import { apiService } from "@/services/apiService";

const ROLES_PATH = "/roles";

// Mantiene las rutas HTTP de roles fuera de los componentes visuales.
export async function getRoles(params = {}) {
  const { data } = await apiService.get(ROLES_PATH, { params });
  return data;
}

export async function getRoleById(id) {
  const { data } = await apiService.get(
    `${ROLES_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createRole(roleData) {
  const { data } = await apiService.post(ROLES_PATH, roleData);
  return data;
}

export async function updateRole(id, roleData) {
  const { data } = await apiService.patch(
    `${ROLES_PATH}/${encodeURIComponent(id)}`,
    roleData,
  );
  return data;
}

export async function deleteRole(id) {
  await apiService.delete(`${ROLES_PATH}/${encodeURIComponent(id)}`);
}

export async function restoreRole(id) {
  const { data } = await apiService.patch(
    `${ROLES_PATH}/${encodeURIComponent(id)}/restore`,
  );
  return data;
}

export async function changeRoleActive(id, active) {
  const { data } = await apiService.patch(
    `${ROLES_PATH}/${encodeURIComponent(id)}/active`,
    { active },
  );
  return data;
}