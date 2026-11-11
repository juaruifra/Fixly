import mongoose from "mongoose";
import { imageRepository } from "../repositories/image.repository.js";
import { AppError } from "../utils/app-error.js";

const ENTITY_TYPES = ["category", "service", "variant"];
const CREATE_FIELDS = ["entityType", "entityId", "url", "alt"];
const UPDATE_FIELDS = ["url", "alt"];
const MAX_URL_LENGTH = 2048;
const MAX_ALT_LENGTH = 250;

function assertObject(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Request body must be an object", 400);
  }
}

function assertAllowedFields(data, allowedFields) {
  const unsupportedField = Object.keys(data).find(
    (field) => !allowedFields.includes(field),
  );
  if (unsupportedField) {
    throw new AppError(`${unsupportedField} is not allowed`, 400);
  }
}

function validateId(id, field = "id") {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
}

function validateEntityType(entityType) {
  if (!ENTITY_TYPES.includes(entityType)) {
    throw new AppError("entityType must be category, service or variant", 400);
  }
}

function normalizeUrl(value) {
  if (typeof value !== "string") {
    throw new AppError("url must be a string", 400);
  }

  const url = value.trim();
  if (!url || url.length > MAX_URL_LENGTH) {
    throw new AppError("url is required and must be at most 2048 characters", 400);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new AppError("url must be an absolute HTTP or HTTPS URL", 400);
  }

  if (
    !/^https?:\/\//i.test(url) ||
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new AppError("url must be an absolute HTTP or HTTPS URL", 400);
  }

  return url;
}

function normalizeAlt(value) {
  if (typeof value !== "string") {
    throw new AppError("alt must be a string", 400);
  }

  const alt = value.trim();
  if (!alt) throw new AppError("alt cannot be empty", 400);
  if (alt.length > MAX_ALT_LENGTH) {
    throw new AppError("alt must be at most 250 characters", 400);
  }
  return alt;
}

function sanitizeCreate(data) {
  assertObject(data);
  assertAllowedFields(data, CREATE_FIELDS);

  for (const field of CREATE_FIELDS) {
    if (!Object.hasOwn(data, field)) {
      throw new AppError(`${field} is required`, 400);
    }
  }

  validateEntityType(data.entityType);
  validateId(data.entityId, "entityId");

  return {
    entityType: data.entityType,
    entityId: String(data.entityId),
    url: normalizeUrl(data.url),
    alt: normalizeAlt(data.alt),
  };
}

function sanitizeUpdate(data) {
  assertObject(data);
  assertAllowedFields(data, UPDATE_FIELDS);

  if (Object.keys(data).length === 0) {
    throw new AppError("At least one of url or alt is required", 400);
  }

  const updates = {};
  if (Object.hasOwn(data, "url")) updates.url = normalizeUrl(data.url);
  if (Object.hasOwn(data, "alt")) updates.alt = normalizeAlt(data.alt);
  return updates;
}

export const imageService = {
  list: () => imageRepository.findAll(),

  async getById(id) {
    validateId(id);
    const image = await imageRepository.findById(id);
    if (!image) throw new AppError("Image not found", 404);
    return image;
  },

  async listByEntity(entityType, entityId) {
    validateEntityType(entityType);
    validateId(entityId, "entityId");
    return imageRepository.findByEntity(entityType, entityId);
  },

  async create(data) {
    const imageData = sanitizeCreate(data);
    const entity = await imageRepository.findRelatedEntity(
      imageData.entityType,
      imageData.entityId,
    );
    if (!entity) throw new AppError("Related entity not found", 404);
    if (entity.deletedAt != null) {
      throw new AppError("Cannot attach an image to a deleted entity", 409);
    }
    return imageRepository.create(imageData);
  },

  async update(id, data) {
    validateId(id);
    const updates = sanitizeUpdate(data);
    const image = await imageRepository.updateById(id, updates);
    if (!image) throw new AppError("Image not found", 404);
    return image;
  },

  async remove(id) {
    validateId(id);
    const image = await imageRepository.deleteById(id);
    if (!image) throw new AppError("Image not found", 404);
  },
};