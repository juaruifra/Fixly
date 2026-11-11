import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ServiceForm from "@/features/services/components/ServiceForm";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/common/ErrorState";
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

  // Conservamos los datos actuales si el usuario solo modifica imágenes.
  async function update(data, imageManager) {
    const currentCategoryId = String(
      service.category?._id ?? service.category ?? "",
    );
    const hasServiceChanges =
      data.name !== service.name ||
      data.category !== currentCategoryId ||
      data.price !== service.price ||
      data.duration !== service.duration ||
      data.description !== (service.description ?? "") ||
      data.active !== service.active ||
      data.status !== service.status;

    if (hasServiceChanges) {
      const updated = await updateService(id, data);
      if (!updated) return;
      setService(updated);
    }

    // Las escrituras de imágenes empiezan cuando el servicio ya está al día.
    if (await imageManager.syncImages(id)) navigate("/services");
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando formulario de edición">
        <Skeleton className="mb-6 h-4 w-36" />
        <div className="page-header compact">
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="card form-card">
          <div className="form-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="space-y-2" key={index}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
            <div className="full-width space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="form-actions">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </section>
    );
  }

  if (!service) {
    return (
      <div className="service-missing-state">
        <p>El servicio no está disponible.</p>
        <Link to="/services">Volver</Link>
      </div>
    );
  }

  if (service.deletedAt) {
    return (
      <section>
        <ErrorState
          title="Servicio eliminado"
          message="Restaura el servicio antes de editarlo."
        />
        <Link className="back-link" to="/services">
          Volver al listado para restaurar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link className="back-link" to="/services">
        ← Volver a servicios
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
        entityId={id}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}
