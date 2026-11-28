import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRightIcon, KeyRoundIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { accountDetailsSchema } from "@/pages/auth/accountDetailsSchema";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfiles";
import { updateOwnProfile } from "@/services/authService";
import { showSuccessAlert } from "@/utils/successAlert";
import { getRolePresentation } from "@/utils/rolePresentation";

// Muestra datos de cuenta y permite editar solo nombre y correo.
export default function Account() {
  const { user, updateCurrentUser } = useAuth();
  const { profiles, defaultProfileId } = useProfiles();
  const [isEditing, setIsEditing] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [unavailableAvatarUrl, setUnavailableAvatarUrl] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues: { name: user.name, email: user.email },
  });
  const formName = useWatch({ control, name: "name" }) ?? "";
  const formEmail = useWatch({ control, name: "email" }) ?? "";
  const selectedProfile = profiles.find((profile) => profile.id === user.defaultProfile || profile.id === defaultProfileId);
  const avatar = selectedProfile?.avatar;
  const role = getRolePresentation(user.role?.name);
  const hasChanges =
    formName.trim() !== user.name ||
    formEmail.trim().toLowerCase() !== user.email;

  function startEditing() {
    setRequestError("");
    reset({ name: user.name, email: user.email });
    setIsEditing(true);
  }

  function cancelEditing() {
    reset({ name: user.name, email: user.email });
    setRequestError("");
    setIsEditing(false);
  }

  async function saveAccount(values) {
    const updates = {};
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();
    if (name !== user.name) updates.name = name;
    if (email !== user.email) updates.email = email;
    if (Object.keys(updates).length === 0) return;

    setRequestError("");
    const expectedUserId = String(user._id ?? user.id);
    try {
      const updatedUser = await updateOwnProfile(updates);
      if (!updateCurrentUser(updatedUser, expectedUserId)) return;
      reset({ name: updatedUser.name, email: updatedUser.email });
      setIsEditing(false);
      await showSuccessAlert("Datos actualizados", "Los datos de tu cuenta se han guardado correctamente.");
    } catch (error) {
      setRequestError(
        error?.status === 409
          ? "Ese correo electrónico ya está registrado."
          : error?.message || "No se pudieron guardar los cambios.",
      );
    }
  }

  return (
    <div className="account-page">
      <header className="account-page-header">
        <h1>Mi cuenta</h1>
      </header>

      <section className="account-home" aria-label="Datos y opciones de cuenta">
        <div className="account-summary">
          {avatar?.url && unavailableAvatarUrl !== avatar.url ? (
            <img
              className="account-summary-avatar"
              src={avatar.url}
              alt={avatar.alt || "Avatar del perfil predeterminado"}
              onError={() => setUnavailableAvatarUrl(avatar.url)}
            />
          ) : (
            <div className="account-summary-icon">
              <UsersIcon aria-hidden="true" />
            </div>
          )}
          <div className="account-summary-content">
            {isEditing ? (
              <form className="account-details-form" onSubmit={handleSubmit(saveAccount)} noValidate>
                <label htmlFor="account-name">
                  <span>Nombre</span>
                  <input
                    id="account-name"
                    maxLength={120}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "account-name-error" : undefined}
                    {...register("name")}
                  />
                  {errors.name && <small id="account-name-error" className="field-error">{errors.name.message}</small>}
                </label>
                <label htmlFor="account-email">
                  <span>Correo electrónico</span>
                  <input
                    id="account-email"
                    type="email"
                    maxLength={254}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "account-email-error" : undefined}
                    {...register("email")}
                  />
                  {errors.email && <small id="account-email-error" className="field-error">{errors.email.message}</small>}
                </label>
                <div>
                  <span className="account-details-label">Rol</span>
                  <Badge variant="chip" tone={role.tone}>{role.label}</Badge>
                </div>
                {requestError && <p className="field-error" role="alert">{requestError}</p>}
                <div className="account-details-actions">
                  <button className="button button-secondary" type="button" onClick={cancelEditing} disabled={isSubmitting}>
                    Cancelar
                  </button>
                  <button className="button" type="submit" disabled={isSubmitting || !hasChanges}>
                    {isSubmitting ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <dl className="account-details">
                  <div><dt>Nombre</dt><dd>{user.name}</dd></div>
                  <div><dt>Correo electrónico</dt><dd>{user.email}</dd></div>
                  <div>
                    <dt>Rol</dt>
                    <dd><Badge variant="chip" tone={role.tone}>{role.label}</Badge></dd>
                  </div>
                </dl>
                <button className="button button-secondary account-edit-button" type="button" onClick={startEditing}>
                  Editar datos
                </button>
              </>
            )}
          </div>
        </div>

        <div className="account-shortcuts">
          <Link className="card account-shortcut" to="/account/profiles">
            <span className="account-shortcut-icon">
              <UsersIcon aria-hidden="true" />
            </span>
            <span className="account-shortcut-copy">
              <strong>Mis perfiles</strong>
              <span>Consulta y gestiona tus perfiles.</span>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </Link>
          <Link className="card account-shortcut" to="/account/password">
            <span className="account-shortcut-icon">
              <KeyRoundIcon aria-hidden="true" />
            </span>
            <span className="account-shortcut-copy">
              <strong>Contraseña</strong>
              <span>Actualiza la contraseña de tu cuenta.</span>
            </span>
            <ChevronRightIcon aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}