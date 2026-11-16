import { Link } from "react-router-dom";
import { ChevronRightIcon, KeyRoundIcon, UsersIcon } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";

// Resume la cuenta y enlaza a las dos secciones personales.
export default function Account() {
  const { user } = useAuth();

  return (
    <main className="account-page">
      <header className="account-page-header">
        <h1>Mi cuenta</h1>
      </header>

      <section className="account-home" aria-label="Datos y opciones de cuenta">
        <div className="account-summary">
          <div className="account-summary-icon">
            <UsersIcon aria-hidden="true" />
          </div>
          <dl className="account-details">
            <div><dt>Nombre</dt><dd>{user.name}</dd></div>
            <div><dt>Correo electrónico</dt><dd>{user.email}</dd></div>
            <div><dt>Rol</dt><dd>{user.role.name}</dd></div>
          </dl>
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
    </main>
  );
}