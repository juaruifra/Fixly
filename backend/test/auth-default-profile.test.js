import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import { imageRepository } from "../src/repositories/image.repository.js";
import { profileRepository } from "../src/repositories/profile.repository.js";
import { revokedTokenRepository } from "../src/repositories/revoked-token.repository.js";
import { userRepository } from "../src/repositories/user.repository.js";
import { swaggerSpec } from "../src/config/swagger.js";
import { createAccessToken } from "../src/utils/jwt.util.js";

test("Mi cuenta edita datos y mantiene un perfil predeterminado propio", async () => {
  assert.ok(swaggerSpec.paths["/api/auth/me"]?.patch);
  assert.ok(swaggerSpec.paths["/api/auth/me/default-profile"]?.patch);
  assert.equal(swaggerSpec.components.schemas.User.properties.defaultProfile.nullable, true);
  process.env.NODE_ENV = "test";
  process.env.AUTH_DISABLED = "true";
  process.env.JWT_SECRET = "test-secret-for-default-profile-tests";

  const ownerId = String(new mongoose.Types.ObjectId());
  const otherOwnerId = String(new mongoose.Types.ObjectId());
  const ownProfileId = String(new mongoose.Types.ObjectId());
  const secondOwnProfileId = String(new mongoose.Types.ObjectId());
  const otherProfileId = String(new mongoose.Types.ObjectId());
  const raceProfileId = String(new mongoose.Types.ObjectId());
  const users = new Map([
    [ownerId, { _id: ownerId, name: "Cliente", email: "client@example.invalid", active: true, deletedAt: null, role: { name: "CLIENT", active: true, deletedAt: null } }],
    [otherOwnerId, { _id: otherOwnerId, name: "Otro", email: "other@example.invalid", active: true, deletedAt: null, role: { name: "CLIENT", active: true, deletedAt: null } }],
  ]);
  const profiles = new Map([
    [ownProfileId, { _id: ownProfileId, owner: ownerId, name: "Casa" }],
    [secondOwnProfileId, { _id: secondOwnProfileId, owner: ownerId, name: "Trabajo" }],
    [otherProfileId, { _id: otherProfileId, owner: otherOwnerId, name: "Ajeno" }],
    [raceProfileId, { _id: raceProfileId, owner: ownerId, name: "Concurrente" }],
  ]);
  const originals = {
    findById: userRepository.findById,
    findByIdForAuth: userRepository.findByIdForAuth,
    existsByEmail: userRepository.existsByEmail,
    updateOwnProfile: userRepository.updateOwnProfile,
    setDefaultProfile: userRepository.setDefaultProfile,
    clearDefaultProfileIfMatches: userRepository.clearDefaultProfileIfMatches,
    findByIdForOwner: profileRepository.findByIdForOwner,
    deleteByIdForOwner: profileRepository.deleteByIdForOwner,
    deleteAvatarForProfile: imageRepository.deleteAvatarForProfile,
    isRevoked: revokedTokenRepository.isRevoked,
  };

  userRepository.findById = async (id) => users.get(String(id)) || null;
  userRepository.findByIdForAuth = userRepository.findById;
  userRepository.existsByEmail = async (email, { excludeId } = {}) =>
    [...users.values()].some(
      (user) => user.email === email && String(user._id) !== String(excludeId),
    );
  userRepository.updateOwnProfile = async (id, updates) => {
    const user = users.get(String(id));
    if (!user || !user.active || user.deletedAt != null) return null;
    Object.assign(user, updates);
    return user;
  };
  userRepository.setDefaultProfile = async (id, profileId) => {
    const user = users.get(String(id));
    if (!user || !user.active || user.deletedAt != null) return null;
    user.defaultProfile = profileId;
    return user;
  };
  userRepository.clearDefaultProfileIfMatches = async (id, profileId) => {
    const user = users.get(String(id));
    if (user && String(user.defaultProfile) === String(profileId)) user.defaultProfile = null;
    return { modifiedCount: user && user.defaultProfile === null ? 1 : 0 };
  };

  let raceReads = 0;
  profileRepository.findByIdForOwner = async (id, owner) => {
    if (String(id) === raceProfileId && ++raceReads === 2) {
      profiles.delete(raceProfileId);
      return null;
    }
    const profile = profiles.get(String(id));
    return profile?.owner === String(owner) ? profile : null;
  };
  profileRepository.deleteByIdForOwner = async (id, owner) => {
    const profile = profiles.get(String(id));
    if (!profile || profile.owner !== String(owner)) return null;
    profiles.delete(String(id));
    return profile;
  };
  imageRepository.deleteAvatarForProfile = async () => null;
  revokedTokenRepository.isRevoked = async () => false;

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const ownerToken = createAccessToken(ownerId);
  const otherToken = createAccessToken(otherOwnerId);
  const request = (path, token, method = "GET", body) => fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  try {
    assert.equal((await request("/auth/me", null)).status, 401);
    const originalUser = await (await request("/auth/me", ownerToken)).json();
    assert.equal(originalUser.defaultProfile, null);
    assert.equal(Object.hasOwn(originalUser, "tokenVersion"), false);

    const nameUpdate = await request("/auth/me", ownerToken, "PATCH", { name: "  Nombre nuevo  " });
    assert.equal(nameUpdate.status, 200);
    assert.equal((await nameUpdate.json()).name, "Nombre nuevo");
    const emailUpdate = await request("/auth/me", ownerToken, "PATCH", { email: "  NEW@EXAMPLE.INVALID " });
    assert.equal(emailUpdate.status, 200);
    assert.equal((await emailUpdate.json()).email, "new@example.invalid");
    assert.equal((await request("/auth/me", ownerToken, "PATCH", { email: "other@example.invalid" })).status, 409);
    assert.equal((await request("/auth/me", ownerToken, "PATCH", {})).status, 400);
    assert.equal((await request("/auth/me", ownerToken, "PATCH", { role: "ADMIN" })).status, 400);
    assert.equal((await request("/auth/me", ownerToken, "PATCH", { defaultProfile: otherProfileId })).status, 400);
    assert.equal((await request("/auth/me", ownerToken)).status, 200);

    const selectOwn = await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: ownProfileId });
    assert.equal(selectOwn.status, 200);
    assert.equal((await selectOwn.json()).defaultProfile, ownProfileId);
    assert.equal((await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: ownProfileId })).status, 200);
    assert.equal((await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: otherProfileId })).status, 404);
    assert.equal((await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: String(new mongoose.Types.ObjectId()) })).status, 404);
    assert.equal((await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: "inválido" })).status, 400);
    assert.equal((await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: ownProfileId, role: "ADMIN" })).status, 400);

    const clear = await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: null });
    assert.equal(clear.status, 200);
    assert.equal((await clear.json()).defaultProfile, null);
    await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: ownProfileId });
    assert.equal((await request(`/profiles/${secondOwnProfileId}`, ownerToken, "DELETE")).status, 204);
    assert.equal(users.get(ownerId).defaultProfile, ownProfileId);

    assert.equal((await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: raceProfileId })).status, 404);
    assert.equal(users.get(ownerId).defaultProfile, null);

    await request("/auth/me/default-profile", ownerToken, "PATCH", { profileId: ownProfileId });
    assert.equal((await request(`/profiles/${ownProfileId}`, ownerToken, "DELETE")).status, 204);
    assert.equal(users.get(ownerId).defaultProfile, null);

    assert.equal((await request("/auth/me/default-profile", otherToken, "PATCH", { profileId: ownProfileId })).status, 404);
  } finally {
    userRepository.findById = originals.findById;
    userRepository.findByIdForAuth = originals.findByIdForAuth;
    userRepository.existsByEmail = originals.existsByEmail;
    userRepository.updateOwnProfile = originals.updateOwnProfile;
    userRepository.setDefaultProfile = originals.setDefaultProfile;
    userRepository.clearDefaultProfileIfMatches = originals.clearDefaultProfileIfMatches;
    profileRepository.findByIdForOwner = originals.findByIdForOwner;
    profileRepository.deleteByIdForOwner = originals.deleteByIdForOwner;
    imageRepository.deleteAvatarForProfile = originals.deleteAvatarForProfile;
    revokedTokenRepository.isRevoked = originals.isRevoked;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});