import mongoose from "mongoose";

import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.util.js";

export async function authenticate(req, _res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new AppError("Authentication required", 401);

    let payload;
    try {
      payload = verifyAccessToken(match[1]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid or expired token", 401);
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      !mongoose.isObjectIdOrHexString(payload.sub)
    ) {
      throw new AppError("Invalid or expired token", 401);
    }

    // Releemos el usuario para que un cambio de rol o desactivación surta efecto ya.
    const user = await userRepository.findById(payload.sub);
    if (!user || !user.active || user.deletedAt != null) {
      throw new AppError("Invalid or expired token", 401);
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
    next();
  } catch (error) {
    next(error);
  }
}
