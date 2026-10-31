import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import { Category } from "../src/models/category.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { seedFixlyData } from "../src/seed-data.js";
import app from "../src/app.js";
import { serviceService } from "../src/services/service.service.js";
import { variantService } from "../src/services/variant.service.js";

const testUri = process.env.MONGODB_TEST_URI;

test(
  "Variant conserva SKU, relaciones y reglas de borrado",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async (t) => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

    // Esta prueba solo puede borrar una base temporal local, nunca la base habitual.
    assert.ok(localHosts.has(parsedUri.hostname), "La base de pruebas debe ser local");
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    let server;
    try {
      await mongoose.connection.dropDatabase();
      await Promise.all([
        Category.syncIndexes(),
        Service.syncIndexes(),
        Variant.syncIndexes(),
      ]);

      const suffix = randomUUID().replaceAll("-", "");
      const category = await Category.create({
        name: `Categoría ${suffix}`,
        slug: `categoria_${suffix}`,
      });
      const service = await Service.create({
        name: `Limpieza de vivienda ${suffix}`,
        category: category._id,
        price: 80,
        duration: 120,
        slug: `limpieza_de_vivienda_${suffix}`,
      });
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });

      await t.test("genera SKU automático y no acepta el SKU del cliente", async () => {
        const variant = await variantService.create({
          service: String(service._id),
          name: "Limpieza de 2 horas",
          sku: "CLIENTE-IGNORADO",
          price: 80,
          duration: 120,
          auto: true,
          requiresBooking: true,
        });

        assert.equal(variant.sku, "LIM-VIV-2H-001");
        assert.equal(variant.auto, true);
        assert.equal(variant.requiresBooking, true);

        const publicVariants = await variantService.listPublic(service._id);
        assert.ok(
          publicVariants.some(({ _id }) => String(_id) === String(variant._id)),
        );
      });

      await t.test("regenera SKU automático y conserva el manual", async () => {
        const automatic = await variantService.create({
          service: String(service._id),
          name: "Limpieza de 3 horas",
          price: 100,
          duration: 180,
        });
        const renamed = await variantService.update(automatic._id, {
          name: "Limpieza extendida",
        });
        assert.equal(renamed.sku, "LIM-VIV-3H-001");

        const manualMode = await variantService.update(automatic._id, {
          auto: false,
        });
        assert.equal(manualMode.sku, renamed.sku);

        const manual = await variantService.update(manualMode._id, {
          sku: "limpieza-especial-01",
        });
        assert.equal(manual.sku, "LIMPIEZA-ESPECIAL-01");
        const manualDuration = await variantService.update(manual._id, {
          duration: 240,
        });
        assert.equal(manualDuration.sku, "LIMPIEZA-ESPECIAL-01");

        const automaticAgain = await variantService.update(manual._id, {
          auto: true,
        });
        assert.equal(automaticAgain.sku, "LIM-VIV-4H-001");
      });

      await t.test("asigna secuencias distintas ante altas simultáneas", async () => {
        const variants = await Promise.all(
          Array.from({ length: 5 }, (_, index) =>
            variantService.create({
              service: String(service._id),
              name: `Simultánea ${index}`,
              price: 10,
              duration: 75,
            }),
          ),
        );

        assert.equal(new Set(variants.map(({ sku }) => sku)).size, 5);
      });

      await t.test("mantiene reservado el SKU al eliminar y rechaza duplicados", async () => {
        const deleted = await variantService.create({
          service: String(service._id),
          name: "Revisión reservada",
          price: 20,
          duration: 30,
        });
        await variantService.remove(deleted._id);

        const next = await variantService.create({
          service: String(service._id),
          name: "Otra revisión",
          price: 25,
          duration: 30,
        });
        assert.notEqual(next.sku, deleted.sku);

        const manual = {
          service: String(service._id),
          name: "SKU manual",
          sku: "MANUAL-UNICO",
          auto: false,
          price: 10,
          duration: 15,
        };
        await variantService.create(manual);
        await assert.rejects(
          variantService.create({ ...manual, name: "SKU duplicado" }),
          (error) => error.status === 409,
        );

        const restored = await variantService.restore(deleted._id);
        assert.equal(restored.deletedAt, null);
        assert.equal(restored.active, true);
      });

      await t.test("el seed normal se repite sin duplicar variantes", async () => {
        const firstRun = await seedFixlyData();
        const secondRun = await seedFixlyData();

        assert.equal(firstRun.variantsCreated, 5);
        assert.equal(secondRun.variantsCreated, 0);
        assert.equal(secondRun.variantsKept, 5);
      });

      await t.test("impide eliminar un servicio con variantes, aunque estén borradas", async () => {
        const variant = await variantService.create({
          service: String(service._id),
          name: "Variante relacionada",
          price: 20,
          duration: 30,
        });
        await variantService.remove(variant._id);

        await assert.rejects(
          serviceService.remove(String(service._id)),
          (error) => error.status === 409 && error.message.includes("variants"),
        );

        const unchanged = await Service.findById(service._id).lean();
        assert.equal(unchanged.deletedAt, null);
        assert.equal(unchanged.active, true);
      });

      await t.test("expone creación, listado público, validación y restauración por HTTP", async () => {
        const baseUrl = `http://127.0.0.1:${server.address().port}/api/variants`;
        const invalidResponse = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: "no-es-un-id" }),
        });
        assert.equal(invalidResponse.status, 400);

        const createResponse = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: String(service._id),
            name: "Reserva por HTTP",
            price: 25,
            duration: 75,
            requiresBooking: true,
          }),
        });
        assert.equal(createResponse.status, 201);
        const created = await createResponse.json();
        assert.match(created.sku, /^LIM-VIV-75M-/);

        const publicResponse = await fetch(
          `${baseUrl}/public?serviceId=${service._id}`,
        );
        assert.equal(publicResponse.status, 200);
        const publicVariants = await publicResponse.json();
        assert.ok(publicVariants.some(({ _id }) => _id === created._id));

        const deleteResponse = await fetch(`${baseUrl}/${created._id}`, {
          method: "DELETE",
        });
        assert.equal(deleteResponse.status, 204);

        const restoreResponse = await fetch(
          `${baseUrl}/${created._id}/restore`,
          { method: "PATCH" },
        );
        assert.equal(restoreResponse.status, 200);
      });
    } finally {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);