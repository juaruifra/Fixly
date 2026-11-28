import { Suspense } from "react";
import { Link, Outlet } from "react-router-dom";
import { PanelsTopLeftIcon, WrenchIcon } from "lucide-react";

import ThemeSelector from "@/components/ThemeSelector";
import ProfileSelector from "@/components/layout/ProfileSelector";
import { PageLoader } from "@/components/common/PageLoader";
import { useAuth } from "@/providers/AuthProvider";

export function FixlyNavbarNavigation({ user, status, personalMenu = null }) {
  return (
    <nav className="public-nav" aria-label="Navegación principal">
      <Link to="/shop">Servicios</Link>
      {status === "authenticated" && user?.role?.name === "ADMIN" && (
        <Link to="/services"><PanelsTopLeftIcon aria-hidden="true" /> Administración</Link>
      )}
      {status === "anonymous" && <Link to="/login">Iniciar sesión</Link>}
      {status === "unavailable" && <Link to="/login">Comprobar sesión</Link>}
      {status === "authenticated" && personalMenu}
      <ThemeSelector />
    </nav>
  );
}

export function FixlyNavbar() {
  const { user, status } = useAuth();

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link className="public-brand" to="/" aria-label="Fixly, inicio">
          <span className="public-brand-mark"><WrenchIcon aria-hidden="true" /></span>
          <span>Fixly<span className="public-brand-dot">.</span></span>
        </Link>
        <FixlyNavbarNavigation
          user={user}
          status={status}
          personalMenu={status === "authenticated" ? <ProfileSelector /> : null}
        />
      </div>
    </header>
  );
}

// Layout compartido: navbar única y footer fuera del área administrativa.
export default function PublicLayout() {
  return (
    <div className="public-shell">
      <FixlyNavbar />
      <main className="public-main"><Suspense fallback={<PageLoader />}><Outlet /></Suspense></main>
      <footer className="public-footer"><span>Fixly.</span><span>Servicios para tu día a día</span></footer>
    </div>
  );
}