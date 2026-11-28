/**
 * Calcula el estado de una paginación a partir de total, límite y offset.
 *
 * @param {number} total - Cantidad total de registros coincidentes.
 * @param {number} limit - Registros solicitados por página.
 * @param {number} offset - Registros omitidos antes de la página actual.
 * @returns {{totalPages:number,currentPage:number}} Páginas válidas y página actual.
 */
export function getPaginationState(total, limit, offset) {
  return {
    totalPages: Math.ceil(total / limit),
    currentPage: Math.floor(offset / limit) + 1,
  };
}

/**
 * Genera números de página acotados alrededor de la página actual.
 *
 * @param {number} totalPages - Número total de páginas válidas.
 * @param {number} currentPage - Página calculada desde el offset.
 * @returns {Array<number|"ellipsis">} Números y separadores.
 */
export function getVisiblePages(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

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
 * Convierte un número de página en el offset consumido por la API.
 *
 * @param {number} pageNumber - Página empezando en 1.
 * @param {number} limit - Registros solicitados por página.
 * @returns {number} Offset a aplicar.
 */
export function getPageOffset(pageNumber, limit) {
  return (pageNumber - 1) * limit;
}
