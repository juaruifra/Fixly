import { User } from "../models/user.model.js";

const roleFields = "name active deletedAt";

function populateRole(query) {
  return query.populate("role", roleFields);
}

export const userRepository = {
  findAll: (filters = {}) => {
    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    return populateRole(User.find(query).select("-passwordHash").sort({ createdAt: -1 })).lean();
  },
  findById: (id) =>
    populateRole(User.findById(id).select("-passwordHash")).lean(),
  findByEmail: (email) =>
    populateRole(User.findOne({ email }).select("-passwordHash")).lean(),
  findByEmailForAuth: (email) =>
    populateRole(User.findOne({ email }).select("+passwordHash")).lean(),
  existsByEmail: (email, { excludeId } = {}) => {
    const query = { email };
    if (excludeId) query._id = { $ne: excludeId };
    return User.exists(query);
  },
  create: async (data) => {
    const user = await User.create(data);
    return populateRole(User.findById(user._id).select("-passwordHash")).lean();
  },
  updateById: (id, data) =>
    populateRole(
      User.findOneAndUpdate(
        { _id: id, deletedAt: null },
        data,
        { new: true, runValidators: true },
      ).select("-passwordHash"),
    ).lean(),
  setActiveById: (id, active) =>
    populateRole(
      User.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { active } },
        { new: true, runValidators: true },
      ).select("-passwordHash"),
    ).lean(),
  softDeleteById: (id, deletedAt) =>
    populateRole(
      User.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: { deletedAt, active: false } },
        { new: true, runValidators: true },
      ).select("-passwordHash"),
    ).lean(),
  restoreById: (id) =>
    populateRole(
      User.findOneAndUpdate(
        { _id: id, deletedAt: { $ne: null } },
        { $set: { deletedAt: null, active: true } },
        { new: true, runValidators: true },
      ).select("-passwordHash").lean(),
    ),
  countByRole: (roleId) => User.countDocuments({ role: roleId }),
};
