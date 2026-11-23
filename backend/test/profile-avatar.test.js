import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { Image } from "../src/models/image.model.js";
import { imageRepository } from "../src/repositories/image.repository.js";
import { profileRepository } from "../src/repositories/profile.repository.js";
import { revokedTokenRepository } from "../src/repositories/revoked-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

test("El avatar es único y solo el propietario del perfil puede gestionarlo", async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-for-profile-avatar-ownership";

  const ownerId = String(new mongoose.Types.ObjectId());
  const otherOwnerId = String(new mongoose.Types.ObjectId());
  const profileId = String(new mongoose.Types.ObjectId());
  const otherProfileId = String(new mongoose.Types.ObjectId());
  const profiles = new Map([
    [profileId, ownerId],
    [otherProfileId, otherOwnerId],
  ]);
  const avatars = new Map();
  const users = new Map([
    [ownerId, { _id: ownerId, name: "Cliente", email: "client@example.invalid", active: true, deletedAt: null, role: { name: "CLIENT", active: true, deletedAt: null } }],
    [otherOwnerId, { _id: otherOwnerId, name: "Admin", email: "admin@example.invalid", active: true, deletedAt: null, role: { name: "ADMIN", active: true, deletedAt: null } }],
  ]);
  const originals = {
    findById: userRepository.findById,
    findByIdForAuth: userRepository.findByIdForAuth,
    isRevoked: revokedTokenRepository.isRevoked,
    clearDefaultProfileIfMatches: userRepository.clearDefaultProfileIfMatches,
    findProfileById: profileRepository.findByIdForOwner,
    deleteProfileById: profileRepository.deleteByIdForOwner,
    findAvatarByProfile: imageRepository.findAvatarByProfile,
    createAvatarForProfile: imageRepository.createAvatarForProfile,
    updateAvatarForProfile: imageRepository.updateAvatarForProfile,
    deleteAvatarForProfile: imageRepository.deleteAvatarForProfile,
  };

  userRepository.findById = async (id) => users.get(String(id));
  userRepository.findByIdForAuth = userRepository.findById;
  revokedTokenRepository.isRevoked = async () => false;
  userRepository.clearDefaultProfileIfMatches = async () => ({ modifiedCount: 0 });
  profileRepository.findByIdForOwner = async (id, owner) =>
    profiles.get(String(id)) === String(owner) ? { _id: id, name: "Casa" } : null;
  profileRepository.deleteByIdForOwner = async (id, owner) => {
    if (profiles.get(String(id)) !== String(owner)) return null;
    profiles.delete(String(id));
    return { _id: id };
  };
  imageRepository.findAvatarByProfile = async (id) => avatars.get(String(id)) || null;
  imageRepository.createAvatarForProfile = async (id, data) => {
    if (avatars.has(String(id))) {
      const error = new Error("Duplicate profile avatar");
      error.code = 11000;
      error.keyPattern = { entityType: 1, entityId: 1 };
      throw error;
    }
    const now = new Date();
    const avatar = {
      _id: new mongoose.Types.ObjectId(),
      entityType: "profile",
      entityId: id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    avatars.set(String(id), avatar);
    return avatar;
  };
  imageRepository.updateAvatarForProfile = async (id, data) => {
    const avatar = avatars.get(String(id));
    if (!avatar) return null;
    Object.assign(avatar, data, { updatedAt: new Date() });
    return avatar;
  };
  imageRepository.deleteAvatarForProfile = async (id) => {
    const avatar = avatars.get(String(id)) || null;
    avatars.delete(String(id));
    return avatar;
  };

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/profiles`;
  const ownerToken = createAccessToken(ownerId);
  const otherToken = createAccessToken(otherOwnerId);
  const request = (id, suffix = "/avatar", token, method = "GET", body) =>
    fetch(`${baseUrl}/${id}${suffix}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const validAvatar = { url: "https://example.invalid/avatar.png", alt: "Avatar" };

  try {
    const avatarUniqueIndex = Image.schema.indexes().find(
      ([keys, options]) => keys.entityType === 1 && keys.entityId === 1 && options.unique,
    );
    assert.ok(avatarUniqueIndex);
    assert.deepEqual(avatarUniqueIndex[1].partialFilterExpression, { entityType: "profile" });

    assert.equal((await request(profileId)).status, 401);
    assert.equal((await request(profileId, "/avatar", ownerToken, "POST", { ...validAvatar, entityId: otherProfileId })).status, 400);

    const attempts = await Promise.all([
      request(profileId, "/avatar", ownerToken, "POST", validAvatar),
      request(profileId, "/avatar", ownerToken, "POST", validAvatar),
    ]);
    assert.deepEqual(attempts.map((response) => response.status).sort(), [201, 409]);
    const createResponse = attempts.find((response) => response.status === 201);
    const createdAvatar = await createResponse.json();
    assert.equal(createdAvatar.entityId, profileId);
    assert.equal(Object.hasOwn(createdAvatar, "profileId"), false);

    const profileResponse = await request(profileId, "", ownerToken);
    assert.equal(profileResponse.status, 200);
    assert.deepEqual((await profileResponse.json()).avatar, {
      url: validAvatar.url,
      alt: validAvatar.alt,
    });

    const listResponse = await request(profileId, "/avatar", ownerToken);
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).length, 1);
    assert.equal((await request(otherProfileId, "/avatar", ownerToken)).status, 404);
    assert.equal((await request(profileId, "/avatar", otherToken)).status, 404);
    assert.equal((await request(profileId, "/avatar", ownerToken, "PATCH", { url: "https://example.invalid/next.png" })).status, 200);
    assert.equal(avatars.get(profileId).url, "https://example.invalid/next.png");
    assert.equal((await request(profileId, "/avatar", otherToken, "DELETE")).status, 404);
    assert.equal((await request(profileId, "/avatar", ownerToken, "DELETE")).status, 204);
    assert.equal((await request(profileId, "/avatar", ownerToken)).status, 200);
    assert.deepEqual(await (await request(profileId, "/avatar", ownerToken)).json(), []);
    assert.equal(avatars.has(profileId), false);

    assert.equal((await request(profileId, "/avatar", ownerToken, "POST", validAvatar)).status, 201);
    assert.equal((await request(profileId, "", ownerToken, "DELETE")).status, 204);
    assert.equal(avatars.has(profileId), false);
    assert.ok(createdAvatar._id);
  } finally {
    userRepository.findById = originals.findById;
    userRepository.findByIdForAuth = originals.findByIdForAuth;
    revokedTokenRepository.isRevoked = originals.isRevoked;
    userRepository.clearDefaultProfileIfMatches = originals.clearDefaultProfileIfMatches;
    profileRepository.findByIdForOwner = originals.findProfileById;
    profileRepository.deleteByIdForOwner = originals.deleteProfileById;
    imageRepository.findAvatarByProfile = originals.findAvatarByProfile;
    imageRepository.createAvatarForProfile = originals.createAvatarForProfile;
    imageRepository.updateAvatarForProfile = originals.updateAvatarForProfile;
    imageRepository.deleteAvatarForProfile = originals.deleteAvatarForProfile;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("Los endpoints genéricos de imágenes excluyen los avatares de perfil", () => {
  assert.deepEqual(imageRepository.findAll().getFilter(), {
    entityType: { $ne: "profile" },
  });
  assert.deepEqual(imageRepository.findById("507f1f77bcf86cd799439011").getFilter(), {
    _id: "507f1f77bcf86cd799439011",
    entityType: { $ne: "profile" },
  });
  assert.deepEqual(
    imageRepository.updateById("507f1f77bcf86cd799439011", { alt: "Imagen" }).getFilter(),
    { _id: "507f1f77bcf86cd799439011", entityType: { $ne: "profile" } },
  );
  assert.deepEqual(imageRepository.deleteById("507f1f77bcf86cd799439011").getFilter(), {
    _id: "507f1f77bcf86cd799439011",
    entityType: { $ne: "profile" },
  });
});