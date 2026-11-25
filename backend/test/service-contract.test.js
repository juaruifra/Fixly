import assert from "node:assert/strict";
import test from "node:test";

import { Category } from "../src/models/category.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { categoryRepository } from "../src/repositories/category.repository.js";
import { serviceRepository } from "../src/repositories/service.repository.js";
import { serviceService } from "../src/services/service.service.js";

test("las consultas de Service excluyen precio y duración históricos", async () => {
  const serviceId = "507f1f77bcf86cd799439011";
  const originalCategoryFind = Category.find;
  const originalServiceFind = Service.find;
  const originalServiceFindOne = Service.findOne;
  const publicProjections = [];

  Category.find = () => ({ distinct: async () => [] });
  const createPublicQuery = () => {
    let projection;
    const query = {
      select(fields) {
        projection = fields;
        return this;
      },
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      lean() {
        publicProjections.push(projection);
        return Promise.resolve([]);
      },
    };
    return query;
  };
  Service.find = createPublicQuery;
  Service.findOne = createPublicQuery;

  try {
    await serviceRepository.findPublic();
    await serviceRepository.findPublicBySlug("limpieza_de_viviendas");
  } finally {
    Category.find = originalCategoryFind;
    Service.find = originalServiceFind;
    Service.findOne = originalServiceFindOne;
  }

  const queries = [
    serviceRepository.findAll(),
    serviceRepository.findById(serviceId),
    serviceRepository.updateById(serviceId, { name: "Servicio actualizado" }),
    serviceRepository.softDeleteById(serviceId, new Date()),
    serviceRepository.restoreById(serviceId),
    serviceRepository.setActiveById(serviceId, false),
    serviceRepository.setStatusById(serviceId, "paused"),
  ];

  for (const query of queries) {
    assert.deepEqual(query.projection(), { "-price": 0, "-duration": 0 });
  }
  assert.equal(Service.schema.path("price"), undefined);
  assert.equal(Service.schema.path("duration"), undefined);
  assert.ok(Variant.schema.path("price"));
  assert.ok(Variant.schema.path("duration"));
  assert.deepEqual(publicProjections, ["-price -duration", "-price -duration"]);
});

test("Service rechaza precio y duración y se crea sin ellos", async () => {
  const serviceId = "507f1f77bcf86cd799439011";

  await assert.rejects(
    serviceService.create({ name: "Servicio", category: serviceId, price: 10 }),
    (error) => error.status === 400,
  );
  await assert.rejects(
    serviceService.update(serviceId, { duration: 30 }),
    (error) => error.status === 400,
  );

  const originalFindCategory = categoryRepository.findById;
  const originalExistsBySlug = serviceRepository.existsBySlug;
  const originalCreate = serviceRepository.create;
  categoryRepository.findById = async () => ({ active: true, deletedAt: null });
  serviceRepository.existsBySlug = async () => false;
  serviceRepository.create = async (data) => data;

  try {
    const created = await serviceService.create({
      name: "Servicio sin precio propio",
      category: serviceId,
    });
    assert.equal(created.name, "Servicio sin precio propio");
    assert.equal(Object.hasOwn(created, "price"), false);
    assert.equal(Object.hasOwn(created, "duration"), false);
  } finally {
    categoryRepository.findById = originalFindCategory;
    serviceRepository.existsBySlug = originalExistsBySlug;
    serviceRepository.create = originalCreate;
  }
});