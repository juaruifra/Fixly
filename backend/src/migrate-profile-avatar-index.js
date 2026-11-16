import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

async function migrateProfileAvatarIndexes() {
  mongoose.set("autoIndex", false);
  await connectDB();
  const { Image } = await import("./models/image.model.js");
  const collection = Image.collection;
  const collectionExists = await mongoose.connection.db
    .listCollections({ name: collection.name }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) await Image.createCollection();

  const duplicateProfiles = await collection.aggregate([
    { $match: { entityType: "profile" } },
    { $group: { _id: "$entityId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicateProfiles.length > 0) {
    throw new Error(
      `More than one avatar exists for profile ${duplicateProfiles[0]._id}; resolve duplicates before migrating indexes.`,
    );
  }

  const indexes = await collection.indexes();
  const obsoleteIndexNames = new Set([
    "entityType_1_profileId_1",
    "entityType_1_entityId_1",
  ]);
  for (const index of indexes) {
    if (obsoleteIndexNames.has(index.name)) {
      await collection.dropIndex(index.name);
    }
  }

  await collection.createIndex(
    { entityType: 1, entityId: 1, createdAt: 1 },
    { name: "entityType_entityId_createdAt_idx" },
  );
  await collection.createIndex(
    { entityType: 1, entityId: 1 },
    {
      name: "one_avatar_per_profile_idx",
      unique: true,
      partialFilterExpression: { entityType: "profile" },
    },
  );
  console.log("Profile avatar indexes migrated without changing image documents.");
}

try {
  await migrateProfileAvatarIndexes();
} catch (error) {
  console.error("Error migrating profile avatar indexes:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}