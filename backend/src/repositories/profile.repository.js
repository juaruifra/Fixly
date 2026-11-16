import { Profile } from "../models/profile.model.js";

const publicFields = "_id name createdAt updatedAt";

export const profileRepository = {
  findAllByOwner: (ownerId) =>
    Profile.find({ owner: ownerId }).select(publicFields).sort({ createdAt: -1 }).lean(),
  findByIdForOwner: (id, ownerId) =>
    Profile.findOne({ _id: id, owner: ownerId }).select(publicFields).lean(),
  findByCreationKey: (ownerId, creationKey) =>
    Profile.findOne({ owner: ownerId, creationKey }).select(publicFields).lean(),
  create: async (ownerId, data, creationKey) => {
    const profile = await Profile.create({
      ...data,
      owner: ownerId,
      ...(creationKey ? { creationKey } : {}),
    });
    return Profile.findById(profile._id).select(publicFields).lean();
  },
  updateByIdForOwner: (id, ownerId, data) =>
    Profile.findOneAndUpdate(
      { _id: id, owner: ownerId },
      { $set: data },
      { new: true, runValidators: true },
    ).select(publicFields).lean(),
  deleteByIdForOwner: (id, ownerId) =>
    Profile.findOneAndDelete({ _id: id, owner: ownerId }).select(publicFields).lean(),
};