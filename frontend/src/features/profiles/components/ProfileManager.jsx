import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";

import ProfileAvatarEditor from "@/features/profiles/components/ProfileAvatarEditor";
import { profileSchema } from "@/features/profiles/profileSchema";
import { useProfiles } from "@/hooks/useProfiles";
import { confirmServiceAction } from "@/utils/confirmAction";

export default function ProfileManager() {
  const [editingProfile, setEditingProfile] = useState(null);
  const [avatarProfile, setAvatarProfile] = useState(null);
  const [notice, setNotice] = useState("");
  const {
    profiles,
    loading,
    submitting,
    error,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useProfiles();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  function startEditing(profile) {
    setNotice("");
    setEditingProfile(profile);
    reset({ name: profile.name });
  }

  function cancelEditing() {
    setEditingProfile(null);
    reset({ name: "" });
  }

  async function saveProfile(values) {
    setNotice("");
    const saved = editingProfile
      ? await updateProfile(editingProfile.id, values)
      : await createProfile(values);
    if (!saved) return;

    setNotice(editingProfile ? "Perfil actualizado." : "Perfil creado.");
    setEditingProfile(null);
    reset({ name: "" });
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
    const removed = await deleteProfile(profile.id);
    if (removed) {
      if (editingProfile?.id === profile.id) cancelEditing();
      setAvatarProfile((current) => current?.id === profile.id ? null : current);
      setNotice("Perfil eliminado.");
    }
  }

  const isSaving = submitting || isSubmitting;

  return (
    <section className="account-profiles" aria-labelledby="profiles-heading">
      <h2 id="profiles-heading">Perfiles</h2>
      {error && <p className="field-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <form className="card form-card account-profile-form" onSubmit={handleSubmit(saveProfile)} noValidate>
        <h3>{editingProfile ? "Editar perfil" : "Crear perfil"}</h3>
        <label htmlFor="profile-name">
          <span>Nombre</span>
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
        <div className="form-actions">
          <button className="button" type="submit" disabled={isSaving}>
            {isSaving ? "Guardando…" : editingProfile ? "Guardar cambios" : "Crear perfil"}
          </button>
          {editingProfile && (
            <button
              className="button button-secondary"
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h3>Perfiles guardados</h3>
      {loading ? (
        <p role="status">Cargando perfiles…</p>
      ) : profiles.length === 0 ? (
        <p className="muted">Aún no hay perfiles.</p>
      ) : (
        <ul className="account-profile-list">
          {profiles.map((profile) => (
            <li key={profile.id}>
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
                  onClick={() => {
                    setNotice("");
                    setAvatarProfile(profile);
                  }}
                  disabled={isSaving}
                >
                  Editar avatar
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  title={`Editar perfil ${profile.name}`}
                  aria-label={`Editar perfil ${profile.name}`}
                  onClick={() => startEditing(profile)}
                  disabled={isSaving}
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
                  disabled={isSaving}
                >
                  <Trash2Icon aria-hidden="true" />
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {avatarProfile && profiles.some((profile) => profile.id === avatarProfile.id) && (
        <ProfileAvatarEditor
          key={avatarProfile.id}
          profile={avatarProfile}
          onClose={() => setAvatarProfile(null)}
          onSaved={async () => {
            await loadProfiles();
            setAvatarProfile(null);
            setNotice("Avatar guardado.");
          }}
        />
      )}
    </section>
  );
}