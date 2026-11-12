import mongoose from "mongoose";

import { workerRepository } from "../repositories/worker.repository.js";
import { AppError } from "../utils/app-error.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()-]+$/;

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError("Invalid worker id", 400);
  }
}

// Normaliza el correo y aplica la regla obligatoria también fuera de HTTP.
function normalizeEmail(email) {
  if (typeof email !== "string") {
    throw new AppError("email must be a string", 400);
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || !emailPattern.test(normalized) || normalized.length > 254) {
    throw new AppError("email must be a valid email address", 400);
  }
  return normalized;
}

// Acepta formatos internacionales comunes sin asumir el país del trabajador.
function normalizePhone(phone) {
  if (typeof phone !== "string") {
    throw new AppError("phone must be a string", 400);
  }

  const normalized = phone.trim();
  if (!normalized) return undefined;
  if (normalized.length > 30) throw new AppError("phone is too long", 400);
  if (!phonePattern.test(normalized)) {
    throw new AppError(
      "phone may contain only digits, spaces, parentheses, hyphens and a leading plus",
      400,
    );
  }

  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) {
    throw new AppError("phone must contain between 7 and 15 digits", 400);
  }
  return normalized;
}

function sanitizeInput(data, { creating = false } = {}) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Worker data must be an object", 400);
  }

  const workerData = {};
  if (Object.hasOwn(data, "name")) {
    if (typeof data.name !== "string") throw new AppError("name must be a string", 400);
    workerData.name = data.name.trim();
    if (!workerData.name) throw new AppError("name cannot be empty", 400);
    if (workerData.name.length > 120) throw new AppError("name is too long", 400);
  } else if (creating) {
    throw new AppError("name is required", 400);
  }

  if (Object.hasOwn(data, "email")) {
    workerData.email = normalizeEmail(data.email);
  } else if (creating) {
    throw new AppError("email is required", 400);
  }

  if (Object.hasOwn(data, "phone")) {
    workerData.phone = normalizePhone(data.phone);
  }

  if (Object.hasOwn(data, "active")) {
    if (typeof data.active !== "boolean") throw new AppError("active must be a boolean", 400);
    workerData.active = data.active;
  }

  return workerData;
}

async function getExistingOrThrow(id) {
  const worker = await workerRepository.findById(id);
  if (!worker) throw new AppError("Worker not found", 404);
  return worker;
}

export const workerService = {
  list: (filters) => workerRepository.findAll(filters),
  listAvailable: () => workerRepository.findAvailable(),
  async getById(id) {
    validateId(id);
    return getExistingOrThrow(id);
  },
  async create(data) {
    return workerRepository.create(sanitizeInput(data, { creating: true }));
  },
  async update(id, data) {
    validateId(id);
    const updates = sanitizeInput(data);
    if (Object.keys(updates).length === 0) {
      throw new AppError("No editable worker fields were provided", 400);
    }

    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted worker. Restore it first.", 409);
    }
    if (!Object.hasOwn(updates, "email")) {
      // Los registros anteriores sin correo deben completarlo antes de editarse.
      if (typeof existing.email !== "string" || !existing.email.trim()) {
        throw new AppError("email is required", 400);
      }
      normalizeEmail(existing.email);
    }

    const worker = await workerRepository.updateById(id, updates);
    if (worker) return worker;
    throw new AppError("Worker not found", 404);
  },
  async setActive(id, active) {
    validateId(id);
    if (typeof active !== "boolean") throw new AppError("active must be a boolean", 400);
    const worker = await workerRepository.setActiveById(id, active);
    if (worker) return worker;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted worker. Restore it first.", 409);
    }
    throw new AppError("Worker not found", 404);
  },
  async remove(id) {
    validateId(id);
    const worker = await workerRepository.softDeleteById(id, new Date());
    if (worker) return worker;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) throw new AppError("Worker is already deleted", 409);
    throw new AppError("Worker could not be deleted", 409);
  },
  async restore(id) {
    validateId(id);
    const worker = await workerRepository.restoreById(id);
    if (worker) return worker;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt == null) throw new AppError("Worker is not deleted", 409);
    throw new AppError("Worker could not be restored", 409);
  },
};
