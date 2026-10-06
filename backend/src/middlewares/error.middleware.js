export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}
export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err?.name === "ValidationError") {
    const firstError = Object.values(err.errors || {})[0];
    return res.status(400).json({ message: firstError?.message || "Validation error" });
  }
  if (err?.code === 11000) return res.status(409).json({ message: "Duplicate resource" });
  const status = Number.isInteger(err?.status) ? err.status : 500;
  return res.status(status).json({ message: status === 500 ? "Internal server error" : (err.message || "Request failed") });
}
