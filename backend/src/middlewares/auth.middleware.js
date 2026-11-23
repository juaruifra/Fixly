import mongoose from "mongoose";

import { revokedTokenRepository } from "../repositories/revoked-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.util.js";

function invalidToken() {
  return new AppError("Invalid or expired token", 401);
}

async function authenticateRequest(req, _res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new AppError("Authentication required", 401);

    let payload;
    try {
      payload = verifyAccessToken(match[1]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw invalidToken();
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !mongoose.isObjectIdOrHexString(payload.sub) ||
      typeof payload.jti !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.jti) ||
      !Number.isInteger(payload.tokenVersion) ||
      payload.tokenVersion < 0 ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= 0
    ) {
      throw invalidToken();
    }

    const expiresAt = new Date(payload.exp * 1000);
    if (!Number.isFinite(expiresAt.getTime())) throw invalidToken();

    if (await revokedTokenRepository.isRevoked(payload.jti)) throw invalidToken();

    // Releemos usuario, versión y rol para aplicar los cambios inmediatamente.
    const user = await userRepository.findByIdForAuth(payload.sub);
    if (!user || !user.active || user.deletedAt != null) {
      throw invalidToken();
    }
    if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
      throw invalidToken();
    }
    if (!user.role?.active || user.role.deletedAt != null) {
      throw new AppError("User role is not available", 403);
    }

    req.authUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role.name,
    };
    req.authToken = { jti: payload.jti, expiresAt };
    next();
  } catch (error) {
    next(error);
  }
}

// Los dos nombres se mantienen por compatibilidad y aplican la misma autenticación.
export function authenticate(req, res, next) {
  return authenticateRequest(req, res, next);
}

export function authenticateRequired(req, res, next) {
  return authenticateRequest(req, res, next);
}
