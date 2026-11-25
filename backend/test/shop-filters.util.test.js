import assert from "node:assert/strict";
import test from "node:test";

import { swaggerSpec } from "../src/config/swagger.js";
import {
  parseShopInteger,
  parseShopPrice,
  parseShopFilterOptions,
  parseShopListFilters,
} from "../src/utils/shop-filters.util.js";

test("Swagger publica los contratos Shop sin requisito de token", () => {
  for (const [path, schema] of [
    ["/api/shop/services", "ShopServicesPage"],
    ["/api/shop/filters", "ShopFilterOptions"],
    ["/api/shopDetail/services/{slug}", "ShopServiceDetail"],
  ]) {
    const operation = swaggerSpec.paths[path]?.get;
    assert.ok(operation, `${path} must be documented`);
    assert.equal(operation.security, undefined);
    assert.equal(
      operation.responses["200"].content["application/json"].schema.$ref,
      `#/components/schemas/${schema}`,
    );
  }

  const variantsOperation =
    swaggerSpec.paths["/api/shopDetail/services/{slug}/variants"]?.get;
  assert.ok(variantsOperation);
  assert.deepEqual(swaggerSpec.paths["/api/shopDetail/services/{slug}"].get.tags, ["Shop Detail"]);
  assert.deepEqual(variantsOperation.tags, ["Shop Detail"]);
  assert.equal(variantsOperation.security, undefined);
  assert.equal(
    variantsOperation.responses["200"].content["application/json"].schema.items.$ref,
    "#/components/schemas/ShopVariantOption",
  );
  assert.ok(variantsOperation.responses["400"]);
  assert.ok(variantsOperation.responses["404"]);
  assert.ok(swaggerSpec.components.schemas.ShopGalleryImage);
  assert.ok(swaggerSpec.components.schemas.ShopServiceDetail);
  assert.ok(swaggerSpec.components.schemas.ShopVariantOption);
  assert.equal(swaggerSpec.paths["/api/shop/services/{slug}"], undefined);
  assert.equal(swaggerSpec.paths["/api/shop/services/{slug}/variants"], undefined);
});

test("aplica defaults, deduplica categorías y normaliza filtros", () => {
  assert.deepEqual(
    parseShopListFilters({
      categories: "limpieza, carpinteria,limpieza",
      search: "  ÁRBOL  de poda ",
      minPrice: "0",
      maxPrice: "19.95",
      sort: "price-desc",
      limit: "50",
      offset: "10",
    }),
    {
      categories: ["limpieza", "carpinteria"],
      search: "arbol de poda",
      minPrice: 0,
      maxPrice: 19.95,
      sort: "price-desc",
      limit: 50,
      offset: 10,
    },
  );

  assert.deepEqual(parseShopListFilters({}), {
    categories: [],
    search: "",
    minPrice: undefined,
    maxPrice: undefined,
    sort: "name-asc",
    limit: 12,
    offset: 0,
  });
});

test("filter options aceptan solo categoría y búsqueda", () => {
  assert.deepEqual(
    parseShopFilterOptions({ categories: "inventada,limpieza", search: "Árbol" }),
    { categories: ["inventada", "limpieza"], search: "arbol" },
  );
});

test("rechaza parámetros no permitidos, repetidos o con estructura", () => {
  for (const query of [
    { categories: ["limpieza", "pintura"] },
    { search: { $ne: "" } },
    { unknown: "value" },
    { categories: "limpieza,,pintura" },
    { categories: "Limpieza" },
  ]) {
    assert.throws(() => parseShopListFilters(query), (error) => error.status === 400);
  }
  assert.throws(
    () => parseShopFilterOptions({ minPrice: "1" }),
    (error) => error.status === 400,
  );
});

test("rechaza rangos y paginación inválidos sin descartar el precio cero", () => {
  for (const query of [
    { minPrice: "20", maxPrice: "19.99" },
    { minPrice: "Infinity" },
    { minPrice: "-0.01" },
    { limit: "51" },
    { limit: "1.5" },
    { offset: "-1" },
    { sort: "sku" },
    { search: "a".repeat(101) },
  ]) {
    assert.throws(() => parseShopListFilters(query), (error) => error.status === 400);
  }
  assert.equal(parseShopListFilters({ minPrice: "0" }).minPrice, 0);
});

test("mantiene el formato numérico de validator y rechaza conversiones parciales", () => {
  assert.equal(parseShopPrice("+2"), 2);
  assert.equal(parseShopPrice("1e2"), 100);
  assert.equal(parseShopPrice(".5"), 0.5);
  assert.equal(parseShopPrice("1."), 1);
  assert.equal(parseShopInteger("+02", "limit", 1, 50), 2);

  for (const value of ["0x10", "12abc", "", " 1 ", "Infinity", "1e999"]) {
    assert.throws(() => parseShopPrice(value), (error) => error.status === 400);
  }
  for (const value of ["1e2", "1.0", "12abc", " 1 "]) {
    assert.throws(
      () => parseShopInteger(value, "offset", 0, Number.MAX_SAFE_INTEGER),
      (error) => error.status === 400,
    );
  }
});