import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import VariantForm from "@/features/variants/components/VariantForm";
import { useVariants } from "@/hooks/useVariants";

function hasVariantChanges(data, variant) {
  const currentServiceId = String(variant.service?._id ?? variant.service ?? "");
  return (
    data.service !== currentServiceId ||
    data.name !== variant.name ||
    data.auto !== variant.auto ||
    (!data.auto && data.sku !== variant.sku) ||
    data.price !== variant.price ||
    data.duration !== variant.duration ||
    data.active !== variant.active ||
    data.status !== variant.status ||
    data.requiresBooking !== variant.requiresBooking
  );
}

export default function VariantCreate() {
  const navigate = useNavigate();
  const [savedVariant, setSavedVariant] = useState(null);
  const [uncertainCreate, setUncertainCreate] = useState(false);
  const { createVariant, updateVariant, submitting } = useVariants();

  // Conservamos el ID confirmado para reintentar imágenes sin duplicar la variante.
  async function create(data, imageManager) {
    let variant = savedVariant;

    if (!variant) {
      variant = await createVariant(data, (error) => {
        if (error.status === null || error.status >= 500) {
          setUncertainCreate(true);
        }
      });
      if (!variant) return;
      setSavedVariant(variant);
      setUncertainCreate(false);
    } else if (hasVariantChanges(data, variant)) {
      // Si cambian datos tras un fallo de imágenes, actualizamos esa misma variante.
      const updated = await updateVariant(variant._id, data);
      if (!updated) return;
      variant = updated;
      setSavedVariant(updated);
    }

    if (await imageManager.syncImages(String(variant._id))) {
      navigate("/variants");
    }
  }

  return (
    <section>
      <Link className="back-link" to="/variants">
        ← Volver a variantes
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">NUEVA</p>
          <h1>Crear variante</h1>
          <p className="muted">Añade una opción a un servicio existente.</p>
        </div>
      </div>
      <VariantForm
        onSubmit={create}
        savedEntityId={savedVariant?._id}
        submissionBlocked={uncertainCreate}
        submitLabel={savedVariant ? "Reintentar guardado" : "Crear variante"}
        submitting={submitting}
      />
      {uncertainCreate && (
        <div className="image-manager-error" role="alert">
          <span>
            No se pudo confirmar si la variante se creó. Comprueba el listado
            antes de volver a intentarlo.
          </span>
          <Link className="button button-secondary" to="/variants" target="_blank">
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