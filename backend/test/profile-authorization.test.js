import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { imageRepository } from "../src/repositories/image.repository.js";
import { Profile } from "../src/models/profile.model.js";
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
    findByCreationKey: profileRepository.findByCreationKey,
    create: profileRepository.create,
    updateByIdForOwner: profileRepository.updateByIdForOwner,
    deleteByIdForOwner: profileRepository.deleteByIdForOwner,
    findAvatarByProfile: imageRepository.findAvatarByProfile,
    findAvatarsByProfiles: imageRepository.findAvatarsByProfiles,
    deleteAvatarForProfile: imageRepository.deleteAvatarForProfile,
  };

  userRepository.findById = async (id) => users.get(String(id));
  profileRepository.findAllByOwner = async (id) =>
    [...profiles.values()].filter((profile) => profile.owner === String(id));
  profileRepository.findByIdForOwner = async (id, owner) => {
    const profile = profiles.get(String(id));
    return profile?.owner === String(owner) ? profile : null;
  };
  profileRepository.findByCreationKey = async (owner, creationKey) =>
    [...profiles.values()].find(
      (profile) => profile.owner === String(owner) && profile.creationKey === creationKey,
    ) || null;
  profileRepository.create = async (owner, data, creationKey) => {
    const existing = creationKey
      ? await profileRepository.findByCreationKey(owner, creationKey)
      : null;
    if (existing) {
      const error = new Error("Duplicate creation key");
      error.code = 11000;
      error.keyPattern = { owner: 1, creationKey: 1 };
      throw error;
    }
    // Simula el índice único que evita duplicados aunque dos peticiones compitan.
    const duplicate = creationKey && [...profiles.values()].some(
      (profile) => profile.owner === String(owner) && profile.creationKey === creationKey,
    );
    if (duplicate) {
      const error = new Error("Duplicate creation key");
      error.code = 11000;
      error.keyPattern = { owner: 1, creationKey: 1 };
      throw error;
    }
    const now = new Date();
    const profile = {
      _id: new mongoose.Types.ObjectId(),
      owner: String(owner),
      ...data,
      ...(creationKey ? { creationKey } : {}),
      createdAt: now,
      updatedAt: now,
    };
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
  imageRepository.findAvatarByProfile = async () => null;
  imageRepository.findAvatarsByProfiles = async () => [];
  imageRepository.deleteAvatarForProfile = async () => null;

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/api/profiles`;
  const ownerToken = createAccessToken(ownerId);
  const otherToken = createAccessToken(otherOwnerId);
  const request = (path = "", token, method = "GET", body, creationKey) => fetch(`${url}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(creationKey ? { "Idempotency-Key": creationKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    const creationIndex = Profile.schema.indexes().find(
      ([keys, options]) => keys.owner === 1 && keys.creationKey === 1 && options.unique,
    );
    assert.ok(creationIndex);
    assert.deepEqual(creationIndex[1].partialFilterExpression, {
      creationKey: { $type: "string" },
    });

    assert.equal((await request("", null)).status, 401);
    const injectedOwner = await request("", ownerToken, "POST", { name: "Perfil ajeno", owner: otherOwnerId });
    assert.equal(injectedOwner.status, 400);

    const creationKey = "56c43d2d-2f96-4f82-9c2c-83b8bb8c662a";
    const createResponse = await request("", ownerToken, "POST", { name: "  Casa  " }, creationKey);
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.name, "Casa");
    assert.equal(created.avatar, null);
    assert.equal(Object.hasOwn(created, "owner"), false);

    const retryResponse = await request("", ownerToken, "POST", { name: "Casa" }, creationKey);
    assert.equal(retryResponse.status, 201);
    assert.equal((await retryResponse.json()).id, created.id);
    const conflictingRetry = await request("", ownerToken, "POST", { name: "Otro nombre" }, creationKey);
    assert.equal(conflictingRetry.status, 201);
    assert.equal((await conflictingRetry.json()).id, created.id);

    const concurrentKey = "8ab875c0-7965-4db4-bf17-2dd4df5267ef";
    const concurrentResponses = await Promise.all([
      request("", ownerToken, "POST", { name: "Compartido" }, concurrentKey),
      request("", ownerToken, "POST", { name: "Compartido" }, concurrentKey),
    ]);
    assert.deepEqual(concurrentResponses.map((response) => response.status), [201, 201]);
    const concurrentProfiles = await Promise.all(concurrentResponses.map((response) => response.json()));
    assert.equal(concurrentProfiles[0].id, concurrentProfiles[1].id);

    const ownerProfile = await request(`/${created.id}`, ownerToken);
    assert.equal(ownerProfile.status, 200);
    assert.equal((await ownerProfile.json()).id, created.id);

    const otherProfile = await request("", otherToken, "POST", { name: "Otro perfil" });
    assert.equal(otherProfile.status, 201);
    const other = await otherProfile.json();

    const ownerList = await request("", ownerToken);
    assert.deepEqual(
      (await ownerList.json()).map(({ id }) => id).sort(),
      [created.id, concurrentProfiles[0].id].sort(),
    );
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
    imageRepository.findAvatarByProfile = originals.findAvatarByProfile;
    imageRepository.findAvatarsByProfiles = originals.findAvatarsByProfiles;
    imageRepository.deleteAvatarForProfile = originals.deleteAvatarForProfile;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});