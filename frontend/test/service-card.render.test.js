import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("ServiceCard se renderiza con las tarjetas administrativas actuales", async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { default: ServiceCard } = await server.ssrLoadModule(
      "/src/features/services/components/ServiceCard.jsx",
    );
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ServiceCard, {
          service: {
            _id: "507f1f77bcf86cd799439011",
            name: "Reparación de grifo",
            category: { name: "Fontanería" },
            description: "Reparación de fugas domésticas.",
          },
          onDelete() {},
        }),
      ),
    );

    assert.match(markup, /Reparación de grifo/);
    assert.match(markup, /Fontanería/);
    assert.match(markup, /Reparación de fugas domésticas/);
  } finally {
    await server.close();
  }
});