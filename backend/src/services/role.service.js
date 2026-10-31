import mongoose from "mongoose";

import { roleRepository } from "../repositories/role.repository.js";
import { AppError } from "../utils/app-error.js";

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError("Invalid role id", 400);
  }
}

function sanitizeInput(data, { creating = false } = {}) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Role data must be an object", 400);
  }

  const roleData = {};
  if (Object.hasOwn(data, "name")) {
    if (typeof data.name !== "string") {
      throw new AppError("name must be a string", 400);
    }
    roleData.name = data.name.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]*$/.test(roleData.name)) {
      throw new AppError("name must use letters, numbers, underscores or hyphens", 400);
    }
    if (roleData.name.length > 60) {
      throw new AppError("name must be at most 60 characters", 400);
    }
  } else if (creating) {
    throw new AppError("name is required", 400);
  }

  if (Object.hasOwn(data, "description")) {
    if (typeof data.description !== "string") {
      throw new AppError("description must be a string", 400);
    }
    roleData.description = data.description.trim();
    if (roleData.description.length > 250) {
      throw new AppError("description must be at most 250 characters", 400);
    }
  }

  if (Object.hasOwn(data, "active")) {
    if (typeof data.active !== "boolean") {
      throw new AppError("active must be a boolean", 400);
    }
    roleData.active = data.active;
  }

  return roleData;
}

async function getExistingOrThrow(id) {
  const role = await roleRepository.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  return role;
}

function isDuplicateName(error) {
  return error?.code === 11000 && error.keyPattern?.name === 1;
}

export const roleService = {
  list: (filters) => roleRepository.findAll(filters),
  async getById(id) {
    validateId(id);
    return getExistingOrThrow(id);
  },
  async create(data) {
    const roleData = sanitizeInput(data, { creating: true });
    if (await roleRepository.findByName(roleData.name)) {
      throw new AppError("Role name already exists", 409);
    }
    try {
      return await roleRepository.create(roleData);
    } catch (error) {
      if (isDuplicateName(error)) {
        throw new AppError("Role name already exists", 409);
      }
      throw error;
    }
  },
  async update(id, data) {
    validateId(id);
    const updates = sanitizeInput(data);
    if (Object.keys(updates).length === 0) {
      throw new AppError("No editable role fields were provided", 400);
    }
    if (updates.name) {
      const existingName = await roleRepository.findByName(updates.name);
      if (existingName && String(existingName._id) !== String(id)) {
        throw new AppError("Role name already exists", 409);
      }
    }
    try {
      const role = await roleRepository.updateById(id, updates);
      if (role) return role;
    } catch (error) {
      if (isDuplicateName(error)) {
        throw new AppError("Role name already exists", 409);
      }
      throw error;
    }
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted role. Restore it first.", 409);
    }
    throw new AppError("Role not found", 404);
  },
  async setActive(id, active) {
    validateId(id);
    if (typeof active !== "boolean") {
      throw new AppError("active must be a boolean", 400);
    }
    const role = await roleRepository.setActiveById(id, active);
    if (role) return role;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted role. Restore it first.", 409);
    }
    throw new AppError("Role not found", 404);
  },
  async remove(id) {
    validateId(id);
    const role = await getExistingOrThrow(id);
    if (role.deletedAt != null) throw new AppError("Role is already deleted", 409);

    const userCount = await roleRepository.countUsersByRole(id);
    if (userCount > 0) {
      throw new AppError("Cannot delete a role assigned to users", 409);
    }

    const deleted = await roleRepository.softDeleteById(id, new Date());
    if (deleted) return deleted;
    throw new AppError("Role could not be deleted", 409);
  },
  async restore(id) {
    validateId(id);
    const role = await roleRepository.restoreById(id);
    if (role) return role;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt == null) throw new AppError("Role is not deleted", 409);
    throw new AppError("Role could not be restored", 409);
  },
};
