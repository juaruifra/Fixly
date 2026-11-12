import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import UserForm from "@/features/users/components/UserForm";
import { useUsers } from "@/hooks/useUsers";

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { getUserById, updateUser, loading, submitting } = useUsers();

  useEffect(() => {
    // La API devuelve datos seguros y el rol poblado, nunca la contraseña.
    getUserById(id).then(setUser);
  }, [getUserById, id]);

  async function update(data) {
    const updates = { ...data };
    const currentRoleId = String(user.role?._id ?? user.role ?? "");

    // No reenviamos un rol actual inactivo si el usuario no ha cambiado la relación.
    if (updates.role === currentRoleId) delete updates.role;

    const hasUserChanges =
      updates.name !== user.name ||
      updates.email !== user.email ||
      updates.role !== undefined ||
      updates.password !== undefined;

    if (!hasUserChanges) {
      navigate("/users");
      return;
    }

    const updated = await updateUser(id, updates);
    if (updated) navigate("/users");
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando formulario de usuario">
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
          <Skeleton className="h-9 w-full" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section>
        <ErrorState
          title="Usuario no disponible"
          message="No se encontró el usuario solicitado."
        />
        <Link className="back-link" to="/users">
          Volver a usuarios
        </Link>
      </section>
    );
  }

  if (user.deletedAt) {
    return (
      <section>
        <ErrorState
          title="Usuario eliminado"
          message="Restaura el usuario antes de editar sus datos."
        />
        <Link className="back-link" to="/users">
          Volver al listado para restaurar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link className="back-link" to="/users">
        ← Volver a usuarios
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">EDITAR</p>
          <h1>Editar usuario</h1>
          <p className="muted">Actualiza los datos y, si hace falta, la contraseña.</p>
        </div>
      </div>
      <UserForm
        initialValues={user}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}