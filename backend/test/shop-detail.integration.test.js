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
  "Shop Detail devuelve solo detalles y variantes disponibles por slug",
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

      const suffix = new mongoose.Types.ObjectId().toString().slice(-8);
      async function createCategory(name, slug, options = {}) {
        return Category.create({ name, slug: `${slug}_${suffix}`, ...options });
      }
      async function createService(category, name, slug, options = {}) {
        return Service.create({
          name,
          slug: `${slug}_${suffix}`,
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
      async function createServiceImage(service, date, url, alt) {
        return Image.create({
          entityType: "service",
          entityId: service._id,
          url,
          alt,
          createdAt: new Date(date),
          updatedAt: new Date(date),
        });
      }
      async function createVariantImage(variant, date, url, alt) {
        return Image.create({
          entityType: "variant",
          entityId: variant._id,
          url,
          alt,
          createdAt: new Date(date),
          updatedAt: new Date(date),
        });
      }

      const category = await createCategory("Limpieza", "limpieza");
      const service = await createService(category, "Limpieza de hogar", "limpieza_hogar", {
        description: "Limpieza de espacios domésticos.",
      });
      const olderVariant = await createVariant(service, "COMPLETA", {
        name: "Limpieza completa",
        description: "Limpieza de todas las habitaciones.",
        price: 75,
        duration: 120,
      });
      const cheaperVariant = await createVariant(service, "BASICA", {
        name: "Limpieza básica",
        price: 20,
        duration: 30,
      });
      await createVariant(service, "PAUSADA", { status: "paused", price: 5 });
      await createVariant(service, "INACTIVA", { active: false, price: 1 });
      await createVariant(service, "ELIMINADA", { deletedAt: new Date(), price: 2 });

      await createServiceImage(
        service,
        "2025-01-01T00:00:00.000Z",
        "https://example.invalid/servicio-primera.jpg",
        "Primera imagen del servicio",
      );
      await createServiceImage(
        service,
        "2025-01-02T00:00:00.000Z",
        "https://example.invalid/servicio-segunda.jpg",
        "Segunda imagen del servicio",
      );
      await createVariantImage(
        olderVariant,
        "2025-01-01T00:00:00.000Z",
        "https://example.invalid/variante-primera.jpg",
        "Primera imagen de variante",
      );
      await createVariantImage(
        olderVariant,
        "2025-01-02T00:00:00.000Z",
        "https://example.invalid/variante-segunda.jpg",
        "Segunda imagen de variante",
      );

      const emptyCategory = await createCategory("Sin variantes", "sin_variantes");
      const serviceWithoutVariant = await createService(
        emptyCategory,
        "Servicio sin variantes",
        "servicio_sin_variantes",
      );
      const pausedService = await createService(category, "Servicio pausado", "servicio_pausado", {
        status: "paused",
      });
      await createVariant(pausedService, "ACTIVA-EN-PAUSADO");
      const inactiveCategory = await createCategory("Categoría inactiva", "categoria_inactiva", {
        active: false,
      });
      const serviceInInactiveCategory = await createService(
        inactiveCategory,
        "Servicio en categoría inactiva",
        "servicio_categoria_inactiva",
      );
      await createVariant(serviceInInactiveCategory, "CATEGORY-OFF");
      const deletedCategory = await createCategory("Categoría eliminada", "categoria_eliminada", {
        deletedAt: new Date(),
      });
      const serviceInDeletedCategory = await createService(
        deletedCategory,
        "Servicio en categoría eliminada",
        "servicio_categoria_eliminada",
      );
      await createVariant(serviceInDeletedCategory, "CATEGORY-DELETED");
      const inactiveService = await createService(category, "Servicio inactivo", "servicio_inactivo", {
        active: false,
      });
      await createVariant(inactiveService, "SERVICE-OFF");
      const deletedService = await createService(category, "Servicio eliminado", "servicio_eliminado", {
        deletedAt: new Date(),
      });
      await createVariant(deletedService, "SERVICE-DELETED");

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api/shopDetail/services`;
      const get = (slug, suffixPath = "") =>
        fetch(`${baseUrl}/${encodeURIComponent(slug)}${suffixPath}`);

      await t.test("las dos rutas son públicas y el detalle calcula precio mínimo e imágenes", async () => {
        const oldBaseUrl = `http://127.0.0.1:${server.address().port}/api/shop/services/${encodeURIComponent(service.slug)}`;
        assert.equal((await fetch(oldBaseUrl)).status, 404);
        assert.equal((await fetch(`${oldBaseUrl}/variants`)).status, 404);
        const response = await get(service.slug);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type").includes("application/json"), true);
        const detail = await response.json();
        assert.deepEqual(detail, {
          name: "Limpieza de hogar",
          slug: service.slug,
          description: "Limpieza de espacios domésticos.",
          category: { name: "Limpieza", slug: category.slug },
          images: [
            {
              url: "https://example.invalid/servicio-primera.jpg",
              alt: "Primera imagen del servicio",
            },
            {
              url: "https://example.invalid/servicio-segunda.jpg",
              alt: "Segunda imagen del servicio",
            },
          ],
          priceFrom: 20,
        });
        assert.equal("_id" in detail, false);

        const variantsResponse = await get(service.slug, "/variants");
        assert.equal(variantsResponse.status, 200);
        const variants = await variantsResponse.json();
        assert.deepEqual(variants, [
          {
            name: "Limpieza básica",
            description: null,
            duration: 30,
            price: 20,
            image: null,
          },
          {
            name: "Limpieza completa",
            description: "Limpieza de todas las habitaciones.",
            duration: 120,
            price: 75,
            image: {
              url: "https://example.invalid/variante-primera.jpg",
              alt: "Primera imagen de variante",
            },
          },
        ]);
        assert.equal("sku" in variants[1], false);
        assert.equal("_id" in variants[1], false);
      });

      await t.test("oculta servicios sin disponibilidad jerárquica con 404", async () => {
        for (const hiddenSlug of [
          serviceWithoutVariant.slug,
          pausedService.slug,
          serviceInInactiveCategory.slug,
          serviceInDeletedCategory.slug,
          inactiveService.slug,
          deletedService.slug,
          `no_existe_${suffix}`,
        ]) {
          assert.equal((await get(hiddenSlug)).status, 404, `detail ${hiddenSlug}`);
          assert.equal((await get(hiddenSlug, "/variants")).status, 404, `variants ${hiddenSlug}`);
        }
      });

      await t.test("rechaza slugs con formato inválido", async () => {
        assert.equal((await get("No válido" )).status, 400);
        assert.ok(cheaperVariant._id);
      });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);