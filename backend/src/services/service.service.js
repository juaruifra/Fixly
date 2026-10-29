import mongoose from "mongoose";
import { serviceRepository } from "../repositories/service.repository.js";
import { categoryRepository } from "../repositories/category.repository.js";
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

function getCategoryId(category) {
  return category?._id ?? category;
}

async function validateCategoryAssignment(categoryId, currentCategory) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new AppError("Invalid category id", 400);
  }

  // Mantener la categoría que ya tenía el servicio no bloquea otras ediciones.
  if (
    currentCategory != null &&
    String(getCategoryId(currentCategory)) === String(categoryId)
  ) {
    return;
  }

  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new AppError("Category not found", 404);
  if (!category.active || category.deletedAt != null) {
    throw new AppError("Category is not available", 409);
  }
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
  async create(data) {
    const serviceData = sanitizeInput(data);
    await validateCategoryAssignment(serviceData.category);
    return createWithUniqueSlug(serviceData);
  },
  async update(id, data) {
    validateId(id);
    const updates = sanitizeInput(data);
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError(
        "Cannot edit a deleted service. Restore it before editing.",
        409,
      );
    }
    if (updates.category !== undefined) {
      await validateCategoryAssignment(updates.category, existing.category);
    }

    const item = await serviceRepository.updateById(id, updates, {
      notDeleted: true,
    });
    if (!item) {
      const current = await getExistingOrThrow(id);
      if (current.deletedAt != null) {
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
