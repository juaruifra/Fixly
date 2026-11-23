import mongoose from "mongoose";

import { profileRepository } from "../repositories/profile.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword, verifyPassword } from "../utils/password.util.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;
const maximumPasswordBytes = 72;

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError("Invalid user id", 400);
  }
}

function normalizeEmail(email) {
  if (typeof email !== "string") throw new AppError("email must be a string", 400);
  const normalized = email.trim().toLowerCase();
  if (!emailPattern.test(normalized) || normalized.length > 254) {
    throw new AppError("email must be a valid email address", 400);
  }
  return normalized;
}

function validateName(name) {
  if (typeof name !== "string") throw new AppError("name must be a string", 400);
  const normalized = name.trim();
  if (!normalized) throw new AppError("name cannot be empty", 400);
  if (normalized.length > 120) throw new AppError("name is too long", 400);
  return normalized;
}

// Todas las vías de contraseña comparten mínimo en caracteres y máximo en bytes UTF-8.
function validatePassword(password) {
  if (typeof password !== "string") {
    throw new AppError("password must be a string", 400);
  }
  if ([...password].length < minimumPasswordLength) {
    throw new AppError(`password must contain at least ${minimumPasswordLength} characters`, 400);
  }
  if (Buffer.byteLength(password, "utf8") > maximumPasswordBytes) {
    throw new AppError("password must not exceed 72 UTF-8 bytes", 400);
  }
}

function isDuplicateEmail(error) {
  return error?.code === 11000 && error.keyPattern?.email === 1;
}

function toPublicUser(user) {
  if (!user) return user;
  const { passwordHash, tokenVersion, ...publicUser } = user;
  return {
    ...publicUser,
    defaultProfile: user.defaultProfile ? String(user.defaultProfile) : null,
  };
}

async function getActiveRoleOrThrow(roleId) {
  if (!mongoose.isObjectIdOrHexString(roleId)) {
    throw new AppError("Invalid role id", 400);
  }
  const role = await roleRepository.findById(roleId);
  if (!role) throw new AppError("Role not found", 404);
  if (!role.active || role.deletedAt != null) {
    throw new AppError("Role is not available", 409);
  }
  return role;
}

async function createWithRole(data, roleId) {
  const name = validateName(data.name);
  const email = normalizeEmail(data.email);
  validatePassword(data.password);
  await getActiveRoleOrThrow(roleId);

  if (await userRepository.existsByEmail(email)) {
    throw new AppError("Email already exists", 409);
  }

  try {
    return toPublicUser(await userRepository.create({
      name,
      email,
      passwordHash: await hashPassword(data.password),
      role: roleId,
    }));
  } catch (error) {
    if (isDuplicateEmail(error)) throw new AppError("Email already exists", 409);
    throw error;
  }
}

async function getExistingOrThrow(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export const userService = {
  async register(data) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("User data must be an object", 400);
    }

    const clientRole = await roleRepository.findByName("CLIENT");
    if (!clientRole || !clientRole.active || clientRole.deletedAt != null) {
      throw new AppError("Client role is not available", 409);
    }

    // El registro público siempre asigna CLIENT e ignora cualquier role enviado.
    return createWithRole(data, clientRole._id);
  },
  async createByAdmin(data) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("User data must be an object", 400);
    }
    if (!Object.hasOwn(data, "role")) throw new AppError("role is required", 400);
    return createWithRole(data, data.role);
  },
  list: (filters) => userRepository.findAll(filters),
  async getById(id) {
    validateId(id);
    return toPublicUser(await getExistingOrThrow(id));
  },
  async updateOwnProfile(id, data) {
    validateId(id);
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("User data must be an object", 400);
    }
    const editableFields = new Set(["name", "email"]);
    if (Object.keys(data).some((field) => !editableFields.has(field))) {
      throw new AppError("User data contains unsupported fields", 400);
    }

    const updates = {};
    if (Object.hasOwn(data, "name")) updates.name = validateName(data.name);
    if (Object.hasOwn(data, "email")) updates.email = normalizeEmail(data.email);
    if (Object.keys(updates).length === 0) {
      throw new AppError("No editable user fields were provided", 400);
    }
    if (updates.email && await userRepository.existsByEmail(updates.email, { excludeId: id })) {
      throw new AppError("Email already exists", 409);
    }

    try {
      const user = await userRepository.updateOwnProfile(id, updates);
      if (user) return toPublicUser(user);
    } catch (error) {
      if (isDuplicateEmail(error)) throw new AppError("Email already exists", 409);
      throw error;
    }
    throw new AppError("User not found", 404);
  },
  async setDefaultProfile(ownerId, data) {
    validateId(ownerId, "user");
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("Profile selection must be an object", 400);
    }
    if (Object.keys(data).some((field) => field !== "profileId")) {
      throw new AppError("Profile selection contains unsupported fields", 400);
    }
    if (!Object.hasOwn(data, "profileId")) {
      throw new AppError("profileId is required", 400);
    }
    const profileId = data.profileId;
    if (profileId !== null) {
      validateId(profileId, "profile");
      const profile = await profileRepository.findByIdForOwner(profileId, ownerId);
      if (!profile) throw new AppError("Profile not found", 404);
    }

    const user = await userRepository.setDefaultProfile(ownerId, profileId);
    if (!user) throw new AppError("User not found", 404);

    if (profileId !== null) {
      // Revalidamos por si la eliminación empezó mientras guardábamos la selección.
      const stillOwned = await profileRepository.findByIdForOwner(profileId, ownerId);
      if (!stillOwned) {
        await userRepository.clearDefaultProfileIfMatches(ownerId, profileId);
        throw new AppError("Profile not found", 404);
      }
    }
    return toPublicUser(user);
  },
  async update(id, data) {
    validateId(id);
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("User data must be an object", 400);
    }

    const updates = {};
    if (Object.hasOwn(data, "name")) updates.name = validateName(data.name);
    if (Object.hasOwn(data, "email")) updates.email = normalizeEmail(data.email);
    if (Object.hasOwn(data, "role")) {
      await getActiveRoleOrThrow(data.role);
      updates.role = data.role;
    }
    if (Object.hasOwn(data, "password")) {
      validatePassword(data.password);
      updates.passwordHash = await hashPassword(data.password);
    }
    if (Object.keys(updates).length === 0) {
      throw new AppError("No editable user fields were provided", 400);
    }

    if (updates.email && (await userRepository.existsByEmail(updates.email, { excludeId: id }))) {
      throw new AppError("Email already exists", 409);
    }

    try {
      const user = await userRepository.updateById(id, updates);
      if (user) return user;
    } catch (error) {
      if (isDuplicateEmail(error)) throw new AppError("Email already exists", 409);
      throw error;
    }
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted user. Restore it first.", 409);
    }
    throw new AppError("User not found", 404);
  },
  async setActive(id, active) {
    validateId(id);
    if (typeof active !== "boolean") throw new AppError("active must be a boolean", 400);
    const user = await userRepository.setActiveById(id, active);
    if (user) return user;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted user. Restore it first.", 409);
    }
    throw new AppError("User not found", 404);
  },
  async remove(id) {
    validateId(id);
    const user = await userRepository.softDeleteById(id, new Date());
    if (user) return user;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) throw new AppError("User is already deleted", 409);
    throw new AppError("User could not be deleted", 409);
  },
  async restore(id) {
    validateId(id);
    const user = await userRepository.restoreById(id);
    if (user) return user;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt == null) throw new AppError("User is not deleted", 409);
    throw new AppError("User could not be restored", 409);
  },
  async changeOwnPassword(id, data) {
    validateId(id);
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError("Password data must be an object", 400);
    }
    if (Object.keys(data).some((field) => !["currentPassword", "newPassword"].includes(field))) {
      throw new AppError("Unexpected password fields", 400);
    }

    validatePassword(data.currentPassword);
    validatePassword(data.newPassword);
    const user = await userRepository.findByIdForPassword(id);
    if (!user || !user.active || user.deletedAt != null) {
      throw new AppError("User not found", 404);
    }

    // Solo la contraseña actual de la cuenta autenticada autoriza el cambio.
    if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
      throw new AppError("Current password is incorrect", 400);
    }

    const nextHash = await hashPassword(data.newPassword);
    const updated = await userRepository.updatePasswordHash(id, user.passwordHash, nextHash);
    if (!updated) throw new AppError("Password could not be updated", 409);
  },
  async authenticate(email, password) {
    const normalizedEmail = normalizeEmail(email);
    validatePassword(password);
    const user = await userRepository.findByEmailForAuth(normalizedEmail);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError("Invalid email or password", 401);
    }
    if (!user.active || user.deletedAt != null) {
      throw new AppError("Invalid email or password", 401);
    }
    if (!user.role?.active || user.role.deletedAt != null) {
      throw new AppError("User role is not available", 403);
    }

    const { passwordHash, ...safeUser } = user;
    // Login usa la versión leída junto con el hash que acaba de verificar.
    return { ...toPublicUser(safeUser), tokenVersion: user.tokenVersion ?? 0 };
  },
};
