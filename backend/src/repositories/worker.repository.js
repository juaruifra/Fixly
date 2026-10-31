import { Worker } from "../models/worker.model.js";

export const workerRepository = {
  findAll: (filters = {}) => {
    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    return Worker.find(query).sort({ createdAt: -1 }).lean();
  },
  findAvailable: () =>
    Worker.find({ active: true, deletedAt: null }).sort({ name: 1 }).lean(),
  findById: (id) => Worker.findById(id).lean(),
  create: (data) => Worker.create(data),
  updateById: (id, data) =>
    Worker.findOneAndUpdate(
      { _id: id, deletedAt: null },
      data,
      { new: true, runValidators: true },
    ).lean(),
  setActiveById: (id, active) =>
    Worker.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { active } },
      { new: true, runValidators: true },
    ).lean(),
  softDeleteById: (id, deletedAt) =>
    Worker.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt, active: false } },
      { new: true, runValidators: true },
    ).lean(),
  restoreById: (id) =>
    Worker.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, active: true } },
      { new: true, runValidators: true },
    ).lean(),
};
