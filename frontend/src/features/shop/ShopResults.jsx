import { Link, useLocation } from "react-router-dom";

import CatalogImage from "@/components/common/CatalogImage";
import ErrorState from "@/components/common/ErrorState";
import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import { SHOP_SORT_OPTIONS } from "@/features/shop/shopQuery";
import { formatCurrency } from "@/utils/formatCurrency";

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
        <div className="shop-results-options">
          <label className="shop-sort">Ordenar
            <select value={filters.sort} onChange={(event) => update({ sort: event.target.value })}>
              {SHOP_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <PageSizeSelector
            value={filters.limit}
            onChange={(limit) => update({ limit, offset: 0 })}
          />
        </div>
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
      {list.status === "ready" && (
        <Pagination
          total={page.total}
          limit={filters.limit}
          offset={filters.offset}
          visibleCount={page.items.length}
          onOffsetChange={(offset) => update({ offset })}
          ariaLabel="Páginas de servicios"
        />
      )}
    </section>
  );
}