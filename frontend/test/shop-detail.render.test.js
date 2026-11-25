import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("Shop Detail consulta sus dos endpoints públicos con cancelación", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const previousSessionStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: () => null };

  try {
    const { getShopDetail, getShopVariants } = await server.ssrLoadModule("/src/services/shopDetailService.js");
    const { apiService } = await server.ssrLoadModule("/src/services/apiService.js");
    const previousAdapter = apiService.defaults.adapter;
    const controller = new AbortController();
    const requests = [];
    apiService.defaults.adapter = async (config) => {
      requests.push({ url: config.url, signal: config.signal });
      return { data: config.url.endsWith("/variants") ? [] : { name: "Limpieza" }, status: 200, config, headers: {} };
    };
    try {
      assert.deepEqual(await getShopDetail("limpieza_hogar", controller.signal), { name: "Limpieza" });
      assert.deepEqual(await getShopVariants("limpieza_hogar", controller.signal), []);
      assert.deepEqual(requests.map((request) => request.url), [
        "/shopDetail/services/limpieza_hogar",
        "/shopDetail/services/limpieza_hogar/variants",
      ]);
      assert.ok(requests.every((request) => request.signal === controller.signal));
    } finally {
      apiService.defaults.adapter = previousAdapter;
    }
  } finally {
    globalThis.sessionStorage = previousSessionStorage;
    await server.close();
  }
});

test("Shop Detail presenta galería, variantes y estados", async (context) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { default: ShopGallery } = await server.ssrLoadModule("/src/features/shop-detail/ShopGallery.jsx");
    const { ShopDetailView } = await server.ssrLoadModule("/src/pages/public/ShopDetail.jsx");
    const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)));
    const search = "?categories=limpieza&search=hogar&minPrice=0&offset=12";

    await context.test("presenta servicio, variantes y regreso con los filtros", () => {
      const markup = render(ShopDetailView, {
        slug: "limpieza_hogar", search,
        state: {
          status: "ready",
          detail: { name: "Limpieza de hogar", category: { name: "Limpieza" }, description: "Limpieza completa", priceFrom: 20, images: [{ url: "https://example.invalid/servicio.jpg", alt: "Vivienda" }] },
          variants: [
            { name: "Básica", description: null, duration: 60, price: 20, image: null },
            { name: "Profunda", description: "Todos los espacios", duration: 120, price: 75, image: { url: "https://example.invalid/variante.jpg", alt: "Espacio limpio" } },
          ],
        },
      });
      assert.match(markup, /href="\/shop\?categories=limpieza&amp;search=hogar&amp;minPrice=0&amp;offset=12"/);
      assert.match(markup, /Limpieza de hogar/);
      assert.match(markup, /Vivienda/);
      assert.match(markup, /Básica/);
      assert.match(markup, /Profunda/);
      assert.match(markup, /120 min/);
      assert.match(markup, /75,00/);
      assert.match(markup, /Sin imagen disponible/);
      assert.equal((markup.match(/type="radio"/g) || []).length, 2);
      assert.doesNotMatch(markup, /checked=""/);
      assert.doesNotMatch(markup, /Añadir al carrito/);
    });

    await context.test("presenta la galería vacía y los controles solo cuando hay varias imágenes", () => {
      assert.match(render(ShopGallery, { images: [] }), /Sin imagen disponible/);
      const single = render(ShopGallery, { images: [{ url: "https://example.invalid/a.jpg", alt: "Primera" }] });
      assert.doesNotMatch(single, /Imagen siguiente/);
      const multiple = render(ShopGallery, { images: [{ url: "https://example.invalid/a.jpg", alt: "Primera" }, { url: "https://example.invalid/b.jpg", alt: "Segunda" }] });
      assert.match(multiple, /Imagen anterior/);
      assert.match(multiple, /Imagen siguiente/);
      assert.match(multiple, /1 \/ 2/);
    });

    await context.test("muestra carga, error recuperable y servicio no disponible", () => {
      const props = { slug: "limpieza_hogar", search };
      assert.match(render(ShopDetailView, { ...props, state: { status: "loading" } }), /Cargando servicio/);
      assert.match(render(ShopDetailView, { ...props, state: { status: "not-found" } }), /Servicio no disponible/);
      const error = render(ShopDetailView, { ...props, state: { status: "error", error: "Sin conexión", retry() {} } });
      assert.match(error, /Sin conexión/);
      assert.match(error, /Reintentar/);
    });
  } finally {
    await server.close();
  }
});