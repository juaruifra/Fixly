import { NavLink, Outlet } from "react-router-dom";
import { MenuIcon, PlusIcon, WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeSelector from "@/components/ThemeSelector";

export default function Layout() {
  return (
    <div className="app-shell">
      {/* Cabecera principal de Fixly. Está preparada para añadir más secciones. */}
      <header className="topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            {/* Marca de la aplicación. */}
            <NavLink to="/services" className="brand">
              <span className="brand-icon">
                <WrenchIcon />
              </span>

              <span>Fixly</span>
            </NavLink>

            {/* Navegación principal. Aquí añadiremos futuras secciones. */}
            <nav className="nav-links">
              <NavLink to="/services">
                Servicios
              </NavLink>
            </nav>
          </div>

          <div className="topbar-actions">
            {/* Acción principal de la sección actual. */}
            <NavLink to="/services/new" className="button button-small">
              <PlusIcon size={16} />
              Nuevo
            </NavLink>

            <ThemeSelector />

            {/* Reservado para futuras opciones de usuario/configuración. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </Button>
          </div>
        </div>
      </header>

      {/* React Router carga aquí la página correspondiente. */}
      <main className="container main-content">
        <Outlet />
      </main>
    </div>
  );
}