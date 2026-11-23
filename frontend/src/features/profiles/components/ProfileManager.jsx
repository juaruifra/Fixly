import { useRef, useState } from "react";
import { CircleUserRoundIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProfileFormModal from "@/features/profiles/components/ProfileFormModal";
import { useProfiles } from "@/hooks/useProfiles";
import { confirmServiceAction } from "@/utils/confirmAction";
import { showSuccessAlert } from "@/utils/successAlert";

// Gestiona el listado; el modal concentra los cambios de nombre y avatar.
export default function ProfileManager() {
  const [modalProfile, setModalProfile] = useState(undefined);
  const creationKeyRef = useRef(null);
  const {
    profiles,
    defaultProfileId,
    loading,
    submitting,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    selectDefaultProfile,
    setProfileAvatar,
  } = useProfiles();

  function openNewProfile() {
    // Reutilizamos la clave si se cerró un alta cuya respuesta pudo perderse.
    if (!creationKeyRef.current) {
      creationKeyRef.current = globalThis.crypto.randomUUID();
    }
    setModalProfile(null);
  }

  async function finishSaving({ profile, avatar, created }) {
    setProfileAvatar(profile.id, avatar);
    if (created) creationKeyRef.current = null;
    setModalProfile(undefined);
    await showSuccessAlert(
      created ? "Perfil creado" : "Perfil actualizado",
      created
        ? "El perfil se ha creado correctamente."
        : "Los cambios se han guardado correctamente.",
    );
  }

  async function removeProfile(profile) {
    const confirmed = await confirmServiceAction({
      title: "Eliminar perfil",
      message: `¿Quieres eliminar el perfil “${profile.name}”?`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!confirmed) return;

    // La confirmación de éxito solo se muestra si el servidor elimina el perfil.
    const removed = await deleteProfile(profile.id);
    if (removed) {
      await showSuccessAlert(
        "Perfil eliminado",
        "El perfil se ha eliminado correctamente.",
      );
    }
  }

  const isBusy = submitting || loading;

  return (
    <section className="account-profiles" aria-labelledby="profiles-heading">
      <header className="account-profiles-header">
        <div>
          <h1 id="profiles-heading">Mis perfiles</h1>
          <p className="account-profiles-description">
            Gestiona los perfiles asociados a tu cuenta.
          </p>
        </div>
        <button className="button" type="button" onClick={openNewProfile} disabled={loading}>
          <PlusIcon aria-hidden="true" />
          Nuevo perfil
        </button>
      </header>
      {error && modalProfile === undefined && <p className="field-error" role="alert">{error}</p>}
      {loading ? (
        <p role="status">Cargando perfiles…</p>
      ) : profiles.length === 0 && !error ? (
        <div className="card account-profiles-empty">
          <CircleUserRoundIcon aria-hidden="true" />
          <p>Aún no tienes perfiles.</p>
          <button className="button button-secondary" type="button" onClick={openNewProfile}>
            Crear primer perfil
          </button>
        </div>
      ) : (
        <ul className="account-profile-grid">
          {profiles.map((profile) => (
            <li
              className={`card account-profile-card${profile.id === defaultProfileId ? " account-profile-card-default" : ""}`}
              key={profile.id}
            >
              {profile.avatar ? (
                <img
                  className="account-profile-avatar"
                  src={profile.avatar.url}
                  alt={profile.avatar.alt}
                  loading="lazy"
                />
              ) : (
                <CircleUserRoundIcon className="account-profile-avatar-placeholder" aria-hidden="true" />
              )}
              <span className="account-profile-name">{profile.name}</span>
              {profile.id === defaultProfileId && (
                <Badge className="account-profile-default" variant="chip" tone="info">
                  <StarIcon aria-hidden="true" />
                  Predeterminado
                </Badge>
              )}
              <div className="account-profile-actions">
                {profile.id !== defaultProfileId && (
                  <Button
                    className="account-profile-icon-action"
                    variant="outline"
                    size="icon-sm"
                    type="button"
                    title={`Establecer ${profile.name} como predeterminado`}
                    aria-label={`Establecer ${profile.name} como predeterminado`}
                    onClick={() => void selectDefaultProfile(profile.id)}
                    disabled={isBusy}
                  >
                    <StarIcon aria-hidden="true" />
                  </Button>
                )}
                <Button
                  className="account-profile-icon-action"
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  title={`Editar perfil ${profile.name}`}
                  aria-label={`Editar perfil ${profile.name}`}
                  onClick={() => {
                    setModalProfile(profile);
                  }}
                  disabled={isBusy}
                >
                  <PencilIcon aria-hidden="true" />
                </Button>
                <Button
                  className="account-profile-icon-action"
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  title={`Eliminar perfil ${profile.name}`}
                  aria-label={`Eliminar perfil ${profile.name}`}
                  onClick={() => void removeProfile(profile)}
                  disabled={isBusy}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {modalProfile !== undefined && (
        <ProfileFormModal
          key={modalProfile?.id ?? "new-profile"}
          initialProfile={modalProfile}
          creationKey={creationKeyRef.current}
          profileError={error}
          createProfile={createProfile}
          updateProfile={updateProfile}
          onCancel={() => setModalProfile(undefined)}
          onSaved={finishSaving}
        />
      )}
    </section>
  );
}