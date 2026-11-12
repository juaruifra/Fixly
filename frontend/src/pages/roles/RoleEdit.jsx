import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import RoleForm from "@/features/roles/components/RoleForm";
import { useRoles } from "@/hooks/useRoles";

export default function RoleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const { getRoleById, updateRole, loading, submitting } = useRoles();

  useEffect(() => {
    // La ruta de detalle permite editar aunque el rol no esté en el listado.
    getRoleById(id).then(setRole);
  }, [getRoleById, id]);

  // El formulario envía solo los tres campos que permite editar el backend.
  async function update(data) {
    const updated = await updateRole(id, data);
    if (updated) navigate("/roles");
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando formulario de rol">
        <Skeleton className="mb-6 h-4 w-36" />
        <div className="page-header compact space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="card form-card space-y-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-28 w-full" />
        </div>
      </section>
    );
  }

  if (!role) {
    return (
      <section>
        <ErrorState
          title="Rol no disponible"
          message="No se encontró el rol solicitado."
        />
        <Link className="back-link" to="/roles">
          Volver a roles
        </Link>
      </section>
    );
  }

  if (role.deletedAt) {
    return (
      <section>
        <ErrorState
          title="Rol eliminado"
          message="Restaura el rol antes de editarlo."
        />
        <Link className="back-link" to="/roles">
          Volver al listado para restaurar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link className="back-link" to="/roles">
        ← Volver a roles
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">EDITAR</p>
          <h1>Editar rol</h1>
          <p className="muted">Actualiza los datos del rol.</p>
        </div>
      </div>
      <RoleForm
        initialValues={role}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}