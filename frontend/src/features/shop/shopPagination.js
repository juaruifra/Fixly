/**
 * Calcula la página visible a partir de los datos actuales del listado.
 * Un offset fuera del total conserva su página calculada para permitir volver
 * sin modificar la URL automáticamente.
 *
 * @param {number} total - Número de servicios que cumplen los filtros.
 * @param {number} limit - Máximo de servicios por página.
 * @param {number} offset - Número de servicios omitidos por la URL.
 * @returns {{totalPages: number, currentPage: number}} Páginas totales y actual.
 */
export function getPaginationState(total, limit, offset) {
  return {
    totalPages: Math.ceil(total / limit),
    currentPage: Math.floor(offset / limit) + 1,
  };
}

/**
 * Devuelve un conjunto acotado de páginas y separadores para el control.
 * Siempre conserva los extremos y páginas cercanas a la actual; si el offset
 * está fuera de rango, la ventana se sitúa junto a la última página válida.
 *
 * @param {number} totalPages - Cantidad de páginas válidas.
 * @param {number} currentPage - Página calculada a partir del offset.
 * @returns {Array<number|string>} Números y separadores `ellipsis`.
 */
export function getVisiblePages(totalPages, currentPage) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const anchor = Math.min(Math.max(currentPage, 1), totalPages);
  const pages = [...new Set([1, anchor - 1, anchor, anchor + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);

  return pages.flatMap((page, index) => {
    if (index === 0) return [page];
    const gap = page - pages[index - 1];
    if (gap === 2) return [page - 1, page];
    return gap > 2 ? ["ellipsis", page] : [page];
  });
}

/**
 * Convierte una página seleccionada en el offset esperado por la API.
 *
 * @param {number} pageNumber - Página elegida, empezando en 1.
 * @param {number} limit - Máximo de servicios por página.
 * @returns {number} Servicios que deben omitirse antes de esa página.
 */
export function getPageOffset(pageNumber, limit) {
  return (pageNumber - 1) * limit;
}