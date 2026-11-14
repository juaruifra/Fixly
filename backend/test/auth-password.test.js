import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
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
    [adminId, { _id: adminId, name: "Admin", email: "admin@example.invalid", active: true, deletedAt: null, role: { name: "ADMIN", active: true, deletedAt: null }, passwordHash: await hashPassword("admin-password") }],
    [clientId, { _id: clientId, name: "Cliente", email: "client@example.invalid", active: true, deletedAt: null, role: { name: "CLIENT", active: true, deletedAt: null }, passwordHash: await hashPassword("client-password") }],
  ]);
  const originals = {
    findById: userRepository.findById,
    findByIdForPassword: userRepository.findByIdForPassword,
    updatePasswordHash: userRepository.updatePasswordHash,
  };

  // Los usuarios simulados evitan leer o modificar cuentas reales.
  userRepository.findById = async (id) => users.get(String(id));
  userRepository.findByIdForPassword = async (id) => users.get(String(id));
  userRepository.updatePasswordHash = async (id, currentHash, nextHash) => {
    const user = users.get(String(id));
    if (!user || user.passwordHash !== currentHash) return null;
    user.passwordHash = nextHash;
    return { _id: id };
  };

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/api/auth/password`;
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
    assert.equal((await request(adminToken, { ...validBody, newPassword: "á".repeat(37) })).status, 400);
    assert.equal((await request(adminToken, { ...validBody, userId: clientId })).status, 400);
    assert.equal(await verifyPassword("admin-password", users.get(adminId).passwordHash), true);

    const adminResponse = await request(adminToken, validBody);
    assert.equal(adminResponse.status, 204);
    assert.equal(await adminResponse.text(), "");
    assert.equal(await verifyPassword("new-admin-password", users.get(adminId).passwordHash), true);
    assert.equal(await verifyPassword("client-password", users.get(clientId).passwordHash), true);
    assert.equal(verifyAccessToken(adminToken).sub, adminId);

    const clientResponse = await request(clientToken, {
      currentPassword: "client-password",
      newPassword: "new-client-password",
    });
    assert.equal(clientResponse.status, 204);
    assert.equal(await verifyPassword("new-client-password", users.get(clientId).passwordHash), true);
    assert.equal(await verifyPassword("new-admin-password", users.get(adminId).passwordHash), true);
  } finally {
    Object.assign(userRepository, originals);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});