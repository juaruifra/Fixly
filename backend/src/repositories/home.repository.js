import { Category } from "../models/category.model.js";
import { Image } from "../models/image.model.js";
import { Service } from "../models/service.model.js";
import { Variant } from "../models/variant.model.js";

/**
 * Construye la consulta que determina qué categorías pueden aparecer en Home.
 *
 * El pipeline recorre una vez los servicios publicados, verifica sus variantes
 * mediante el índice existente por `service` y agrupa por categoría antes de
 * recuperar la categoría y su imagen. Así evita consultar todos los servicios
 * una vez por cada categoría y no produce tarjetas duplicadas. Los nombres de
 * colección proceden de los modelos Mongoose.
 *
 * @returns {Array<Object>} Etapas de agregación para `Service.aggregate()`.
 */
function buildHomeCategoriesPipeline() {
  return [
    // Partimos de servicios vendibles para recorrerlos una sola vez.
    {
      $match: {
        active: true,
        status: "published",
        deletedAt: null,
      },
    },
    {
      $lookup: {
        from: Variant.collection.name,
        let: { serviceId: "$_id" },
        pipeline: [
          // La igualdad por service aprovecha el índice compuesto de Variant.
          {
            $match: {
              active: true,
              status: "published",
              deletedAt: null,
              $expr: { $eq: ["$service", "$$serviceId"] },
            },
          },
          // Solo comprobamos existencia de una variante; no hace falta cargarla.
          { $limit: 1 },
        ],
        as: "availableVariants",
      },
    },
    // Un servicio sin variantes elegibles no aporta una categoría a Home.
    { $match: { "availableVariants.0": { $exists: true } } },
    // Varias ofertas de una categoría se convierten en una única tarjeta.
    { $group: { _id: "$category" } },
    {
      $lookup: {
        from: Category.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    // Si la categoría fue borrada físicamente, se descarta al no tener relación.
    { $unwind: "$category" },
    // Su propio estado se evalúa después de comprobar que existen ofertas.
    { $match: { "category.active": true, "category.deletedAt": null } },
    {
      $lookup: {
        from: Image.collection.name,
        let: { categoryId: "$category._id" },
        pipeline: [
          {
            $match: {
              entityType: "category",
              $expr: { $eq: ["$entityId", "$$categoryId"] },
            },
          },
          // El orden coincide con la galería administrativa; _id desempata fechas iguales.
          { $sort: { createdAt: 1, _id: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, url: 1, alt: 1 } },
        ],
        as: "firstImage",
      },
    },
    // No exponemos ObjectId, estado, fechas ni datos de servicios o variantes.
    {
      $project: {
        _id: 0,
        name: "$category.name",
        slug: "$category.slug",
        image: {
          $ifNull: [{ $arrayElemAt: ["$firstImage", 0] }, null],
        },
      },
    },
    // El orden alfabético ofrece una respuesta estable para la página de inicio.
    { $sort: { name: 1, slug: 1 } },
  ];
}

export const homeRepository = {
  /**
   * Recupera las categorías que cumplen todas las reglas de Home.
   *
  * `$lookup` correlaciona cada servicio con sus variantes. `$group` reúne los
  * servicios elegibles por categoría antes de unir la categoría. El límite del
  * lookup de variantes solo comprueba existencia; `$project` deja únicamente
  * los datos públicos de la tarjeta y evita duplicados por servicio.
   *
   * @returns {Promise<Array<{name: string, slug: string, image: Object|null}>>}
   *   Categorías ordenadas alfabéticamente; `image` es null si no hay imagen.
   */
  findAvailableCategories: () =>
    Service.aggregate(buildHomeCategoriesPipeline()).exec(),
};