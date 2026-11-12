import { Link, useNavigate } from "react-router-dom";

import WorkerForm from "@/features/workers/components/WorkerForm";
import { useWorkers } from "@/hooks/useWorkers";

export default function WorkerCreate() {
  const navigate = useNavigate();
  const { createWorker, submitting } = useWorkers();

  // El correo requerido se valida antes de enviar el alta al backend.
  async function create(data) {
    const worker = await createWorker(data);
    if (worker) navigate("/workers");
  }

  return (
    <section>
      <Link className="back-link" to="/workers">
        ← Volver a trabajadores
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">NUEVO</p>
          <h1>Crear trabajador</h1>
          <p className="muted">Añade un trabajador sin crear una cuenta de usuario.</p>
        </div>
      </div>
      <WorkerForm
        creating
        onSubmit={create}
        submitLabel="Crear trabajador"
        submitting={submitting}
      />
    </section>
  );
}