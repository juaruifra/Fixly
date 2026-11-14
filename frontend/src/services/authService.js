import { apiService } from "@/services/apiService";

// Comprueba las credenciales usando el endpoint de autenticación existente.
export async function login(credentials) {
  const { data } = await apiService.post("/auth/login", credentials);
  return data;
}

// /auth/me exige el token real incluso cuando está activo el bypass local.
export async function getCurrentUser(token) {
  const { data } = await apiService.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}