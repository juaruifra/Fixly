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
  "Shop aplica filtros conjuntos, calcula precios, pagina y expone opciones",
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
      async function createVariant(service, code, name, description, price, options = {}) {
        return Variant.create({
          service: service._id,
          name,
          description,
          sku: `${code}-${suffix}`.toUpperCase(),
          price,
          duration: 60,
          ...options,
        });
      }

      const cleaningCategory = await createCategory("Limpieza", "limpieza");
      const carpentryCategory = await createCategory("Carpintería", "carpinteria");
      const gardeningCategory = await createCategory("Jardinería", "jardineria");
      const emptyCategory = await createCategory("Sin oferta", "sin_oferta");
      const unavailableCategory = await createCategory("Oferta pausada", "oferta_pausada");

      const cleaningService = await createService(
        cleaningCategory,
        "Limpieza de hogar",
        "limpieza_hogar",
        { description: "Servicio de limpieza para espacios domésticos." },
      );
      await createVariant(
        cleaningService,
        "BASICA",
        "Limpieza básica",
        "Mantenimiento cotidiano del hogar.",
        25,
      );
      await createVariant(
        cleaningService,
        "COMPLETA",
        "Limpieza completa",
        "Limpieza completa de las habitaciones.",
        75,
      );
      await createVariant(
        cleaningService,
        "PROFUNDA",
        "Limpieza profunda",
        "Eliminación de suciedad incrustada.",
        125,
      );

      const carpentryService = await createService(
        carpentryCategory,
        "Montaje de muebles",
        "montaje_muebles",
      );
      await createVariant(carpentryService, "MONTAJE", "Montaje estándar", "Montaje básico.", 55);

      const gardeningService = await createService(
        gardeningCategory,
        "Poda de árboles",
        "poda_arboles",
        { description: "Mantenimiento de árboles y arbustos." },
      );
      await createVariant(
        gardeningService,
        "PODA",
        "Poda anual",
        "Poda ligera de árboles.",
        45,
      );
      const freeService = await createService(
        gardeningCategory,
        "Ajuste de riego",
        "ajuste_riego",
      );
      await createVariant(freeService, "GRATIS", "Ajuste básico", "Revisión sin coste.", 0);

      const serviceWithoutVariant = await createService(
        emptyCategory,
        "Servicio sin variantes",
        "servicio_sin_variantes",
      );
      assert.ok(serviceWithoutVariant._id);
      const unavailableService = await createService(
        unavailableCategory,
        "Servicio con variante pausada",
        "servicio_pausado",
      );
      await createVariant(
        unavailableService,
        "PAUSADA",
        "Variante pausada",
        "No disponible.",
        10,
        { status: "paused" },
      );

      await Image.create({
        entityType: "service",
        entityId: cleaningService._id,
        url: "https://example.invalid/limpieza.jpg",
        alt: "Limpieza de una vivienda",
      });

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api/shop`;
      const get = (path) => fetch(`${baseUrl}${path}`);

      await t.test("es público, no duplica servicios y aplica OR de categorías", async () => {
        const response = await get(
          `/services?categories=${cleaningCategory.slug},desconocida,${carpentryCategory.slug}`,
        );
        assert.equal(response.status, 200);
        const page = await response.json();
        assert.equal(page.total, 2);
        assert.equal(page.items.length, 2);
        assert.ok(page.items.some(({ slug }) => slug === cleaningService.slug));
        assert.ok(page.items.some(({ slug }) => slug === carpentryService.slug));

        const cleaningOnly = await get(`/services?categories=${cleaningCategory.slug}`);
        const cleaningPage = await cleaningOnly.json();
        assert.equal(cleaningPage.total, 1);
        assert.equal(cleaningPage.items[0].priceFrom, 25);
        assert.equal(cleaningPage.items[0].image.url, "https://example.invalid/limpieza.jpg");
        assert.equal("sku" in cleaningPage.items[0], false);
        assert.equal("duration" in cleaningPage.items[0], false);
      });

      await t.test("la misma variante debe cumplir búsqueda y precio", async () => {
        const noMatch = await get("/services?search=profunda&maxPrice=50");
        assert.deepEqual(await noMatch.json(), {
          items: [],
          total: 0,
          limit: 12,
          offset: 0,
        });

        const matchingVariant = await get("/services?search=PROFUNDA&maxPrice=150");
        const page = await matchingVariant.json();
        assert.equal(page.total, 1);
        assert.equal(page.items[0].priceFrom, 125);
        assert.equal(page.items[0].slug, cleaningService.slug);

        const textFromService = await get("/services?search=hogar&maxPrice=50");
        const serviceMatchPage = await textFromService.json();
        assert.equal(serviceMatchPage.total, 1);
        assert.equal(serviceMatchPage.items[0].priceFrom, 25);

        const textFromVariantDescription = await get("/services?search=suciedad&maxPrice=150");
        assert.equal((await textFromVariantDescription.json()).items[0].priceFrom, 125);
      });

      await t.test("normaliza acentos, admite cero y calcula límites adaptativos", async () => {
        const accentSearch = await get("/services?search=ARBÓLES");
        const accentPage = await accentSearch.json();
        assert.equal(accentPage.total, 1);
        assert.equal(accentPage.items[0].slug, gardeningService.slug);

        const categorySearch = await get("/services?search=CARPINTERÍA");
        const categoryPage = await categorySearch.json();
        assert.equal(categoryPage.total, 1);
        assert.equal(categoryPage.items[0].slug, carpentryService.slug);

        const zeroPrice = await get("/services?minPrice=0&maxPrice=0");
        const zeroPage = await zeroPrice.json();
        assert.equal(zeroPage.total, 1);
        assert.equal(zeroPage.items[0].priceFrom, 0);

        const optionsResponse = await get(
          `/filters?categories=${cleaningCategory.slug}&search=profunda`,
        );
        assert.equal(optionsResponse.status, 200);
        const options = await optionsResponse.json();
        assert.equal(options.categories.length, 3);
        assert.deepEqual(options.priceRange, { min: 125, max: 125 });

        const emptyOptions = await get("/filters?categories=inexistente");
        assert.deepEqual((await emptyOptions.json()).priceRange, { min: null, max: null });
      });

      await t.test("ordena antes de paginar y conserva el total fuera de rango", async () => {
        const firstPage = await get("/services?sort=price-asc&limit=2&offset=0");
        const first = await firstPage.json();
        assert.equal(first.total, 4);
        assert.deepEqual(first.items.map(({ priceFrom }) => priceFrom), [0, 25]);

        const lastPage = await get("/services?sort=price-asc&limit=1&offset=2");
        const last = await lastPage.json();
        assert.equal(last.total, 4);
        assert.equal(last.items.length, 1);
        assert.equal(last.items[0].priceFrom, 45);

        const beyondTotal = await get("/services?limit=2&offset=100");
        const emptyPage = await beyondTotal.json();
        assert.equal(emptyPage.total, 4);
        assert.deepEqual(emptyPage.items, []);
      });

      await t.test("rechaza parámetros inválidos y estructuras inesperadas", async () => {
        const invalidRequests = [
          "/services?minPrice=20&maxPrice=19",
          "/services?minPrice=Infinity",
          "/services?minPrice=0x10",
          "/services?minPrice=12abc",
          "/services?minPrice=",
          "/services?minPrice=%201%20",
          "/services?minPrice=1.2abc",
          "/services?minPrice=10&minPrice=20",
          "/services?search%5B%24ne%5D=x",
          "/services?categories%5B%24ne%5D=x",
          "/services?sort=sku",
          "/services?limit=51",
          "/services?search=%5Bobject%20Object%5D&unknown=value",
          `/services?categories=${cleaningCategory.slug}&categories=${carpentryCategory.slug}`,
          "/filters?sort=price-asc",
        ];
        for (const path of invalidRequests) {
          assert.equal((await get(path)).status, 400, path);
        }

        assert.equal((await get("/services?maxPrice=1e2")).status, 200);
        assert.equal((await get("/services?maxPrice=.5")).status, 200);
        assert.equal((await get("/services?maxPrice=1.")).status, 200);
        assert.equal((await get("/services?minPrice=%2B2")).status, 200);
        assert.equal((await get("/services?offset=%2B0")).status, 200);
      });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);