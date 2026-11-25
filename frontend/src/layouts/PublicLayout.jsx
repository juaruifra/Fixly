import { Link, Outlet, useNavigate } from "react-router-dom";
import { CircleUserRoundIcon, LogOutIcon, PanelsTopLeftIcon, UsersIcon, WrenchIcon } from "lucide-react";

import ThemeSelector from "@/components/ThemeSelector";
import { useAuth } from "@/providers/AuthProvider";
import { showApiErrorAlert } from "@/utils/errorHandler";

export function PublicNavigation({ user, status, isLoggingOut, onSignOut }) {
  const authenticated = status === "authenticated";

  return (
    <nav className="public-nav" aria-label="Navegación principal">
      {authenticated && user?.role?.name === "ADMIN" && (
        <Link to="/services"><PanelsTopLeftIcon aria-hidden="true" /> Administración</Link>
      )}
      {authenticated && (
        <>
          <Link to="/account"><CircleUserRoundIcon aria-hidden="true" /> Mi cuenta</Link>
          <Link to="/account/profiles"><UsersIcon aria-hidden="true" /> Mis perfiles</Link>
        </>
      )}
      {status === "anonymous" && <Link to="/login">Iniciar sesión</Link>}
      {status === "unavailable" && <Link to="/login">Comprobar sesión</Link>}
      {authenticated && (
        <button type="button" className="public-signout" onClick={onSignOut} disabled={isLoggingOut}>
          <LogOutIcon aria-hidden="true" /> {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      )}
      <ThemeSelector />
    </nav>
  );
}

export default function PublicLayout() {
  const { user, status, signOut, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      await showApiErrorAlert(error, "No se pudo cerrar la sesión en el servidor");
    }
  }

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <Link className="public-brand" to="/" aria-label="Fixly, inicio">
            <span className="public-brand-mark"><WrenchIcon aria-hidden="true" /></span>
            <span>Fixly<span className="public-brand-dot">.</span></span>
          </Link>
          <PublicNavigation user={user} status={status} isLoggingOut={isLoggingOut} onSignOut={handleSignOut} />
        </div>
      </header>
      <main className="public-main"><Outlet /></main>
      <footer className="public-footer"><span>Fixly.</span><span>Servicios para tu día a día</span></footer>
    </div>
  );
}