import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("Shop muestra filtros y resultados públicos", async (context) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const previousSessionStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: () => null };

  try {
    const { default: ShopFilters } = await server.ssrLoadModule("/src/features/shop/ShopFilters.jsx");
    const { default: ShopResults } = await server.ssrLoadModule("/src/features/shop/ShopResults.jsx");
    const { default: Pagination } = await server.ssrLoadModule("/src/components/common/Pagination.jsx");
    const { default: PageSizeSelector } = await server.ssrLoadModule("/src/components/common/PageSizeSelector.jsx");
    const { getShopFilters, getShopServices } = await server.ssrLoadModule("/src/services/shopService.js");
    const { apiService } = await server.ssrLoadModule("/src/services/apiService.js");
    const filters = { categories: ["limpieza"], search: "hogar", minPrice: 0, maxPrice: 50, sort: "price-asc", limit: 12, offset: 0 };
    const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/shop?categories=limpieza&offset=12"] }, createElement(component, props)));

    await context.test("muestra categorías, rango adaptativo y valores aplicados", () => {
      const markup = render(ShopFilters, {
        filters,
        options: { status: "ready", data: { categories: [{ slug: "limpieza", name: "Limpieza" }], priceRange: { min: 10, max: 100 } } },
        update() {}, clear() {}, retryOptions() {},
      });
      assert.match(markup, /Limpieza/);
      assert.match(markup, /checked=""/);
      assert.match(markup, /Disponible: 10 € – 100 €/);
      assert.match(markup, /value="0"/);
      assert.match(markup, /value="50"/);
      assert.match(markup, /Aplicar precio/);
      assert.match(markup, /Filtros\s*<span[^>]*aria-label="3 filtros aplicados"/);
    });

    await context.test("maneja carga, error, resultados vacíos y páginas fuera de rango", () => {
      const props = { filters, update() {}, retryList() {} };
      assert.match(render(ShopResults, { ...props, list: { status: "loading" } }), /Cargando servicios/);
      assert.match(render(ShopResults, { ...props, list: { status: "error", error: "Sin conexión" } }), /Sin conexión/);
      assert.match(render(ShopResults, { ...props, list: { status: "ready", data: { items: [], total: 0 } } }), /No hay servicios para estos filtros/);
      const outOfRange = render(ShopResults, { ...props, filters: { ...filters, offset: 24 }, list: { status: "ready", data: { items: [], total: 2 } } });
      assert.match(outOfRange, /No hay servicios en esta página/);
      assert.match(outOfRange, /Volver a la página anterior/);
    });

    await context.test("página actual, números y navegación respetan offset", () => {
      const updates = [];
      const page = { total: 58, items: Array.from({ length: 12 }, () => ({})) };
      const pagination = Pagination({ total: page.total, limit: filters.limit, offset: 24, visibleCount: page.items.length, onOffsetChange: (value) => updates.push({ offset: value }) });
      const controls = pagination.props.children[0].props.children;
      const buttons = controls.flat(Infinity).filter((child) => child?.type === "button");
      const current = buttons.find((button) => button.props["aria-current"] === "page");
      assert.equal(current.props["aria-label"], "Página 3");
      assert.match(render(Pagination, { total: page.total, limit: filters.limit, offset: 24, visibleCount: page.items.length, onOffsetChange() {} }), /aria-current="page"/);
      current.props.onClick();
      assert.deepEqual(updates, []);
      buttons.find((button) => button.props["aria-label"] === "Página 5").props.onClick();
      buttons.find((button) => button.props["aria-label"] === "Página anterior").props.onClick();
      buttons.find((button) => button.props["aria-label"] === "Página siguiente").props.onClick();
      assert.deepEqual(updates, [{ offset: 48 }, { offset: 12 }, { offset: 36 }]);

      const first = Pagination({ total: page.total, limit: filters.limit, offset: 0, visibleCount: page.items.length, onOffsetChange() {} });
      assert.equal(first.props.children[0].props.children[0].props.disabled, true);
      const last = Pagination({ total: page.total, limit: filters.limit, offset: 48, visibleCount: page.items.length, onOffsetChange() {} });
      assert.equal(last.props.children[0].props.children[2].props.disabled, true);
      assert.equal(Pagination({ total: 12, limit: filters.limit, offset: 0, visibleCount: 1, onOffsetChange() {} }), null);
      assert.equal(Pagination({ total: 0, limit: filters.limit, offset: 0, visibleCount: 0, onOffsetChange() {} }), null);
      const sizeMarkup = render(PageSizeSelector, { value: 6, onChange() {} });
      assert.match(sizeMarkup, /Por página/);
      assert.match(sizeMarkup, /<option value="6" selected="">6<\/option>/);
    });

    await context.test("renderiza datos del servicio y alternativas de imagen", () => {
      const markup = render(ShopResults, {
        filters, update() {}, retryList() {},
        list: { status: "ready", data: { total: 13, items: [{ slug: "limpieza_hogar", name: "Limpieza de hogar", description: "Limpieza completa", category: { name: "Limpieza" }, image: null, priceFrom: 25 }] } },
      });
      assert.match(markup, /Limpieza de hogar/);
      assert.match(markup, /href="\/shop\/limpieza_hogar\?categories=limpieza&amp;offset=12"/);
      assert.match(markup, /Limpieza completa/);
      assert.match(markup, /25,00/);
      assert.match(markup, /Sin imagen disponible/);
      assert.match(markup, /Página siguiente/);
      const freeMarkup = render(ShopResults, {
        filters, update() {}, retryList() {},
        list: { status: "ready", data: { total: 1, items: [{ slug: "gratuito", name: "Servicio gratuito", description: null, category: { name: "Limpieza" }, image: null, priceFrom: 0 }] } },
      });
      assert.match(freeMarkup, /0,00/);
    });

    await context.test("ambas consultas respetan sus parámetros y cancelación", async () => {
      const previousAdapter = apiService.defaults.adapter;
      const controller = new AbortController();
      const requests = [];
      apiService.defaults.adapter = async (config) => {
        requests.push({ url: config.url, params: config.params.toString(), signal: config.signal });
        return { data: config.url.endsWith("filters") ? { categories: [], priceRange: { min: null, max: null } } : { items: [], total: 0, limit: 12, offset: 0 }, status: 200, config, headers: {} };
      };
      try {
        await getShopFilters(new URLSearchParams("categories=limpieza&search=hogar"), controller.signal);
        await getShopServices(new URLSearchParams("categories=limpieza&minPrice=0&limit=12&offset=0"), controller.signal);
        assert.deepEqual(requests.map(({ url, params }) => [url, params]), [
          ["/shop/filters", "categories=limpieza&search=hogar"],
          ["/shop/services", "categories=limpieza&minPrice=0&limit=12&offset=0"],
        ]);
        assert.ok(requests.every((request) => request.signal === controller.signal));
      } finally {
        apiService.defaults.adapter = previousAdapter;
      }
    });
  } finally {
    globalThis.sessionStorage = previousSessionStorage;
    await server.close();
  }
});