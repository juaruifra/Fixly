import { useEffect, useState } from "react";

import ImageManager from "@/features/images/components/ImageManager";
import { useEntityImages } from "@/features/images/useEntityImages";
import { confirmServiceAction } from "@/utils/confirmAction";

function hasPendingChanges(manager, draftDirty) {
  return (
    draftDirty ||
    manager.removedImages.length > 0 ||
    manager.images.some((image) =>
      !image.serverId ||
      image.url !== image.savedUrl ||
      image.alt !== image.savedAlt,
    )
  );
}

export default function ProfileAvatarEditor({ profile, onClose, onSaved }) {
  const manager = useEntityImages("profile", true);
  const [draftDirty, setDraftDirty] = useState(false);

  useEffect(() => {
    void manager.loadImages(profile.id);
  }, [manager.loadImages, profile.id]);

  async function saveAvatar() {
    if (await manager.syncImages(profile.id)) await onSaved();
  }

  async function cancelEditing() {
    if (hasPendingChanges(manager, draftDirty)) {
      const discard = await confirmServiceAction({
        title: "Descartar cambios del avatar",
        message: "Los cambios que no hayas guardado se perderán.",
        confirmText: "Descartar",
        danger: true,
      });
      if (!discard) return;
    }
    onClose();
  }

  return (
    <section className="account-avatar-editor" aria-labelledby="avatar-editor-title">
      <h3 id="avatar-editor-title">Avatar de {profile.name}</h3>
      <ImageManager
        manager={manager}
        entityId={profile.id}
        entityType="profile"
        maxImages={1}
        title="Avatar"
        description="Cada perfil puede tener un único avatar. Edita el existente para sustituirlo."
        saveNotice="Guarda el avatar para aplicar los cambios. Si cierras antes, los cambios pendientes se descartarán."
        onDraftDirtyChange={setDraftDirty}
      />
      {draftDirty && (
        <p className="muted" role="note">
          Confirma el borrador con «Añadir imagen» o «Actualizar imagen» antes de guardar el avatar.
        </p>
      )}
      <div className="form-actions">
        <button
          className="button"
          type="button"
          onClick={() => void saveAvatar()}
          disabled={!manager.ready || manager.saving || draftDirty}
        >
          {manager.saving ? "Guardando…" : "Guardar avatar"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void cancelEditing()}
          disabled={manager.saving}
        >
          Cerrar
        </button>
      </div>
    </section>
  );
}