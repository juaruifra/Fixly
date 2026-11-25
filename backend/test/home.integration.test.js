import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import app from "../src/app.js";
import { Category } from "../src/models/category.model.js";
import { Image } from "../src/models/image.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";

const testUri = process.env.MONGODB_TEST_URI;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

test(
  "Home oculta entidades no disponibles y ordena la primera imagen",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async (t) => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    assert.ok(localHosts.has(parsedUri.hostname), "La base de pruebas debe ser local");
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    let server;
    try {
      await mongoose.connection.dropDatabase();
      await Promise.all([
        Category.syncIndexes(),
        Image.syncIndexes(),
        Service.syncIndexes(),
        Variant.syncIndexes(),
      ]);

      const suffix = new mongoose.Types.ObjectId().toString();
      async function createCategory(name, options = {}) {
        return Category.create({
          name,
          slug: `${name.toLowerCase().replaceAll(" ", "_")}_${suffix}`,
          ...options,
        });
      }
      async function createService(category, name, options = {}) {
        return Service.create({
          name,
          slug: `${name.toLowerCase().replaceAll(" ", "_")}_${suffix}`,
          category: category._id,
          ...options,
        });
      }
      async function createVariant(service, sku, options = {}) {
        return Variant.create({
          service: service._id,
          name: sku,
          sku: `${sku}-${suffix}`,
          price: 10,
          duration: 30,
          ...options,
        });
      }

      const visibleCategory = await createCategory("Fontanería");
      const noVariantCategory = await createCategory("Sin variantes");
      const unavailableVariantCategory = await createCategory("Variante pausada");
      const inactiveCategory = await createCategory("Categoría inactiva", { active: false });
      const deletedCategory = await createCategory("Categoría eliminada", {
        deletedAt: new Date(),
      });

      const visibleService = await createService(visibleCategory, "Reparar grifo");
      const secondVisibleService = await createService(visibleCategory, "Instalar grifo");
      const serviceWithoutVariant = await createService(noVariantCategory, "Servicio sin opción");
      const serviceWithPausedVariant = await createService(
        unavailableVariantCategory,
        "Servicio con opción pausada",
      );
      const serviceInInactiveCategory = await createService(
        inactiveCategory,
        "Servicio en categoría inactiva",
      );
      const serviceInDeletedCategory = await createService(
        deletedCategory,
        "Servicio en categoría eliminada",
      );

      await createVariant(visibleService, "VISIBLE");
      await createVariant(secondVisibleService, "VISIBLE-2");
      await createVariant(serviceWithPausedVariant, "PAUSADA", { status: "paused" });
      await createVariant(serviceInInactiveCategory, "INACTIVA");
      await createVariant(serviceInDeletedCategory, "ELIMINADA");

      const unavailableOffers = [
        { name: "Servicio borrador", service: { status: "draft" } },
        { name: "Servicio inactivo", service: { active: false } },
        { name: "Servicio eliminado", service: { deletedAt: new Date() } },
        { name: "Variante borrador", variant: { status: "draft" } },
        { name: "Variante inactiva", variant: { active: false } },
        { name: "Variante eliminada", variant: { deletedAt: new Date() } },
      ];
      for (const [index, offer] of unavailableOffers.entries()) {
        const category = await createCategory(`${offer.name} categoría`);
        const service = await createService(
          category,
          `${offer.name} servicio`,
          offer.service,
        );
        await createVariant(service, `NO-DISPONIBLE-${index}`, offer.variant);
      }

      await Image.create([
        {
          entityType: "category",
          entityId: visibleCategory._id,
          url: "https://example.invalid/primera.jpg",
          alt: "Primera imagen",
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          updatedAt: new Date("2025-01-01T00:00:00.000Z"),
        },
        {
          entityType: "category",
          entityId: visibleCategory._id,
          url: "https://example.invalid/segunda.jpg",
          alt: "Segunda imagen",
          createdAt: new Date("2025-01-02T00:00:00.000Z"),
          updatedAt: new Date("2025-01-02T00:00:00.000Z"),
        },
      ]);

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });

      const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/home/categories`,
      );
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), [
        {
          name: "Fontanería",
          slug: visibleCategory.slug,
          image: {
            url: "https://example.invalid/primera.jpg",
            alt: "Primera imagen",
          },
        },
      ]);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);