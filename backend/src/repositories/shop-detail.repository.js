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
 * El slug y la disponibilidad propia de Service se comprueban antes de unir
 * Category. Ambas operaciones completan luego estas etapas con su propio lookup
 * de variantes, según necesiten solo precios o los datos de cada modalidad.
 *
 * @param {string} slug - Slug exacto del Service solicitado, validado en la ruta.
 * @returns {Array<Object>} Etapas para Service con `category` como objeto público.
 */
function buildAvailableServiceBySlugStages(slug) {
  // La fábrica crea un objeto nuevo; JavaScript añade el slug sin alterar un
  // filtro compartido entre peticiones.
  const serviceFilter = serviceAvailabilityFilter();
  serviceFilter.slug = slug;

  return [
    // Service.aggregate parte de servicios. $match exige slug, active,
    // published y ausencia de borrado antes de buscar la categoría.
    { $match: serviceFilter },
    {
      $lookup: {
        // `let` toma $category del Service exterior y lo expone como
        // $$categoryId dentro del pipeline que recorre documentos Category.
        from: Category.collection.name,
        let: { categoryId: "$category" },
        pipeline: [
          {
            $match: {
              // `...` añade la disponibilidad propia de Category. $expr/$eq
              // comparan su $_id con la variable $$categoryId del servicio.
              ...categoryAvailabilityFilter(),
              $expr: { $eq: ["$_id", "$$categoryId"] },
            },
          },
          // $project conserva solo los campos que consume el detalle público.
          { $project: { _id: 0, name: 1, slug: 1 } },
        ],
        as: "category",
      },
    },
    // $lookup produce un array. $unwind lo convierte en objeto y descarta el
    // servicio si no hay categoría disponible; no cambia estados en cascada.
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
      // $$serviceId guarda el _id del servicio exterior. Dentro del pipeline
      // $entityId pertenece a Image; $expr/$eq relacionan ambos valores.
      from: Image.collection.name,
      let: { serviceId: "$_id" },
      pipeline: [
        {
          $match: {
            entityType: "service",
            $expr: { $eq: ["$entityId", "$$serviceId"] },
          },
        },
        // $sort ordena toda la galería y usa _id como desempate; $project
        // conserva URL y alt, sin reducir el array a una sola imagen.
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
 * @param {boolean} options.includeImages - Si true añade la primera imagen;
 *   si false solo proyecta precios. No hay valor predeterminado en esta función.
 * @returns {Object} Etapa `$lookup` que crea `availableVariants` en Service.
 */
function buildAvailableVariantsLookup({ includeImages }) {
  const pipeline = [
    {
      $match: {
        // Cada documento interior es Variant. `...` aplica su disponibilidad y
        // $expr/$eq la relacionan con $$serviceId del Service exterior.
        ...variantAvailabilityFilter(),
        $expr: { $eq: ["$service", "$$serviceId"] },
      },
    },
  ];

  if (includeImages) {
    // JavaScript añade este lookup únicamente para el endpoint de variantes.
    // Su `let` toma el _id de la Variant actual, no el del Service exterior.
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
          // $sort y $limit escogen la primera imagen estable; $project limita
          // su contenido. El array vacío no descarta la variante.
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
        // $arrayElemAt toma la imagen del array y $ifNull conserva null cuando
        // falta; también normaliza la descripción opcional a null.
        image: { $ifNull: [{ $arrayElemAt: ["$firstImage", 0] }, null] },
      },
    });
  } else {
    // El detalle necesita únicamente los precios para calcular su mínimo.
    pipeline.push({ $project: { _id: 0, price: 1 } });
  }

  return {
    $lookup: {
      from: Variant.collection.name,
      let: { serviceId: "$_id" },
      pipeline,
      // Mongo añade un array por servicio; no genera una fila por variante.
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
 * @returns {Promise<Object|null>} `{name, slug, description, category, images,
 *   priceFrom}` o null si no existe una oferta visible. El service convierte
 *   ese null en HTTP 404; el repositorio no genera respuestas HTTP.
 */
async function findServiceDetailBySlug(slug) {
  const pipeline = buildAvailableServiceBySlugStages(slug);
  pipeline.push(buildAvailableVariantsLookup({ includeImages: false }));
  // $exists sobre la posición 0 requiere al menos una variante elegible; sin
  // ella el servicio no es comercialmente visible en ninguna de las dos rutas.
  pipeline.push({ $match: { "availableVariants.0": { $exists: true } } });
  pipeline.push(buildServiceImagesLookup());
  // $addFields mantiene el servicio y $min calcula el precio inicial usando
  // todas sus variantes disponibles, sin los filtros de precio de Shop List.
  pipeline.push({
    $addFields: { priceFrom: { $min: "$availableVariants.price" } },
  });
  // $project define el contrato público; $ifNull transforma una descripción
  // ausente en null y mantiene `images` como array, incluso si está vacío.
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
 * @returns {Promise<Array<Object>>} `{name, description, duration, price,
 *   image}` por variante; array vacío si no hay servicio o variantes elegibles.
 *   El service traduce el array vacío a HTTP 404.
 */
async function findAvailableVariantsByServiceSlug(slug) {
  const pipeline = buildAvailableServiceBySlugStages(slug);
  pipeline.push(buildAvailableVariantsLookup({ includeImages: true }));
  pipeline.push({ $match: { "availableVariants.0": { $exists: true } } });
  // $unwind convierte el array en una fila por Variant para ordenarlas; a
  // diferencia del listado de servicios, aquí cada fila será una modalidad.
  pipeline.push({ $unwind: "$availableVariants" });
  // $sort ordena por creación descendente y desempata por _id descendente.
  pipeline.push({
    $sort: {
      "availableVariants.createdAt": -1,
      "availableVariants._id": -1,
    },
  });
  // $replaceRoot sustituye el Service exterior por la Variant de cada fila.
  pipeline.push({ $replaceRoot: { newRoot: "$availableVariants" } });
  // $project elimina identificadores y datos internos antes de devolverla.
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