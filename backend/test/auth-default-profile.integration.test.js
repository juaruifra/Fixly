import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import app from "../src/app.js";
import { Image } from "../src/models/image.model.js";
import { Profile } from "../src/models/profile.model.js";
import { Role } from "../src/models/role.model.js";
import { User } from "../src/models/user.model.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

const testUri = process.env.MONGODB_TEST_URI;

test(
  "MongoDB conserva defaultProfile, propiedad y limpieza selectiva al borrar",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async () => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(parsedUri.hostname));
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    const previousEnvironment = {
      NODE_ENV: process.env.NODE_ENV,
      AUTH_DISABLED: process.env.AUTH_DISABLED,
      JWT_SECRET: process.env.JWT_SECRET,
      MONGODB_URI: process.env.MONGODB_URI,
    };
    process.env.NODE_ENV = "test";
    process.env.AUTH_DISABLED = "true";
    process.env.JWT_SECRET = randomUUID().replaceAll("-", "").repeat(2);
    process.env.MONGODB_URI = testUri;

    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    await Promise.all([
      Image.createIndexes(),
      Profile.createIndexes(),
      Role.createIndexes(),
      User.createIndexes(),
    ]);

    const suffix = randomUUID().replaceAll("-", "");
    const role = await Role.create({ name: `CLIENT_${suffix}` });
    const owner = await User.create({
      name: "Cliente temporal",
      email: `owner-${suffix}@example.invalid`,
      passwordHash: "test-hash-not-used-by-this-test",
      role: role._id,
    });
    const otherOwner = await User.create({
      name: "Otro cliente temporal",
      email: `other-${suffix}@example.invalid`,
      passwordHash: "test-hash-not-used-by-this-test",
      role: role._id,
    });
    const ownedProfile = await Profile.create({ owner: owner._id, name: "Casa" });
    const secondaryProfile = await Profile.create({ owner: owner._id, name: "Trabajo" });
    const foreignProfile = await Profile.create({ owner: otherOwner._id, name: "Ajeno" });

    let server;
    try {
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      const token = createAccessToken(owner._id, 0);
      const headers = { Authorization: `Bearer ${token}` };
      const request = (path, method = "GET", body) => fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...headers,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const initial = await request("/auth/me");
      assert.equal(initial.status, 200);
      const initialUser = await initial.json();
      assert.equal(initialUser.defaultProfile, null);
      assert.equal(Object.hasOwn(initialUser, "tokenVersion"), false);

      const edited = await request("/auth/me", "PATCH", {
        name: "  Nombre actualizado  ",
        email: ` OWNER-${suffix}@EXAMPLE.INVALID `,
      });
      assert.equal(edited.status, 200);
      const editedUser = await edited.json();
      assert.equal(editedUser.name, "Nombre actualizado");
      assert.equal(editedUser.email, `owner-${suffix}@example.invalid`);
      assert.equal((await request("/auth/me")).status, 200);

      assert.equal((await request("/auth/me", "PATCH", { email: otherOwner.email })).status, 409);
      assert.equal((await request("/auth/me", "PATCH", { role: "ADMIN" })).status, 400);
      assert.equal((await request("/auth/me", "PATCH", { defaultProfile: String(ownedProfile._id) })).status, 400);

      const selected = await request("/auth/me/default-profile", "PATCH", {
        profileId: String(ownedProfile._id),
      });
      assert.equal(selected.status, 200);
      assert.equal((await selected.json()).defaultProfile, String(ownedProfile._id));
      assert.equal((await request("/auth/me/default-profile", "PATCH", {
        profileId: String(foreignProfile._id),
      })).status, 404);
      assert.equal((await request("/auth/me/default-profile", "PATCH", {
        profileId: null,
      })).status, 200);

      await request("/auth/me/default-profile", "PATCH", { profileId: String(ownedProfile._id) });
      assert.equal((await request(`/profiles/${secondaryProfile._id}`, "DELETE")).status, 204);
      assert.equal(String((await User.findById(owner._id).select("defaultProfile").lean()).defaultProfile), String(ownedProfile._id));

      assert.equal((await request(`/profiles/${ownedProfile._id}`, "DELETE")).status, 204);
      const afterDelete = await User.findById(owner._id).select("defaultProfile").lean();
      assert.equal(afterDelete.defaultProfile, null);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      const profileIds = [ownedProfile._id, secondaryProfile._id, foreignProfile._id];
      await Image.deleteMany({ entityType: "profile", entityId: { $in: profileIds } });
      await Profile.deleteMany({ _id: { $in: profileIds } });
      await User.deleteMany({ _id: { $in: [owner._id, otherOwner._id] } });
      await Role.deleteOne({ _id: role._id });
      await mongoose.disconnect();
      for (const [key, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);