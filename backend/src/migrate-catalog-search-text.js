import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

import { Category } from "./models/category.model.js";
import { Service } from "./models/service.model.js";
import { Variant } from "./models/variant.model.js";
import { normalizeCatalogSearchText } from "./utils/catalog-search.util.js";

const defaultBatchSize = 250;
const searchableModels = [
  {
    name: "categories",
    Model: Category,
    sourceFields: ["name"],
    buildSearchText: ({ name }) => normalizeCatalogSearchText(name),
  },
  {
    name: "services",
    Model: Service,
    sourceFields: ["name", "description"],
    buildSearchText: ({ name, description }) =>
      normalizeCatalogSearchText(name, description),
  },
  {
    name: "variants",
    Model: Variant,
    sourceFields: ["name", "description"],
    buildSearchText: ({ name, description }) =>
      normalizeCatalogSearchText(name, description),
  },
];

/**
 * Inspecciona una colección y, en modo apply, corrige el campo derivado.
 *
 * El cursor limita el uso de memoria. El dry-run solo lee y no ejecuta
 * `bulkWrite`. En modo apply cada operación compara `_id`, campos fuente y el
 * valor derivado leídos para no pisar una edición concurrente. La opción de
 * timestamps impide cambiar `updatedAt` al corregir solo `searchText`.
 * También se cuentan documentos eliminados lógicamente porque pueden restaurarse.
 *
 * @param {Object} options - Modelo, campos fuente y modo de la operación.
 * @param {import("mongoose").Model} options.Model - Modelo que se inspecciona.
 * @param {string[]} options.sourceFields - Campos fuente que forman searchText.
 * @param {(document:Object)=>string} options.buildSearchText - Normalizador de un documento.
 * @param {boolean} options.dryRun - Si true, no ejecuta escrituras.
 * @param {number} [options.batchSize=250] - Máximo de operaciones por lote.
 * @returns {Promise<Object>} Conteos examinados, previstos, actualizados y errores.
 */
export async function scanSearchTextCollection({
  Model,
  sourceFields,
  buildSearchText,
  dryRun,
  batchSize = defaultBatchSize,
}) {
  const report = {
    collection: Model.collection.name,
    documentsExamined: 0,
    missingSearchText: 0,
    staleSearchText: 0,
    alreadyCorrect: 0,
    wouldUpdate: 0,
    matchedForUpdate: 0,
    modified: 0,
    skippedConcurrentChanges: 0,
    errors: 0,
  };
  const operations = [];

  async function flushBatch() {
    if (dryRun || operations.length === 0) return;

    const result = await Model.bulkWrite(operations, {
      ordered: false,
      timestamps: false,
    });
    report.matchedForUpdate += result.matchedCount ?? result.nMatched ?? 0;
    report.modified += result.modifiedCount ?? result.nModified ?? 0;
    operations.length = 0;
  }

  const projection = Object.fromEntries([
    ...sourceFields.map((field) => [field, 1]),
    ["+searchText", 1],
  ]);
  const cursor = Model.find({}).select(projection).lean().cursor();

  try {
    for await (const document of cursor) {
      report.documentsExamined += 1;

      let expectedSearchText;
      try {
        expectedSearchText = buildSearchText(document);
      } catch {
        report.errors += 1;
        continue;
      }

      if (document.searchText === expectedSearchText) {
        report.alreadyCorrect += 1;
        continue;
      }

      if (typeof document.searchText !== "string") {
        report.missingSearchText += 1;
      } else {
        report.staleSearchText += 1;
      }
      report.wouldUpdate += 1;
      if (dryRun) continue;

      const sourceSnapshot = { _id: document._id };
      for (const field of sourceFields) {
        sourceSnapshot[field] = Object.hasOwn(document, field)
          ? document[field]
          : { $exists: false };
      }
      sourceSnapshot.searchText = Object.hasOwn(document, "searchText")
        ? document.searchText
        : { $exists: false };

      operations.push({
        updateOne: {
          filter: sourceSnapshot,
          update: { $set: { searchText: expectedSearchText } },
          timestamps: false,
        },
      });
      if (operations.length >= batchSize) await flushBatch();
    }
    await flushBatch();
  } finally {
    await cursor.close();
  }

  if (!dryRun) {
    report.skippedConcurrentChanges =
      report.wouldUpdate - report.matchedForUpdate;
  }
  return report;
}

/**
 * Selecciona modo read-only o apply y rechaza argumentos ambiguos.
 *
 * Sin flag el comportamiento es dry-run; solo `--apply` habilita escrituras.
 *
 * @param {string[]} args - Argumentos posicionales del proceso.
 * @returns {"dry-run"|"apply"} Modo único de ejecución.
 * @throws {Error} Si hay flags desconocidos o se solicitan ambos modos.
 */
function parseMode(args) {
  const allowedArgs = new Set(["--dry-run", "--apply"]);
  const invalidArg = args.find((arg) => !allowedArgs.has(arg));
  if (invalidArg) throw new Error(`Opción desconocida: ${invalidArg}`);
  if (args.includes("--dry-run") && args.includes("--apply")) {
    throw new Error("Elige solo uno de --dry-run o --apply.");
  }
  return args.includes("--apply") ? "apply" : "dry-run";
}

/**
 * Comprueba que la URI y la confirmación apuntan al mismo nombre de base.
 *
 * El nombre se puede informar en el reporte; la URI completa nunca se registra.
 *
 * @param {string} uri - URI configurada mediante MONGODB_URI.
 * @returns {string} Nombre exacto confirmado para esa conexión.
 * @throws {Error} Si falta el nombre, la URI es inválida o no coincide.
 */
function getConfirmedDatabaseName(uri) {
  const expectedDatabaseName = process.env.CATALOG_SEARCH_BACKFILL_DB_NAME?.trim();
  if (!expectedDatabaseName) {
    throw new Error(
      "Falta CATALOG_SEARCH_BACKFILL_DB_NAME con el nombre exacto de la base revisada.",
    );
  }

  let uriDatabaseName;
  try {
    uriDatabaseName = decodeURIComponent(new URL(uri).pathname).replace(
      /^\/+|\/+$/g,
      "",
    );
  } catch {
    throw new Error("MONGODB_URI no es válida.");
  }
  if (!uriDatabaseName || uriDatabaseName !== expectedDatabaseName) {
    throw new Error(
      "El nombre de la base en MONGODB_URI no coincide con CATALOG_SEARCH_BACKFILL_DB_NAME.",
    );
  }
  return expectedDatabaseName;
}

/**
 * Ejecuta la simulación o aplicación después de verificar el destino.
 *
 * La conexión directa desactiva autoIndex y autoCreate. No usa `connectDB()`
 * porque ese helper crea índices de revocación, lo cual no es admisible en el
 * dry-run. Nunca registra la URI ni el host.
 *
 * @param {string[]} args - Solo acepta `--dry-run` o `--apply`.
 * @returns {Promise<Object>} Informe con base confirmada y conteos por colección.
 * @throws {Error} Si faltan confirmaciones o el destino conectado no coincide.
 */
export async function runCatalogSearchBackfill(args = []) {
  const mode = parseMode(args);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI es obligatoria.");

  const databaseName = getConfirmedDatabaseName(uri);
  if (
    mode === "apply" &&
    process.env.ALLOW_CATALOG_SEARCH_BACKFILL !== "true"
  ) {
    throw new Error(
      "Apply bloqueado: configura ALLOW_CATALOG_SEARCH_BACKFILL=true después de revisar el dry-run.",
    );
  }

  await mongoose.connect(uri, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 3000,
  });
  try {
    if (mongoose.connection.name !== databaseName) {
      throw new Error(
        "La base conectada no coincide con CATALOG_SEARCH_BACKFILL_DB_NAME.",
      );
    }

    const collections = {};
    for (const modelConfig of searchableModels) {
      collections[modelConfig.name] = await scanSearchTextCollection({
        ...modelConfig,
        dryRun: mode === "dry-run",
      });
    }
    return { mode, database: databaseName, collections };
  } finally {
    await mongoose.disconnect();
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const report = await runCatalogSearchBackfill(process.argv.slice(2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error("Backfill de búsqueda no completado:", error.message);
    process.exitCode = 1;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}