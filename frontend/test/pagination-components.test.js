import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { getPageOffset, getPaginationState, getVisiblePages } from "../src/utils/pagination.js";
test("las utilidades comunes conservan los cálculos de paginación", () => {
  assert.deepEqual(getPaginationState(58, 12, 24), { totalPages: 5, currentPage: 3 });
  assert.equal(getPageOffset(3, 12), 24);
  assert.deepEqual(getVisiblePages(5, 3), [1, 2, 3, 4, 5]);
  assert.deepEqual(getVisiblePages(1000, 500), [1, "ellipsis", 499, 500, 501, "ellipsis", 1000]);
});

test("PageSizeSelector expone límites y conserva uno personalizado", async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { PAGE_SIZE_OPTIONS, default: PageSizeSelector } = await server.ssrLoadModule("/src/components/common/PageSizeSelector.jsx");
    assert.deepEqual(PAGE_SIZE_OPTIONS, [2, 4, 8, 12, 24, 36, 48]);
    const markup = renderToStaticMarkup(createElement(PageSizeSelector, { value: 6, onChange() {} }));
    assert.match(markup, /<option value="6" selected="">6<\/option>/);
    assert.match(markup, /Por página/);

    const { default: Pagination } = await server.ssrLoadModule("/src/components/common/Pagination.jsx");
    const paginationMarkup = renderToStaticMarkup(createElement(Pagination, {
      total: 58,
      limit: 12,
      offset: 24,
      visibleCount: 12,
      onOffsetChange() {},
      ariaLabel: "Páginas de resultados",
    }));
    assert.match(paginationMarkup, /aria-current="page"/);
    assert.match(paginationMarkup, /25–36 de 58/);
    assert.match(paginationMarkup, /aria-current="page"/);
    assert.match(paginationMarkup, /aria-label="Página anterior"/);
    assert.match(paginationMarkup, /aria-label="Página siguiente"/);
  } finally {
    await server.close();
  }
});
