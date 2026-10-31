import mongoose from "mongoose";
import { serviceRepository } from "../repositories/service.repository.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { variantRepository } from "../repositories/variant.repository.js";
import { AppError } from "../utils/app-error.js";
import { generateSlug } from "../utils/slug.util.js";

const allowedStatuses = ["draft", "published", "paused", "discontinued"];

// Solo aceptamos IDs de MongoDB completos, no valores que puedan convertirse a uno.
function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError("Invalid service id", 400);
  }
}

function sanitizeInput(data, { creating = false } = {}) {
  // El servicio también valida su entrada por si se llama sin pasar por HTTP.
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Service data must be an object", 400);
  }

  // Solo guardamos campos editables; el slug se genera dentro del servicio.
  const allowed = [
    "name",
    "category",
    "price",
    "duration",
    "description",
    "active",
    "status",
  ];
  const serviceData = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  );

  if (creating) {
    // Un servicio nuevo necesita estos cuatro datos para quedar completo.
    for (const field of ["name", "category", "price", "duration"]) {
      if (!Object.hasOwn(serviceData, field)) {
        throw new AppError(`${field} is required`, 400);
      }
    }
  }

  if (Object.hasOwn(serviceData, "name")) {
    // Limpiamos el nombre y aplicamos el mismo máximo que acepta la API.
    if (typeof serviceData.name !== "string") {
      throw new AppError("name must be a string", 400);
    }
    serviceData.name = serviceData.name.trim();
    if (!serviceData.name) throw new AppError("name cannot be empty", 400);
    if (serviceData.name.length > 120) {
      throw new AppError("name must be at most 120 characters", 400);
    }
  }

  // El precio debe ser un número real y no puede ser negativo.
  if (Object.hasOwn(serviceData, "price")) {
    if (
      typeof serviceData.price !== "number" ||
      !Number.isFinite(serviceData.price) ||
      serviceData.price < 0
    ) {
      throw new AppError(
        "price must be a number greater than or equal to 0",
        400,
      );
    }
  }

  // La duración se expresa en minutos enteros y no puede ser menor de 15.
  if (Object.hasOwn(serviceData, "duration")) {
    if (!Number.isInteger(serviceData.duration) || serviceData.duration < 15) {
      throw new AppError(
        "duration must be an integer greater than or equal to 15",
        400,
      );
    }
  }

  if (Object.hasOwn(serviceData, "description")) {
    // La descripción es opcional, pero si llega debe ser texto de hasta 500 caracteres.
    if (typeof serviceData.description !== "string") {
      throw new AppError("description must be a string", 400);
    }
    serviceData.description = serviceData.description.trim();
    if (serviceData.description.length > 500) {
      throw new AppError("description must be at most 500 characters", 400);
    }
  }

  // Estos valores también se comprueban aquí, aunque la ruta ya los valide.
  if (
    Object.hasOwn(serviceData, "active") &&
    typeof serviceData.active !== "boolean"
  ) {
    throw new AppError("active must be a boolean", 400);
  }

  if (
    Object.hasOwn(serviceData, "status") &&
    !allowedStatuses.includes(serviceData.status)
  ) {
    throw new AppError("Invalid service status", 400);
  }

  return serviceData;
}

function getCategoryId(category) {
  return category?._id ?? category;
}

async function validateCategoryAssignment(categoryId, currentCategory) {
  // La relación debe apuntar a una categoría existente y disponible.
  if (!mongoose.isObjectIdOrHexString(categoryId)) {
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
    const serviceData = sanitizeInput(data, { creating: true });
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
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Service is already deleted", 409);
    }

    // También cuentan variantes eliminadas: sus SKU y pedidos siguen referenciándolas.
    const variantCount = await variantRepository.countByService(id);
    if (variantCount > 0) {
      throw new AppError(
        "Cannot delete service while variants are associated with it.",
        409,
      );
    }

    const item = await serviceRepository.softDeleteById(id, new Date());
    if (item) return;
    const current = await getExistingOrThrow(id);
    if (current.deletedAt != null) {
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
    if (typeof active !== "boolean") {
      throw new AppError("active must be a boolean", 400);
    }
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
