import { Service } from "../models/service.model.js";
import { Category } from "../models/category.model.js";

const categoryFields = "name slug active deletedAt";
const serviceContractFields = "-price -duration";

/**
 * Excluye del resultado dos propiedades que ya no forman parte del contrato.
 *
 * Los documentos creados antes de esta fase pueden conservar `price` y
 * `duration` físicamente en MongoDB. Como `.lean()` devuelve objetos planos,
 * no se debe confiar en que el esquema nuevo elimine esos campos al serializar.
 * La proyección los oculta sin modificar los documentos ni los pedidos históricos.
 *
 * @param {import("mongoose").Query} query - Consulta pendiente de Service.
 * @returns {import("mongoose").Query} La misma consulta con proyección excluyente.
 */
function withoutLegacyCommercialFields(query) {
  return query.select(serviceContractFields);
}

async function findAvailableCategoryIds() {
  return Category.find({ active: true, deletedAt: null }).distinct("_id");
}

export const serviceRepository = {
  findAll: (filters = {}) => {
    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.status !== undefined) query.status = filters.status;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    return withoutLegacyCommercialFields(Service.find(query))
      .populate("category", categoryFields)
      .sort({ createdAt: -1 })
      .lean();
  },
  findById: (id) =>
    withoutLegacyCommercialFields(Service.findById(id))
      .populate("category", categoryFields)
      .lean(),
  // Solo expone servicios activos, publicados y no eliminados.
  findPublic: async () => {
    const categoryIds = await findAvailableCategoryIds();
    return withoutLegacyCommercialFields(Service.find({
      active: true,
      deletedAt: null,
      status: "published",
      category: { $in: categoryIds },
    }))
      .populate("category", categoryFields)
      .sort({ createdAt: -1 })
        .lean();
  },
  findPublicBySlug: async (slug) => {
    const categoryIds = await findAvailableCategoryIds();
    return withoutLegacyCommercialFields(Service.findOne({
      slug,
      active: true,
      deletedAt: null,
      status: "published",
      category: { $in: categoryIds },
    }))
      .populate("category", categoryFields)
      .lean();
  },
  existsBySlug: (slug) => Service.exists({ slug }),
  create: async (data) => {
    const service = await Service.create(data);
    return withoutLegacyCommercialFields(Service.findById(service._id))
      .populate("category", categoryFields)
      .lean();
  },
  updateById: (id, data, { notDeleted = false } = {}) =>
    withoutLegacyCommercialFields(Service.findOneAndUpdate(
      notDeleted ? { _id: id, deletedAt: null } : { _id: id },
      data,
      { new: true, runValidators: true },
    ))
      .populate("category", categoryFields)
      .lean(),
  softDeleteById: (id, deletedAt) =>
    withoutLegacyCommercialFields(Service.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt, active: false } },
      { new: true, runValidators: true },
    )).lean(),
  restoreById: (id) =>
    withoutLegacyCommercialFields(Service.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, active: true } },
      { new: true, runValidators: true },
    ))
      .populate("category", categoryFields)
      .lean(),
  setActiveById: (id, active) =>
    withoutLegacyCommercialFields(Service.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { active } },
      { new: true, runValidators: true },
    ))
      .populate("category", categoryFields)
      .lean(),
  setStatusById: (id, status) =>
    withoutLegacyCommercialFields(Service.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { status } },
      { new: true, runValidators: true },
    ))
      .populate("category", categoryFields)
      .lean(),
};
