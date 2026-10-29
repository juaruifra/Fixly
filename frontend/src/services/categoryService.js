import { apiService } from "@/services/apiService";

const CATEGORIES_PATH = "/categories";

// Centraliza las rutas HTTP para que las pantallas no dependan de ellas.
export async function getCategories(params = {}) {
  const { data } = await apiService.get(CATEGORIES_PATH, { params });
  return data;
}

export async function getAvailableCategories() {
  const { data } = await apiService.get(`${CATEGORIES_PATH}/available`);
  return data;
}

export async function getCategoryById(id) {
  const { data } = await apiService.get(
    `${CATEGORIES_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function getCategoryBySlug(slug) {
  const { data } = await apiService.get(
    `${CATEGORIES_PATH}/slug/${encodeURIComponent(slug)}`,
  );
  return data;
}

export async function createCategory(categoryData) {
  const { data } = await apiService.post(CATEGORIES_PATH, categoryData);
  return data;
}

export async function updateCategory(id, categoryData) {
  const { data } = await apiService.patch(
    `${CATEGORIES_PATH}/${encodeURIComponent(id)}`,
    categoryData,
  );
  return data;
}

export async function deleteCategory(id) {
  const { data } = await apiService.delete(
    `${CATEGORIES_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function restoreCategory(id) {
  const { data } = await apiService.patch(
    `${CATEGORIES_PATH}/${encodeURIComponent(id)}/restore`,
  );
  return data;
}

export async function changeCategoryActive(id, active) {
  const { data } = await apiService.patch(
    `${CATEGORIES_PATH}/${encodeURIComponent(id)}/active`,
    { active },
  );
  return data;
}