import { useEffect, useRef, useState } from "react";
import { CircleUserRoundIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import ProfileFormModal from "@/features/profiles/components/ProfileFormModal";
import { useProfiles } from "@/hooks/useProfiles";
import { confirmServiceAction } from "@/utils/confirmAction";

// Gestiona el listado; el modal concentra los cambios de nombre y avatar.
export default function ProfileManager() {
  const [modalProfile, setModalProfile] = useState(undefined);
  const [notice, setNotice] = useState("");
  const creationKeyRef = useRef(null);
  const {
    profiles,
    loading,
    submitting,
    error,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setProfileAvatar,
  } = useProfiles();

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  function openNewProfile() {
    setNotice("");
    // Reutilizamos la clave si se cerró un alta cuya respuesta pudo perderse.
    if (!creationKeyRef.current) {
      creationKeyRef.current = globalThis.crypto.randomUUID();
    }
    setModalProfile(null);
  }

  function finishSaving({ profile, avatar, created }) {
    setProfileAvatar(profile.id, avatar);
    if (created) creationKeyRef.current = null;
    setModalProfile(undefined);
    setNotice(created ? "Perfil creado." : "Perfil actualizado.");
  }

  async function removeProfile(profile) {
    const confirmed = await confirmServiceAction({
      title: "Eliminar perfil",
      message: `¿Quieres eliminar el perfil “${profile.name}”?`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!confirmed) return;

    setNotice("");
    // La confirmación de éxito solo se muestra si el servidor elimina el perfil.
    const removed = await deleteProfile(profile.id);
    if (removed) setNotice("Perfil eliminado.");
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
      {notice && <p role="status">{notice}</p>}

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
            <li className="card account-profile-card" key={profile.id}>
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
              <div className="account-profile-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  title={`Editar perfil ${profile.name}`}
                  aria-label={`Editar perfil ${profile.name}`}
                  onClick={() => {
                    setNotice("");
                    setModalProfile(profile);
                  }}
                  disabled={isBusy}
                >
                  <PencilIcon aria-hidden="true" />
                  Editar
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  title={`Eliminar perfil ${profile.name}`}
                  aria-label={`Eliminar perfil ${profile.name}`}
                  onClick={() => void removeProfile(profile)}
                  disabled={isBusy}
                >
                  <Trash2Icon aria-hidden="true" />
                  Eliminar
                </button>
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