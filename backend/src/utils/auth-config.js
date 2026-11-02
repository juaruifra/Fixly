export function isLocalAuthBypassEnabled(req) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.AUTH_DISABLED !== "true"
  ) {
    return false;
  }

  const address = String(req?.ip ?? req?.socket?.remoteAddress ?? "").replace(
    /^::ffff:/,
    "",
  );
  return address === "127.0.0.1" || address === "::1";
}