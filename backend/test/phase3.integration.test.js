import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

import app from "../src/app.js";
import { Cart } from "../src/models/cart.model.js";
import { Category } from "../src/models/category.model.js";
import { Order } from "../src/models/order.model.js";
import { Role } from "../src/models/role.model.js";
import { Service } from "../src/models/service.model.js";
import { User } from "../src/models/user.model.js";
import { Variant } from "../src/models/variant.model.js";
import { userService } from "../src/services/user.service.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

process.env.JWT_SECRET ||= randomUUID().replaceAll("-", "").repeat(2);

const testUri = process.env.MONGODB_TEST_URI;

test(
  "Cart y Order conservan propiedad, precio e idempotencia",
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
        Cart.syncIndexes(),
        Category.syncIndexes(),
        Order.syncIndexes(),
        Role.syncIndexes(),
        Service.syncIndexes(),
        User.syncIndexes(),
        Variant.syncIndexes(),
      ]);

      const suffix = randomUUID().replaceAll("-", "");
      const clientRole = await Role.create({ name: "CLIENT" });
      const adminRole = await Role.create({ name: "ADMIN" });
      const client = await userService.createByAdmin({
        name: "Cliente de prueba",
        email: `client-${suffix}@fixly.local`,
        password: `client-password-${suffix}`,
        role: String(clientRole._id),
      });
      const otherClient = await userService.createByAdmin({
        name: "Otro cliente",
        email: `other-${suffix}@fixly.local`,
        password: `other-password-${suffix}`,
        role: String(clientRole._id),
      });
      const admin = await userService.createByAdmin({
        name: "Admin de prueba",
        email: `admin-${suffix}@fixly.local`,
        password: `admin-password-${suffix}`,
        role: String(adminRole._id),
      });

      const category = await Category.create({
        name: `Categoria ${suffix}`,
        slug: `categoria_${suffix}`,
      });
      const service = await Service.create({
        name: `Servicio ${suffix}`,
        category: category._id,
        price: 99,
        duration: 60,
        slug: `servicio_${suffix}`,
      });
      const variant = await Variant.create({
        service: service._id,
        name: "Visita de 30 minutos",
        sku: `TEST-${suffix.slice(0, 12)}`.toUpperCase(),
        auto: false,
        price: 19.99,
        duration: 30,
        status: "published",
      });
      const unavailableVariant = await Variant.create({
        service: service._id,
        name: "Variante desactivada",
        sku: `OFF-${suffix.slice(0, 12)}`.toUpperCase(),
        auto: false,
        price: 10,
        duration: 15,
        active: false,
        status: "published",
      });

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.once("listening", resolve);
      });
      const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      const clientHeaders = {
        Authorization: `Bearer ${createAccessToken(client._id)}`,
        "Content-Type": "application/json",
      };
      const otherHeaders = {
        Authorization: `Bearer ${createAccessToken(otherClient._id)}`,
        "Content-Type": "application/json",
      };
      const adminHeaders = {
        Authorization: `Bearer ${createAccessToken(admin._id)}`,
        "Content-Type": "application/json",
      };

      await t.test("el carrito suma cantidades y no acepta precios del cliente", async () => {
        const first = await fetch(`${baseUrl}/cart/items`, {
          method: "POST",
          headers: clientHeaders,
          body: JSON.stringify({ variant: String(variant._id), quantity: 2, price: 0 }),
        });
        assert.equal(first.status, 200);

        const second = await fetch(`${baseUrl}/cart/items`, {
          method: "POST",
          headers: clientHeaders,
          body: JSON.stringify({ variant: String(variant._id), quantity: 1 }),
        });
        assert.equal(second.status, 200);
        const cart = await second.json();
        assert.equal(cart.items.length, 1);
        assert.equal(cart.items[0].quantity, 3);

        const unavailable = await fetch(`${baseUrl}/cart/items`, {
          method: "POST",
          headers: clientHeaders,
          body: JSON.stringify({ variant: String(unavailableVariant._id), quantity: 1 }),
        });
        assert.equal(unavailable.status, 409);
      });

      let order;
      await t.test("checkout calcula el total y conserva una instantánea del pedido", async () => {
        const response = await fetch(`${baseUrl}/cart/checkout`, {
          method: "POST",
          headers: clientHeaders,
        });
        assert.equal(response.status, 201);
        order = await response.json();

        assert.equal(order.total, 59.97);
        assert.equal(order.items[0].sku, variant.sku);
        assert.equal(order.items[0].serviceName, service.name);
        assert.equal(order.items[0].variantName, variant.name);
        assert.equal(order.items[0].price, 19.99);
        assert.equal(order.items[0].duration, 30);
        assert.equal(order.items[0].quantity, 3);
        assert.equal("checkoutToken" in order, false);

        await Variant.updateOne({ _id: variant._id }, { $set: { price: 50, name: "Nombre nuevo" } });
        const storedOrder = await Order.findById(order._id).lean();
        assert.equal(storedOrder.items[0].price, 19.99);
        assert.equal(storedOrder.items[0].variantName, "Visita de 30 minutos");

        const cartResponse = await fetch(`${baseUrl}/cart`, { headers: clientHeaders });
        const emptyCart = await cartResponse.json();
        assert.equal(emptyCart.items.length, 0);
      });

      await t.test("el checkout repetido recupera el mismo pedido sin duplicarlo", async () => {
        const checkoutToken = randomUUID();
        const recoveryOrder = await Order.create({
          user: client._id,
          items: [{
            variant: variant._id,
            sku: variant.sku,
            serviceName: service.name,
            variantName: "Instantánea de recuperación",
            price: 19.99,
            duration: 30,
            quantity: 1,
            subtotal: 19.99,
          }],
          total: 19.99,
          checkoutToken,
        });
        await Cart.findOneAndUpdate(
          { user: client._id },
          {
            $set: {
              checkoutToken,
              items: [{ variant: variant._id, quantity: 1 }],
            },
          },
        );

        const response = await fetch(`${baseUrl}/cart/checkout`, {
          method: "POST",
          headers: clientHeaders,
        });
        assert.equal(response.status, 201);
        const recovered = await response.json();
        assert.equal(recovered._id, String(recoveryOrder._id));
        assert.equal(await Order.countDocuments({ user: client._id }), 2);
        const cart = await Cart.findOne({ user: client._id })
          .select("+checkoutToken")
          .lean();
        assert.equal(cart.items.length, 0);
        assert.equal(cart.checkoutToken, null);
      });

      await t.test("los pedidos quedan aislados por propietario y el ADMIN puede cambiar estados", async () => {
        const hidden = await fetch(`${baseUrl}/orders/${order._id}`, { headers: otherHeaders });
        assert.equal(hidden.status, 404);
        const ownOrders = await fetch(`${baseUrl}/orders`, { headers: otherHeaders });
        assert.equal((await ownOrders.json()).length, 0);

        const forbidden = await fetch(`${baseUrl}/orders/${order._id}/status`, {
          method: "PATCH",
          headers: clientHeaders,
          body: JSON.stringify({ status: "confirmed" }),
        });
        assert.equal(forbidden.status, 403);

        const confirmed = await fetch(`${baseUrl}/orders/${order._id}/status`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ status: "confirmed" }),
        });
        assert.equal(confirmed.status, 200);
        const completed = await fetch(`${baseUrl}/orders/${order._id}/status`, {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ status: "completed" }),
        });
        assert.equal(completed.status, 200);
      });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  },
);
