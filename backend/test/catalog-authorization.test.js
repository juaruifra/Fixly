import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { categoryService } from "../src/services/category.service.js";
import { serviceService } from "../src/services/service.service.js";
import { variantService } from "../src/services/variant.service.js";
import { revokedTokenRepository } from "../src/repositories/revoked-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

test("El catálogo público sigue abierto y la administración exige ADMIN", async () => {
  process.env.NODE_ENV = "test";
  process.env.AUTH_DISABLED = "true";
  process.env.JWT_SECRET = "test-secret-for-catalog-authorization-only";
  const adminId = new mongoose.Types.ObjectId();
  const clientId = new mongoose.Types.ObjectId();
  const originalFindUser = userRepository.findById;
  const originalFindUserForAuth = userRepository.findByIdForAuth;
  const originalIsRevoked = revokedTokenRepository.isRevoked;
  const originalMethods = [
    [categoryService, "listAvailable"],
    [categoryService, "getAvailableBySlug"],
    [categoryService, "list"],
    [categoryService, "create"],
    [categoryService, "update"],
    [categoryService, "remove"],
    [serviceService, "listPublic"],
    [serviceService, "getPublicBySlug"],
    [serviceService, "list"],
    [serviceService, "create"],
    [serviceService, "update"],
    [serviceService, "remove"],
    [variantService, "listPublic"],
    [variantService, "list"],
    [variantService, "create"],
    [variantService, "update"],
    [variantService, "remove"],
  ].map(([service, name]) => [service, name, service[name]]);

  // Las respuestas simuladas permiten probar los guardas sin conectar a MongoDB.
  userRepository.findById = async (id) => ({
    _id: id,
    name: "Test",
    email: "test@example.invalid",
    active: true,
    deletedAt: null,
    role: { name: String(id) === String(adminId) ? "ADMIN" : "CLIENT", active: true, deletedAt: null },
  });
  userRepository.findByIdForAuth = userRepository.findById;
  revokedTokenRepository.isRevoked = async () => false;
  categoryService.listAvailable = async () => [];
  categoryService.getAvailableBySlug = async () => ({ name: "Test" });
  categoryService.list = async () => [];
  serviceService.listPublic = async () => [];
  serviceService.getPublicBySlug = async () => ({ name: "Test" });
  serviceService.list = async () => [];
  variantService.listPublic = async () => [];
  variantService.list = async () => [];
  for (const service of [categoryService, serviceService, variantService]) {
    service.create = async (data) => data;
    service.update = async (_id, data) => data;
    service.remove = async () => {};
  }

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const adminHeaders = { Authorization: `Bearer ${createAccessToken(adminId)}` };
  const clientHeaders = { Authorization: `Bearer ${createAccessToken(clientId)}` };

  try {
    for (const path of [
      "/categories/available",
      "/categories/slug/test",
      "/services/public",
      "/services/slug/test",
      "/variants/public",
    ]) {
      assert.equal((await fetch(`${baseUrl}${path}`)).status, 200, path);
    }

    for (const path of ["/categories", "/services", "/variants"]) {
      assert.equal((await fetch(`${baseUrl}${path}`)).status, 401, path);
      assert.equal((await fetch(`${baseUrl}${path}`, { headers: clientHeaders })).status, 403, path);
      assert.equal((await fetch(`${baseUrl}${path}`, { headers: adminHeaders })).status, 200, path);
      assert.equal((await fetch(`${baseUrl}${path}`, { method: "POST" })).status, 401, path);
      assert.equal((await fetch(`${baseUrl}${path}`, { method: "POST", headers: clientHeaders })).status, 403, path);
    }

    const id = "507f1f77bcf86cd799439011";
    const adminJsonHeaders = { ...adminHeaders, "Content-Type": "application/json" };
    const createPayloads = [
      ["/categories", { name: "Categoría" }],
      ["/services", { name: "Servicio", category: id }],
      ["/variants", { name: "Variante", service: id, price: 10, duration: 30 }],
    ];
    for (const [path, body] of createPayloads) {
      assert.equal((await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: adminJsonHeaders,
        body: JSON.stringify(body),
      })).status, 201, path);
      assert.equal((await fetch(`${baseUrl}${path}/${id}`, {
        method: "PATCH",
        headers: adminJsonHeaders,
        body: JSON.stringify({ name: "Actualizado" }),
      })).status, 200, path);
      assert.equal((await fetch(`${baseUrl}${path}/${id}`, {
        method: "DELETE",
        headers: adminHeaders,
      })).status, 204, path);
    }

    for (const field of ["price", "duration"]) {
      const fieldValue = field === "price" ? 10 : 30;
      const createResponse = await fetch(`${baseUrl}/services`, {
        method: "POST",
        headers: adminJsonHeaders,
        body: JSON.stringify({
          name: "Servicio inválido",
          category: id,
          [field]: fieldValue,
        }),
      });
      assert.equal(createResponse.status, 400, `POST /services rejects ${field}`);

      const updateResponse = await fetch(`${baseUrl}/services/${id}`, {
        method: "PATCH",
        headers: adminJsonHeaders,
        body: JSON.stringify({ [field]: fieldValue }),
      });
      assert.equal(updateResponse.status, 400, `PATCH /services rejects ${field}`);
    }

    const protectedOperations = [
      ["GET", `/categories/${id}`],
      ["PATCH", `/categories/${id}`],
      ["PATCH", `/categories/${id}/active`],
      ["PATCH", `/categories/${id}/restore`],
      ["DELETE", `/categories/${id}`],
      ["GET", `/services/${id}`],
      ["PATCH", `/services/${id}`],
      ["PATCH", `/services/${id}/active`],
      ["PATCH", `/services/${id}/status`],
      ["PATCH", `/services/${id}/restore`],
      ["DELETE", `/services/${id}`],
      ["GET", `/variants/${id}`],
      ["GET", `/variants/service/${id}`],
      ["PATCH", `/variants/${id}`],
      ["PATCH", `/variants/${id}/active`],
      ["PATCH", `/variants/${id}/status`],
      ["PATCH", `/variants/${id}/restore`],
      ["DELETE", `/variants/${id}`],
    ];
    for (const [method, path] of protectedOperations) {
      assert.equal((await fetch(`${baseUrl}${path}`, { method })).status, 401, `${method} ${path}`);
      assert.equal((await fetch(`${baseUrl}${path}`, { method, headers: clientHeaders })).status, 403, `${method} ${path}`);
    }
    assert.equal(
      (await fetch(`${baseUrl}/services`, { headers: { Authorization: "Bearer token-invalido" } })).status,
      401,
    );
  } finally {
    userRepository.findById = originalFindUser;
    userRepository.findByIdForAuth = originalFindUserForAuth;
    revokedTokenRepository.isRevoked = originalIsRevoked;
    for (const [service, name, original] of originalMethods) service[name] = original;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});