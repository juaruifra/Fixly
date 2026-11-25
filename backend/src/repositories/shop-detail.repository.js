import { Category } from "../models/category.model.js";
import { Image } from "../models/image.model.js";
import { Service } from "../models/service.model.js";
import { Variant } from "../models/variant.model.js";
import {
  categoryAvailabilityFilter,
  serviceAvailabilityFilter,
  variantAvailabilityFilter,
} from "../utils/catalog-availability.util.js";

/**
 * Prepara los estados disponibles del Service y su Category para detalle.
 *
 * Ambas consultas de Shop Detail parten de las mismas condiciones del padre.
 * La elegibilidad propia de Category se comprueba por separado y no depende de
 * cambios de estado en cascada.
 *
 * @param {string} slug - Slug exacto del Service solicitado.
 * @returns {Array<Object>} Filtros y lookup de la categoría elegible.
 */
function buildAvailableServiceBySlugStages(slug) {
  const serviceFilter = serviceAvailabilityFilter();
  serviceFilter.slug = slug;

  return [
    { $match: serviceFilter },
    {
      $lookup: {
        from: Category.collection.name,
        let: { categoryId: "$category" },
        pipeline: [
          {
            $match: {
              ...categoryAvailabilityFilter(),
              $expr: { $eq: ["$_id", "$$categoryId"] },
            },
          },
          { $project: { _id: 0, name: 1, slug: 1 } },
        ],
        as: "category",
      },
    },
    { $unwind: "$category" },
  ];
}

/**
 * Recupera todas las imágenes de un Service en su orden público estable.
 *
 * `$sort` define la galería del detalle; `_id` resuelve empates en createdAt.
 * La relación se carga en una sola agregación, no con una consulta por imagen.
 *
 * @returns {Object} Etapa `$lookup` correlacionada con la entidad Service.
 */
function buildServiceImagesLookup() {
  return {
    $lookup: {
      from: Image.collection.name,
      let: { serviceId: "$_id" },
      pipeline: [
        {
          $match: {
            entityType: "service",
            $expr: { $eq: ["$entityId", "$$serviceId"] },
          },
        },
        { $sort: { createdAt: 1, _id: 1 } },
        { $project: { _id: 0, url: 1, alt: 1 } },
      ],
      as: "images",
    },
  };
}

/**
 * Une las variantes elegibles y, si se solicita, su primera imagen.
 *
 * Ambas rutas limitan variantes por estado y relación con Service. El detalle
 * solo necesita precios para calcular priceFrom; el endpoint de variantes añade
 * el lookup de Image y conserva únicamente sus campos públicos.
 *
 * @param {Object} options - Controla si cada variante incluye imagen.
 * @param {boolean} options.includeImages - Añade el lookup de imagen para variantes.
 * @returns {Object} Etapa `$lookup` correlacionada por ID de Service.
 */
function buildAvailableVariantsLookup({ includeImages }) {
  const pipeline = [
    {
      $match: {
        ...variantAvailabilityFilter(),
        $expr: { $eq: ["$service", "$$serviceId"] },
      },
    },
  ];

  if (includeImages) {
    pipeline.push({
      $lookup: {
        from: Image.collection.name,
        let: { variantId: "$_id" },
        pipeline: [
          {
            $match: {
              entityType: "variant",
              $expr: { $eq: ["$entityId", "$$variantId"] },
            },
          },
          // La primera imagen se ordena igual que en el resto del catálogo.
          { $sort: { createdAt: 1, _id: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, url: 1, alt: 1 } },
        ],
        as: "firstImage",
      },
    });
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        description: { $ifNull: ["$description", null] },
        duration: 1,
        price: 1,
        createdAt: 1,
        image: { $ifNull: [{ $arrayElemAt: ["$firstImage", 0] }, null] },
      },
    });
  } else {
    pipeline.push({ $project: { _id: 0, price: 1 } });
  }

  return {
    $lookup: {
      from: Variant.collection.name,
      let: { serviceId: "$_id" },
      pipeline,
      as: "availableVariants",
    },
  };
}

/**
 * Recupera el detalle público de un servicio y su galería completa.
 *
 * El slug y la disponibilidad de Service/Category se comprueban antes de las
 * relaciones. Solo se proyecta el precio de cada Variant porque esta respuesta
 * necesita calcular el mínimo inicial, no devolver las variantes. `$lookup`
 * recupera la galería completa en orden estable y la proyección final evita IDs
 * y estados internos.
 *
 * @param {string} slug - Slug exacto del servicio.
 * @returns {Promise<Object|null>} Detalle público o null si no hay oferta visible.
 */
async function findServiceDetailBySlug(slug) {
  const pipeline = buildAvailableServiceBySlugStages(slug);
  pipeline.push(buildAvailableVariantsLookup({ includeImages: false }));
  pipeline.push({ $match: { "availableVariants.0": { $exists: true } } });
  pipeline.push(buildServiceImagesLookup());
  pipeline.push({
    $addFields: { priceFrom: { $min: "$availableVariants.price" } },
  });
  pipeline.push({
    $project: {
      _id: 0,
      name: 1,
      slug: 1,
      description: { $ifNull: ["$description", null] },
      category: 1,
      images: 1,
      priceFrom: 1,
    },
  });

  const [detail] = await Service.aggregate(pipeline).exec();
  return detail ?? null;
}

/**
 * Lista variantes disponibles de un Service visible mediante su slug.
 *
 * El pipeline valida también el Service y Category padre. Cada variante incluye
 * su primera imagen, ordenada por fecha ascendente e `_id` para desempatar. La
 * lista resultante se ordena por fecha descendente y no expone SKU ni IDs.
 *
 * @param {string} slug - Slug exacto del servicio padre.
 * @returns {Promise<Array<Object>>} Variantes públicas disponibles.
 */
async function findAvailableVariantsByServiceSlug(slug) {
  const pipeline = buildAvailableServiceBySlugStages(slug);
  pipeline.push(buildAvailableVariantsLookup({ includeImages: true }));
  pipeline.push({ $match: { "availableVariants.0": { $exists: true } } });
  pipeline.push({ $unwind: "$availableVariants" });
  pipeline.push({
    $sort: {
      "availableVariants.createdAt": -1,
      "availableVariants._id": -1,
    },
  });
  pipeline.push({ $replaceRoot: { newRoot: "$availableVariants" } });
  pipeline.push({
    $project: {
      _id: 0,
      name: 1,
      description: 1,
      duration: 1,
      price: 1,
      image: 1,
    },
  });

  return Service.aggregate(pipeline).exec();
}

export const shopDetailRepository = {
  findServiceDetailBySlug,
  findAvailableVariantsByServiceSlug,
};