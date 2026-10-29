import { Category } from "../models/category.model.js";
import { Service } from "../models/service.model.js";

export const categoryRepository = {
  // Lista categorías para administración y aplica los filtros recibidos.
  findAll: async (filters = {}) => {
    const query = {};
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.deleted !== undefined) {
      query.deletedAt = filters.deleted ? { $ne: null } : null;
    }
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .lean();
    if (categories.length === 0) return categories;

    // No filtramos deletedAt: también contamos servicios borrados lógicamente.
    const counts = await Service.aggregate([
      { $match: { category: { $in: categories.map(({ _id }) => _id) } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(
      counts.map(({ _id, count }) => [String(_id), count]),
    );

    return categories.map((category) => ({
      ...category,
      serviceCount: countByCategory.get(String(category._id)) || 0,
    }));
  },
  // Solo devuelve categorías que se pueden asignar a un servicio nuevo.
  findAvailable: () =>
    Category.find({ active: true, deletedAt: null })
      .sort({ name: 1 })
      .lean(),
  // La web busca por slug, pero solo debe encontrar categorías disponibles.
  findAvailableBySlug: (slug) =>
    Category.findOne({ slug, active: true, deletedAt: null }).lean(),
  findById: async (id) => {
    const category = await Category.findById(id).lean();
    if (!category) return null;

    const serviceCount = await Service.countDocuments({ category: id });
    return { ...category, serviceCount };
  },
  // Incluye todos los servicios relacionados, aunque estén borrados lógicamente.
  countServicesByCategory: (categoryId) =>
    Service.countDocuments({ category: categoryId }),
  // Permite comprobar si el slug ya pertenece a otra categoría.
  existsBySlug: (slug) => Category.exists({ slug }),
  create: (data) => Category.create(data),
  // Las categorías eliminadas deben restaurarse antes de poder editarlas.
  updateById: (id, data) =>
    Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      data,
      { new: true, runValidators: true },
    ).lean(),
  // Conserva el documento y registra la fecha en vez de borrarlo físicamente.
  softDeleteById: (id, deletedAt) =>
    Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt, active: false } },
      { new: true, runValidators: true },
    ).lean(),
  // La restauración limpia la fecha de borrado y vuelve a activar la categoría.
  restoreById: (id) =>
    Category.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, active: true } },
      { new: true, runValidators: true },
    ).lean(),
  setActiveById: (id, active) =>
    Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { active } },
      { new: true, runValidators: true },
    ).lean(),
};