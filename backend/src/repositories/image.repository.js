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
  // Una imagen solo es pública si toda su cadena de catálogo es visible.
  async isEntityPublic(entityType, entityId) {
    if (entityType === "category") {
      return Boolean(await Category.exists({ _id: entityId, active: true, deletedAt: null }));
    }

    let serviceId = entityId;
    if (entityType === "variant") {
      const variant = await Variant.findOne({
        _id: entityId,
        active: true,
        status: "published",
        deletedAt: null,
      }).select("service").lean();
      if (!variant) return false;
      serviceId = variant.service;
    } else if (entityType !== "service") {
      return false;
    }

    const service = await Service.findOne({
      _id: serviceId,
      active: true,
      status: "published",
      deletedAt: null,
    }).select("category").lean();
    if (!service) return false;
    return Boolean(await Category.exists({
      _id: service.category,
      active: true,
      deletedAt: null,
    }));
  },
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