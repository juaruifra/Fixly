import mongoose from "mongoose";

import { serviceRepository } from "../repositories/service.repository.js";
import { variantRepository } from "../repositories/variant.repository.js";
import { AppError } from "../utils/app-error.js";
import { getVariantSkuPrefix } from "../utils/variant-sku.util.js";

const allowedStatuses = ["draft", "published", "paused", "discontinued"];
const maxSkuAttempts = 20;
const skuPattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function validateId(id, label = "variant") {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new AppError(`Invalid ${label} id`, 400);
  }
}

function isDuplicateSku(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.sku === 1 || error.keyValue?.sku !== undefined)
  );
}

function normalizeSku(sku) {
  if (typeof sku !== "string") {
    throw new AppError("sku must be a string", 400);
  }
  const normalized = sku.trim().toUpperCase();
  if (!normalized || !skuPattern.test(normalized)) {
    throw new AppError("sku must contain only letters, numbers and hyphens", 400);
  }
  return normalized;
}

function sanitizeInput(data, { creating = false } = {}) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Variant data must be an object", 400);
  }

  const allowed = [
    "service",
    "name",
    "sku",
    "auto",
    "price",
    "duration",
    "active",
    "status",
    "requiresBooking",
  ];
  const variantData = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  );

  if (creating) {
    for (const field of ["service", "name", "price", "duration"]) {
      if (!Object.hasOwn(variantData, field)) {
        throw new AppError(`${field} is required`, 400);
      }
    }
  }

  if (Object.hasOwn(variantData, "service")) {
    if (!mongoose.isObjectIdOrHexString(variantData.service)) {
      throw new AppError("Invalid service id", 400);
    }
  }

  if (Object.hasOwn(variantData, "name")) {
    if (typeof variantData.name !== "string") {
      throw new AppError("name must be a string", 400);
    }
    variantData.name = variantData.name.trim();
    if (!variantData.name) throw new AppError("name cannot be empty", 400);
    if (variantData.name.length > 120) {
      throw new AppError("name must be at most 120 characters", 400);
    }
  }

  if (Object.hasOwn(variantData, "price")) {
    if (
      typeof variantData.price !== "number" ||
      !Number.isFinite(variantData.price) ||
      variantData.price < 0
    ) {
      throw new AppError(
        "price must be a number greater than or equal to 0",
        400,
      );
    }
  }

  if (Object.hasOwn(variantData, "duration")) {
    if (!Number.isInteger(variantData.duration) || variantData.duration < 1) {
      throw new AppError("duration must be a positive integer", 400);
    }
  }

  for (const field of ["auto", "active", "requiresBooking"]) {
    if (
      Object.hasOwn(variantData, field) &&
      typeof variantData[field] !== "boolean"
    ) {
      throw new AppError(`${field} must be a boolean`, 400);
    }
  }

  if (
    Object.hasOwn(variantData, "status") &&
    !allowedStatuses.includes(variantData.status)
  ) {
    throw new AppError("Invalid variant status", 400);
  }

  return variantData;
}

async function getServiceOrThrow(serviceId) {
  validateId(serviceId, "service");
  const service = await serviceRepository.findById(serviceId);
  if (!service) throw new AppError("Service not found", 404);
  if (service.deletedAt != null) {
    throw new AppError("Cannot use a deleted service", 409);
  }
  return service;
}

async function getVariantOrThrow(id) {
  const variant = await variantRepository.findById(id);
  if (!variant) throw new AppError("Variant not found", 404);
  return variant;
}

async function createWithAutoSku(data, service) {
  const prefix = getVariantSkuPrefix(service.slug, data.duration);
  const existingSkus = await variantRepository.findSkusByPrefix(prefix);
  let sequence = existingSkus.reduce((highest, { sku }) => {
    const current = Number(sku.slice(prefix.length + 1));
    return Number.isInteger(current) ? Math.max(highest, current) : highest;
  }, 0) + 1;

  // El índice único resuelve colisiones si dos altas calculan la misma secuencia.
  for (let attempt = 0; attempt < maxSkuAttempts; attempt += 1) {
    const sku = `${prefix}-${String(sequence).padStart(3, "0")}`;
    try {
      return await variantRepository.create({ ...data, auto: true, sku });
    } catch (error) {
      if (!isDuplicateSku(error)) throw error;
      sequence += 1;
    }
  }

  throw new AppError("Could not generate a unique variant SKU", 409);
}

async function updateWithAutoSku(id, data, prefix, excludeId) {
  const existingSkus = await variantRepository.findSkusByPrefix(prefix);
  let sequence = existingSkus.reduce((highest, { sku }) => {
    const current = Number(sku.slice(prefix.length + 1));
    return Number.isInteger(current) ? Math.max(highest, current) : highest;
  }, 0) + 1;

  for (let attempt = 0; attempt < maxSkuAttempts; attempt += 1) {
    const sku = `${prefix}-${String(sequence).padStart(3, "0")}`;
    if (await variantRepository.findBySku(sku, { excludeId })) {
      sequence += 1;
      continue;
    }

    try {
      const variant = await variantRepository.updateById(id, {
        ...data,
        auto: true,
        sku,
      });
      if (variant) return variant;
      return null;
    } catch (error) {
      if (!isDuplicateSku(error)) throw error;
      sequence += 1;
    }
  }

  throw new AppError("Could not generate a unique variant SKU", 409);
}

export const variantService = {
  async list(filters) {
    if (filters?.service !== undefined) validateId(filters.service, "service");
    return variantRepository.findAll(filters);
  },
  async listPublic(serviceId) {
    if (serviceId !== undefined) validateId(serviceId, "service");
    return variantRepository.findPublic(serviceId);
  },
  async listByService(serviceId) {
    await getServiceOrThrow(serviceId);
    return variantRepository.findAll({ service: serviceId });
  },
  async getById(id) {
    validateId(id);
    return getVariantOrThrow(id);
  },
  async create(data) {
    const variantData = sanitizeInput(data, { creating: true });
    const service = await getServiceOrThrow(variantData.service);
    const auto = variantData.auto ?? true;

    if (auto) {
      // En modo automático, el SKU siempre se calcula y no se toma del cliente.
      delete variantData.sku;
      return createWithAutoSku(variantData, service);
    }

    variantData.auto = false;
    variantData.sku = normalizeSku(variantData.sku);
    if (await variantRepository.findBySku(variantData.sku)) {
      throw new AppError("Variant SKU already exists", 409);
    }

    try {
      return await variantRepository.create(variantData);
    } catch (error) {
      if (isDuplicateSku(error)) {
        throw new AppError("Variant SKU already exists", 409);
      }
      throw error;
    }
  },
  async update(id, data) {
    validateId(id);
    const updates = sanitizeInput(data);
    const current = await getVariantOrThrow(id);
    if (current.deletedAt != null) {
      throw new AppError("Cannot edit a deleted variant. Restore it first.", 409);
    }

    const currentServiceId = String(current.service?._id ?? current.service);
    const nextServiceId = String(updates.service ?? currentServiceId);
    const serviceChanged = nextServiceId !== currentServiceId;
    const service =
      serviceChanged || (updates.auto === true && current.auto === false)
        ? await getServiceOrThrow(nextServiceId)
        : current.service;
    const nextAuto = updates.auto ?? current.auto;
    const nextDuration = updates.duration ?? current.duration;

    if (serviceChanged) updates.service = nextServiceId;

    if (nextAuto) {
      delete updates.sku;
      updates.auto = true;

      const mustRegenerate =
        current.auto === false ||
        updates.duration !== undefined ||
        serviceChanged;
      if (!mustRegenerate) {
        return variantRepository.updateById(id, updates);
      }

      const serviceSlug = service?.slug;
      if (!serviceSlug) throw new AppError("Service slug is required", 409);
      const prefix = getVariantSkuPrefix(serviceSlug, nextDuration);
      const variant = await updateWithAutoSku(id, updates, prefix, id);
      if (variant) return variant;
    } else {
      updates.auto = false;
      if (updates.sku !== undefined) {
        updates.sku = normalizeSku(updates.sku);
        if (await variantRepository.findBySku(updates.sku, { excludeId: id })) {
          throw new AppError("Variant SKU already exists", 409);
        }
      }

      try {
        const variant = await variantRepository.updateById(id, updates);
        if (variant) return variant;
      } catch (error) {
        if (isDuplicateSku(error)) {
          throw new AppError("Variant SKU already exists", 409);
        }
        throw error;
      }
    }

    const existing = await getVariantOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted variant. Restore it first.", 409);
    }
    throw new AppError("Variant not found", 404);
  },
  async remove(id) {
    validateId(id);
    const item = await variantRepository.softDeleteById(id, new Date());
    if (item) return item;
    const existing = await getVariantOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Variant is already deleted", 409);
    }
    throw new AppError("Variant could not be deleted", 409);
  },
  async restore(id) {
    validateId(id);
    const item = await variantRepository.restoreById(id);
    if (item) return item;
    const existing = await getVariantOrThrow(id);
    if (existing.deletedAt == null) {
      throw new AppError("Variant is not deleted", 409);
    }
    throw new AppError("Variant could not be restored", 409);
  },
  async setActive(id, active) {
    validateId(id);
    if (typeof active !== "boolean") {
      throw new AppError("active must be a boolean", 400);
    }
    const item = await variantRepository.setActiveById(id, active);
    if (item) return item;
    const existing = await getVariantOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted variant. Restore it first.", 409);
    }
    throw new AppError("Variant not found", 404);
  },
  async setStatus(id, status) {
    validateId(id);
    if (!allowedStatuses.includes(status)) {
      throw new AppError("Invalid variant status", 400);
    }
    const item = await variantRepository.setStatusById(id, status);
    if (item) return item;
    const existing = await getVariantOrThrow(id);
    if (existing.deletedAt != null) {
      throw new AppError("Cannot edit a deleted variant. Restore it first.", 409);
    }
    throw new AppError("Variant not found", 404);
  },
};
