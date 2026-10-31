import "dotenv/config";
import mongoose from "mongoose";

import { connectDB } from "./config/db.js";
import { Category } from "./models/category.model.js";
import { Service } from "./models/service.model.js";
import { Variant } from "./models/variant.model.js";
import { seedFixlyData } from "./seed-data.js";

const LOCAL_MONGO_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Un reset borra colecciones completas, así que exigimos varias confirmaciones.
function checkResetConfiguration() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Reset bloqueado: NODE_ENV debe ser development.");
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED_RESET !== "true") {
    throw new Error(
      "Reset bloqueado: confirma ALLOW_DESTRUCTIVE_SEED_RESET=true.",
    );
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("Reset bloqueado: MONGODB_URI no está configurada.");
  }

  let databaseUrl;
  try {
    databaseUrl = new URL(process.env.MONGODB_URI);
  } catch {
    throw new Error("Reset bloqueado: MONGODB_URI no es válida.");
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname).replace(
    /^\/+|\/+$/g,
    "",
  );
  if (!LOCAL_MONGO_HOSTS.has(databaseUrl.hostname)) {
    throw new Error("Reset bloqueado: MongoDB debe estar en un host local.");
  }
  if (databaseName !== "fixly") {
    throw new Error("Reset bloqueado: la base de datos debe llamarse fixly.");
  }

  return { databaseName, host: databaseUrl.hostname };
}

try {
  const expectedTarget = checkResetConfiguration();
  await connectDB();

  // También comprobamos el destino real, no solo el valor escrito en el .env.
  if (
    mongoose.connection.name !== expectedTarget.databaseName ||
    !LOCAL_MONGO_HOSTS.has(mongoose.connection.host)
  ) {
    throw new Error("Reset bloqueado: la conexión no coincide con el destino local esperado.");
  }

  // El orden respeta las relaciones: primero variantes, después servicios y categorías.
  await Variant.deleteMany({});
  await Service.deleteMany({});
  await Category.deleteMany({});

  // La carga compartida crea primero categorías y luego servicios relacionados.
  const summary = await seedFixlyData();
  console.log("Reset de desarrollo completado:", summary);
} catch (error) {
  console.error("No se pudo completar seed:reset:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}