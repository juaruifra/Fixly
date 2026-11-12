import { Link, useNavigate } from "react-router-dom";

import RoleForm from "@/features/roles/components/RoleForm";
import { useRoles } from "@/hooks/useRoles";

export default function RoleCreate() {
  const navigate = useNavigate();
  const { createRole, submitting } = useRoles();

  // Volvemos al listado solo cuando la API confirma la creación.
  async function create(data) {
    const role = await createRole(data);
    if (role) navigate("/roles");
  }

  return (
    <section>
      <Link className="back-link" to="/roles">
        ← Volver a roles
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">NUEVO</p>
          <h1>Crear rol</h1>
          <p className="muted">Añade un perfil de acceso a Fixly.</p>
        </div>
      </div>
      <RoleForm
        onSubmit={create}
        submitLabel="Crear rol"
        submitting={submitting}
      />
    </section>
  );
}