import { Service } from "../models/service.model.js";
import { Variant } from "../models/variant.model.js";
import { serviceRepository } from "./service.repository.js";

const serviceFields = "name slug category active status deletedAt";
const categoryFields = "name slug active deletedAt";

function populateService(query) {
  return query.populate({
    path: "service",
    select: serviceFields,
    populate: { path: "category", select: categoryFields },
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const variantRepository = {
  findAll: (filters = {}) => {
    const query = {};
    if (filters.service !== undefined) query.service = filters.service;
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.status !== undefined) query.status = filters.status;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    return populateService(Variant.find(query).sort({ createdAt: -1 })).lean();
  },
  findPublic: async (serviceId) => {
    const publicServices = await serviceRepository.findPublic();
    let serviceIds = publicServices.map(({ _id }) => _id);
    if (serviceId) {
      serviceIds = serviceIds.filter((id) => String(id) === String(serviceId));
    }
    if (serviceIds.length === 0) return [];

    return populateService(
      Variant.find({
        service: { $in: serviceIds },
        active: true,
        status: "published",
        deletedAt: null,
      }).sort({ createdAt: -1 }),
    ).lean();
  },
  findById: (id) => populateService(Variant.findById(id)).lean(),
  findBySku: (sku, { excludeId } = {}) => {
    const query = { sku };
    if (excludeId) query._id = { $ne: excludeId };
    return Variant.findOne(query).lean();
  },
  findByServiceAndName: (service, name) =>
    Variant.findOne({ service, name }).lean(),
  findSkusByPrefix: (prefix) =>
    Variant.find({
      sku: new RegExp(`^${escapeRegex(prefix)}-\\d+$`),
    })
      .select("sku")
      .lean(),
  countByService: (serviceId) => Variant.countDocuments({ service: serviceId }),
  create: async (data) => {
    const variant = await Variant.create(data);
    return populateService(Variant.findById(variant._id)).lean();
  },
  updateById: (id, data) =>
    populateService(
      Variant.findOneAndUpdate(
        { _id: id, deletedAt: null },
        data,
        { new: true, runValidators: true },
      ),
    ).lean(),
  softDeleteById: (id, deletedAt) =>
    populateService(
      Variant.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { deletedAt, active: false } },
        { new: true, runValidators: true },
      ),
    ).lean(),
  restoreById: (id) =>
    populateService(
      Variant.findOneAndUpdate(
        { _id: id, deletedAt: { $ne: null } },
        { $set: { deletedAt: null, active: true } },
        { new: true, runValidators: true },
      ),
    ).lean(),
  setActiveById: (id, active) =>
    populateService(
      Variant.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { active } },
        { new: true, runValidators: true },
      ),
    ).lean(),
  setStatusById: (id, status) =>
    populateService(
      Variant.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { status } },
        { new: true, runValidators: true },
      ),
    ).lean(),
};