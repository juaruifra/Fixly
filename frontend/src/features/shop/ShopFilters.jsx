import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";

import ErrorState from "@/components/common/ErrorState";
import { parseShopQuery } from "@/features/shop/shopQuery";

function sliderValue(value, minimum, maximum, fallback) {
  if (value === "" || !Number.isFinite(Number(value))) return fallback;
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

export default function ShopFilters({ filters, options, update, clear, retryOptions }) {
  const [search, setSearch] = useState(filters.search);
  const [minPrice, setMinPrice] = useState(filters.minPrice === undefined ? "" : String(filters.minPrice));
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice === undefined ? "" : String(filters.maxPrice));
  const [formError, setFormError] = useState("");

  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    setMinPrice(filters.minPrice === undefined ? "" : String(filters.minPrice));
    setMaxPrice(filters.maxPrice === undefined ? "" : String(filters.maxPrice));
    setFormError("");
  }, [filters.minPrice, filters.maxPrice]);

  function submitSearch(event) {
    event.preventDefault();
    if ([...search.trim()].length > 100) {
      setFormError("La búsqueda no puede superar 100 caracteres.");
      return;
    }
    setFormError("");
    update({ search: search.trim() });
  }

  function submitPrice(event) {
    event.preventDefault();
    const values = new URLSearchParams();
    if (minPrice !== "") values.set("minPrice", minPrice);
    if (maxPrice !== "") values.set("maxPrice", maxPrice);
    try {
      parseShopQuery(values);
      setFormError("");
      update({ minPrice, maxPrice });
    } catch (error) {
      setFormError(error.message);
    }
  }

  function toggleCategory(slug) {
    const categories = filters.categories.includes(slug)
      ? filters.categories.filter((value) => value !== slug)
      : [...filters.categories, slug];
    update({ categories });
  }

  function clearFilters() {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setFormError("");
    clear();
  }

  const categories = options.data?.categories ?? [];
  const missingCategories = filters.categories.filter((slug) => !categories.some((category) => category.slug === slug));
  const range = options.data?.priceRange;
  const hasRange = Number.isFinite(range?.min) && Number.isFinite(range?.max);
  const sliderDisabled = !hasRange || range.min === range.max;

  return (
    <aside className="shop-filters" aria-label="Filtros de servicios">
      <div className="shop-filter-heading"><h2>Filtros</h2><button type="button" className="shop-text-button" onClick={clearFilters}>Limpiar</button></div>
      <form className="shop-search" onSubmit={submitSearch}>
        <label htmlFor="shop-search">Buscar</label>
        <div className="shop-search-control">
          <input id="shop-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="¿Qué necesitas?" />
          <button type="submit" aria-label="Buscar servicios" title="Buscar servicios"><SearchIcon aria-hidden="true" /></button>
        </div>
      </form>
      {formError && <p className="shop-form-error" role="alert">{formError}</p>}
      {options.status === "loading" && <p role="status">Cargando filtros...</p>}
      {options.status === "error" && <ErrorState title="No se pudieron cargar los filtros" message={options.error} onRetry={retryOptions} />}
      {options.status === "ready" && (
        <>
          <fieldset className="shop-filter-group">
            <legend>Categorías</legend>
            {[...categories, ...missingCategories.map((slug) => ({ slug, name: slug }))].map((category) => (
              <label className="shop-checkbox" key={category.slug}>
                <input type="checkbox" checked={filters.categories.includes(category.slug)} onChange={() => toggleCategory(category.slug)} />
                <span>{category.name}</span>
              </label>
            ))}
            {categories.length === 0 && missingCategories.length === 0 && <p>No hay categorías disponibles.</p>}
          </fieldset>
          <form className="shop-filter-group" onSubmit={submitPrice} noValidate>
            <h3>Precio</h3>
            <p className="shop-range-caption">{hasRange ? `Disponible: ${range.min} € – ${range.max} €` : "Sin precios disponibles"}</p>
            <div className="shop-price-inputs">
              <label>Mínimo (€)<input type="number" min="0" step="any" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label>
              <label>Máximo (€)<input type="number" min="0" step="any" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
            </div>
            <label className="shop-slider-label">Ajustar mínimo
              <input type="range" min={hasRange ? range.min : 0} max={hasRange ? range.max : 0} step="any" disabled={sliderDisabled} value={hasRange ? sliderValue(minPrice, range.min, range.max, range.min) : 0} onChange={(event) => setMinPrice(event.target.value)} />
            </label>
            <label className="shop-slider-label">Ajustar máximo
              <input type="range" min={hasRange ? range.min : 0} max={hasRange ? range.max : 0} step="any" disabled={sliderDisabled} value={hasRange ? sliderValue(maxPrice, range.min, range.max, range.max) : 0} onChange={(event) => setMaxPrice(event.target.value)} />
            </label>
            <button type="submit" className="shop-apply">Aplicar precio</button>
          </form>
        </>
      )}
    </aside>
  );
}