import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import ErrorState from "@/components/common/ErrorState";
import Loading from "../components/Loading";
import ServiceChip from "@/features/services/components/ServiceChip";
import { useServices } from "@/hooks/useServices";
import { confirmServiceAction } from "@/utils/confirmAction";

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const {
    getServiceById,
    deleteService,
    restoreService,
    loading,
    submitting,
  } = useServices();

  useEffect(() => {
    getServiceById(id).then(setService);
  }, [getServiceById, id]);

  async function remove() {
    const confirmed = await confirmServiceAction({
      title: "Eliminar servicio",
      message: `¿Quieres eliminar “${service.name}”? Podrás restaurarlo después.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!confirmed) return;

    const deletedId = await deleteService(id);
    if (deletedId) {
      navigate("/services");
    }
  }

  async function restore() {
    const confirmed = await confirmServiceAction({
      title: "Restaurar servicio",
      message: `¿Quieres restaurar “${service.name}”? Luego podrás editarlo de nuevo.`,
      confirmText: "Restaurar",
    });
    if (!confirmed) return;

    const restored = await restoreService(id);
    if (restored) setService(restored);
  }

  if (loading) return <Loading />;

  if (!service) {
    return (
      <section className="detail-page">
        <ErrorState
          title="Servicio no disponible"
          message="No se encontró el servicio solicitado."
        />
        <Link className="back-link" to="/services">
          Volver al listado
        </Link>
      </section>
    );
  }

  return (
    <section className="detail-page">
      <Link className="back-link" to="/services">
        ← Volver a servicios
      </Link>

      <div className="detail-hero card">
        <div className="detail-icon">🔧</div>
        <div>
          <span className="city">
            {service.category} · {service.duration} min
          </span>
          <h1>{service.name}</h1>
          <div className="price">
            {Number(service.price).toLocaleString("es-ES", {
              style: "currency",
              currency: "EUR",
            })}
          </div>
        </div>
      </div>

      {service.deletedAt && (
        <div className="service-deleted-notice" role="status">
          <div>
            <ServiceChip value="deleted" kind="status" label="Eliminado" />
            <p>
              Registro eliminado el{" "}
              {new Date(service.deletedAt).toLocaleString("es-ES")}. Está en
              modo de solo lectura hasta que lo restaures.
            </p>
          </div>
          <Button disabled={submitting} onClick={restore}>
            <RotateCcwIcon aria-hidden="true" />
            Restaurar servicio
          </Button>
        </div>
      )}

      <div className="card detail-body">
        <h2>Descripción</h2>
        <p>{service.description || "Este servicio no tiene descripción."}</p>
        <p>
          <strong>Estado:</strong> {service.active ? "Activo" : "Inactivo"}
        </p>

        <dl className="metadata">
          <div>
            <dt>ID</dt>
            <dd>{service._id}</dd>
          </div>
          <div>
            <dt>Creado</dt>
            <dd>{new Date(service.createdAt).toLocaleString("es-ES")}</dd>
          </div>
          <div>
            <dt>Última actualización</dt>
            <dd>{new Date(service.updatedAt).toLocaleString("es-ES")}</dd>
          </div>
        </dl>

        <div className="form-actions">
          {!service.deletedAt && (
            <>
              <Link className="button" to={`/services/${id}/edit`}>
                Editar
              </Link>
              <button className="button button-danger" onClick={remove}>
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
