import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import WorkerForm from "@/features/workers/components/WorkerForm";
import { useWorkers } from "@/hooks/useWorkers";

export default function WorkerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const { getWorkerById, updateWorker, loading, submitting } = useWorkers();

  useEffect(() => {
    // Carga el registro por ID aunque no esté en el listado compartido.
    getWorkerById(id).then(setWorker);
  }, [getWorkerById, id]);

  async function update(data) {
    const updates = {};
    if (data.name !== worker.name) updates.name = data.name;
    if (data.email !== worker.email) updates.email = data.email;
    if (data.phone !== undefined && data.phone !== worker.phone) {
      updates.phone = data.phone;
    }

    // No enviamos un PATCH vacío cuando el usuario no ha cambiado nada.
    if (Object.keys(updates).length === 0) {
      navigate("/workers");
      return;
    }

    const updated = await updateWorker(id, updates);
    if (updated) navigate("/workers");
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando formulario de trabajador">
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

  if (!worker) {
    return (
      <section>
        <ErrorState
          title="Trabajador no disponible"
          message="No se encontró el trabajador solicitado."
        />
        <Link className="back-link" to="/workers">
          Volver a trabajadores
        </Link>
      </section>
    );
  }

  if (worker.deletedAt) {
    return (
      <section>
        <ErrorState
          title="Trabajador eliminado"
          message="Restaura el trabajador antes de editar sus datos."
        />
        <Link className="back-link" to="/workers">
          Volver al listado para restaurar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link className="back-link" to="/workers">
        ← Volver a trabajadores
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">EDITAR</p>
          <h1>Editar trabajador</h1>
          <p className="muted">Actualiza los datos de contacto.</p>
        </div>
      </div>
      <WorkerForm
        initialValues={worker}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}