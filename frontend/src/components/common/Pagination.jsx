import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { getPageOffset, getPaginationState, getVisiblePages } from "@/utils/pagination";

/**
 * Paginación común independiente de la entidad representada.
 *
 * @param {Object} props - Datos de paginación.
 * @param {number} props.total - Registros totales coincidentes.
 * @param {number} props.limit - Registros por página.
 * @param {number} props.offset - Registros omitidos antes de la página actual.
 * @param {number} props.visibleCount - Registros visibles en la página actual.
 * @param {(offset:number) => void} props.onOffsetChange - Navega al offset indicado.
 * @param {string} [props.ariaLabel="Paginación"] - Etiqueta accesible del nav.
 * @returns {import("react").JSX.Element|null} Controles o null si no son necesarios.
 */
export default function Pagination({
  total,
  limit,
  offset,
  visibleCount,
  onOffsetChange,
  ariaLabel = "Paginación",
}) {
  const { totalPages, currentPage } = getPaginationState(total, limit, offset);
  const canGoBack = offset > 0;
  const canGoForward = offset + limit < total;

  if (totalPages <= 1) {
    if (!canGoBack) return null;
    return (
      <div className="pagination-recovery">
        <span>Fuera de los {total} resultados</span>
        <button type="button" onClick={() => onOffsetChange(Math.max(0, offset - limit))}>Volver a la página anterior</button>
      </div>
    );
  }

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <div className="pagination-controls">
        <button type="button" onClick={() => onOffsetChange(Math.max(0, offset - limit))} disabled={!canGoBack} aria-label="Página anterior" title="Página anterior">
          <ChevronLeftIcon aria-hidden="true" />
        </button>
        {getVisiblePages(totalPages, currentPage).map((pageNumber, index) => (
          pageNumber === "ellipsis" ? (
            <span className="pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>…</span>
          ) : (
            <button
              type="button"
              key={pageNumber}
              aria-label={`Página ${pageNumber}`}
              aria-current={pageNumber === currentPage ? "page" : undefined}
              onClick={() => {
                if (pageNumber !== currentPage) onOffsetChange(getPageOffset(pageNumber, limit));
              }}
            >{pageNumber}</button>
          )
        ))}
        <button type="button" onClick={() => onOffsetChange(offset + limit)} disabled={!canGoForward} aria-label="Página siguiente" title="Página siguiente">
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </div>
      <span>{visibleCount ? `${offset + 1}–${offset + visibleCount} de ${total}` : `Fuera de los ${total} resultados`}</span>
    </nav>
  );
}
