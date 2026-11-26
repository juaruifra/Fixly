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
 * No aplica orden ni paginación: `findServices` y `findAdaptivePriceRange`
 * reutilizan estas etapas con parámetros distintos. Los valores predeterminados
 * se asignan en el servicio/parser, no en este constructor.
 *
 * @param {Object} queryParams - Filtros normalizados por `shop.service`.
 * @param {string[]} queryParams.categories - Slugs únicos de Category.
 * @param {string} queryParams.search - Texto normalizado o cadena vacía.
 * @param {number|undefined} queryParams.minPrice - Límite inclusivo inferior.
 * @param {number|undefined} queryParams.maxPrice - Límite inclusivo superior.
 * @returns {Array<Object>} Etapas para Service que conservan un documento por
 *   servicio y añaden el array `eligibleVariants` para consultas posteriores.
 */
function buildShopCandidateStages({ categories, search, minPrice, maxPrice }) {
  // Cada fábrica crea un filtro nuevo por petición; los objetos no se comparten
  // entre agregaciones ni se mutan por fuera de este constructor.
  const serviceFilter = serviceAvailabilityFilter();
  const categoryFilter = categoryAvailabilityFilter();
  const variantFilter = variantAvailabilityFilter();
  const priceFilter = {};

  // El objeto se construye dinámicamente: $in acepta cualquiera de los slugs
  // (OR). Categoría, texto y precio se aplican en etapas sucesivas (AND).
  if (categories.length > 0) {
    categoryFilter.slug = { $in: categories };
  }

  // $gte/$lte son inclusivos; cada límite puede existir independientemente.
  // El filtro se incorpora a Variant, nunca al precio de Service.
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

  // Solo se crean etapas de búsqueda si hay texto; escapar la expresión evita
  // que los caracteres del usuario actúen como operadores de regex.
  const searchRegex = search ? escapeSearchRegex(search) : null;
  const stages = [
    {
      // Service.aggregate comienza en Service; $match descarta servicios no
      // activos, no publicados o eliminados antes de buscar relaciones.
      $match: serviceFilter,
    },
    {
      $lookup: {
        // Para cada Service, `let` copia su campo $category a $$categoryId.
        // El pipeline interno lee documentos Category, no el servicio exterior.
        from: Category.collection.name,
        let: { categoryId: "$category" },
        pipeline: [
          {
            $match: {
              // `...` incorpora disponibilidad y, si existe, el $in de slugs.
              ...categoryFilter,
              // $expr permite $eq entre $_id de Category y $$categoryId del
              // Service. `$campo` y `$$variable` pertenecen a ámbitos distintos.
              $expr: { $eq: ["$_id", "$$categoryId"] },
            },
          },
          // $project conserva el texto de búsqueda y los datos públicos usados
          // después; no devuelve estados ni el documento completo.
          { $project: { _id: 0, name: 1, slug: 1, searchText: 1 } },
        ],
        as: "category",
      },
    },
    // $lookup produce un array; $unwind lo convierte en objeto y descarta el
    // servicio si su categoría no existe o no supera el filtro.
    { $unwind: "$category" },
  ];

  stages.push({
    $lookup: {
      // El pipeline interno recibe Variant; $$serviceId guarda el _id del
      // Service exterior y $service es el campo de la variante consultada.
      from: Variant.collection.name,
      let: { serviceId: "$_id" },
      pipeline: [
        {
          $match: {
            // `...` añade disponibilidad y, si existe, el rango de precios.
            // $expr/$eq correlacionan la variante con el servicio actual.
            ...variantFilter,
            $expr: { $eq: ["$service", "$$serviceId"] },
          },
        },
        // $project limita los datos del array usado para texto y precio.
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
  // $exists sobre la posición 0 exige al menos una variante que cumpla estado
  // y precio. El array permanece agrupado, sin duplicar la tarjeta de Service.
  stages.push({ $match: { "availableVariants.0": { $exists: true } } });

  if (searchRegex) {
    // $addFields conserva el Service y añade dos resultados: una bandera para
    // texto en Service/Category y un array de variantes que coinciden en texto.
    stages.push({
      $addFields: {
        serviceOrCategoryMatches: {
          $or: [
            {
              // $ifNull evita pasar null a $regexMatch; i ignora mayúsculas.
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
        // $filter recorre solo availableVariants, ya restringidas por precio.
        // `as` declara $$variant; así texto y precio deben coincidir en la
        // misma variante cuando no coincide el servicio ni su categoría.
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
    // $size cuenta el array filtrado y $gt exige al menos una coincidencia si
    // el texto no coincide con Service/Category. $or expresa esa alternativa.
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
    // $cond selecciona las variantes elegibles para el mínimo: si coincide el
    // padre son todas las disponibles; si no, solo matchingTextVariants.
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
    // Sin búsqueda todas las variantes disponibles por estado/precio cuentan.
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
      // `let` conserva el ID del servicio de la página en $$serviceId. El
      // pipeline interno busca Images relacionadas, no servicios adicionales.
      from: Image.collection.name,
      let: { serviceId: "$_id" },
      pipeline: [
        {
          $match: {
            entityType: "service",
            $expr: { $eq: ["$entityId", "$$serviceId"] },
          },
        },
        // $sort y $limit escogen una imagen estable; $project elimina su _id.
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
 * @param {Object} queryParams - Filtros normalizados; incluye `sort`, `limit`
 *   y `offset`, cuyos defaults se establecen antes de llegar al repositorio.
 * @returns {Promise<{items:Array<Object>,total:number,limit:number,offset:number}>}
 *   `items` contiene tarjetas con categoría, imagen opcional y `priceFrom`;
 *   `total` cuenta servicios antes de paginar y se devuelven limit/offset.
 */
async function findServices(queryParams) {
  const pipeline = buildShopCandidateStages(queryParams);
  // $min calcula el mínimo del array eligibleVariants para cada Service.
  pipeline.push({
    $addFields: { priceFrom: { $min: "$eligibleVariants.price" } },
  });
  // Ordenar antes de paginar garantiza páginas consistentes; _id desempata.
  pipeline.push({ $sort: sortByMode[queryParams.sort] });
  pipeline.push({
    // $facet envía los mismos candidatos a dos subpipelines independientes:
    // metadata cuenta todos; results omite offset y limita la página actual.
    $facet: {
      metadata: [{ $count: "total" }],
      results: [
        { $skip: queryParams.offset },
        { $limit: queryParams.limit },
        // Las imágenes se unen después de $skip/$limit, solo para esta página.
        buildFirstServiceImageLookup(),
        {
          $project: {
            _id: 0,
            name: 1,
            slug: 1,
            description: { $ifNull: ["$description", null] },
            category: { name: "$category.name", slug: "$category.slug" },
            // $arrayElemAt extrae la primera imagen; $ifNull conserva null si
            // el lookup devolvió un array vacío. Lo mismo se aplica a description.
            image: { $ifNull: [{ $arrayElemAt: ["$firstImage", 0] }, null] },
            priceFrom: 1,
          },
        },
      ],
    },
  });
  pipeline.push({
    // $project convierte el resultado único de $facet en el contrato de página.
    // metadata puede estar vacío: $arrayElemAt/$ifNull dan total 0. $literal
    // incluye limit/offset como valores, no como referencias de campo Mongo.
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
  // Se conservan categoría y búsqueda pero se excluye el precio aplicado para
  // que el control pueda ofrecer todo el rango disponible de esos candidatos.
  const adaptiveQueryParams = {
    categories: queryParams.categories,
    search: queryParams.search,
    minPrice: undefined,
    maxPrice: undefined,
  };
  const pipeline = buildShopCandidateStages(adaptiveQueryParams);
  // A diferencia del listado, aquí $unwind crea una fila por variante porque
  // interesa agrupar precios, no contar ni paginar servicios.
  pipeline.push({ $unwind: "$eligibleVariants" });
  pipeline.push({
    // _id null reúne todas las filas; $min y $max calculan los extremos globales.
    $group: {
      _id: null,
      min: { $min: "$eligibleVariants.price" },
      max: { $max: "$eligibleVariants.price" },
    },
  });
  // $project elimina el identificador de grupo; si no hay filas se devuelve
  // el par null/null desde JavaScript. Orden y paginación no afectan al rango.
  pipeline.push({ $project: { _id: 0, min: 1, max: 1 } });

  const [range] = await Service.aggregate(pipeline).exec();
  return range ?? { min: null, max: null };
}

export const shopRepository = {
  findServices,
  findAdaptivePriceRange,
};