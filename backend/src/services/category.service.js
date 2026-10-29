import mongoose from "mongoose";
import { categoryRepository } from "../repositories/category.repository.js";
import { AppError } from "../utils/app-error.js";
import { generateSlug } from "../utils/slug.util.js";

// Rechaza identificadores mal formados antes de consultar MongoDB.
function validateId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid category id", 400);
  }
}

// Solo aceptamos campos editables; slug y deletedAt los controla el servidor.
function sanitizeInput(data) {
  const allowed = ["name", "description", "active"];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  );
}

// Detecta la colisión del índice único de slug, incluso si dos altas coinciden.
function isSlugDuplicate(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.slug === 1 || error.message?.includes("slug_1"))
  );
}

// Busca un slug libre y añade un sufijo si ya existe, por ejemplo categoria_2.
async function createWithUniqueSlug(data) {
  const base = generateSlug(data.name) || "category";
  let suffix = 1;

  while (true) {
    const slug = suffix === 1 ? base : `${base}_${suffix}`;
    if (await categoryRepository.existsBySlug(slug)) {
      suffix += 1;
      continue;
    }

    try {
      return await categoryRepository.create({ ...data, slug });
    } catch (error) {
      if (!isSlugDuplicate(error)) throw error;
      suffix += 1;
    }
  }
}

// Recupera la categoría o responde con el error 404 usado por la API.
async function getExistingOrThrow(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw new AppError("Category not found", 404);
  return category;
}

export const categoryService = {
  // El repositorio construye la consulta con los filtros administrativos.
  list: (filters) => categoryRepository.findAll(filters),
  // Esta lista se reserva para asignar categorías a servicios nuevos.
  listAvailable: () => categoryRepository.findAvailable(),
  // La web usa el slug en la URL y solo puede abrir categorías disponibles.
  async getAvailableBySlug(slug) {
    const category = await categoryRepository.findAvailableBySlug(slug);
    if (!category) throw new AppError("Category not found", 404);
    return category;
  },
  async getById(id) {
    validateId(id);
    return getExistingOrThrow(id);
  },
  create: (data) => createWithUniqueSlug(sanitizeInput(data)),
  async update(id, data) {
    validateId(id);
    const updates = sanitizeInput(data);
    const category = await categoryRepository.updateById(id, updates);
    if (category) return category;

    // updateById solo modifica categorías no eliminadas.
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError(
        "Cannot edit a deleted category. Restore it before editing.",
        409,
      );
    }
    throw new AppError("Category not found", 404);
  },
  async remove(id) {
    validateId(id);

    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Category is already deleted", 409);
    }

    // El repositorio cuenta también servicios eliminados lógicamente.
    const serviceCount =
      await categoryRepository.countServicesByCategory(id);
    if (serviceCount > 0) {
      throw new AppError(
        `Cannot delete category while ${serviceCount} services are associated with it.`,
        409,
      );
    }

    const category = await categoryRepository.softDeleteById(id, new Date());
    if (category) return;

    throw new AppError("Category could not be deleted", 409);
  },
  async restore(id) {
    validateId(id);
    const category = await categoryRepository.restoreById(id);
    if (category) return category;

    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt == null) {
      throw new AppError("Category is not deleted", 409);
    }
    throw new AppError("Category could not be restored", 409);
  },
  async setActive(id, active) {
    validateId(id);
    const category = await categoryRepository.setActiveById(id, active);
    if (category) return category;

    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError(
        "Cannot edit a deleted category. Restore it before editing.",
        409,
      );
    }
    throw new AppError("Category not found", 404);
  },
};