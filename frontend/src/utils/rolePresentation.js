export function getRolePresentation(roleName) {
  if (roleName === "ADMIN") return { label: "ADMIN", tone: "info" };
  if (roleName === "CLIENT") return { label: "CLIENT", tone: "success" };
  return { label: roleName || "Sin rol", tone: "neutral" };
}