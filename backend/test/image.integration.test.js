import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import app from "../src/app.js";
import { Category } from "../src/models/category.model.js";
import { Image } from "../src/models/image.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { swaggerSpec } from "../src/config/swagger.js";

const testUri = process.env.MONGODB_TEST_URI;

test("Swagger documenta las seis rutas públicas de Image", () => {
  const expectedOperations = [
    ["/api/images", "get"],
    ["/api/images", "post"],
    ["/api/images/{id}", "get"],
    ["/api/images/{id}", "patch"],
    ["/api/images/{id}", "delete"],
    ["/api/images/entity/{entityType}/{entityId}", "get"],
  ];

  for (const [path, method] of expectedOperations) {
    assert.ok(swaggerSpec.paths[path]?.[method], `${method} ${path} is documented`);
    assert.equal(swaggerSpec.paths[path][method].security, undefined);
  }
  assert.equal(swaggerSpec.paths["/api/images/{id}"].put, undefined);

  for (const schema of ["Image", "ImageInput", "ImagePatchInput"]) {
    assert.ok(swaggerSpec.components.schemas[schema]);
  }
});

test(
  "Image valida relaciones, actualizaciones y borrado físico",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async (t) => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    assert.ok(localHosts.has(parsedUri.hostname), "La base de pruebas debe ser local");
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    let server;
    try {
      await mongoose.connection.dropDatabase();
      await Promise.all([
        Category.syncIndexes(),
        Service.syncIndexes(),
        Variant.syncIndexes(),
        Image.syncIndexes(),
      ]);

      const suffix = randomUUID().replaceAll("-", "");
      const category = await Category.create({
        name: `Categoría ${suffix}`,
        slug: `categoria_${suffix}`,
      });
      const service = await Service.create({
        name: `Servicio ${suffix}`,
        category: category._id,
        price: 25,
        duration: 30,
        slug: `servicio_${suffix}`,
      });
      const variant = await Variant.create({
        service: service._id,
        name: `Variante ${suffix}`,
        sku: `IMG-${suffix.slice(0, 12)}`.toUpperCase(),
        auto: false,
        price: 25,
        duration: 30,
      });

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api/images`;
      const imageInput = (entityType, entityId, extra = {}) => ({
        entityType,
        entityId: String(entityId),
        url: "https://image.test.invalid/example.jpg",
        alt: "Imagen de ejemplo",
        ...extra,
      });
      const postImage = (data) =>
        fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

      await t.test("rechaza tipo, ObjectId, entidad, URL, alt y campos inválidos", async () => {
        const valid = imageInput("service", service._id);
        assert.equal(
          (await postImage({ ...valid, entityType: "role" })).status,
          400,
        );
        assert.equal(
          (await postImage({ ...valid, entityId: "not-an-object-id" })).status,
          400,
        );
        assert.equal(
          (
            await postImage({
              ...valid,
              entityId: String(new mongoose.Types.ObjectId()),
            })
          ).status,
          404,
        );
        assert.equal(
          (await postImage({ ...valid, url: "file:///tmp/image.jpg" })).status,
          400,
        );
        assert.equal((await postImage({ ...valid, alt: "   " })).status, 400);
        assert.equal((await postImage({ ...valid, createdAt: new Date() })).status, 400);
      });

      let serviceImage;
      let secondServiceImage;
      await t.test("crea imágenes para category, service y variant, incluidas varias por entidad", async () => {
        const categoryResponse = await postImage(
          imageInput("category", category._id),
        );
        assert.equal(categoryResponse.status, 201);

        const serviceResponse = await postImage(
          imageInput("service", service._id),
        );
        assert.equal(serviceResponse.status, 201);
        serviceImage = await serviceResponse.json();

        const secondResponse = await postImage(
          imageInput("service", service._id, {
            url: "https://example.com/images/second.jpg",
            alt: "Segunda imagen",
          }),
        );
        assert.equal(secondResponse.status, 201);
        secondServiceImage = await secondResponse.json();
        assert.notEqual(serviceImage._id, secondServiceImage._id);

        const variantResponse = await postImage(
          imageInput("variant", variant._id),
        );
        assert.equal(variantResponse.status, 201);
      });

      await t.test("lista, consulta por ID y devuelve listas vacías por entidad", async () => {
        const allResponse = await fetch(baseUrl);
        assert.equal(allResponse.status, 200);
        const allImages = await allResponse.json();
        assert.equal(allImages.length, 4);

        const byIdResponse = await fetch(`${baseUrl}/${serviceImage._id}`);
        assert.equal(byIdResponse.status, 200);
        assert.equal((await byIdResponse.json())._id, serviceImage._id);

        const byEntityResponse = await fetch(
          `${baseUrl}/entity/service/${service._id}`,
        );
        assert.equal(byEntityResponse.status, 200);
        assert.equal((await byEntityResponse.json()).length, 2);

        const emptyResponse = await fetch(
          `${baseUrl}/entity/service/${new mongoose.Types.ObjectId()}`,
        );
        assert.equal(emptyResponse.status, 200);
        assert.deepEqual(await emptyResponse.json(), []);
      });

      await t.test("PATCH actualiza solo url o alt y rechaza campos de relación", async () => {
        const altResponse = await fetch(`${baseUrl}/${serviceImage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alt: "Descripción actualizada" }),
        });
        assert.equal(altResponse.status, 200);
        const afterAlt = await altResponse.json();
        assert.equal(afterAlt.alt, "Descripción actualizada");
        assert.equal(afterAlt.url, serviceImage.url);

        const nextUrl = "https://example.com/images/updated.jpg";
        const urlResponse = await fetch(`${baseUrl}/${serviceImage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: nextUrl }),
        });
        assert.equal(urlResponse.status, 200);
        const afterUrl = await urlResponse.json();
        assert.equal(afterUrl.url, nextUrl);
        assert.equal(afterUrl.alt, "Descripción actualizada");

        const entityTypeResponse = await fetch(`${baseUrl}/${serviceImage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType: "category" }),
        });
        assert.equal(entityTypeResponse.status, 400);

        const entityIdResponse = await fetch(`${baseUrl}/${serviceImage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId: String(category._id) }),
        });
        assert.equal(entityIdResponse.status, 400);

        for (const field of ["_id", "createdAt", "updatedAt"]) {
          const immutableResponse = await fetch(
            `${baseUrl}/${serviceImage._id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [field]: "changed" }),
            },
          );
          assert.equal(immutableResponse.status, 400);
        }

        const emptyPatchResponse = await fetch(`${baseUrl}/${serviceImage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        assert.equal(emptyPatchResponse.status, 400);
      });

      await t.test("rechaza asociaciones a entidades eliminadas y las rutas no requieren JWT", async () => {
        await Promise.all([
          Category.updateOne({ _id: category._id }, { $set: { deletedAt: new Date() } }),
          Service.updateOne({ _id: service._id }, { $set: { deletedAt: new Date() } }),
          Variant.updateOne({ _id: variant._id }, { $set: { deletedAt: new Date() } }),
        ]);

        for (const [entityType, entity] of [
          ["category", category],
          ["service", service],
          ["variant", variant],
        ]) {
          assert.equal(
            (await postImage(imageInput(entityType, entity._id))).status,
            409,
          );
        }

        assert.equal((await fetch(baseUrl)).status, 200);
      });

      await t.test("DELETE elimina físicamente y no existe restauración", async () => {
        const deleteResponse = await fetch(
          `${baseUrl}/${secondServiceImage._id}`,
          { method: "DELETE" },
        );
        assert.equal(deleteResponse.status, 204);
        assert.equal(await Image.findById(secondServiceImage._id), null);

        const getDeletedResponse = await fetch(
          `${baseUrl}/${secondServiceImage._id}`,
        );
        assert.equal(getDeletedResponse.status, 404);

        const restoreResponse = await fetch(
          `${baseUrl}/${secondServiceImage._id}/restore`,
          { method: "PATCH" },
        );
        assert.equal(restoreResponse.status, 404);
      });
    } finally {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
      await mongoose.disconnect();
    }
  },
);