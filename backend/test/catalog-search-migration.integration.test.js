import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import { Category } from "../src/models/category.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { runCatalogSearchBackfill } from "../src/migrate-catalog-search-text.js";
import { normalizeCatalogSearchText } from "../src/utils/catalog-search.util.js";

const testUri = process.env.MONGODB_TEST_URI;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const confirmationKeys = [
  "MONGODB_URI",
  "CATALOG_SEARCH_BACKFILL_DB_NAME",
  "ALLOW_CATALOG_SEARCH_BACKFILL",
];

test(
  "el CLI simula sin efectos, evita pisar cambios y aplica searchText idempotentemente",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async () => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    assert.ok(localHosts.has(parsedUri.hostname), "La base de pruebas debe ser local");
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    const originalEnvironment = Object.fromEntries(
      confirmationKeys.map((key) => [key, process.env[key]]),
    );
    const modelCollections = [Category, Service, Variant];

    async function connectToTestDatabase() {
      await mongoose.connect(testUri, {
        autoIndex: false,
        autoCreate: false,
        serverSelectionTimeoutMS: 3000,
      });
    }

    async function collectionSnapshots() {
      return Promise.all(
        modelCollections.map(async (Model) => ({
          name: Model.collection.name,
          indexes: (await Model.collection.indexes()).map(({ name }) => name),
          documents: await Model.collection.find({}).sort({ _id: 1 }).toArray(),
        })),
      );
    }

    try {
      await connectToTestDatabase();
      await mongoose.connection.dropDatabase();

      const suffix = new mongoose.Types.ObjectId().toString();
      const category = await Category.create({
        name: `Árboles ${suffix}`,
        slug: `arboles_${suffix}`,
        deletedAt: new Date(),
      });
      const service = await Service.create({
        name: `Poda ${suffix}`,
        description: "Servicio de mantenimiento.",
        slug: `poda_${suffix}`,
        category: category._id,
      });
      const variant = await Variant.create({
        service: service._id,
        name: `Limpieza profunda ${suffix}`,
        description: "Limpieza detallada.",
        sku: `MIG-${suffix}`,
        price: 10,
        duration: 30,
      });

      await Category.collection.updateOne(
        { _id: category._id },
        { $unset: { searchText: 1 } },
      );
      await Service.collection.updateOne(
        { _id: service._id },
        { $set: { searchText: "valor antiguo" } },
      );

      const beforeDryRun = await collectionSnapshots();
      const collectionsBefore = (await mongoose.connection.db
        .listCollections({}, { nameOnly: true })
        .toArray())
        .map(({ name }) => name)
        .sort();
      await mongoose.disconnect();

      process.env.MONGODB_URI = testUri;
      process.env.CATALOG_SEARCH_BACKFILL_DB_NAME = databaseName;
      delete process.env.ALLOW_CATALOG_SEARCH_BACKFILL;

      process.env.CATALOG_SEARCH_BACKFILL_DB_NAME = "base_no_confirmada";
      await assert.rejects(
        runCatalogSearchBackfill(["--dry-run"]),
        /no coincide con CATALOG_SEARCH_BACKFILL_DB_NAME/,
      );
      assert.equal(mongoose.connection.readyState, 0);
      process.env.CATALOG_SEARCH_BACKFILL_DB_NAME = databaseName;

      await assert.rejects(
        runCatalogSearchBackfill(["--apply"]),
        /ALLOW_CATALOG_SEARCH_BACKFILL=true/,
      );

      // Sin flag CLI equivale a dry-run y no requiere autorización de escritura.
      const dryRun = await runCatalogSearchBackfill([]);
      assert.equal(dryRun.mode, "dry-run");
      assert.equal(dryRun.database, databaseName);
      assert.deepEqual(
        [
          dryRun.collections.categories,
          dryRun.collections.services,
          dryRun.collections.variants,
        ].map(({ documentsExamined, missingSearchText, staleSearchText, alreadyCorrect, wouldUpdate, errors }) => ({
          documentsExamined,
          missingSearchText,
          staleSearchText,
          alreadyCorrect,
          wouldUpdate,
          errors,
        })),
        [
          {
            documentsExamined: 1,
            missingSearchText: 1,
            staleSearchText: 0,
            alreadyCorrect: 0,
            wouldUpdate: 1,
            errors: 0,
          },
          {
            documentsExamined: 1,
            missingSearchText: 0,
            staleSearchText: 1,
            alreadyCorrect: 0,
            wouldUpdate: 1,
            errors: 0,
          },
          {
            documentsExamined: 1,
            missingSearchText: 0,
            staleSearchText: 0,
            alreadyCorrect: 1,
            wouldUpdate: 0,
            errors: 0,
          },
        ],
      );

      await connectToTestDatabase();
      const afterDryRun = await collectionSnapshots();
      const collectionsAfter = (await mongoose.connection.db
        .listCollections({}, { nameOnly: true })
        .toArray())
        .map(({ name }) => name)
        .sort();
      assert.deepEqual(afterDryRun, beforeDryRun, "dry-run no debe escribir ni crear índices");
      assert.deepEqual(collectionsAfter, collectionsBefore, "dry-run no debe crear colecciones");
      await mongoose.disconnect();

      process.env.ALLOW_CATALOG_SEARCH_BACKFILL = "true";
      const originalServiceBulkWrite = Service.bulkWrite;
      Service.bulkWrite = async function (operations, options) {
        await Service.collection.updateOne(
          { _id: service._id },
          { $set: { description: "Descripción editada concurrentemente." } },
        );
        return originalServiceBulkWrite.call(this, operations, options);
      };

      let applied;
      try {
        applied = await runCatalogSearchBackfill(["--apply"]);
      } finally {
        Service.bulkWrite = originalServiceBulkWrite;
      }
      assert.equal(applied.mode, "apply");
      assert.equal(applied.collections.categories.modified, 1);
      assert.equal(applied.collections.services.modified, 0);
      assert.equal(applied.collections.services.skippedConcurrentChanges, 1);
      assert.equal(applied.collections.variants.modified, 0);

      await connectToTestDatabase();
      const categoryAfter = await Category.collection.findOne({ _id: category._id });
      const serviceAfterRace = await Service.collection.findOne({ _id: service._id });
      const variantAfter = await Variant.collection.findOne({ _id: variant._id });
      assert.equal(categoryAfter.searchText, normalizeCatalogSearchText(category.name));
      assert.equal(serviceAfterRace.description, "Descripción editada concurrentemente.");
      assert.equal(serviceAfterRace.searchText, "valor antiguo");
      assert.equal(variantAfter.searchText, normalizeCatalogSearchText(variant.name, variant.description));
      assert.equal(categoryAfter.deletedAt.getTime(), category.deletedAt.getTime());
      assert.equal(variantAfter.sku, variant.sku);
      assert.deepEqual(
        [categoryAfter.updatedAt, serviceAfterRace.updatedAt, variantAfter.updatedAt],
        beforeDryRun.map(({ documents }) => documents[0].updatedAt),
        "apply no debe modificar updatedAt",
      );
      await mongoose.disconnect();

      const reconciled = await runCatalogSearchBackfill(["--apply"]);
      assert.equal(reconciled.collections.services.modified, 1);
      await connectToTestDatabase();
      const reconciledService = await Service.collection.findOne({ _id: service._id });
      assert.equal(
        reconciledService.searchText,
        normalizeCatalogSearchText(service.name, "Descripción editada concurrentemente."),
      );
      await mongoose.disconnect();

      const repeatedApply = await runCatalogSearchBackfill(["--apply"]);
      assert.equal(repeatedApply.collections.categories.modified, 0);
      assert.equal(repeatedApply.collections.services.modified, 0);
      assert.equal(repeatedApply.collections.variants.modified, 0);
      assert.equal(repeatedApply.collections.categories.alreadyCorrect, 1);
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await connectToTestDatabase();
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);