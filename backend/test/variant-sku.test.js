import test from "node:test";
import assert from "node:assert/strict";

import { getVariantSkuPrefix } from "../src/utils/variant-sku.util.js";

test("forma el prefijo con palabras significativas y horas", () => {
  assert.equal(
    getVariantSkuPrefix("limpieza_de_vivienda", 120),
    "LIM-VIV-2H",
  );
});

test("acepta guiones como separadores y conserva minutos no exactos", () => {
  assert.equal(getVariantSkuPrefix("reparacion-grifos", 90), "REP-GRI-90M");
});

test("usa un valor de respaldo si el slug no tiene dos palabras útiles", () => {
  assert.equal(getVariantSkuPrefix("de_la", 30), "SRV-SVC-30M");
  assert.equal(getVariantSkuPrefix("limpieza", 60), "LIM-SRV-1H");
});