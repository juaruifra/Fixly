import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import ProfileAvatarEditor from "@/features/profiles/components/ProfileAvatarEditor";
import { profileSchema } from "@/features/profiles/profileSchema";
import { useEntityImages } from "@/features/images/useEntityImages";
import { confirmServiceAction } from "@/utils/confirmAction";

function hasPendingChanges(formDirty, avatarManager, avatarDraftDirty) {
  return (
    formDirty ||
    avatarDraftDirty ||
    avatarManager.removedImages.length > 0 ||
    avatarManager.images.some((image) =>
      !image.serverId ||
      image.url !== image.savedUrl ||
      image.alt !== image.savedAlt,
    )
  );
}

// Mantiene juntos los cambios locales de nombre y avatar hasta guardar el perfil.
export default function ProfileFormModal({
  initialProfile,
  creationKey,
  profileError,
  createProfile,
  updateProfile,
  onCancel,
  onSaved,
}) {
  const dialogRef = useRef(null);
  const [activeProfile, setActiveProfile] = useState(initialProfile);
  const [createdInModal, setCreatedInModal] = useState(false);
  const [avatarDraftDirty, setAvatarDraftDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarManager = useEntityImages("profile", Boolean(initialProfile));
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initialProfile?.name ?? "" },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    // El diálogo nativo gestiona el foco y limita la navegación al contenido modal.
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (initialProfile?.id) void avatarManager.loadImages(initialProfile.id);
  }, [avatarManager.loadImages, initialProfile?.id]);

  async function requestClose() {
    if (saving || isSubmitting || avatarManager.saving) return;

    if (hasPendingChanges(isDirty, avatarManager, avatarDraftDirty)) {
      const hasPartialSave = createdInModal || activeProfile?.name !== initialProfile?.name;
      const confirmed = await confirmServiceAction({
        title: "Descartar cambios",
        message: hasPartialSave
          ? "Ya hay cambios guardados en el perfil. Al cerrar se descartarán los cambios que aún estén pendientes."
          : "Los cambios que no hayas guardado se perderán.",
        confirmText: "Descartar",
        danger: true,
      });
      if (!confirmed) return;
    }

    onCancel();
  }

  async function saveProfile(values) {
    setSaving(true);
    let profile = activeProfile;
    let createdNow = false;

    try {
      const hasAvatarChanges =
        avatarManager.removedImages.length > 0 ||
        avatarManager.images.some((image) =>
          !image.serverId ||
          image.url !== image.savedUrl ||
          image.alt !== image.savedAlt,
        );
      if (profile && profile.name === values.name && !hasAvatarChanges) {
        if (dialogRef.current?.open) dialogRef.current.close();
        onCancel();
        return;
      }

      if (!profile) {
        profile = await createProfile({ name: values.name }, creationKey);
        if (!profile) return;
        // Conservamos el ID aunque falle después la sincronización del avatar.
        setActiveProfile(profile);
        setCreatedInModal(true);
        createdNow = true;
        reset({ name: profile.name });
      }

      if (profile.name !== values.name) {
        const updated = await updateProfile(profile.id, { name: values.name });
        if (!updated) return;
        profile = updated;
        setActiveProfile(profile);
        reset({ name: profile.name });
      }

      // La imagen solo se sincroniza después de confirmar el perfil y su ID.
      if (!(await avatarManager.syncImages(profile.id))) return;

      const avatar = avatarManager.images[0]
        ? { url: avatarManager.images[0].url, alt: avatarManager.images[0].alt }
        : null;
      // Cerramos el diálogo nativo antes de que el padre muestre SweetAlert2.
      if (dialogRef.current?.open) dialogRef.current.close();
      await onSaved({ profile, avatar, created: createdNow || createdInModal });
    } finally {
      setSaving(false);
    }
  }

  function handleDialogCancel(event) {
    event.preventDefault();
    void requestClose();
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) void requestClose();
  }

  const isEditing = Boolean(initialProfile || createdInModal);
  const isSaving = saving || isSubmitting || avatarManager.saving;

  return (
    <dialog
      ref={dialogRef}
      className="profile-modal"
      aria-labelledby="profile-modal-title"
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
    >
      <form className="profile-modal-content" onSubmit={handleSubmit(saveProfile)} noValidate>
        <header className="profile-modal-header">
          <div>
            <h2 id="profile-modal-title">{isEditing ? "Editar perfil" : "Nuevo perfil"}</h2>
            <p className="muted">El nombre y el avatar se guardan juntos.</p>
          </div>
        </header>

        {profileError && <p className="field-error" role="alert">{profileError}</p>}
        <label htmlFor="profile-name">
          <span>Nombre del perfil</span>
          <input
            id="profile-name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "profile-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <small id="profile-name-error" className="field-error">
              {errors.name.message}
            </small>
          )}
        </label>

        <ProfileAvatarEditor
          manager={avatarManager}
          entityId={activeProfile?.id ?? initialProfile?.id}
          onDraftDirtyChange={setAvatarDraftDirty}
        />
        {avatarDraftDirty && (
          <p className="muted" role="note">
            Confirma el borrador con «Añadir imagen» o «Actualizar imagen» antes de guardar el perfil.
          </p>
        )}

        <div className="form-actions profile-modal-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void requestClose()}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            className="button"
            type="submit"
            disabled={isSaving || !avatarManager.ready || avatarDraftDirty}
          >
            {isSaving ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </form>
    </dialog>
  );
}