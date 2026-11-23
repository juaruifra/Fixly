import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { connectDB } from "../src/config/db.js";
import { RevokedToken } from "../src/models/revoked-token.model.js";

const testUri = process.env.MONGODB_TEST_URI;

test(
  "MongoDB crea el índice único y el índice TTL de RevokedToken",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async () => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(parsedUri.hostname));
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    const previousUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = testUri;
    try {
      // Solo crea los índices requeridos; no borra colecciones ni documentos.
      await connectDB();
      const indexes = await RevokedToken.collection.indexes();
      assert.ok(indexes.some((index) => index.key.jti === 1 && index.unique === true));
      assert.ok(indexes.some(
        (index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0,
      ));
    } finally {
      await mongoose.disconnect();
      if (previousUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousUri;
    }
  },
);