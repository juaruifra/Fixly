import jwt from "jsonwebtoken";

import { AppError } from "./app-error.js";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("JWT_SECRET must contain at least 32 characters", 500);
  }
  return secret;
}

export function createAccessToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}
