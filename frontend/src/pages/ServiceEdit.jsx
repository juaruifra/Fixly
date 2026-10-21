import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ServiceForm from "@/features/services/components/ServiceForm";
import Loading from "../components/Loading";
import { useServices } from "@/hooks/useServices";

export default function ServiceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const {
    getServiceById,
    updateService,
    loading,
    submitting,
  } = useServices();

  useEffect(() => {
    getServiceById(id).then(setService);
  }, [getServiceById, id]);

  async function update(data) {
    const updated = await updateService(id, data);
    if (updated) {
      navigate(`/services/${id}`);
    }
  }

  if (loading) return <Loading />;

  if (!service) {
    return (
      <div className="service-missing-state">
        <p>El servicio no está disponible.</p>
        <Link to="/services">Volver</Link>
      </div>
    );
  }

  return (
    <section>
      <Link className="back-link" to={`/services/${id}`}>
        ← Volver al detalle
      </Link>

      <div className="page-header compact">
        <div>
          <p className="eyebrow">EDITAR</p>
          <h1>Editar servicio</h1>
          <p className="muted">Actualiza los datos y guarda los cambios.</p>
        </div>
      </div>

      <ServiceForm
        initialValues={service}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}
