import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import ThemeSelector from "@/components/ThemeSelector";
import ProfileManager from "@/features/profiles/components/ProfileManager";
import { accountPasswordSchema } from "@/pages/auth/accountSchema";
import { useAuth } from "@/providers/AuthProvider";
import { changeOwnPassword } from "@/services/authService";

// Muestra los datos verificados de la cuenta sin permitir editar el rol.
export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [requestError, setRequestError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(accountPasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function submit(values) {
    setRequestError("");
    try {
      // Solo se envían las contraseñas necesarias; la confirmación queda en React.
      await changeOwnPassword(values.currentPassword, values.newPassword);
      reset();
      signOut();
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setRequestError(
        error?.status === 400 && error?.message === "Current password is incorrect"
          ? "La contraseña actual no es correcta."
          : error?.message || "No se pudo cambiar la contraseña.",
      );
    }
  }

  return (
    <main className="login-page">
      <div className="login-content">
        <div className="login-header">
          <strong className="login-brand">Fixly</strong>
          <ThemeSelector />
        </div>
        {user.role.name === "ADMIN" && (
          <Link className="back-link" to="/services">Volver al panel</Link>
        )}
        <h1>Mi cuenta</h1>
        <dl className="account-details">
          <div><dt>Nombre</dt><dd>{user.name}</dd></div>
          <div><dt>Correo electrónico</dt><dd>{user.email}</dd></div>
          <div><dt>Rol</dt><dd>{user.role.name}</dd></div>
        </dl>

        <form className="card form-card login-form" onSubmit={handleSubmit(submit)} noValidate>
          <h2>Cambiar contraseña</h2>
          <label htmlFor="current-password">
            <span>Contraseña actual</span>
            <input id="current-password" type="password" autoComplete="current-password"
              aria-invalid={Boolean(errors.currentPassword)}
              aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
              {...register("currentPassword")} />
            {errors.currentPassword && <small id="current-password-error" className="field-error">{errors.currentPassword.message}</small>}
          </label>
          <label htmlFor="new-password">
            <span>Nueva contraseña</span>
            <input id="new-password" type="password" autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={errors.newPassword ? "new-password-error" : undefined}
              {...register("newPassword")} />
            {errors.newPassword && <small id="new-password-error" className="field-error">{errors.newPassword.message}</small>}
          </label>
          <label htmlFor="confirm-password">
            <span>Confirmar nueva contraseña</span>
            <input id="confirm-password" type="password" autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              {...register("confirmPassword")} />
            {errors.confirmPassword && <small id="confirm-password-error" className="field-error">{errors.confirmPassword.message}</small>}
          </label>
          {requestError && <p className="field-error" role="alert">{requestError}</p>}
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
        <ProfileManager />
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}