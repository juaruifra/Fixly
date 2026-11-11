import { Category } from "../models/category.model.js";
import { Image } from "../models/image.model.js";
import { Service } from "../models/service.model.js";
import { Variant } from "../models/variant.model.js";

const relatedModels = { category: Category, service: Service, variant: Variant };

export const imageRepository = {
  findAll: () => Image.find().sort({ createdAt: -1 }).lean(),
  findById: (id) => Image.findById(id).lean(),
  findByEntity: (entityType, entityId) =>
    Image.find({ entityType, entityId }).sort({ createdAt: 1 }).lean(),
  findRelatedEntity: (entityType, entityId) =>
    relatedModels[entityType]
      .findById(entityId)
      .select("_id deletedAt")
      .lean(),
  create: (data) => Image.create(data),
  updateById: (id, data) =>
    Image.findByIdAndUpdate(id, { $set: data }, {
      new: true,
      runValidators: true,
    }).lean(),
  deleteById: (id) => Image.findByIdAndDelete(id).lean(),
};