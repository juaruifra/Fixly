import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import app from "../src/app.js";
import { Role } from "../src/models/role.model.js";
import { User } from "../src/models/user.model.js";
import { verifyPassword } from "../src/utils/password.util.js";

process.env.JWT_SECRET ||= randomUUID().replaceAll("-", "").repeat(2);

const testUri = process.env.MONGODB_TEST_URI;

test(
  "Role, User, Worker y autenticación",
  { skip: !testUri && "Configura MONGODB_TEST_URI con una base local fixly_test_." },
  async (t) => {
    const parsedUri = new URL(testUri);
    const databaseName = decodeURIComponent(parsedUri.pathname).replace(/^\/+/, "");
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

    // Esta prueba solo puede borrar una base temporal local, nunca la base habitual.
    assert.ok(localHosts.has(parsedUri.hostname), "La base de pruebas debe ser local");
    assert.match(databaseName, /^fixly_test_[a-z0-9_]+$/i);

    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    let server;
    const previousAdminEmail = process.env.FIXLY_ADMIN_EMAIL;
    const previousAdminPassword = process.env.FIXLY_ADMIN_PASSWORD;
    const previousAdminName = process.env.FIXLY_ADMIN_NAME;

    try {
      await mongoose.connection.dropDatabase();
      await Promise.all([Role.syncIndexes(), User.syncIndexes()]);

      const suffix = randomUUID().replaceAll("-", "");
      process.env.FIXLY_ADMIN_NAME = "Admin de pruebas";
      process.env.FIXLY_ADMIN_EMAIL = `admin-${suffix}@fixly.local`;
      process.env.FIXLY_ADMIN_PASSWORD = `test-password-${suffix}`;

      const { seedFixlyData } = await import("../src/seed-data.js");
      const firstSeed = await seedFixlyData();
      const secondSeed = await seedFixlyData();
      assert.equal(firstSeed.rolesCreated, 2);
      assert.equal(firstSeed.adminUsersCreated, 1);
      assert.equal(secondSeed.rolesKept, 2);
      assert.equal(secondSeed.adminUsersKept, 1);

      const admin = await User.findOne({ email: process.env.FIXLY_ADMIN_EMAIL })
        .select("+passwordHash")
        .lean();
      assert.notEqual(admin.passwordHash, process.env.FIXLY_ADMIN_PASSWORD);
      assert.equal(
        await verifyPassword(process.env.FIXLY_ADMIN_PASSWORD, admin.passwordHash),
        true,
      );

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      const adminLogin = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: process.env.FIXLY_ADMIN_EMAIL,
          password: process.env.FIXLY_ADMIN_PASSWORD,
        }),
      });
      assert.equal(adminLogin.status, 200);
      const adminSession = await adminLogin.json();
      assert.equal(adminSession.user.role.name, "ADMIN");
      assert.ok(adminSession.token);
      assert.equal("passwordHash" in adminSession.user, false);

      const adminHeaders = {
        Authorization: `Bearer ${adminSession.token}`,
        "Content-Type": "application/json",
      };

      await t.test("Category y Service existentes siguen respondiendo sin JWT", async () => {
        const servicesResponse = await fetch(`${baseUrl}/services/public`);
        const categoriesResponse = await fetch(`${baseUrl}/categories/available`);
        assert.equal(servicesResponse.status, 200);
        assert.equal(categoriesResponse.status, 200);
      });

      await t.test("el registro público siempre asigna CLIENT y oculta el hash", async () => {
        const response = await fetch(`${baseUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Cliente de prueba",
            email: `client-${suffix}@fixly.local`,
            password: `client-password-${suffix}`,
            role: String(adminSession.user.role._id),
          }),
        });
        assert.equal(response.status, 201);
        const result = await response.json();
        assert.equal(result.user.role.name, "CLIENT");
        assert.equal("passwordHash" in result.user, false);
        assert.ok(result.token);
      });

      await t.test("login rechaza credenciales inválidas y /me devuelve el usuario seguro", async () => {
        const wrongLogin = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: process.env.FIXLY_ADMIN_EMAIL,
            password: "wrong-password",
          }),
        });
        assert.equal(wrongLogin.status, 401);

        const me = await fetch(`${baseUrl}/auth/me`, { headers: adminHeaders });
        assert.equal(me.status, 200);
        const user = await me.json();
        assert.equal(user.email, process.env.FIXLY_ADMIN_EMAIL);
        assert.equal("passwordHash" in user, false);
      });

      await t.test("el administrador puede crear, desactivar, eliminar y restaurar usuarios", async () => {
        const clientRole = await Role.findOne({ name: "CLIENT" }).lean();
        const userData = {
          name: "Usuario de administración",
          email: `managed-${suffix}@fixly.local`,
          password: `managed-password-${suffix}`,
          role: String(clientRole._id),
        };
        const createdResponse = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify(userData),
        });
        assert.equal(createdResponse.status, 201);
        const created = await createdResponse.json();
        assert.equal("passwordHash" in created, false);

        const duplicateResponse = await fetch(`${baseUrl}/users`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify(userData),
        });
        assert.equal(duplicateResponse.status, 409);

        const inactiveResponse = await fetch(`${baseUrl}/users/${created._id}/active`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ active: false }),
        });
        assert.equal(inactiveResponse.status, 200);

        const deletedResponse = await fetch(`${baseUrl}/users/${created._id}`, {
          method: "DELETE",
          headers: adminHeaders,
        });
        assert.equal(deletedResponse.status, 204);

        const restoredResponse = await fetch(`${baseUrl}/users/${created._id}/restore`, {
          method: "PATCH",
          headers: adminHeaders,
        });
        assert.equal(restoredResponse.status, 200);
        const restored = await restoredResponse.json();
        assert.equal(restored.active, true);
        assert.equal(restored.deletedAt, null);

        const updatedResponse = await fetch(`${baseUrl}/users/${created._id}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ name: "Usuario actualizado" }),
        });
        assert.equal(updatedResponse.status, 200);
        const updated = await updatedResponse.json();
        assert.equal(updated.name, "Usuario actualizado");
        assert.equal("passwordHash" in updated, false);
      });

      await t.test("las rutas administrativas exigen ADMIN", async () => {
        const missingToken = await fetch(`${baseUrl}/roles`);
        assert.equal(missingToken.status, 401);

        const clientLogin = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `client-${suffix}@fixly.local`,
            password: `client-password-${suffix}`,
          }),
        });
        const clientSession = await clientLogin.json();
        const forbidden = await fetch(`${baseUrl}/roles`, {
          headers: { Authorization: `Bearer ${clientSession.token}` },
        });
        assert.equal(forbidden.status, 403);

        const allowed = await fetch(`${baseUrl}/roles`, {
          headers: { Authorization: `Bearer ${adminSession.token}` },
        });
        assert.equal(allowed.status, 200);
      });

      await t.test("un rol asignado no se puede borrar y uno libre se puede restaurar", async () => {
        const adminRole = await Role.findOne({ name: "ADMIN" }).lean();
        const blocked = await fetch(`${baseUrl}/roles/${adminRole._id}`, {
          method: "DELETE",
          headers: adminHeaders,
        });
        assert.equal(blocked.status, 409);

        const created = await fetch(`${baseUrl}/roles`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ name: `TEMP_${suffix}` }),
        });
        assert.equal(created.status, 201);
        const role = await created.json();

        const updated = await fetch(`${baseUrl}/roles/${role._id}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ description: "Rol temporal actualizado" }),
        });
        assert.equal(updated.status, 200);

        const inactive = await fetch(`${baseUrl}/roles/${role._id}/active`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ active: false }),
        });
        assert.equal(inactive.status, 200);

        const deleted = await fetch(`${baseUrl}/roles/${role._id}`, {
          method: "DELETE",
          headers: adminHeaders,
        });
        assert.equal(deleted.status, 204);

        const restored = await fetch(`${baseUrl}/roles/${role._id}/restore`, {
          method: "PATCH",
          headers: adminHeaders,
        });
        assert.equal(restored.status, 200);
      });

      await t.test("el administrador puede gestionar trabajadores sin cuenta", async () => {
        const created = await fetch(`${baseUrl}/workers`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            name: "Trabajador de prueba",
            phone: "+34123456789",
          }),
        });
        assert.equal(created.status, 201);
        let worker = await created.json();
        assert.equal("user" in worker, false);

        const updated = await fetch(`${baseUrl}/workers/${worker._id}`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ name: "Trabajador actualizado" }),
        });
        assert.equal(updated.status, 200);
        worker = await updated.json();
        assert.equal(worker.name, "Trabajador actualizado");

        const inactive = await fetch(`${baseUrl}/workers/${worker._id}/active`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ active: false }),
        });
        assert.equal(inactive.status, 200);

        const deleted = await fetch(`${baseUrl}/workers/${worker._id}`, {
          method: "DELETE",
          headers: adminHeaders,
        });
        assert.equal(deleted.status, 204);

        const restored = await fetch(`${baseUrl}/workers/${worker._id}/restore`, {
          method: "PATCH",
          headers: adminHeaders,
        });
        assert.equal(restored.status, 200);
      });
    } finally {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      for (const [key, value] of [
        ["FIXLY_ADMIN_EMAIL", previousAdminEmail],
        ["FIXLY_ADMIN_PASSWORD", previousAdminPassword],
        ["FIXLY_ADMIN_NAME", previousAdminName],
      ]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);
