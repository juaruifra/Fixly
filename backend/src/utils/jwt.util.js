import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import { AppError } from "./app-error.js";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("JWT_SECRET must contain at least 32 characters", 500);
  }
  return secret;
}

export function createAccessToken(userId, tokenVersion = 0) {
  if (!Number.isInteger(tokenVersion) || tokenVersion < 0) {
    throw new AppError("Invalid token version", 500);
  }
  return jwt.sign(
    { sub: String(userId), jti: randomUUID(), tokenVersion },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}
