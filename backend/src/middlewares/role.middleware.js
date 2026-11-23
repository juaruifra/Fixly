import { AppError } from "../utils/app-error.js";

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.authUser) return next(new AppError("Authentication required", 401));
    if (!allowedRoles.includes(req.authUser.role)) {
      return next(new AppError("Insufficient permissions", 403));
    }
    return next();
  };
}
