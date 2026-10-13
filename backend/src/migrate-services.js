import "dotenv/config";
import mongoose from "mongoose";
import slugify from "slugify";
import { connectDB } from "./config/db.js";
import { Service } from "./models/service.model.js";

async function assignMissingSlug(service) {
  const base = slugify(service.name || "", {
    lower: true,
    strict: true,
    replacement: "_"
  }) || "service";
  let suffix = 1;

  while (true) {
    const slug = suffix === 1 ? base : `${base}_${suffix}`;
    if (await Service.exists({ slug })) {
      suffix += 1;
      continue;
    }

    try {
      const result = await Service.updateOne(
        { _id: service._id, slug: { $exists: false } },
        { $set: { slug } }
      );
      return result.modifiedCount === 1;
    } catch (error) {
      if (error?.code !== 11000 || (
        error.keyPattern?.slug !== 1 &&
        !error.message?.includes("slug_1")
      )) {
        throw error;
      }
      suffix += 1;
    }
  }
}

async function migrateServices() {
  await connectDB();
  let updated = 0;
  const cursor = Service.find({
    $or: [
      { status: { $exists: false } },
      { slug: { $exists: false } },
      { deletedAt: { $exists: false } }
    ]
  }).select("_id name").lean().cursor();

  for await (const service of cursor) {
    let changed = false;
    const statusUpdate = await Service.updateOne(
      { _id: service._id, status: { $exists: false } },
      { $set: { status: "published" } }
    );
    changed ||= statusUpdate.modifiedCount === 1;

    const deletedAtUpdate = await Service.updateOne(
      { _id: service._id, deletedAt: { $exists: false } },
      { $set: { deletedAt: null } }
    );
    changed ||= deletedAtUpdate.modifiedCount === 1;

    if (await assignMissingSlug(service)) changed = true;
    if (changed) updated += 1;
  }

  console.log(`Migración completada: ${updated} servicios actualizados.`);
}

try {
  await migrateServices();
} catch (error) {
  console.error("Error al migrar servicios:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
