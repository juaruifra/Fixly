import { useState } from "react";

// Los campos del formulario se limpian después de cada alta o edición local.
const EMPTY_DRAFT = { url: "", alt: "" };

// Nombres legibles para explicar junto a qué entidad se guardará la galería.
const ENTITY_LABELS = {
  category: "la categoría",
  service: "el servicio",
  variant: "la variante",
};

// Comprueba el formato localmente; que la URL exista depende del servidor externo.
function validateImageDraft(draft) {
  const url = draft.url.trim();
  const alt = draft.alt.trim();

  if (!url || url.length > 2048) {
    return "La URL es obligatoria y no puede superar 2048 caracteres.";
  }
  if (!alt || alt.length > 250) {
    return "El texto alternativo es obligatorio y no puede superar 250 caracteres.";
  }

  try {
    const parsedUrl = new URL(url);
    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return "La URL debe ser HTTP o HTTPS y no incluir credenciales.";
    }
  } catch {
    return "Introduce una URL absoluta válida.";
  }

  return "";
}

// Permite preparar imágenes en el formulario y guardarlas junto a la entidad.
export default function ImageManager({ manager, entityId, entityType }) {
  // Borrador separado para que editar una tarjeta no la cambie hasta confirmar.
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // Identifica la tarjeta en edición; null significa que se está añadiendo.
  const [editingId, setEditingId] = useState(null);
  // Error de campos, distinto de los errores que devuelve la API.
  const [draftError, setDraftError] = useState("");
  // Permite sustituir solo la vista previa fallida, manteniendo las acciones.
  const [unavailableIds, setUnavailableIds] = useState(() => new Set());

  // Limpia el editor sin alterar las imágenes que ya están en la galería.
  function resetDraft() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setDraftError("");
  }

  // Añadir o confirmar una edición solo cambia el estado local del formulario.
  function submitDraft() {
    const error = validateImageDraft(draft);
    if (error) {
      setDraftError(error);
      return;
    }

    const imageData = { url: draft.url.trim(), alt: draft.alt.trim() };
    if (editingId) {
      manager.updateImageLocally(editingId, imageData);
      setUnavailableIds((current) => {
        const next = new Set(current);
        next.delete(editingId);
        return next;
      });
    } else {
      manager.addImage(imageData);
    }
    resetDraft();
  }

  // Copia la imagen al editor sin afectar la tarjeta hasta confirmar.
  function beginEdit(image) {
    setEditingId(image.localId);
    setDraft({ url: image.url, alt: image.alt });
    setDraftError("");
  }

  // El hook distingue entre descartar una nueva y marcar una existente para borrar.
  function removeImage(image) {
    manager.removeImageLocally(image.localId);
    setUnavailableIds((current) => {
      const next = new Set(current);
      next.delete(image.localId);
      return next;
    });
    if (editingId === image.localId) resetDraft();
  }

  // Reintenta la carga inicial cuando la API no pudo devolver la galería.
  async function retryLoad() {
    if (entityId) await manager.loadImages(entityId);
  }

  return (
    <section className="image-manager full-width" aria-labelledby="image-manager-title">
      <div className="image-manager-heading">
        <div>
          <h2 id="image-manager-title">Imágenes</h2>
            <p className="muted">
              Añade imágenes y guárdalas junto con {ENTITY_LABELS[entityType]}.
            </p>
            <p className="image-manager-notice" role="note">
              Guarda {ENTITY_LABELS[entityType]} para aplicar los cambios
              pendientes de imágenes. Si sales antes, esos cambios locales se perderán.
            </p>
        </div>
        {manager.removedImages.length > 0 && (
          <span className="muted" role="status">
            {manager.removedImages.length} pendiente(s) de quitar
          </span>
        )}
      </div>

      {manager.loading && <p role="status">Cargando imágenes…</p>}
      {manager.loadError && (
        <div className="image-manager-error" role="alert">
          <span>{manager.loadError}</span>
          <button type="button" className="button button-secondary" onClick={retryLoad}>
            Reintentar carga
          </button>
        </div>
      )}
      {manager.saveError && (
        <p className="field-error" role="alert">
          No se completó la sincronización de imágenes. {manager.saveError} Puedes
          corregir los datos y volver a guardar; los pasos confirmados se conservan.
        </p>
      )}
      {manager.uncertainCreateLocalId && (
        <div className="image-manager-error" role="alert">
          <span>
            No se pudo confirmar si una imagen se guardó. Comprueba la galería
            de esta entidad en Swagger antes de repetir la operación.
          </span>
          <button
            type="button"
            className="button button-secondary"
            onClick={manager.confirmUncertainRetry}
          >
            Ya lo comprobé; permitir reintento
          </button>
        </div>
      )}

      {/* La galería muestra cambios locales y todavía no confirma cambios en el servidor. */}
      <div className="image-manager-grid">
        {manager.images.map((image) => (
          <article className="image-manager-card" key={image.localId}>
            <div className="image-manager-preview">
              {/* Una URL rota solo afecta a la vista previa; editar y quitar siguen disponibles. */}
              {unavailableIds.has(image.localId) ? (
                <span role="status">Imagen no disponible</span>
              ) : (
                <img
                  src={image.url}
                  alt={image.alt}
                  loading="lazy"
                  onError={() =>
                    setUnavailableIds((current) =>
                      new Set(current).add(image.localId),
                    )
                  }
                />
              )}
            </div>
            <p className="image-manager-alt">{image.alt}</p>
            <div className="image-manager-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={manager.saving || manager.uncertainCreateLocalId === image.localId}
                onClick={() => beginEdit(image)}
              >
                Editar
              </button>
              <button
                type="button"
                className="button button-ghost"
                disabled={manager.saving || manager.uncertainCreateLocalId === image.localId}
                onClick={() => removeImage(image)}
              >
                Quitar
              </button>
            </div>
          </article>
        ))}
        {!manager.loading && manager.ready && manager.images.length === 0 && (
          <p className="muted">Todavía no hay imágenes.</p>
        )}
      </div>

      <div className="image-manager-form">
        <label htmlFor="image-url">
          <span>URL de la imagen</span>
          <input
            id="image-url"
            type="url"
            maxLength={2048}
            value={draft.url}
            aria-invalid={Boolean(draftError)}
            onChange={(event) => setDraft({ ...draft, url: event.target.value })}
          />
        </label>
        <label htmlFor="image-alt">
          <span>Texto alternativo</span>
          <input
            id="image-alt"
            type="text"
            maxLength={250}
            value={draft.alt}
            aria-invalid={Boolean(draftError)}
            onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
          />
        </label>
        {draftError && <p className="field-error" role="alert">{draftError}</p>}
        <div className="image-manager-actions">
          <button type="button" className="button" disabled={manager.saving || !manager.ready} onClick={submitDraft}>
            {editingId ? "Actualizar imagen" : "Añadir imagen"}
          </button>
          {editingId && (
            <button type="button" className="button button-secondary" onClick={resetDraft}>
              Cancelar edición
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
