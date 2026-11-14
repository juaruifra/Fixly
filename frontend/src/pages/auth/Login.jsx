import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useLocation } from "react-router-dom";

import ThemeSelector from "@/components/ThemeSelector";
import { PageLoader } from "@/components/common/PageLoader";
import { loginSchema } from "@/pages/auth/loginSchema";
import { useAuth } from "@/providers/AuthProvider";

// El formulario delega la verificación y conservación de la sesión al contexto.
export default function Login() {
  const [requestError, setRequestError] = useState("");
  const { user, status, signIn, restoreSession, sessionError } = useAuth();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(credentials) {
    setRequestError("");

    try {
      await signIn(credentials);
    } catch (error) {
      // La alerta no distingue cuentas inexistentes de contraseñas incorrectas.
      setRequestError(
        error?.status === 401
          ? "No se pudo iniciar sesión. Comprueba tus credenciales."
          : error?.status === 403
            ? "La cuenta no tiene acceso en este momento."
            : error?.message || "No se pudo verificar el acceso.",
      );
    } finally {
      // La contraseña no se conserva en el formulario tras la petición.
      resetField("password");
    }
  }

  if (status === "checking") return <PageLoader />;
  if (status === "authenticated") {
    return <Navigate to={user.role.name === "ADMIN" ? "/services" : "/account"} replace />;
  }

  return (
    <main className="login-page">
      <div className="login-content">
        <div className="login-header">
          <strong className="login-brand">Fixly</strong>
          <ThemeSelector />
        </div>
        <h1>Iniciar sesión</h1>
        {location.state?.passwordChanged && (
          <p role="status">Contraseña actualizada. Inicia sesión de nuevo.</p>
        )}
        {status === "unavailable" && (
          <div role="alert">
            <p>{sessionError}</p>
            <button className="button button-secondary" type="button" onClick={restoreSession}>
              Reintentar sesión
            </button>
          </div>
        )}
        <form className="card form-card login-form" onSubmit={handleSubmit(submit)} noValidate>
          <label htmlFor="login-email">
            <span>Correo electrónico</span>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <small id="login-email-error" className="field-error">
                {errors.email.message}
              </small>
            )}
          </label>
          <label htmlFor="login-password">
            <span>Contraseña</span>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <small id="login-password-error" className="field-error">
                {errors.password.message}
              </small>
            )}
          </label>
          {requestError && <p className="field-error" role="alert">{requestError}</p>}
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Comprobando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}