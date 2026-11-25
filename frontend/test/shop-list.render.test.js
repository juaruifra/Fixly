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
    });

    await context.test("maneja carga, error, resultados vacíos y páginas fuera de rango", () => {
      const props = { filters, update() {}, retryList() {} };
      assert.match(render(ShopResults, { ...props, list: { status: "loading" } }), /Cargando servicios/);
      assert.match(render(ShopResults, { ...props, list: { status: "error", error: "Sin conexión" } }), /Sin conexión/);
      assert.match(render(ShopResults, { ...props, list: { status: "ready", data: { items: [], total: 0 } } }), /No hay servicios para estos filtros/);
      const outOfRange = render(ShopResults, { ...props, filters: { ...filters, offset: 24 }, list: { status: "ready", data: { items: [], total: 2 } } });
      assert.match(outOfRange, /Fuera de los 2 resultados/);
      assert.match(outOfRange, /Página anterior/);
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