import test from "node:test";
import assert from "node:assert/strict";

import { isLocalAuthBypassEnabled } from "../src/utils/auth-config.js";

test("el bypass requiere desarrollo, flag activo e IP loopback", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAuthDisabled = process.env.AUTH_DISABLED;

  try {
    process.env.NODE_ENV = "development";
    process.env.AUTH_DISABLED = "true";
    assert.equal(isLocalAuthBypassEnabled({ ip: "127.0.0.1" }), true);
    assert.equal(isLocalAuthBypassEnabled({ ip: "::1" }), true);
    assert.equal(isLocalAuthBypassEnabled({ ip: "::ffff:127.0.0.1" }), true);
    assert.equal(isLocalAuthBypassEnabled({ ip: "192.168.1.25" }), false);

    process.env.NODE_ENV = "production";
    assert.equal(isLocalAuthBypassEnabled({ ip: "127.0.0.1" }), false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAuthDisabled === undefined) delete process.env.AUTH_DISABLED;
    else process.env.AUTH_DISABLED = previousAuthDisabled;
  }
});
