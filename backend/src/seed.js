import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { seedFixlyData } from "./seed-data.js";

try {
  await connectDB();
  const summary = await seedFixlyData();
  console.log("Seed completado sin borrar ni sobrescribir datos:", summary);
} catch (e) {
  console.error("Error al ejecutar el seed:", e);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
