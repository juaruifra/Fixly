import { apiService } from "@/services/apiService";

const SERVICES_PATH = "/services";

export async function getServices(params = {}) {
  const { data } = await apiService.get(SERVICES_PATH, { params });
  return data;
}

export async function getPublicServices() {
  const { data } = await apiService.get(`${SERVICES_PATH}/public`);
  return data;
}

export async function getServiceBySlug(slug) {
  const encodedSlug = encodeURIComponent(slug);
  const { data } = await apiService.get(`${SERVICES_PATH}/slug/${encodedSlug}`);
  return data;
}

export async function getServiceById(id) {
  const { data } = await apiService.get(
    `${SERVICES_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createService(serviceData) {
  const { data } = await apiService.post(SERVICES_PATH, serviceData);
  return data;
}

export async function updateService(id, serviceData) {
  const { data } = await apiService.patch(
    `${SERVICES_PATH}/${encodeURIComponent(id)}`,
    serviceData,
  );
  return data;
}

export async function deleteService(id) {
  const { data } = await apiService.delete(
    `${SERVICES_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function restoreService(id) {
  const { data } = await apiService.patch(
    `${SERVICES_PATH}/${encodeURIComponent(id)}/restore`,
  );
  return data;
}

export async function changeServiceActive(id, active) {
  const { data } = await apiService.patch(
    `${SERVICES_PATH}/${encodeURIComponent(id)}/active`,
    { active },
  );
  return data;
}

export async function changeServiceStatus(id, status) {
  const { data } = await apiService.patch(
    `${SERVICES_PATH}/${encodeURIComponent(id)}/status`,
    { status },
  );
  return data;
}