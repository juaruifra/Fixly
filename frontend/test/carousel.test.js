import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("Carousel mide el paso real y muestra flechas solo donde hay desplazamiento", async (context) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { getCarouselEdges, getCarouselStep, getScrollBehavior } = await server.ssrLoadModule("/src/components/common/Carousel.jsx");
    const { default: Carousel } = await server.ssrLoadModule("/src/components/common/Carousel.jsx");
    await context.test("el paso usa la distancia real entre dos cards consecutivas", () => {
      assert.equal(getCarouselStep({ left: 20 }, { left: 338 }), 318);
      assert.equal(getCarouselStep({ left: 20 }, { left: 10 }), 0);
    });

    await context.test("las flechas reflejan inicio, mitad, final y contenido que cabe", () => {
      assert.deepEqual(getCarouselEdges(2.4, 1300, 1000), { canScrollBack: false, canScrollForward: true });
      assert.deepEqual(getCarouselEdges(150, 1300, 1000), { canScrollBack: true, canScrollForward: true });
      assert.deepEqual(getCarouselEdges(300, 1300, 1000), { canScrollBack: true, canScrollForward: false });
      assert.deepEqual(getCarouselEdges(0, 999.5, 1000), { canScrollBack: false, canScrollForward: false });
      assert.deepEqual(getCarouselEdges(0, 1300, 1300), { canScrollBack: false, canScrollForward: false });
    });

    await context.test("respeta la preferencia de movimiento reducido", () => {
      assert.equal(getScrollBehavior(true), "auto");
      assert.equal(getScrollBehavior(false), "smooth");
    });

    await context.test("renderiza children genéricos con controles inicialmente ocultos", () => {
      const markup = renderToStaticMarkup(createElement(Carousel, { label: "Servicios" },
        createElement("a", { href: "/uno", key: "uno" }, "Uno"),
        createElement("button", { type: "button", key: "dos" }, "Dos"),
      ));
      assert.match(markup, /aria-label="Servicios"/);
      assert.match(markup, /href="\/uno"/);
      assert.match(markup, /Uno/);
      assert.match(markup, /Dos/);
      assert.equal((markup.match(/hidden=""/g) || []).length, 2);
      assert.match(markup, /tabindex="-1"/);
    });
  } finally {
    await server.close();
  }
});
