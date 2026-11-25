import assert from "node:assert/strict";
import test from "node:test";

import app from "../src/app.js";
import { swaggerSpec } from "../src/config/swagger.js";
import { Category } from "../src/models/category.model.js";
import { Image } from "../src/models/image.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { homeRepository } from "../src/repositories/home.repository.js";
import { homeService } from "../src/services/home.service.js";

test("Home devuelve las categorías mediante una ruta pública", async () => {
  const originalListCategories = homeService.listCategories;
  const categories = [
    {
      name: "Fontanería",
      slug: "fontaneria",
      image: { url: "https://example.invalid/fontaneria.jpg", alt: "Grifo" },
    },
  ];
  homeService.listCategories = async () => categories;

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/home/categories`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), categories);
  } finally {
    homeService.listCategories = originalListCategories;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("Swagger documenta Home como endpoint público", () => {
  const operation = swaggerSpec.paths["/api/home/categories"]?.get;

  assert.ok(operation);
  assert.equal(operation.security, undefined);
  assert.deepEqual(
    operation.responses["200"].content["application/json"].schema,
    {
      type: "array",
      items: { $ref: "#/components/schemas/HomeCategory" },
    },
  );
  assert.ok(swaggerSpec.components.schemas.HomeCategory);
});

test("Home consulta solo entidades elegibles y limita las relaciones", async () => {
  const originalAggregate = Service.aggregate;
  let pipeline;
  Service.aggregate = (stages) => {
    pipeline = stages;
    return { exec: async () => [] };
  };

  try {
    assert.deepEqual(await homeRepository.findAvailableCategories(), []);
  } finally {
    Service.aggregate = originalAggregate;
  }

  assert.deepEqual(pipeline[0], {
    $match: { active: true, status: "published", deletedAt: null },
  });

  const variantLookup = pipeline.find(
    (stage) => stage.$lookup?.from === Variant.collection.name,
  ).$lookup;
  const variantMatch = variantLookup.pipeline[0].$match;
  assert.deepEqual(
    {
      active: variantMatch.active,
      status: variantMatch.status,
      deletedAt: variantMatch.deletedAt,
    },
    { active: true, status: "published", deletedAt: null },
  );
  assert.ok(variantLookup.pipeline.some((stage) => stage.$limit === 1));
  assert.ok(pipeline.some((stage) => stage.$group?._id === "$category"));

  const categoryLookup = pipeline.find(
    (stage) => stage.$lookup?.from === Category.collection.name,
  ).$lookup;
  assert.equal(categoryLookup.localField, "_id");
  assert.equal(categoryLookup.foreignField, "_id");

  const imageLookup = pipeline.find(
    (stage) => stage.$lookup?.from === Image.collection.name,
  ).$lookup;
  assert.deepEqual(imageLookup.pipeline[1], {
    $sort: { createdAt: 1, _id: 1 },
  });
  assert.ok(imageLookup.pipeline.some((stage) => stage.$limit === 1));
  assert.deepEqual(pipeline.at(-1), { $sort: { name: 1, slug: 1 } });
});