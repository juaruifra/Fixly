import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import CatalogImage from "@/components/common/CatalogImage";
import ErrorState from "@/components/common/ErrorState";
import { getPageOffset, getPaginationState, getVisiblePages } from "@/features/shop/shopPagination";
import { SHOP_SORT_OPTIONS } from "@/features/shop/shopQuery";
import { formatCurrency } from "@/utils/formatCurrency";

export function ShopPagination({ page, filters, update }) {
  const { totalPages, currentPage } = getPaginationState(page.total, filters.limit, filters.offset);
  const canGoBack = filters.offset > 0;
  const canGoForward = filters.offset + filters.limit < page.total;

  // Fuera de rango se conserva la vuelta anterior, incluso con cero o una página.
  if (totalPages <= 1) {
    return canGoBack ? (
      <div className="shop-pagination-recovery">
        <span>Fuera de los {page.total} resultados</span>
        <button type="button" onClick={() => update({ offset: Math.max(0, filters.offset - filters.limit) })}>Volver a la página anterior</button>
      </div>
    ) : null;
  }

  return (
    <nav className="shop-pagination" aria-label="Páginas de servicios">
      <div className="shop-pagination-controls">
        <button type="button" onClick={() => update({ offset: Math.max(0, filters.offset - filters.limit) })} disabled={!canGoBack} aria-label="Página anterior" title="Página anterior"><ChevronLeftIcon aria-hidden="true" /></button>
        {getVisiblePages(totalPages, currentPage).map((pageNumber, index) => (
          pageNumber === "ellipsis" ? <span className="shop-pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>…</span> : (
            <button
              type="button"
              key={pageNumber}
              aria-label={`Página ${pageNumber}`}
              aria-current={pageNumber === currentPage ? "page" : undefined}
              onClick={() => {
                if (pageNumber !== currentPage) update({ offset: getPageOffset(pageNumber, filters.limit) });
              }}
            >{pageNumber}</button>
          )
        ))}
        <button type="button" onClick={() => update({ offset: filters.offset + filters.limit })} disabled={!canGoForward} aria-label="Página siguiente" title="Página siguiente"><ChevronRightIcon aria-hidden="true" /></button>
      </div>
      <span>{page.items.length ? `${filters.offset + 1}–${filters.offset + page.items.length} de ${page.total}` : `Fuera de los ${page.total} resultados`}</span>
    </nav>
  );
}

export default function ShopResults({ filters, list, update, retryList }) {
  const location = useLocation();
  const page = list.data;
  const canGoBack = filters.offset > 0;

  return (
    <section className="shop-results" aria-labelledby="shop-results-heading">
      <div className="shop-results-toolbar">
        <div>
          <h2 id="shop-results-heading">Servicios disponibles</h2>
          {list.status === "ready" && <p>{page.total} {page.total === 1 ? "servicio" : "servicios"}</p>}
        </div>
        <label className="shop-sort">Ordenar
          <select value={filters.sort} onChange={(event) => update({ sort: event.target.value })}>
            {SHOP_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {list.status === "loading" && <p className="shop-message" role="status">Cargando servicios...</p>}
      {list.status === "error" && <ErrorState title="No se pudieron cargar los servicios" message={list.error} onRetry={retryList} />}
      {list.status === "ready" && page.items.length === 0 && (
        <p className="shop-message">{canGoBack && page.total > 0 ? "No hay servicios en esta página." : "No hay servicios para estos filtros."}</p>
      )}
      {list.status === "ready" && page.items.length > 0 && (
        <div className="shop-grid">
          {page.items.map((service) => (
            <article className="shop-service" key={service.slug}>
              <div className="shop-service-image"><CatalogImage image={service.image} /></div>
              <div className="shop-service-content">
                <p className="shop-service-category">{service.category.name}</p>
                <h3><Link to={{ pathname: `/shop/${encodeURIComponent(service.slug)}`, search: location.search }} className="shop-service-link">{service.name}</Link></h3>
                {service.description && <p className="shop-service-description">{service.description}</p>}
                <p className="shop-service-price"><span>Desde</span> {formatCurrency(service.priceFrom)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      {list.status === "ready" && <ShopPagination page={page} filters={filters} update={update} />}
    </section>
  );
}