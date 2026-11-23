import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { roleRepository } from "../src/repositories/role.repository.js";
import { revokedTokenRepository } from "../src/repositories/revoked-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createAccessToken, verifyAccessToken } from "../src/utils/jwt.util.js";
import { hashPassword, verifyPassword } from "../src/utils/password.util.js";

test("El cambio de contraseña solo afecta a la cuenta autenticada", async () => {
  process.env.NODE_ENV = "development";
  process.env.AUTH_DISABLED = "true";
  process.env.JWT_SECRET = "test-secret-for-own-password-change-only";

  const adminId = String(new mongoose.Types.ObjectId());
  const clientId = String(new mongoose.Types.ObjectId());
  const users = new Map([
    [adminId, { _id: adminId, name: "Admin", email: "admin@example.invalid", active: true, deletedAt: null, tokenVersion: 0, role: { name: "ADMIN", active: true, deletedAt: null }, passwordHash: await hashPassword("admin-password") }],
    [clientId, { _id: clientId, name: "Cliente", email: "client@example.invalid", active: true, deletedAt: null, tokenVersion: 0, role: { name: "CLIENT", active: true, deletedAt: null }, passwordHash: await hashPassword("client-password") }],
  ]);
  const originals = {
    findById: userRepository.findById,
    findByIdForAuth: userRepository.findByIdForAuth,
    findByIdForPassword: userRepository.findByIdForPassword,
    findByEmailForAuth: userRepository.findByEmailForAuth,
    existsByEmail: userRepository.existsByEmail,
    create: userRepository.create,
    updatePasswordHash: userRepository.updatePasswordHash,
    updateById: userRepository.updateById,
    isRevoked: revokedTokenRepository.isRevoked,
    findRoleByName: roleRepository.findByName,
    findRoleById: roleRepository.findById,
  };

  // Los usuarios simulados evitan leer o modificar cuentas reales.
  userRepository.findById = async (id) => users.get(String(id));
  userRepository.findByIdForAuth = async (id) => users.get(String(id));
  userRepository.findByIdForPassword = async (id) => users.get(String(id));
  userRepository.findByEmailForAuth = async (email) =>
    [...users.values()].find((user) => user.email === email) || null;
  userRepository.existsByEmail = async (email) =>
    [...users.values()].some((user) => user.email === email);
  userRepository.create = async (data) => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      active: true,
      deletedAt: null,
      tokenVersion: 0,
      role: { name: "CLIENT", active: true, deletedAt: null },
    };
    users.set(String(user._id), user);
    const { tokenVersion, ...publicUser } = user;
    return publicUser;
  };
  const clientRoleId = new mongoose.Types.ObjectId();
  roleRepository.findByName = async (name) =>
    name === "CLIENT" ? { _id: clientRoleId, active: true, deletedAt: null } : null;
  roleRepository.findById = async (id) =>
    String(id) === String(clientRoleId) ? { _id: clientRoleId, name: "CLIENT", active: true, deletedAt: null } : null;
  userRepository.updatePasswordHash = async (id, currentHash, nextHash) => {
    const user = users.get(String(id));
    if (!user || user.passwordHash !== currentHash) return null;
    user.passwordHash = nextHash;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    return { _id: id };
  };
  userRepository.updateById = async (id, updates) => {
    const user = users.get(String(id));
    if (!user || user.deletedAt != null) return null;
    Object.assign(user, updates);
    if (Object.hasOwn(updates, "passwordHash")) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    return { ...user, passwordHash: undefined, tokenVersion: undefined };
  };
  revokedTokenRepository.isRevoked = async () => false;

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/api/auth/password`;
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const adminToken = createAccessToken(adminId);
  const clientToken = createAccessToken(clientId);
  const request = (token, body) => fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  try {
    const validBody = { currentPassword: "admin-password", newPassword: "new-admin-password" };
    assert.equal((await request(null, validBody)).status, 401);
    assert.equal((await request("token-invalido", validBody)).status, 401);
    assert.equal((await request(adminToken, { ...validBody, currentPassword: "wrong-password" })).status, 400);
    assert.equal((await request(adminToken, { ...validBody, newPassword: "corta" })).status, 400);
    assert.equal((await request(adminToken, { ...validBody, newPassword: "😀".repeat(4) })).status, 400);
    assert.equal((await request(adminToken, { ...validBody, newPassword: "á".repeat(37) })).status, 400);
    assert.equal((await request(adminToken, { ...validBody, userId: clientId })).status, 400);
    assert.equal(users.get(adminId).tokenVersion, 0);
    assert.equal(await verifyPassword("admin-password", users.get(adminId).passwordHash), true);

    const maximumUtf8Password = "é".repeat(36);
    const registration = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Utf8",
        email: "utf8@example.invalid",
        password: maximumUtf8Password,
      }),
    });
    assert.equal(registration.status, 201);
    const registered = await registration.json();
    assert.equal(Object.hasOwn(registered.user, "tokenVersion"), false);

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "utf8@example.invalid", password: maximumUtf8Password }),
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.email, "utf8@example.invalid");
    assert.equal((await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "utf8@example.invalid", password: "😀".repeat(4) }),
    })).status, 400);
    assert.equal((await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "utf8@example.invalid", password: "é".repeat(37) }),
    })).status, 400);

    const tooFewUnicodeCharacters = "😀".repeat(4);
    assert.equal((await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Corto",
        email: "short@example.invalid",
        password: tooFewUnicodeCharacters,
      }),
    })).status, 400);

    const adminResponse = await request(adminToken, validBody);
    assert.equal(adminResponse.status, 204);
    assert.equal(await adminResponse.text(), "");
    assert.equal(await verifyPassword("new-admin-password", users.get(adminId).passwordHash), true);
    assert.equal(users.get(adminId).tokenVersion, 1);
    assert.equal(await verifyPassword("client-password", users.get(clientId).passwordHash), true);
    assert.equal(verifyAccessToken(adminToken).sub, adminId);
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).status, 401);

    const clientResponse = await request(clientToken, {
      currentPassword: "client-password",
      newPassword: "á".repeat(36),
    });
    assert.equal(clientResponse.status, 204);
    assert.equal(await verifyPassword("á".repeat(36), users.get(clientId).passwordHash), true);
    assert.equal(await verifyPassword("new-admin-password", users.get(adminId).passwordHash), true);
    assert.equal(users.get(clientId).tokenVersion, 1);

    const currentAdminToken = createAccessToken(adminId, users.get(adminId).tokenVersion);
    const currentClientToken = createAccessToken(clientId, users.get(clientId).tokenVersion);
    const updateClient = (body) => fetch(`${baseUrl}/users/${clientId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${currentAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    assert.equal((await updateClient({ name: "Cliente editado", tokenVersion: 999 })).status, 200);
    assert.equal(users.get(clientId).tokenVersion, 1);
    assert.equal((await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${currentClientToken}` },
    })).status, 200);

    assert.equal((await updateClient({ password: "é".repeat(37) })).status, 400);
    assert.equal(users.get(clientId).tokenVersion, 1);
    assert.equal((await updateClient({ password: "é".repeat(36) })).status, 200);
    assert.equal(users.get(clientId).tokenVersion, 2);
    assert.equal((await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${currentClientToken}` },
    })).status, 401);
    assert.equal(await verifyPassword("é".repeat(36), users.get(clientId).passwordHash), true);
  } finally {
    Object.assign(userRepository, originals);
    revokedTokenRepository.isRevoked = originals.isRevoked;
    roleRepository.findByName = originals.findRoleByName;
    roleRepository.findById = originals.findRoleById;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});