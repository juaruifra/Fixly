import { apiService } from "@/services/apiService";

const IMAGES_PATH = "/images";

// Estas funciones solo traducen operaciones de la interfaz a endpoints de Image.
export async function getImagesByEntity(entityType, entityId) {
  if (entityType === "profile") {
    const { data } = await apiService.get(
      `/profiles/${encodeURIComponent(entityId)}/avatar`,
    );
    return data;
  }

  const { data } = await apiService.get(
    `${IMAGES_PATH}/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
  );
  return data;
}

export async function createImage(imageData) {
  if (imageData.entityType === "profile") {
    const { data } = await apiService.post(
      `/profiles/${encodeURIComponent(imageData.entityId)}/avatar`,
      { url: imageData.url, alt: imageData.alt },
    );
    return data;
  }

  const { data } = await apiService.post(IMAGES_PATH, imageData);
  return data;
}

export async function updateImage(id, imageData, context) {
  if (context?.entityType === "profile") {
    const { data } = await apiService.patch(
      `/profiles/${encodeURIComponent(context.entityId)}/avatar`,
      imageData,
    );
    return data;
  }

  const { data } = await apiService.patch(
    `${IMAGES_PATH}/${encodeURIComponent(id)}`,
    imageData,
  );
  return data;
}

export async function deleteImage(id, context) {
  try {
    if (context?.entityType === "profile") {
      await apiService.delete(
        `/profiles/${encodeURIComponent(context.entityId)}/avatar`,
      );
      return;
    }
    await apiService.delete(`${IMAGES_PATH}/${encodeURIComponent(id)}`);
  } catch (error) {
    // Un 404 significa que el borrado ya se completó antes de perder la respuesta.
    if (error.status === 404) return;
    throw error;
  }
}