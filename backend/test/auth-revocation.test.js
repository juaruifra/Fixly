import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { RevokedToken } from "../src/models/revoked-token.model.js";
import { revokedTokenRepository } from "../src/repositories/revoked-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { authService } from "../src/services/auth.service.js";
import { userService } from "../src/services/user.service.js";
import { swaggerSpec } from "../src/config/swagger.js";
import { createAccessToken, verifyAccessToken } from "../src/utils/jwt.util.js";

test("La revocación afecta solo a un jti y la autenticación falla cerrada", async () => {
  process.env.NODE_ENV = "development";
  process.env.AUTH_DISABLED = "true";
  process.env.JWT_SECRET = "test-secret-for-revocation-flow-only-2026";

  const userId = String(new mongoose.Types.ObjectId());
  const user = {
    _id: userId,
    name: "Cliente",
    email: "client@example.invalid",
    active: true,
    deletedAt: null,
    tokenVersion: 0,
    role: { name: "CLIENT", active: true, deletedAt: null },
  };
  const revoked = new Map();
  const originals = {
    findById: userRepository.findById,
    findByIdForAuth: userRepository.findByIdForAuth,
    isRevoked: revokedTokenRepository.isRevoked,
    revoke: revokedTokenRepository.revoke,
    authenticate: userService.authenticate,
    register: userService.register,
  };

  userRepository.findById = async (id) => String(id) === userId ? user : null;
  userRepository.findByIdForAuth = userRepository.findById;
  revokedTokenRepository.isRevoked = async (jti) => revoked.has(jti);
  revokedTokenRepository.revoke = async ({ jti, user: owner, expiresAt }) => {
    if (!revoked.has(jti)) revoked.set(jti, { user: String(owner), expiresAt });
  };
  userService.authenticate = async () => ({ ...user, tokenVersion: user.tokenVersion });
  userService.register = async () => ({ _id: userId });

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, token, method = "GET") => fetch(`${baseUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  try {
    const originalDateNow = Date.now;
    Date.now = () => 1_800_000_000_000;
    const firstLogin = await authService.login({ email: user.email, password: "unused" });
    const secondLogin = await authService.login({ email: user.email, password: "unused" });
    Date.now = originalDateNow;
    const firstPayload = verifyAccessToken(firstLogin.token);
    const secondPayload = verifyAccessToken(secondLogin.token);
    assert.equal(firstPayload.iat, secondPayload.iat);
    assert.notEqual(firstPayload.jti, secondPayload.jti);
    assert.equal(firstPayload.tokenVersion, 0);
    assert.equal(secondPayload.tokenVersion, 0);
    assert.equal(Object.hasOwn(firstLogin.user, "tokenVersion"), false);

    const registered = await authService.register({});
    assert.equal(verifyAccessToken(registered.token).tokenVersion, 0);
    assert.equal(Object.hasOwn(registered.user, "tokenVersion"), false);
    assert.ok(swaggerSpec.paths["/api/auth/logout"]?.post);

    const legacyToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const expiredToken = jwt.sign(
      { sub: userId, jti: "90bde7f5-77c1-44bb-8a8a-e8946c8c9144", tokenVersion: 0 },
      process.env.JWT_SECRET,
      { expiresIn: -1 },
    );
    assert.equal((await request("/auth/me", null)).status, 401);
    assert.equal((await request("/auth/me", legacyToken)).status, 401);
    assert.equal((await request("/auth/me", expiredToken)).status, 401);
    assert.equal((await request("/auth/me", firstLogin.token)).status, 200);
    assert.equal((await request("/auth/me", secondLogin.token)).status, 200);
    const loginAfterLogout = await authService.login({ email: user.email, password: "unused" });
    assert.equal((await request("/auth/me", loginAfterLogout.token)).status, 200);

    const concurrentLogout = await Promise.all([
      request("/auth/logout", firstLogin.token, "POST"),
      request("/auth/logout", firstLogin.token, "POST"),
    ]);
    assert.ok(concurrentLogout.some((response) => response.status === 204));
    assert.ok(concurrentLogout.every((response) => [204, 401].includes(response.status)));
    assert.equal(revoked.size, 1);
    assert.equal(revoked.get(firstPayload.jti).user, userId);
    assert.ok(revoked.get(firstPayload.jti).expiresAt instanceof Date);
    for (const path of ["/auth/me", "/categories", "/roles", "/profiles", "/cart", "/orders", "/images"]) {
      assert.equal((await request(path, firstLogin.token)).status, 401, path);
    }
    assert.equal((await request("/auth/me", secondLogin.token)).status, 200);
    assert.equal((await request("/auth/logout", firstLogin.token, "POST")).status, 401);

    user.tokenVersion = 1;
    assert.equal((await request("/auth/me", secondLogin.token)).status, 401);
    const newVersionToken = createAccessToken(userId, 1);
    assert.equal((await request("/auth/me", newVersionToken)).status, 200);

    revokedTokenRepository.isRevoked = async () => {
      throw new Error("database unavailable");
    };
    assert.equal((await request("/auth/me", newVersionToken)).status, 500);
  } finally {
    userRepository.findById = originals.findById;
    userRepository.findByIdForAuth = originals.findByIdForAuth;
    revokedTokenRepository.isRevoked = originals.isRevoked;
    revokedTokenRepository.revoke = originals.revoke;
    userService.authenticate = originals.authenticate;
    userService.register = originals.register;
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
});

test("RevokedToken declara índices único y TTL", () => {
  const indexes = RevokedToken.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.jti === 1 && options.unique));
  assert.ok(indexes.some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0));
});

test("Los cambios de contraseña incrementan tokenVersion en la misma actualización", () => {
  const userId = new mongoose.Types.ObjectId();
  const adminPasswordUpdate = userRepository.updateById(userId, { passwordHash: "nuevo-hash" });
  assert.deepEqual(adminPasswordUpdate.getUpdate(), {
    $set: { passwordHash: "nuevo-hash" },
    $inc: { tokenVersion: 1 },
  });

  const ownPasswordUpdate = userRepository.updatePasswordHash(
    userId,
    "hash-anterior",
    "hash-nuevo",
  );
  assert.deepEqual(ownPasswordUpdate.getUpdate(), {
    $set: { passwordHash: "hash-nuevo" },
    $inc: { tokenVersion: 1 },
  });

  assert.deepEqual(
    userRepository.updateById(userId, { name: "Nombre actualizado" }).getUpdate(),
    { $set: { name: "Nombre actualizado" } },
  );
});

test("La revocación usa upsert y tolera una carrera de clave duplicada", async () => {
  const originalUpdateOne = RevokedToken.updateOne;
  const originalExists = RevokedToken.exists;
  const jti = "d6d32b35-3884-4d81-8506-a345b2be54e3";
  const ownerId = new mongoose.Types.ObjectId();
  const expiresAt = new Date(Date.now() + 60_000);
  let updateCall;

  try {
    RevokedToken.updateOne = async (...args) => {
      updateCall = args;
      return { upsertedCount: 1 };
    };
    await revokedTokenRepository.revoke({ jti, user: ownerId, expiresAt });
    assert.deepEqual(updateCall[0], { jti });
    assert.deepEqual(updateCall[1], { $setOnInsert: { jti, user: ownerId, expiresAt } });
    assert.equal(updateCall[2].upsert, true);

    const duplicateError = Object.assign(new Error("duplicate key"), {
      code: 11000,
      keyPattern: { jti: 1 },
    });
    RevokedToken.updateOne = async () => { throw duplicateError; };
    RevokedToken.exists = async (query) => query.jti === jti ? { _id: ownerId } : null;
    await revokedTokenRepository.revoke({ jti, user: ownerId, expiresAt });

    RevokedToken.exists = async () => null;
    await assert.rejects(
      revokedTokenRepository.revoke({ jti, user: ownerId, expiresAt }),
      duplicateError,
    );
  } finally {
    RevokedToken.updateOne = originalUpdateOne;
    RevokedToken.exists = originalExists;
  }
});