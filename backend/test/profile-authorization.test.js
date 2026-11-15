import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { profileRepository } from "../src/repositories/profile.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

test("Los perfiles solo se pueden consultar y modificar por su propietario", async () => {
  process.env.NODE_ENV = "development";
  process.env.AUTH_DISABLED = "true";
  process.env.JWT_SECRET = "test-secret-for-profile-ownership-only";

  const ownerId = String(new mongoose.Types.ObjectId());
  const otherOwnerId = String(new mongoose.Types.ObjectId());
  const profiles = new Map();
  const users = new Map([
    [ownerId, { _id: ownerId, name: "Cliente", email: "client@example.invalid", active: true, deletedAt: null, role: { name: "CLIENT", active: true, deletedAt: null } }],
    [otherOwnerId, { _id: otherOwnerId, name: "Admin", email: "admin@example.invalid", active: true, deletedAt: null, role: { name: "ADMIN", active: true, deletedAt: null } }],
  ]);
  const originals = {
    findById: userRepository.findById,
    findAllByOwner: profileRepository.findAllByOwner,
    findByIdForOwner: profileRepository.findByIdForOwner,
    create: profileRepository.create,
    updateByIdForOwner: profileRepository.updateByIdForOwner,
    deleteByIdForOwner: profileRepository.deleteByIdForOwner,
  };

  userRepository.findById = async (id) => users.get(String(id));
  profileRepository.findAllByOwner = async (id) =>
    [...profiles.values()].filter((profile) => profile.owner === String(id));
  profileRepository.findByIdForOwner = async (id, owner) => {
    const profile = profiles.get(String(id));
    return profile?.owner === String(owner) ? profile : null;
  };
  profileRepository.create = async (owner, data) => {
    const now = new Date();
    const profile = { _id: new mongoose.Types.ObjectId(), owner: String(owner), ...data, createdAt: now, updatedAt: now };
    profiles.set(String(profile._id), profile);
    return profile;
  };
  profileRepository.updateByIdForOwner = async (id, owner, data) => {
    const profile = profiles.get(String(id));
    if (!profile || profile.owner !== String(owner)) return null;
    Object.assign(profile, data, { updatedAt: new Date() });
    return profile;
  };
  profileRepository.deleteByIdForOwner = async (id, owner) => {
    const profile = profiles.get(String(id));
    if (!profile || profile.owner !== String(owner)) return null;
    profiles.delete(String(id));
    return profile;
  };

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/api/profiles`;
  const ownerToken = createAccessToken(ownerId);
  const otherToken = createAccessToken(otherOwnerId);
  const request = (path = "", token, method = "GET", body) => fetch(`${url}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    assert.equal((await request("", null)).status, 401);
    const injectedOwner = await request("", ownerToken, "POST", { name: "Perfil ajeno", owner: otherOwnerId });
    assert.equal(injectedOwner.status, 400);

    const createResponse = await request("", ownerToken, "POST", { name: "  Casa  " });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.name, "Casa");
    assert.equal(Object.hasOwn(created, "owner"), false);

    const otherProfile = await request("", otherToken, "POST", { name: "Otro perfil" });
    assert.equal(otherProfile.status, 201);
    const other = await otherProfile.json();

    const ownerList = await request("", ownerToken);
    assert.deepEqual((await ownerList.json()).map(({ id }) => id), [created.id]);
    assert.equal((await request(`/${other.id}`, ownerToken)).status, 404);
    assert.equal((await request(`/${other.id}`, ownerToken, "PATCH", { name: "Manipulado" })).status, 404);
    assert.equal((await request(`/${other.id}`, ownerToken, "DELETE")).status, 404);
    assert.equal(profiles.get(other.id).name, "Otro perfil");

    const updateResponse = await request(`/${created.id}`, ownerToken, "PATCH", { name: "  Casa nueva  " });
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).name, "Casa nueva");
    assert.equal((await request(`/${created.id}`, ownerToken, "DELETE")).status, 204);
    assert.equal((await request(`/${created.id}`, ownerToken)).status, 404);
  } finally {
    Object.assign(userRepository, { findById: originals.findById });
    Object.assign(profileRepository, {
      findAllByOwner: originals.findAllByOwner,
      findByIdForOwner: originals.findByIdForOwner,
      create: originals.create,
      updateByIdForOwner: originals.updateByIdForOwner,
      deleteByIdForOwner: originals.deleteByIdForOwner,
    });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});