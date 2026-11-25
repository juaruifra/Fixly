import { Category } from "../models/category.model.js";
import { Image } from "../models/image.model.js";
import { Service } from "../models/service.model.js";
import { Variant } from "../models/variant.model.js";
import {
  categoryAvailabilityFilter,
  serviceAvailabilityFilter,
  variantAvailabilityFilter,
} from "../utils/catalog-availability.util.js";
import { escapeSearchRegex } from "../utils/catalog-search.util.js";

const sortByMode = {
  "name-asc": { name: 1, _id: 1 },
  "name-desc": { name: -1, _id: 1 },
  "price-asc": { priceFrom: 1, _id: 1 },
  "price-desc": { priceFrom: -1, _id: 1 },
};

/**
 * Construye en un mismo lugar los filtros dinámicos y candidatos de Shop.
 *
 * Los tres filtros iniciales expresan la disponibilidad obligatoria. Después,
 * los `if` añaden categorías y precio únicamente cuando están presentes. La
 * categoría utiliza `$in` (OR entre slugs); los grupos distintos se concatenan
 * como etapas sucesivas y, por tanto, se combinan con AND.
 *
 * La búsqueda se escapa una vez y se usa después de filtrar variantes por precio.
 * Si coincide con Service/Category, todas las variantes dentro del rango son
 * elegibles. Si coincide solo con Variant, el `$filter` conserva únicamente las
 * variantes que cumplen texto y precio a la vez.
 *
 * @param {Object} queryParams - Filtros normalizados por `shop.service`.
 * @param {string[]} queryParams.categories - Slugs únicos de Category.
 * @param {string} queryParams.search - Texto normalizado o cadena vacía.
 * @param {number|undefined} queryParams.minPrice - Límite inclusivo inferior.
 * @param {number|undefined} queryParams.maxPrice - Límite inclusivo superior.
 * @returns {Array<Object>} Etapas desde `$match` hasta `eligibleVariants`.
 */
function buildShopCandidateStages({ categories, search, minPrice, maxPrice }) {
  // Cada fábrica crea un filtro nuevo por petición; los objetos no se comparten
  // entre agregaciones ni se mutan por fuera de este constructor.
  const serviceFilter = serviceAvailabilityFilter();
  const categoryFilter = categoryAvailabilityFilter();
  const variantFilter = variantAvailabilityFilter();
  const priceFilter = {};

  // La lista de categorías es OR: MongoDB acepta cualquier slug del conjunto.
  if (categories.length > 0) {
    categoryFilter.slug = { $in: categories };
  }

  // Los límites son inclusivos y opcionales de forma independiente.
  if (minPrice !== undefined) {
    priceFilter.$gte = minPrice;
  }
  if (maxPrice !== undefined) {
    priceFilter.$lte = maxPrice;
  }
  // Un objeto vacío significa que no hay rango y Variant no recibe un filtro price.
  if (Object.keys(priceFilter).length > 0) {
    variantFilter.price = priceFilter;
  }

  const searchRegex = search ? escapeSearchRegex(search) : null;
  const stages = [
    {
      $match: serviceFilter,
    },
    {
      $lookup: {
        from: Category.collection.name,
        let: { categoryId: "$category" },
        pipeline: [
          {
            $match: {
              // Extendemos el filtro propio de Category sin alterar su objeto.
              ...categoryFilter,
              $expr: { $eq: ["$_id", "$$categoryId"] },
            },
          },
          { $project: { _id: 0, name: 1, slug: 1, searchText: 1 } },
        ],
        as: "category",
      },
    },
    { $unwind: "$category" },
  ];

  stages.push({
    $lookup: {
      from: Variant.collection.name,
      let: { serviceId: "$_id" },
      pipeline: [
        {
          $match: {
            // `$expr` añade la relación al filtro comercial obligatorio de Variant.
            ...variantFilter,
            $expr: { $eq: ["$service", "$$serviceId"] },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            searchText: 1,
            price: 1,
            duration: 1,
          },
        },
      ],
      as: "availableVariants",
    },
  });
  stages.push({ $match: { "availableVariants.0": { $exists: true } } });

  if (searchRegex) {
    stages.push({
      $addFields: {
        serviceOrCategoryMatches: {
          $or: [
            {
              $regexMatch: {
                input: { $ifNull: ["$searchText", ""] },
                regex: searchRegex,
                options: "i",
              },
            },
            {
              $regexMatch: {
                input: { $ifNull: ["$category.searchText", ""] },
                regex: searchRegex,
                options: "i",
              },
            },
          ],
        },
        matchingTextVariants: {
          $filter: {
            input: "$availableVariants",
            as: "variant",
            cond: {
              $regexMatch: {
                input: { $ifNull: ["$$variant.searchText", ""] },
                regex: searchRegex,
                options: "i",
              },
            },
          },
        },
      },
    });
    stages.push({
      $match: {
        $expr: {
          $or: [
            "$serviceOrCategoryMatches",
            { $gt: [{ $size: "$matchingTextVariants" }, 0] },
          ],
        },
      },
    });
    stages.push({
      $addFields: {
        eligibleVariants: {
          $cond: [
            "$serviceOrCategoryMatches",
            "$availableVariants",
            "$matchingTextVariants",
          ],
        },
      },
    });
  } else {
    stages.push({ $addFields: { eligibleVariants: "$availableVariants" } });
  }

  return stages;
}

/**
 * Prepara el lookup de la primera imagen para los servicios de la página actual.
 *
 * Se añade después de `$skip` y `$limit`, por lo que MongoDB solo busca imágenes
 * para las tarjetas que se van a devolver. `createdAt` y `_id` hacen estable la
 * selección cuando varias imágenes comparten la misma fecha.
 *
 * @returns {Object} Etapa `$lookup` correlacionada por ID de Service.
 */
function buildFirstServiceImageLookup() {
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
        { $limit: 1 },
        { $project: { _id: 0, url: 1, alt: 1 } },
      ],
      as: "firstImage",
    },
  };
}

/**
 * Ejecuta la búsqueda paginada de servicios de Shop List.
 *
 * `$sort` ocurre antes de `$facet`, cuyo contador incluye todos los servicios
 * filtrados y cuya rama `results` aplica `$skip` y `$limit`. La imagen se une
 * solo a la página actual. Cada documento del pipeline sigue representando un
 * Service porque las variantes permanecen como array, no se hace `$unwind`.
 *
 * @param {Object} queryParams - Filtros ya normalizados por el servicio.
 * @returns {Promise<{items:Array<Object>,total:number,limit:number,offset:number}>}
 *   Página de tarjetas y total anterior a la paginación.
 */
async function findServices(queryParams) {
  const pipeline = buildShopCandidateStages(queryParams);
  pipeline.push({
    $addFields: { priceFrom: { $min: "$eligibleVariants.price" } },
  });
  pipeline.push({ $sort: sortByMode[queryParams.sort] });
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      results: [
        { $skip: queryParams.offset },
        { $limit: queryParams.limit },
        buildFirstServiceImageLookup(),
        {
          $project: {
            _id: 0,
            name: 1,
            slug: 1,
            description: { $ifNull: ["$description", null] },
            category: { name: "$category.name", slug: "$category.slug" },
            image: { $ifNull: [{ $arrayElemAt: ["$firstImage", 0] }, null] },
            priceFrom: 1,
          },
        },
      ],
    },
  });
  pipeline.push({
    $project: {
      _id: 0,
      items: "$results",
      total: { $ifNull: [{ $arrayElemAt: ["$metadata.total", 0] }, 0] },
      limit: { $literal: queryParams.limit },
      offset: { $literal: queryParams.offset },
    },
  });

  const [page] = await Service.aggregate(pipeline).exec();
  return page ?? {
    items: [],
    total: 0,
    limit: queryParams.limit,
    offset: queryParams.offset,
  };
}

/**
 * Calcula límites adaptativos sin aplicar precio, orden ni paginación.
 *
 * Reutiliza las categorías, búsqueda y la regla texto-variante de Shop List.
 * `$unwind` solo se usa en esta agregación temporal de precios, donde cada fila
 * representa una variante elegible; el `$group` produce un único min/max.
 *
 * @param {Object} queryParams - Categorías y búsqueda, sin límites de precio.
 * @returns {Promise<{min:number|null,max:number|null}>} Límites o null si no hay resultados.
 */
async function findAdaptivePriceRange(queryParams) {
  const adaptiveQueryParams = {
    categories: queryParams.categories,
    search: queryParams.search,
    minPrice: undefined,
    maxPrice: undefined,
  };
  const pipeline = buildShopCandidateStages(adaptiveQueryParams);
  pipeline.push({ $unwind: "$eligibleVariants" });
  pipeline.push({
    $group: {
      _id: null,
      min: { $min: "$eligibleVariants.price" },
      max: { $max: "$eligibleVariants.price" },
    },
  });
  pipeline.push({ $project: { _id: 0, min: 1, max: 1 } });

  const [range] = await Service.aggregate(pipeline).exec();
  return range ?? { min: null, max: null };
}

export const shopRepository = {
  findServices,
  findAdaptivePriceRange,
};