import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("Home pública y navegación respetan estados y roles", async (context) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const previousStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  globalThis.localStorage = { getItem: () => null };
  globalThis.sessionStorage = { getItem: () => null };

  try {
    const { HomeContent } = await server.ssrLoadModule("/src/pages/public/Home.jsx");
    const { PublicNavigation } = await server.ssrLoadModule("/src/layouts/PublicLayout.jsx");
    const { loginDestination } = await server.ssrLoadModule("/src/pages/auth/Login.jsx");
    const { ThemeProvider } = await server.ssrLoadModule("/src/providers/ThemeProvider.jsx");
    const { getHomeCategories } = await server.ssrLoadModule("/src/services/homeService.js");
    const { apiService } = await server.ssrLoadModule("/src/services/apiService.js");

    await context.test("renderiza categorías, imágenes y estados", () => {
      const render = (props) => renderToStaticMarkup(createElement(HomeContent, props));
      assert.match(render({ status: "loading", categories: [] }), /Cargando categorías/);
      assert.match(render({ status: "error", categories: [], error: "Sin conexión", retry() {} }), /Sin conexión/);
      assert.match(render({ status: "ready", categories: [] }), /No hay categorías disponibles/);
      const markup = render({
        status: "ready",
        categories: [
          { slug: "limpieza", name: "Limpieza", image: { url: "https://example.invalid/a.jpg", alt: "Imagen de limpieza" } },
          { slug: "fontaneria", name: "Fontanería", image: null },
        ],
      });
      assert.match(markup, /Limpieza/);
      assert.match(markup, /Imagen de limpieza/);
      assert.match(markup, /Sin imagen disponible/);
    });

    await context.test("expone solo las opciones correspondientes al rol", () => {
      const renderNav = (props) => renderToStaticMarkup(createElement(
        MemoryRouter,
        null,
        createElement(ThemeProvider, null, createElement(PublicNavigation, props)),
      ));
      const anonymous = renderNav({ status: "anonymous" });
      assert.match(anonymous, /href="\/login"/);
      assert.doesNotMatch(anonymous, /href="\/services"|href="\/account"/);
      const client = renderNav({ status: "authenticated", user: { role: { name: "CLIENT" } } });
      assert.match(client, /href="\/account"/);
      assert.match(client, /href="\/account\/profiles"/);
      assert.doesNotMatch(client, /href="\/services"/);
      assert.match(client, /Cerrar sesión/);
      const admin = renderNav({ status: "authenticated", user: { role: { name: "ADMIN" } } });
      assert.match(admin, /href="\/services"/);
      assert.match(admin, /href="\/account\/profiles"/);
      assert.match(renderNav({ status: "unavailable" }), /Comprobar sesión/);
    });

    await context.test("el destino del login depende del rol", () => {
      assert.equal(loginDestination({ role: { name: "CLIENT" } }), "/");
      assert.equal(loginDestination({ role: { name: "ADMIN" } }), "/services");
    });

    await context.test("consulta categorías con la señal de cancelación", async () => {
      const previousAdapter = apiService.defaults.adapter;
      const controller = new AbortController();
      apiService.defaults.adapter = async (config) => {
        assert.equal(config.url, "/home/categories");
        assert.equal(config.signal, controller.signal);
        return { data: [{ slug: "limpieza", name: "Limpieza", image: null }], status: 200, config, headers: {} };
      };
      try {
        assert.deepEqual(await getHomeCategories(controller.signal), [
          { slug: "limpieza", name: "Limpieza", image: null },
        ]);
      } finally {
        apiService.defaults.adapter = previousAdapter;
      }
    });
  } finally {
    globalThis.localStorage = previousStorage;
    globalThis.sessionStorage = previousSessionStorage;
    await server.close();
  }
});