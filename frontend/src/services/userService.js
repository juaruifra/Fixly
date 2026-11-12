import { apiService } from "@/services/apiService";

const USERS_PATH = "/users";

// Estas funciones mantienen los endpoints administrativos fuera de las pantallas.
export async function getUsers(params = {}) {
  const { data } = await apiService.get(USERS_PATH, { params });
  return data;
}

export async function getUserById(id) {
  const { data } = await apiService.get(
    `${USERS_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createUser(userData) {
  const { data } = await apiService.post(USERS_PATH, userData);
  return data;
}

export async function updateUser(id, userData) {
  const { data } = await apiService.patch(
    `${USERS_PATH}/${encodeURIComponent(id)}`,
    userData,
  );
  return data;
}

export async function deleteUser(id) {
  await apiService.delete(`${USERS_PATH}/${encodeURIComponent(id)}`);
}

export async function restoreUser(id) {
  const { data } = await apiService.patch(
    `${USERS_PATH}/${encodeURIComponent(id)}/restore`,
  );
  return data;
}

export async function changeUserActive(id, active) {
  const { data } = await apiService.patch(
    `${USERS_PATH}/${encodeURIComponent(id)}/active`,
    { active },
  );
  return data;
}