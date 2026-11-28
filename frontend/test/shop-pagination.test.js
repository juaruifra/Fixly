import assert from "node:assert/strict";
import test from "node:test";

import { getPageOffset, getPaginationState, getVisiblePages } from "../src/utils/pagination.js";

test("calcula páginas y offset sin alterar valores fuera de rango", () => {
  assert.deepEqual(getPaginationState(58, 12, 24), { totalPages: 5, currentPage: 3 });
  assert.equal(getPageOffset(3, 12), 24);
  assert.deepEqual(getPaginationState(2, 12, 24), { totalPages: 1, currentPage: 3 });
  assert.deepEqual(getPaginationState(0, 12, 0), { totalPages: 0, currentPage: 1 });
});

test("limita las páginas visibles con separadores y mantiene los extremos", () => {
  assert.deepEqual(getVisiblePages(5, 3), [1, 2, 3, 4, 5]);
  assert.deepEqual(getVisiblePages(1000, 500), [1, "ellipsis", 499, 500, 501, "ellipsis", 1000]);
  assert.deepEqual(getVisiblePages(1000, 1002), [1, "ellipsis", 999, 1000]);
  assert.deepEqual(getVisiblePages(0, 1), []);
});