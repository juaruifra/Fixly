import { apiService } from "@/services/apiService";

const IMAGES_PATH = "/images";

// Estas funciones solo traducen operaciones de la interfaz a endpoints de Image.
export async function getImagesByEntity(entityType, entityId) {
  const { data } = await apiService.get(
    `${IMAGES_PATH}/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
  );
  return data;
}

export async function createImage(imageData) {
  const { data } = await apiService.post(IMAGES_PATH, imageData);
  return data;
}

export async function updateImage(id, imageData) {
  const { data } = await apiService.patch(
    `${IMAGES_PATH}/${encodeURIComponent(id)}`,
    imageData,
  );
  return data;
}

export async function deleteImage(id) {
  try {
    await apiService.delete(`${IMAGES_PATH}/${encodeURIComponent(id)}`);
  } catch (error) {
    // Un 404 significa que el borrado ya se completó antes de perder la respuesta.
    if (error.status === 404) return;
    throw error;
  }
}