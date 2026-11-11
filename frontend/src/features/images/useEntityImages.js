import { useCallback, useState } from "react";

import * as imageService from "@/services/imageService";
import { showApiErrorAlert } from "@/utils/errorHandler";

// Conserva los valores recibidos para detectar qué imágenes se editaron.
function toLocalImage(image) {
  return {
    localId: image._id,
    serverId: image._id,
    url: image.url,
    alt: image.alt,
    savedUrl: image.url,
    savedAlt: image.alt,
  };
}

// Mantiene los cambios temporales y confirma cada operación antes de seguir.
export function useEntityImages(entityType, hasExistingEntity = false) {
  // Imágenes visibles: cada una conserva su ID del servidor o uno temporal.
  const [images, setImages] = useState([]);
  // Imágenes existentes que se borrarán solo al guardar el formulario.
  const [removedImages, setRemovedImages] = useState([]);
  // Carga y guardado se muestran por separado porque son operaciones distintas.
  const [loading, setLoading] = useState(false);
  // En edición no se puede guardar hasta que la galería termine de cargar.
  const [ready, setReady] = useState(!hasExistingEntity);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Identifica una creación sin respuesta que podría haberse completado en el servidor.
  const [uncertainCreateLocalId, setUncertainCreateLocalId] = useState(null);

  // En edición, carga las imágenes y prepara el formulario para aceptar cambios.
  const loadImages = useCallback(
    async (entityId) => {
      setLoading(true);
      setReady(false);
      setLoadError("");

      try {
        // El endpoint devuelve la galería completa asociada a esta entidad.
        const result = await imageService.getImagesByEntity(entityType, entityId);
        setImages(result.map(toLocalImage));
        setRemovedImages([]);
        setReady(true);
        return true;
      } catch (error) {
        // Si la galería no carga, dejamos el formulario bloqueado para evitar borrar datos sin verlos.
        const normalized = await showApiErrorAlert(error);
        setLoadError(normalized.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [entityType],
  );

  // Las imágenes nuevas reciben un ID temporal y no llaman todavía a la API.
  const addImage = useCallback((imageData) => {
    setImages((current) => [
      ...current,
      {
        // El prefijo new- distingue este ID temporal de un ObjectId del servidor.
        localId: `new-${globalThis.crypto.randomUUID()}`,
        serverId: null,
        url: imageData.url,
        alt: imageData.alt,
        savedUrl: null,
        savedAlt: null,
      },
    ]);
    setSaveError("");
  }, []);

  // Guarda la edición en React para sincronizarla solo al guardar la categoría.
  const updateImageLocally = useCallback((localId, imageData) => {
    setImages((current) =>
      current.map((image) =>
        image.localId === localId ? { ...image, ...imageData } : image,
      ),
    );
    setSaveError("");
  }, []);

  // Solo las imágenes existentes quedan marcadas para borrado definitivo.
  const removeImageLocally = useCallback(
    (localId) => {
      const image = images.find((item) => item.localId === localId);
      if (!image) return;

      if (image.serverId) {
        setRemovedImages((current) => [...current, image]);
      }
      setImages((current) =>
        current.filter((item) => item.localId !== localId),
      );
      setSaveError("");
    },
    [images],
  );

  // Exige que el usuario compruebe el listado antes de repetir una creación dudosa.
  const confirmUncertainRetry = useCallback(() => {
    setUncertainCreateLocalId(null);
    setSaveError("");
  }, []);

  const syncImages = useCallback(
    async (entityId) => {
      if (uncertainCreateLocalId) {
        setSaveError(
          "Comprueba en el listado de imágenes si la última creación se completó antes de autorizar otro intento.",
        );
        return false;
      }

      setSaving(true);
      setSaveError("");
      let currentAction = null;

      try {
        // Guardamos o actualizamos de una en una y registramos cada éxito.
        for (const image of images) {
          if (!image.serverId) {
            // Una imagen sin serverId todavía necesita su primer POST.
            currentAction = { type: "create", localId: image.localId };
            const created = await imageService.createImage({
              entityType,
              entityId,
              url: image.url,
              alt: image.alt,
            });
            setImages((current) =>
              current.map((item) =>
                item.localId === image.localId
                  ? {
                      ...item,
                      serverId: created._id,
                      savedUrl: created.url,
                      savedAlt: created.alt,
                    }
                  : item,
              ),
            );
            currentAction = null;
            continue;
          }

          // Los valores guardados permiten omitir imágenes que no han cambiado.
          if (image.url === image.savedUrl && image.alt === image.savedAlt) {
            continue;
          }

          // El PATCH conserva la relación y modifica solo los datos editables.
          const updated = await imageService.updateImage(image.serverId, {
            url: image.url,
            alt: image.alt,
          });
          setImages((current) =>
            current.map((item) =>
              item.localId === image.localId
                ? {
                    ...item,
                    url: updated.url,
                    alt: updated.alt,
                    savedUrl: updated.url,
                    savedAlt: updated.alt,
                  }
                : item,
            ),
          );
          currentAction = null;
        }

        // Borramos al final para conservar imágenes si una escritura falla.
        for (const image of removedImages) {
          currentAction = { type: "delete", localId: image.localId };
          await imageService.deleteImage(image.serverId);
          // Quitamos el pendiente solo después de confirmar el DELETE.
          setRemovedImages((current) =>
            current.filter((item) => item.localId !== image.localId),
          );
          currentAction = null;
        }

        return true;
      } catch (error) {
        const normalized = await showApiErrorAlert(error);
        // Una creación sin respuesta puede haberse completado en el servidor.
        // No la repetimos hasta que el usuario compruebe si ya existe.
        if (
          currentAction?.type === "create" &&
          (normalized.status === null || normalized.status >= 500)
        ) {
          setUncertainCreateLocalId(currentAction.localId);
        }
        setSaveError(normalized.message);
        return false;
      } finally {
        // El formulario vuelve a habilitarse tanto si todo salió bien como si falló.
        setSaving(false);
      }
    },
    [entityType, images, removedImages, uncertainCreateLocalId],
  );

  return {
    images,
    removedImages,
    loading,
    ready,
    loadError,
    saving,
    saveError,
    uncertainCreateLocalId,
    loadImages,
    addImage,
    updateImageLocally,
    removeImageLocally,
    confirmUncertainRetry,
    syncImages,
  };
}