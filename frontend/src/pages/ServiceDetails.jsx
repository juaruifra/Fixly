import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
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

  if (loading) {
    return (
      <section className="detail-page" role="status" aria-label="Cargando servicio">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="detail-hero card">
          <Skeleton className="size-12 rounded-lg" />
          <div className="w-full space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
        <div className="card detail-body space-y-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="metadata">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="form-actions">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </section>
    );
  }

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
          <div className="detail-statuses" aria-label="Estado del servicio">
            <ServiceChip value={service.status} kind="status" />
            <ServiceChip
              value={service.deletedAt ? "deleted" : service.active ? "active" : "inactive"}
              kind="availability"
              label={
                service.deletedAt
                  ? "Eliminado"
                  : service.active
                    ? "Activo"
                    : "Inactivo"
              }
            />
          </div>
        </div>
      </div>

      {service.deletedAt && (
        <div className="service-deleted-notice" role="status">
          <div>
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
