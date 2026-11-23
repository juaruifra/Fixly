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
    const { changeOwnPassword } = await server.ssrLoadModule(
      "/src/services/authService.js",
    );
    const { logout } = await server.ssrLoadModule(
      "/src/services/authService.js",
    );
    const { createProfile } = await server.ssrLoadModule(
      "/src/services/profileService.js",
    );
    const { setDefaultProfile } = await server.ssrLoadModule(
      "/src/services/profileService.js",
    );
    let responseStatus = 200;
    let authorization;
    let lastRequest;
    let rejectedSessions = 0;
    const unsubscribe = onUnauthorized(() => { rejectedSessions += 1; });

    // El adaptador simula la red sin enviar tokens ni datos a ningún servidor.
    apiService.defaults.adapter = async (config) => {
      lastRequest = config;
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

    await createProfile(
      { name: "Perfil de prueba" },
      "56c43d2d-2f96-4f82-9c2c-83b8bb8c662a",
    );
    assert.equal(lastRequest.method, "post");
    assert.equal(lastRequest.url, "/profiles");
    assert.equal(
      lastRequest.headers.get("Idempotency-Key"),
      "56c43d2d-2f96-4f82-9c2c-83b8bb8c662a",
    );

    await setDefaultProfile("507f1f77bcf86cd799439011");
    assert.equal(lastRequest.method, "patch");
    assert.equal(lastRequest.url, "/auth/me/default-profile");
    assert.deepEqual(JSON.parse(lastRequest.data), {
      profileId: "507f1f77bcf86cd799439011",
    });

    await setDefaultProfile("507f1f77bcf86cd799439011");
    assert.equal(lastRequest.method, "patch");
    assert.equal(lastRequest.url, "/auth/me/default-profile");
    assert.deepEqual(JSON.parse(lastRequest.data), {
      profileId: "507f1f77bcf86cd799439011",
    });

    await apiService.get("https://example.invalid/resource");
    assert.equal(authorization, undefined);

    await apiService.post("/auth/login", {});
    assert.equal(authorization, undefined);

    await logout();
    assert.equal(lastRequest.method, "post");
    assert.equal(lastRequest.url, "/auth/logout");
    assert.equal(authorization, "Bearer token-de-prueba");

    await changeOwnPassword("current-test-password", "new-test-password");
    assert.equal(lastRequest.method, "patch");
    assert.equal(lastRequest.url, "/auth/password");
    assert.deepEqual(JSON.parse(lastRequest.data), {
      currentPassword: "current-test-password",
      newPassword: "new-test-password",
    });
    assert.equal(authorization, "Bearer token-de-prueba");

    responseStatus = 400;
    await assert.rejects(
      changeOwnPassword("wrong-test-password", "new-test-password"),
      (error) => error.status === 400,
    );
    assert.equal(rejectedSessions, 0);

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
  const { revokedTokenRepository } = await import("../../backend/src/repositories/revoked-token.repository.js");
  const { categoryService } = await import("../../backend/src/services/category.service.js");
  const { createAccessToken } = await import("../../backend/src/utils/jwt.util.js");
  const adminId = "507f1f77bcf86cd799439011";
  const clientId = "507f1f77bcf86cd799439012";
  const originalFindUser = userRepository.findById;
  const originalFindAuthUser = userRepository.findByIdForAuth;
  const originalIsRevoked = revokedTokenRepository.isRevoked;
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
  userRepository.findByIdForAuth = userRepository.findById;
  revokedTokenRepository.isRevoked = async () => false;
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
    userRepository.findByIdForAuth = originalFindAuthUser;
    revokedTokenRepository.isRevoked = originalIsRevoked;
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