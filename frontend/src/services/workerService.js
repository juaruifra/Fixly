import { apiService } from "@/services/apiService";

const WORKERS_PATH = "/workers";

// Estas funciones mantienen los endpoints administrativos fuera de las pantallas.
export async function getWorkers(params = {}) {
  const { data } = await apiService.get(WORKERS_PATH, { params });
  return data;
}

export async function getWorkerById(id) {
  const { data } = await apiService.get(
    `${WORKERS_PATH}/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createWorker(workerData) {
  const { data } = await apiService.post(WORKERS_PATH, workerData);
  return data;
}

export async function updateWorker(id, workerData) {
  const { data } = await apiService.patch(
    `${WORKERS_PATH}/${encodeURIComponent(id)}`,
    workerData,
  );
  return data;
}

export async function deleteWorker(id) {
  await apiService.delete(`${WORKERS_PATH}/${encodeURIComponent(id)}`);
}

export async function restoreWorker(id) {
  const { data } = await apiService.patch(
    `${WORKERS_PATH}/${encodeURIComponent(id)}/restore`,
  );
  return data;
}

export async function changeWorkerActive(id, active) {
  const { data } = await apiService.patch(
    `${WORKERS_PATH}/${encodeURIComponent(id)}/active`,
    { active },
  );
  return data;
}