import { Service } from "../models/service.model.js";

export const serviceRepository = {
  findAll: (filters = {}) => {
    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.status !== undefined) query.status = filters.status;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    return Service.find(query).sort({ createdAt: -1 }).lean();
  },
  findById: (id) => Service.findById(id).lean(),
  // Solo expone servicios activos, publicados y no eliminados.
  findPublic: () => Service.find({
    active: true,
    deletedAt: null,
    status: "published"
  }).sort({ createdAt: -1 }).lean(),
  findPublicBySlug: (slug) => Service.findOne({
    slug,
    active: true,
    deletedAt: null,
    status: "published"
  }).lean(),
  existsBySlug: (slug) => Service.exists({ slug }),
  create: (data) => Service.create(data),
  updateById: (id, data, { notDeleted = false } = {}) => Service.findOneAndUpdate(
    notDeleted ? { _id: id, deletedAt: null } : { _id: id },
    data,
    { new: true, runValidators: true }
  ).lean(),
  softDeleteById: (id, deletedAt) => Service.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt, active: false } },
    { new: true, runValidators: true }
  ).lean(),
  restoreById: (id) => Service.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null, active: true } },
    { new: true, runValidators: true }
  ).lean(),
  setActiveById: (id, active) => Service.findOneAndUpdate(
    active ? { _id: id, deletedAt: null } : { _id: id },
    { $set: { active } },
    { new: true, runValidators: true }
  ).lean(),
  setStatusById: (id, status) => Service.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true }
  ).lean()
};
