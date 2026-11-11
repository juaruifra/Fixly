import { apiService } from "@/services/apiService";

const VARIANTS_PATH = "/variants";

// Estas funciones mantienen las rutas de Variant fuera de las pantallas.
export async function getVariants(params = {}) {
  const { data } = await apiService.get(VARIANTS_PATH, { params });
  return data;
}

export async function getVariantById(id) {
  const { data } = await apiService.get(
    `${VARIANTS_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createVariant(variantData) {
  const { data } = await apiService.post(VARIANTS_PATH, variantData);
  return data;
}

export async function updateVariant(id, variantData) {
  const { data } = await apiService.patch(
    `${VARIANTS_PATH}/${encodeURIComponent(id)}`,
    variantData,
  );
  return data;
}

export async function deleteVariant(id) {
  await apiService.delete(`${VARIANTS_PATH}/${encodeURIComponent(id)}`);
}

export async function restoreVariant(id) {
  const { data } = await apiService.patch(
    `${VARIANTS_PATH}/${encodeURIComponent(id)}/restore`,
  );
  return data;
}

export async function changeVariantActive(id, active) {
  const { data } = await apiService.patch(
    `${VARIANTS_PATH}/${encodeURIComponent(id)}/active`,
    { active },
  );
  return data;
}

export async function changeVariantStatus(id, status) {
  const { data } = await apiService.patch(
    `${VARIANTS_PATH}/${encodeURIComponent(id)}/status`,
    { status },
  );
  return data;
}