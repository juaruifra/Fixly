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
 * Construye la consulta que determina qué categorías pueden aparecer en Home.
 *
 * El pipeline recorre una vez los servicios publicados, verifica sus variantes
 * mediante el índice existente por `service` y agrupa por categoría antes de
 * recuperar la categoría y su imagen. Así evita consultar todos los servicios
 * una vez por cada categoría y no produce tarjetas duplicadas. Los nombres de
 * colección proceden de los modelos Mongoose.
 *
 * Home solicita imágenes; Shop Filters reutiliza los mismos candidatos sin
 * imágenes para no ejecutar un lookup que no necesita.
 *
 * @param {Object} [options={}] - Opciones para construir el pipeline.
 * @param {boolean} [options.includeImages=true] - Añade la primera imagen pública.
 * @returns {Array<Object>} Etapas para agregar sobre Service; cada resultado
 *   contiene `name`, `slug` y, si se solicita, `image: {url, alt}|null`.
 */
function buildHomeCategoriesPipeline({ includeImages = true } = {}) {
  const pipeline = [
    // Service.aggregate inicia el recorrido: $match conserva servicios activos,
    // publicados y no eliminados. Cada documento todavía representa un Service.
    {
      $match: serviceAvailabilityFilter(),
    },
    {
      $lookup: {
        // El lookup ejecuta su pipeline para cada servicio exterior y reúne
        // las variantes encontradas en un array, sin multiplicar el servicio.
        from: Variant.collection.name,
        // `$` lee el _id del servicio; `let` lo hace accesible como $$serviceId.
        let: { serviceId: "$_id" },
        pipeline: [
          // El pipeline interno recibe documentos Variant. `...` incorpora las
          // condiciones activo/publicado/no eliminado sin sustituir la relación.
          {
            $match: {
              ...variantAvailabilityFilter(),
              // $expr permite usar $eq entre $service de Variant y la variable
              // $$serviceId del Service exterior; la relación aprovecha su índice.
              $expr: { $eq: ["$service", "$$serviceId"] },
            },
          },
          // Solo comprobamos existencia de una variante; no hace falta cargarla.
          { $limit: 1 },
        ],
        as: "availableVariants",
      },
    },
    // $exists sobre la posición 0 comprueba que el array tenga al menos una
    // variante elegible; un servicio sin ella no aporta categoría a Home.
    { $match: { "availableVariants.0": { $exists: true } } },
    // $group reúne servicios por su campo $category y usa ese ID como _id del
    // grupo: varias ofertas de una categoría producen una única tarjeta.
    { $group: { _id: "$category" } },
    {
      $lookup: {
        // Cada grupo contiene el ID de categoría en _id; localField/foreignField
        // lo relacionan con Category y dejan el documento encontrado en un array.
        from: Category.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    // $unwind convierte el array category en un objeto; si está vacío descarta
    // el grupo, por ejemplo cuando falta físicamente la categoría relacionada.
    { $unwind: "$category" },
    // $match comprueba la categoría anidada: activa y no eliminada. Category no
    // tiene estado published y esta comprobación no cambia estados en cascada.
    { $match: categoryAvailabilityFilter("category.") },
  ];

  if (includeImages) {
    // Esta etapa solo existe en Home; los filtros de Shop reutilizan los mismos
    // candidatos sin cargar imágenes. El lookup conserva categorías sin imagen.
    pipeline.push({
      $lookup: {
        from: Image.collection.name,
        // El _id procede de la Category exterior, no de la imagen interna.
        let: { categoryId: "$category._id" },
        pipeline: [
          {
            $match: {
              entityType: "category",
              // $entityId es de Image y $$categoryId procede del `let` anterior.
              $expr: { $eq: ["$entityId", "$$categoryId"] },
            },
          },
          // $sort ordena por creación e _id; $limit conserva solo la primera y
          // $project deja URL y texto alternativo, no el documento completo.
          { $sort: { createdAt: 1, _id: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, url: 1, alt: 1 } },
        ],
        as: "firstImage",
      },
    });
    // $project transforma el documento en tarjeta pública. $arrayElemAt toma
    // la primera imagen del array y $ifNull devuelve null si no existe.
    pipeline.push({
      $project: {
        _id: 0,
        name: "$category.name",
        slug: "$category.slug",
        image: {
          $ifNull: [{ $arrayElemAt: ["$firstImage", 0] }, null],
        },
      },
    });
  } else {
    // Shop solo necesita opciones de categoría, no descargar la galería.
    pipeline.push({
      $project: {
        _id: 0,
        name: "$category.name",
        slug: "$category.slug",
      },
    });
  }

  // El orden alfabético ofrece una respuesta estable para Home y Shop filters.
  pipeline.push({ $sort: { name: 1, slug: 1 } });
  return pipeline;
}

export const homeRepository = {
  /**
   * Ejecuta el pipeline sobre Service y devuelve las tarjetas de Home.
   * Reutiliza el constructor compartido con las opciones de Shop; sin imagen
   * relacionada se conserva la categoría con `image: null`.
   *
   * @returns {Promise<Array<{name: string, slug: string, image: Object|null}>>}
   *   Categorías ordenadas alfabéticamente; `image` es null si no hay imagen.
   */
  findAvailableCategories: () =>
    Service.aggregate(buildHomeCategoriesPipeline()).exec(),
  /**
   * Ejecuta los mismos criterios comerciales para los filtros de Shop sin
   * recuperar imágenes, que ese consumidor no necesita.
   *
   * @returns {Promise<Array<{name: string, slug: string}>>} Categorías ordenadas.
   */
  findAvailableCategoryOptions: () =>
    Service.aggregate(buildHomeCategoriesPipeline({ includeImages: false })).exec(),
};