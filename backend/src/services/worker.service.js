import mongoose from "mongoose";

import { workerRepository } from "../repositories/worker.repository.js";
import { AppError } from "../utils/app-error.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError("Invalid worker id", 400);
  }
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
    if (typeof data.email !== "string") throw new AppError("email must be a string", 400);
    const email = data.email.trim().toLowerCase();
    if (email && (!emailPattern.test(email) || email.length > 254)) {
      throw new AppError("email must be a valid email address", 400);
    }
    workerData.email = email || undefined;
  }

  if (Object.hasOwn(data, "phone")) {
    if (typeof data.phone !== "string") throw new AppError("phone must be a string", 400);
    const phone = data.phone.trim();
    if (phone.length > 30) throw new AppError("phone is too long", 400);
    workerData.phone = phone || undefined;
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
    const worker = await workerRepository.updateById(id, updates);
    if (worker) return worker;
    const existing = await getExistingOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted worker. Restore it first.", 409);
    }
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
