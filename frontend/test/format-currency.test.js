import assert from "node:assert/strict";
import test from "node:test";

import { formatCurrency } from "../src/utils/formatCurrency.js";

test("mantiene el formato anterior, también para cero y valores ausentes", () => {
  const previous = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  for (const amount of [0, 0.5, 25, 1234.56, null, undefined]) {
    assert.equal(formatCurrency(amount), previous.format(amount));
  }
  assert.match(formatCurrency(0), /0,00/);
});