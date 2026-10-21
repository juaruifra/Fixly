import mongoose from "mongoose";
import { serviceRepository } from "../repositories/service.repository.js";
import { AppError } from "../utils/app-error.js";
import { generateSlug } from "../utils/slug.util.js";

const allowedStatuses = ["draft", "published", "paused", "discontinued"];

function validateId(id) {
  if (!mongoose.isValidObjectId(id))
    throw new AppError("Invalid service id", 400);
}

function sanitizeInput(data) {
  const allowed = [
    "name",
    "category",
    "price",
    "duration",
    "description",
    "active",
    "status",
  ];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  );
}

function isSlugDuplicate(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.slug === 1 || error.message?.includes("slug_1"))
  );
}

async function createWithUniqueSlug(data) {
  const base = generateSlug(data.name) || "service";
  let suffix = 1;

  while (true) {
    const slug = suffix === 1 ? base : `${base}_${suffix}`;
    if (await serviceRepository.existsBySlug(slug)) {
      suffix += 1;
      continue;
    }

    try {
      return await serviceRepository.create({ ...data, slug });
    } catch (error) {
      if (!isSlugDuplicate(error)) throw error;
      suffix += 1;
    }
  }
}

async function getExistingOrThrow(id) {
  const item = await serviceRepository.findById(id);
  if (!item) throw new AppError("Service not found", 404);
  return item;
}

export const serviceService = {
  list: (filters) => serviceRepository.findAll(filters),
  async listPublic() {
    return serviceRepository.findPublic();
  },
  async getById(id) {
    validateId(id);
    return getExistingOrThrow(id);
  },
  async getPublicBySlug(slug) {
    const item = await serviceRepository.findPublicBySlug(slug);
    if (!item) throw new AppError("Service not found", 404);
    return item;
  },
  create: (data) => createWithUniqueSlug(sanitizeInput(data)),
  async update(id, data) {
    validateId(id);
    const updates = sanitizeInput(data);
    const item = await serviceRepository.updateById(id, updates, {
      notDeleted: true,
    });
    if (!item) {
      const existing = await getExistingOrThrow(id);
      if (existing.deletedAt != null) {
        throw new AppError(
          "Cannot edit a deleted service. Restore it before editing.",
          409,
        );
      }
      throw new AppError("Service not found", 404);
    }
    return item;
  },
  async remove(id) {
    validateId(id);
    const item = await serviceRepository.softDeleteById(id, new Date());
    if (item) return;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Service is already deleted", 409);
    }
    throw new AppError("Service could not be deleted", 409);
  },
  async restore(id) {
    validateId(id);
    const item = await serviceRepository.restoreById(id);
    if (item) return item;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt == null) {
      throw new AppError("Service is not deleted", 409);
    }
    throw new AppError("Service could not be restored", 409);
  },
  async setActive(id, active) {
    validateId(id);
    const item = await serviceRepository.setActiveById(id, active);
    if (item) return item;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError(
        "Cannot edit a deleted service. Restore it before editing.",
        409,
      );
    }
    throw new AppError("Service not found", 404);
  },
  async setStatus(id, status) {
    validateId(id);
    if (!allowedStatuses.includes(status)) {
      throw new AppError("Invalid service status", 400);
    }
    const item = await serviceRepository.setStatusById(id, status);
    if (!item) {
      const existing = await getExistingOrThrow(id);
      if (existing.deletedAt != null) {
        throw new AppError(
          "Cannot edit a deleted service. Restore it before editing.",
          409,
        );
      }
      throw new AppError("Service not found", 404);
    }
    return item;
  },
};
