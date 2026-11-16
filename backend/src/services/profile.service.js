import mongoose from "mongoose";

import { imageRepository } from "../repositories/image.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { AppError } from "../utils/app-error.js";

function validateId(id, label) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(`Invalid ${label} id`, 400);
  }
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
  async create(ownerId, data) {
    validateId(ownerId, "user");
    const profile = await profileRepository.create(
      ownerId,
      validateProfileData(data, { creating: true }),
    );
    return toPublicProfile(profile);
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
    // Una segunda limpieza cubre un avatar creado durante la eliminación.
    await imageRepository.deleteAvatarForProfile(id);
  },
};