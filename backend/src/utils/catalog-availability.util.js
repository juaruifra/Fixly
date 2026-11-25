/**
 * Crea el filtro de disponibilidad propia de Category.
 *
 * Category no tiene estado de publicación. La fábrica devuelve un objeto nuevo
 * en cada llamada para que un pipeline no pueda mutar filtros compartidos.
 *
 * @param {string} [prefix=""] - Prefijo de ruta Mongo, por ejemplo `category.`.
 * @returns {{[key:string]:boolean|null}} Condiciones active/deletedAt.
 */
export function categoryAvailabilityFilter(prefix = "") {
  return {
    [`${prefix}active`]: true,
    [`${prefix}deletedAt`]: null,
  };
}

/**
 * Crea el filtro comercial obligatorio de Service.
 *
 * @param {string} [prefix=""] - Prefijo de ruta Mongo si el Service está anidado.
 * @returns {{[key:string]:boolean|string|null}} Condiciones active/status/deletedAt.
 */
export function serviceAvailabilityFilter(prefix = "") {
  return {
    [`${prefix}active`]: true,
    [`${prefix}status`]: "published",
    [`${prefix}deletedAt`]: null,
  };
}

/**
 * Crea el filtro comercial obligatorio de Variant.
 *
 * @param {string} [prefix=""] - Prefijo de ruta Mongo si la Variant está anidada.
 * @returns {{[key:string]:boolean|string|null}} Condiciones active/status/deletedAt.
 */
export function variantAvailabilityFilter(prefix = "") {
  return {
    [`${prefix}active`]: true,
    [`${prefix}status`]: "published",
    [`${prefix}deletedAt`]: null,
  };
}