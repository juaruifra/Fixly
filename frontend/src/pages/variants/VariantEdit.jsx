import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function VariantEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [variant, setVariant] = useState(null);
  const { getVariantById, updateVariant, loading, submitting } = useVariants();

  useEffect(() => {
    // La respuesta incluye el servicio relacionado para rellenar el selector.
    getVariantById(id).then(setVariant);
  }, [getVariantById, id]);

  // Solo enviamos PATCH cuando cambió algún campo de la variante.
  async function update(data, imageManager) {
    if (hasVariantChanges(data, variant)) {
      const updated = await updateVariant(id, data);
      if (!updated) return;
      setVariant(updated);
    }

    // Las imágenes se sincronizan después de guardar la variante.
    if (await imageManager.syncImages(id)) navigate("/variants");
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando formulario de variante">
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

  if (!variant) {
    return (
      <section>
        <ErrorState
          title="Variante no disponible"
          message="No se encontró la variante solicitada."
        />
        <Link className="back-link" to="/variants">
          Volver a variantes
        </Link>
      </section>
    );
  }

  if (variant.deletedAt) {
    return (
      <section>
        <ErrorState
          title="Variante eliminada"
          message="Restaura la variante antes de editarla."
        />
        <Link className="back-link" to="/variants">
          Volver al listado para restaurar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link className="back-link" to="/variants">
        ← Volver a variantes
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">EDITAR</p>
          <h1>Editar variante</h1>
          <p className="muted">Actualiza los datos y guarda los cambios.</p>
        </div>
      </div>
      <VariantForm
        initialValues={variant}
        entityId={id}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}