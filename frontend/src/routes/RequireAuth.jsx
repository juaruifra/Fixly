import { Navigate, Outlet } from "react-router-dom";

import { PageLoader } from "@/components/common/PageLoader";
import { useAuth } from "@/providers/AuthProvider";

// No muestra contenido privado hasta comprobar la sesión y el rol en el servidor.
export default function RequireAuth({ adminOnly = false }) {
  const { user, status, sessionError, restoreSession } = useAuth();

  if (status === "checking") return <PageLoader />;
  if (status === "unavailable") {
    return (
      <div className="login-page">
        <div className="login-content">
          <h1>Sesión no disponible</h1>
          <p role="alert">{sessionError}</p>
          <button className="button" type="button" onClick={restoreSession}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  if (adminOnly && user.role.name !== "ADMIN") {
    return <Navigate to="/account" replace />;
  }

  return <Outlet />;
}