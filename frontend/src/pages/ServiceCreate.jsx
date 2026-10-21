import { Link, useNavigate } from "react-router-dom";

import ServiceForm from "@/features/services/components/ServiceForm";
import { useServices } from "@/hooks/useServices";

export default function ServiceCreate() {
  const navigate = useNavigate();
  const {
    createService,
    submitting,
  } = useServices();

  async function create(data) {
    const created = await createService(data);
    if (created) {
      navigate(`/services/${created._id}`);
    }
  }

  return (
    <section>
      <Link className="back-link" to="/services">
        ← Volver
      </Link>

      <div className="page-header compact">
        <div>
          <p className="eyebrow">NUEVO</p>
          <h1>Crear servicio</h1>
          <p className="muted">Añade un servicio al catálogo de Fixly.</p>
        </div>
      </div>

      <ServiceForm
        onSubmit={create}
        submitLabel="Crear servicio"
        submitting={submitting}
      />
    </section>
  );
}
