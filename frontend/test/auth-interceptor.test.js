import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("Axios protege el token y distingue 401 de 403", async () => {
  const savedStorage = globalThis.sessionStorage;
  let token = "token-de-prueba";
  globalThis.sessionStorage = {
    getItem: () => token,
    setItem: (_key, value) => { token = value; },
    removeItem: () => { token = null; },
  };

  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { apiService, onUnauthorized } = await server.ssrLoadModule(
      "/src/services/apiService.js",
    );
    let responseStatus = 200;
    let authorization;
    let rejectedSessions = 0;
    const unsubscribe = onUnauthorized(() => { rejectedSessions += 1; });

    // El adaptador simula la red sin enviar tokens ni datos a ningún servidor.
    apiService.defaults.adapter = async (config) => {
      authorization = config.headers.get("Authorization");
      const response = {
        status: responseStatus,
        statusText: "Test",
        data: { message: "Test" },
        headers: {},
        config,
      };
      if (responseStatus !== 200) {
        const error = new Error("Test");
        error.config = config;
        error.response = response;
        throw error;
      }
      return response;
    };

    await apiService.get("/users");
    assert.equal(authorization, "Bearer token-de-prueba");

    await apiService.get("https://example.invalid/resource");
    assert.equal(authorization, undefined);

    await apiService.post("/auth/login", {});
    assert.equal(authorization, undefined);

    responseStatus = 403;
    await assert.rejects(apiService.get("/users"), (error) => error.status === 403);
    assert.equal(rejectedSessions, 0);

    responseStatus = 401;
    await assert.rejects(apiService.get("/users"), (error) => error.status === 401);
    assert.equal(rejectedSessions, 1);

    await assert.rejects(
      apiService.get("/auth/me", { headers: { Authorization: "Bearer token-antiguo" } }),
      (error) => error.status === 401,
    );
    assert.equal(rejectedSessions, 1);
    unsubscribe();
  } finally {
    globalThis.sessionStorage = savedStorage;
    await server.close();
  }
});

test("Axios y la API aplican los permisos sin acceder a MongoDB", async () => {
  const savedStorage = globalThis.sessionStorage;
  const savedEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_DISABLED: process.env.AUTH_DISABLED,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  process.env.NODE_ENV = "test";
  process.env.AUTH_DISABLED = "false";
  process.env.JWT_SECRET = "test-secret-for-integrated-authorization";

  const { default: app } = await import("../../backend/src/app.js");
  const { userRepository } = await import("../../backend/src/repositories/user.repository.js");
  const { categoryService } = await import("../../backend/src/services/category.service.js");
  const { createAccessToken } = await import("../../backend/src/utils/jwt.util.js");
  const adminId = "507f1f77bcf86cd799439011";
  const clientId = "507f1f77bcf86cd799439012";
  const originalFindUser = userRepository.findById;
  const originalList = categoryService.list;
  const originalPublicList = categoryService.listAvailable;
  let token = createAccessToken(adminId);
  let rejectedSessions = 0;
  globalThis.sessionStorage = {
    getItem: () => token,
    removeItem: () => { token = null; },
  };
  userRepository.findById = async (id) => ({
    _id: id,
    name: "Test",
    email: "test@example.invalid",
    active: true,
    deletedAt: null,
    role: { name: String(id) === adminId ? "ADMIN" : "CLIENT", active: true, deletedAt: null },
  });
  categoryService.list = async () => [];
  categoryService.listAvailable = async () => [];

  const apiServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    apiServer.once("error", reject);
    apiServer.once("listening", resolve);
  });
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });

  try {
    const { apiService, onUnauthorized } = await vite.ssrLoadModule("/src/services/apiService.js");
    apiService.defaults.baseURL = `http://127.0.0.1:${apiServer.address().port}/api`;
    const unsubscribe = onUnauthorized(() => {
      rejectedSessions += 1;
      sessionStorage.removeItem("fixly-token");
    });

    assert.equal((await apiService.get("/categories")).status, 200);
    token = createAccessToken(clientId);
    await assert.rejects(apiService.get("/categories"), (error) => error.status === 403);
    assert.equal(rejectedSessions, 0);

    token = "token-invalido";
    await assert.rejects(apiService.get("/categories"), (error) => error.status === 401);
    assert.equal(rejectedSessions, 1);
    assert.equal(token, null);
    assert.equal((await apiService.get("/categories/available")).status, 200);
    unsubscribe();
  } finally {
    userRepository.findById = originalFindUser;
    categoryService.list = originalList;
    categoryService.listAvailable = originalPublicList;
    globalThis.sessionStorage = savedStorage;
    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await vite.close();
    await new Promise((resolve, reject) => apiServer.close((error) => error ? reject(error) : resolve()));
  }
});