import mongoose from "mongoose";

import { imageRepository } from "../repositories/image.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

function validateId(id, label) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(`Invalid ${label} id`, 400);
  }
}

function validateCreationKey(creationKey) {
  if (creationKey === undefined || creationKey === null || creationKey === "") {
    return null;
  }
  if (
    typeof creationKey !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(creationKey)
  ) {
    throw new AppError("Idempotency-Key must be a UUID v4", 400);
  }
  return creationKey;
}

function isDuplicateCreationKey(error) {
  return error?.code === 11000 && Boolean(error.keyPattern?.creationKey);
}

function validateProfileData(data, { creating = false } = {}) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Profile data must be an object", 400);
  }

  const allowedFields = new Set(["name"]);
  if (Object.keys(data).some((field) => !allowedFields.has(field))) {
    throw new AppError("Profile contains unsupported fields", 400);
  }
  if (!Object.hasOwn(data, "name")) {
    throw new AppError("name is required", 400);
  }
  if (typeof data.name !== "string") {
    throw new AppError("name must be a string", 400);
  }

  const name = data.name.trim();
  if (!name) throw new AppError("name cannot be empty", 400);
  if (name.length > 120) throw new AppError("name is too long", 400);
  if (!creating && Object.keys(data).length === 0) {
    throw new AppError("No editable profile fields were provided", 400);
  }
  return { name };
}

function toPublicProfile(profile, avatar = null) {
  return {
    id: String(profile._id),
    name: profile.name,
    avatar: avatar ? { url: avatar.url, alt: avatar.alt } : null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export const profileService = {
  async list(ownerId) {
    validateId(ownerId, "user");
    const profiles = await profileRepository.findAllByOwner(ownerId);
    const avatars = await imageRepository.findAvatarsByProfiles(
      profiles.map((profile) => profile._id),
    );
    const avatarsByProfile = new Map(
      avatars.map((avatar) => [String(avatar.entityId), avatar]),
    );
    return profiles.map((profile) =>
      toPublicProfile(profile, avatarsByProfile.get(String(profile._id))),
    );
  },
  async getById(ownerId, id) {
    validateId(ownerId, "user");
    validateId(id, "profile");
    const existingProfile = await profileRepository.findByIdForOwner(id, ownerId);
    if (!existingProfile) throw new AppError("Profile not found", 404);
    const avatar = await imageRepository.findAvatarByProfile(id);
    return toPublicProfile(existingProfile, avatar);
  },
  async create(ownerId, data, creationKey) {
    validateId(ownerId, "user");
    const key = validateCreationKey(creationKey);
    const profileData = validateProfileData(data, { creating: true });

    if (key) {
      // Reutilizamos el perfil existente cuando el cliente repite la misma creación.
      const existing = await profileRepository.findByCreationKey(ownerId, key);
      if (existing) return toPublicProfile(existing);
    }

    try {
      return toPublicProfile(await profileRepository.create(ownerId, profileData, key));
    } catch (error) {
      if (!key || !isDuplicateCreationKey(error)) throw error;
      // El índice único resuelve carreras entre dos peticiones con la misma clave.
      const existing = await profileRepository.findByCreationKey(ownerId, key);
      if (!existing) throw error;
      return toPublicProfile(existing);
    }
  },
  async update(ownerId, id, data) {
    validateId(ownerId, "user");
    validateId(id, "profile");
    const updates = validateProfileData(data);
    const profile = await profileRepository.updateByIdForOwner(id, ownerId, updates);
    if (!profile) throw new AppError("Profile not found", 404);
    const avatar = await imageRepository.findAvatarByProfile(id);
    return toPublicProfile(profile, avatar);
  },
  async remove(ownerId, id) {
    validateId(ownerId, "user");
    validateId(id, "profile");
    const profile = await profileRepository.findByIdForOwner(id, ownerId);
    if (!profile) throw new AppError("Profile not found", 404);

    // Primero quitamos el avatar para no borrar el perfil si falla su limpieza.
    await imageRepository.deleteAvatarForProfile(id);
    const deletedProfile = await profileRepository.deleteByIdForOwner(id, ownerId);
    if (!deletedProfile) throw new AppError("Profile not found", 404);
    // La selección se limpia después de borrar; una selección concurrente se revalida.
    await userRepository.clearDefaultProfileIfMatches(ownerId, id);
    // Una segunda limpieza cubre un avatar creado durante la eliminación.
    await imageRepository.deleteAvatarForProfile(id);
  },
};