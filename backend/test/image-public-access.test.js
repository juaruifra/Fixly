import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { Category } from "../src/models/category.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { imageRepository } from "../src/repositories/image.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { imageService } from "../src/services/image.service.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

test("Las imágenes públicas respetan visibilidad y las internas requieren ADMIN", async () => {
  process.env.NODE_ENV = "test";
  process.env.AUTH_DISABLED = "false";
  process.env.JWT_SECRET = "test-secret-for-image-authorization-only";

  const ids = Object.fromEntries(
    ["admin", "client", "category", "hiddenCategory", "service", "draftService", "hiddenService", "variant", "pausedVariant", "hiddenVariant"].map(
      (name) => [name, new mongoose.Types.ObjectId()],
    ),
  );
  const categories = [
    { _id: ids.category, active: true, deletedAt: null },
    { _id: ids.hiddenCategory, active: false, deletedAt: null },
  ];
  const services = [
    { _id: ids.service, category: ids.category, active: true, status: "published", deletedAt: null },
    { _id: ids.draftService, category: ids.category, active: true, status: "draft", deletedAt: null },
    { _id: ids.hiddenService, category: ids.hiddenCategory, active: true, status: "published", deletedAt: null },
  ];
  const variants = [
    { _id: ids.variant, service: ids.service, active: true, status: "published", deletedAt: null },
    { _id: ids.pausedVariant, service: ids.service, active: true, status: "paused", deletedAt: null },
    { _id: ids.hiddenVariant, service: ids.hiddenService, active: true, status: "published", deletedAt: null },
  ];
  const originals = {
    categoryExists: Category.exists,
    serviceFindOne: Service.findOne,
    variantFindOne: Variant.findOne,
    findImages: imageRepository.findByEntity,
    findUser: userRepository.findById,
    createImage: imageService.create,
    updateImage: imageService.update,
    removeImage: imageService.remove,
  };

  // Simulamos los modelos y conservamos las condiciones que construye el repositorio.
  function matches(record, query) {
    return Object.entries(query).every(([key, value]) =>
      key === "_id" ? String(record[key]) === String(value) : record[key] === value,
    );
  }
  function findOne(records, query) {
    return { select: () => ({ lean: async () => records.find((item) => matches(item, query)) || null }) };
  }
  Category.exists = async (query) => categories.find((item) => matches(item, query)) || null;
  Service.findOne = (query) => findOne(services, query);
  Variant.findOne = (query) => findOne(variants, query);
  imageRepository.findByEntity = async () => [{ url: "https://example.invalid/image.jpg", alt: "Imagen" }];
  imageService.create = async (data) => data;
  imageService.update = async (_id, data) => data;
  imageService.remove = async () => {};
  userRepository.findById = async (id) => ({
    _id: id,
    name: "Test",
    email: "test@example.invalid",
    active: true,
    deletedAt: null,
    role: { name: String(id) === String(ids.admin) ? "ADMIN" : "CLIENT", active: true, deletedAt: null },
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/images`;
  const adminHeaders = { Authorization: `Bearer ${createAccessToken(ids.admin)}` };
  const clientHeaders = { Authorization: `Bearer ${createAccessToken(ids.client)}` };

  try {
    for (const [type, id] of [["category", ids.category], ["service", ids.service], ["variant", ids.variant]]) {
      const response = await fetch(`${baseUrl}/public/entity/${type}/${id}`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).length, 1);
    }
    for (const [type, id] of [
      ["category", ids.hiddenCategory],
      ["service", ids.draftService],
      ["service", ids.hiddenService],
      ["variant", ids.pausedVariant],
      ["variant", ids.hiddenVariant],
    ]) {
      assert.equal((await fetch(`${baseUrl}/public/entity/${type}/${id}`)).status, 404);
    }

    // También se ocultan imágenes cuando se desactiva o elimina una relación pública.
    categories[0].deletedAt = new Date();
    assert.equal((await fetch(`${baseUrl}/public/entity/category/${ids.category}`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/public/entity/service/${ids.service}`)).status, 404);
    categories[0].deletedAt = null;
    services[0].active = false;
    assert.equal((await fetch(`${baseUrl}/public/entity/service/${ids.service}`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/public/entity/variant/${ids.variant}`)).status, 404);
    services[0].active = true;
    services[0].deletedAt = new Date();
    assert.equal((await fetch(`${baseUrl}/public/entity/variant/${ids.variant}`)).status, 404);
    services[0].deletedAt = null;
    variants[0].active = false;
    assert.equal((await fetch(`${baseUrl}/public/entity/variant/${ids.variant}`)).status, 404);
    variants[0].active = true;
    variants[0].deletedAt = new Date();
    assert.equal((await fetch(`${baseUrl}/public/entity/variant/${ids.variant}`)).status, 404);

    assert.equal((await fetch(`${baseUrl}/public/entity/profile/${ids.category}`)).status, 400);

    const internalPath = `${baseUrl}/entity/category/${ids.category}`;
    assert.equal((await fetch(internalPath)).status, 401);
    assert.equal((await fetch(internalPath, { headers: clientHeaders })).status, 403);
    assert.equal((await fetch(internalPath, { headers: adminHeaders })).status, 200);
    for (const path of [baseUrl, `${baseUrl}/${ids.category}`]) {
      assert.equal((await fetch(path)).status, 401);
      assert.equal((await fetch(path, { headers: clientHeaders })).status, 403);
    }
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const path = method === "POST" ? baseUrl : `${baseUrl}/${ids.category}`;
      assert.equal((await fetch(path, { method })).status, 401);
      assert.equal((await fetch(path, { method, headers: clientHeaders })).status, 403);
    }

    const adminJsonHeaders = { ...adminHeaders, "Content-Type": "application/json" };
    assert.equal((await fetch(baseUrl, {
      method: "POST",
      headers: adminJsonHeaders,
      body: JSON.stringify({ entityType: "category", entityId: String(ids.category), url: "https://example.invalid/image.jpg", alt: "Imagen" }),
    })).status, 201);
    assert.equal((await fetch(`${baseUrl}/${ids.category}`, {
      method: "PATCH",
      headers: adminJsonHeaders,
      body: JSON.stringify({ alt: "Nueva descripción" }),
    })).status, 200);
    assert.equal((await fetch(`${baseUrl}/${ids.category}`, {
      method: "DELETE",
      headers: adminHeaders,
    })).status, 204);
  } finally {
    Category.exists = originals.categoryExists;
    Service.findOne = originals.serviceFindOne;
    Variant.findOne = originals.variantFindOne;
    imageRepository.findByEntity = originals.findImages;
    userRepository.findById = originals.findUser;
    imageService.create = originals.createImage;
    imageService.update = originals.updateImage;
    imageService.remove = originals.removeImage;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});