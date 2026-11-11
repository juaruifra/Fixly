import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ServiceForm from "@/features/services/components/ServiceForm";
import { useServices } from "@/hooks/useServices";

export default function ServiceCreate() {
  const navigate = useNavigate();
  // Solo conservamos el servicio después de recibir confirmación del backend.
  const [savedService, setSavedService] = useState(null);
  // Evita repetir un POST cuya respuesta se perdió o fue incierta.
  const [uncertainCreate, setUncertainCreate] = useState(false);
  const {
    createService,
    updateService,
    submitting,
  } = useServices();

  // Primero guarda el servicio; después usa su ID para sincronizar las imágenes.
  async function create(data, imageManager) {
    let service = savedService;

    if (!service) {
      service = await createService(data, (error) => {
        if (error.status === null || error.status >= 500) {
          setUncertainCreate(true);
        }
      });
      if (!service) return;
      setSavedService(service);
      setUncertainCreate(false);
    } else {
      // Si cambia algún dato tras un fallo de imágenes, actualizamos el mismo servicio.
      const hasServiceChanges =
        data.name !== service.name ||
        data.category !== String(service.category?._id ?? service.category ?? "") ||
        data.price !== service.price ||
        data.duration !== service.duration ||
        data.description !== (service.description ?? "") ||
        data.active !== service.active ||
        data.status !== service.status;

      if (hasServiceChanges) {
        const updated = await updateService(service._id, data);
        if (!updated) return;
        service = updated;
        setSavedService(updated);
      }
    }

    if (await imageManager.syncImages(String(service._id))) {
      navigate("/services");
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
        savedEntityId={savedService?._id}
        submissionBlocked={uncertainCreate}
        submitLabel={savedService ? "Reintentar guardado" : "Crear servicio"}
        submitting={submitting}
      />
      {uncertainCreate && (
        <div className="image-manager-error" role="alert">
          <span>
            No se pudo confirmar si el servicio se creó. Comprueba el listado
            antes de volver a intentarlo.
          </span>
          <Link className="button button-secondary" to="/services" target="_blank">
            Abrir listado
          </Link>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setUncertainCreate(false)}
          >
            Ya lo comprobé; permitir reintento
          </button>
        </div>
      )}
    </section>
  );
}
