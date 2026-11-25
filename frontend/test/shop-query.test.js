import assert from "node:assert/strict";
import test from "node:test";

import { buildShopRequestParams, parseShopQuery, updateShopQuery } from "../src/features/shop/shopQuery.js";

test("Shop interpreta filtros y valores predeterminados de la URL", () => {
  assert.deepEqual(parseShopQuery(new URLSearchParams()), {
    categories: [], search: "", minPrice: undefined, maxPrice: undefined,
    sort: "name-asc", limit: 12, offset: 0,
  });
  assert.deepEqual(parseShopQuery(new URLSearchParams("categories=limpieza,limpieza,carpinteria&search=%C3%A1rbol&minPrice=0&maxPrice=50&sort=price-desc&limit=5&offset=10")), {
    categories: ["limpieza", "carpinteria"], search: "árbol", minPrice: 0, maxPrice: 50,
    sort: "price-desc", limit: 5, offset: 10,
  });
});

test("Shop rechaza parámetros inválidos sin corregir la URL", () => {
  for (const query of [
    "search=a&search=b", "other=x", "categories=limpieza,", "minPrice=-1",
    "minPrice=20&maxPrice=10", "maxPrice=Infinity", "sort=other", "limit=51",
    "offset=1.5", "offset=9007199254740992", `search=${"a".repeat(101)}`,
  ]) {
    assert.throws(() => parseShopQuery(new URLSearchParams(query)), query);
  }
});

test("las opciones adaptativas solo reciben categoría y búsqueda", () => {
  const filters = parseShopQuery(new URLSearchParams("categories=limpieza&search=hogar&minPrice=0&maxPrice=50&offset=12"));
  assert.equal(buildShopRequestParams(filters, true).toString(), "categories=limpieza&search=hogar");
  assert.equal(buildShopRequestParams(filters).get("minPrice"), "0");
  assert.equal(buildShopRequestParams(filters).get("offset"), "12");
});

test("cambiar filtros reinicia la página y paginar conserva los filtros", () => {
  const current = new URLSearchParams("categories=limpieza&search=hogar&minPrice=0&offset=12");
  const changed = updateShopQuery(current, { categories: ["limpieza", "pintura"] });
  assert.equal(changed.get("offset"), null);
  assert.equal(changed.get("categories"), "limpieza,pintura");
  assert.equal(changed.get("minPrice"), "0");
  const paged = updateShopQuery(changed, { offset: 24 });
  assert.equal(paged.get("offset"), "24");
  assert.equal(paged.get("search"), "hogar");
  assert.equal(current.get("offset"), "12");
});