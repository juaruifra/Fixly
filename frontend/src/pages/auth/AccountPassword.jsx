import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { accountPasswordSchema } from "@/pages/auth/accountSchema";
import { useAuth } from "@/providers/AuthProvider";
import { changeOwnPassword } from "@/services/authService";

// Conserva las validaciones y el cierre de sesión del cambio de contraseña.
export default function AccountPassword() {
  const { signOut } = useAuth();
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
    <main className="account-page">
      <header className="account-page-header">
        <h1>Contraseña</h1>
      </header>
      <form
        className="card form-card login-form account-password-form"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <h2>Cambiar contraseña</h2>
        <label htmlFor="current-password">
          <span>Contraseña actual</span>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <small id="current-password-error" className="field-error">
              {errors.currentPassword.message}
            </small>
          )}
        </label>
        <label htmlFor="new-password">
          <span>Nueva contraseña</span>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? "new-password-error" : undefined}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <small id="new-password-error" className="field-error">
              {errors.newPassword.message}
            </small>
          )}
        </label>
        <label htmlFor="confirm-password">
          <span>Confirmar nueva contraseña</span>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <small id="confirm-password-error" className="field-error">
              {errors.confirmPassword.message}
            </small>
          )}
        </label>
        {requestError && <p className="field-error" role="alert">{requestError}</p>}
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </main>
  );
}