import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import app from "../src/app.js";
import { RevokedToken } from "../src/models/revoked-token.model.js";
import { Role } from "../src/models/role.model.js";
import { User } from "../src/models/user.model.js";
import { authService } from "../src/services/auth.service.js";
import { hashPassword } from "../src/utils/password.util.js";
import { verifyAccessToken } from "../src/utils/jwt.util.js";

const testUri = process.env.MONGODB_TEST_URI;

test(
  "MongoDB revoca una sesión, conserva otras y versiona cambios de contraseña",
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
    };
    process.env.NODE_ENV = "test";
    process.env.AUTH_DISABLED = "true";
    process.env.JWT_SECRET = randomUUID().replaceAll("-", "").repeat(2);

    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    await Promise.all([
      RevokedToken.createIndexes(),
      Role.createIndexes(),
      User.createIndexes(),
    ]);

    const suffix = randomUUID().replaceAll("-", "");
    const clientRole = await Role.create({ name: `CLIENT_${suffix}` });
    let adminRole = await Role.findOne({ name: "ADMIN" });
    const createdAdminRole = !adminRole;
    if (!adminRole) adminRole = await Role.create({ name: "ADMIN" });
    const clientPassword = "client-test-password";
    const adminPassword = "admin-test-password";
    const client = await User.create({
      name: "Cliente temporal",
      email: `client-${suffix}@example.invalid`,
      passwordHash: await hashPassword(clientPassword),
      role: clientRole._id,
    });
    const admin = await User.create({
      name: "Admin temporal",
      email: `admin-${suffix}@example.invalid`,
      passwordHash: await hashPassword(adminPassword),
      role: adminRole._id,
    });

    let server;
    try {
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      const request = (path, token, method = "GET", body) => fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const firstSession = await authService.login({ email: client.email, password: clientPassword });
      const secondSession = await authService.login({ email: client.email, password: clientPassword });
      const firstJti = verifyAccessToken(firstSession.token).jti;
      assert.notEqual(firstJti, verifyAccessToken(secondSession.token).jti);
      assert.equal((await request("/auth/me", firstSession.token)).status, 200);
      assert.equal((await request("/auth/me", secondSession.token)).status, 200);

      assert.equal((await request("/auth/logout", firstSession.token, "POST")).status, 204);
      assert.equal(await RevokedToken.exists({ jti: firstJti, user: client._id }) !== null, true);
      assert.equal((await request("/auth/me", firstSession.token)).status, 401);
      assert.equal((await request("/auth/me", secondSession.token)).status, 200);

      const concurrentSession = await authService.login({
        email: client.email,
        password: clientPassword,
      });
      const concurrentJti = verifyAccessToken(concurrentSession.token).jti;
      const concurrentLogouts = await Promise.all([
        request("/auth/logout", concurrentSession.token, "POST"),
        request("/auth/logout", concurrentSession.token, "POST"),
      ]);
      assert.ok(concurrentLogouts.some((response) => response.status === 204));
      assert.ok(concurrentLogouts.every((response) => [204, 401].includes(response.status)));
      assert.equal(await RevokedToken.countDocuments({ jti: concurrentJti }), 1);
      assert.equal((await request("/auth/me", concurrentSession.token)).status, 401);
      assert.equal((await request("/auth/me", secondSession.token)).status, 200);

      const adminSession = await authService.login({ email: admin.email, password: adminPassword });
      const nameChange = await request(
        `/users/${client._id}`,
        adminSession.token,
        "PATCH",
        { name: "Cliente renombrado" },
      );
      assert.equal(nameChange.status, 200);
      assert.equal((await request("/auth/me", secondSession.token)).status, 200);

      const adminPasswordUpdate = await request(
        `/users/${client._id}`,
        adminSession.token,
        "PATCH",
        { password: "new-admin-set-password" },
      );
      assert.equal(adminPasswordUpdate.status, 200);
      assert.equal((await request("/auth/me", secondSession.token)).status, 401);

      const clientSessionAfterAdminChange = await authService.login({
        email: client.email,
        password: "new-admin-set-password",
      });
      assert.equal((await request("/auth/me", clientSessionAfterAdminChange.token)).status, 200);

      const ownPasswordUpdate = await request(
        "/auth/password",
        clientSessionAfterAdminChange.token,
        "PATCH",
        { currentPassword: "new-admin-set-password", newPassword: "new-own-password" },
      );
      assert.equal(ownPasswordUpdate.status, 204);
      assert.equal((await request("/auth/me", clientSessionAfterAdminChange.token)).status, 401);
      const finalSession = await authService.login({
        email: client.email,
        password: "new-own-password",
      });
      assert.equal((await request("/auth/me", finalSession.token)).status, 200);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await RevokedToken.deleteMany({ user: { $in: [client._id, admin._id] } });
      await User.deleteMany({ _id: { $in: [client._id, admin._id] } });
      await Role.deleteMany({ _id: clientRole._id });
      if (createdAdminRole) await Role.deleteMany({ _id: adminRole._id });
      await mongoose.disconnect();
      for (const [key, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);