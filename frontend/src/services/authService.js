import { apiService } from "@/services/apiService";

// Comprueba las credenciales usando el endpoint de autenticación existente.
export async function login(credentials) {
  const { data } = await apiService.post("/auth/login", credentials);
  return data;
}

// /auth/me comprueba el token y devuelve la identidad vigente.
export async function getCurrentUser(token) {
  const { data } = await apiService.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// El endpoint siempre cambia la contraseña de la sesión autenticada.
export async function changeOwnPassword(currentPassword, newPassword) {
  await apiService.patch("/auth/password", { currentPassword, newPassword });
}

export async function logout() {
  await apiService.post("/auth/logout");
}

export async function updateOwnProfile(profileData) {
  const { data } = await apiService.patch("/auth/me", profileData);
  return data;
}