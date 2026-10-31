import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";

export const roleRepository = {
  findAll: (filters = {}) => {
    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    return Role.find(query).sort({ name: 1 }).lean();
  },
  findById: (id) => Role.findById(id).lean(),
  findByName: (name) => Role.findOne({ name }).lean(),
  create: (data) => Role.create(data),
  updateById: (id, data) =>
    Role.findOneAndUpdate(
      { _id: id, deletedAt: null },
      data,
      { new: true, runValidators: true },
    ).lean(),
  setActiveById: (id, active) =>
    Role.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { active } },
      { new: true, runValidators: true },
    ).lean(),
  softDeleteById: (id, deletedAt) =>
    Role.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt, active: false } },
      { new: true, runValidators: true },
    ).lean(),
  restoreById: (id) =>
    Role.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, active: true } },
      { new: true, runValidators: true },
    ).lean(),
  // Incluso los usuarios eliminados conservan la referencia histórica al rol.
  countUsersByRole: (roleId) => User.countDocuments({ role: roleId }),
};
