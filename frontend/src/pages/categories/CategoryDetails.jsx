import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RotateCcwIcon } from "lucide-react";

import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { confirmServiceAction } from "@/utils/confirmAction";

export default function CategoryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const { getCategoryById, deleteCategory, restoreCategory, loading, submitting } =
    useCategories();

  useEffect(() => {
    getCategoryById(id).then(setCategory);
  }, [getCategoryById, id]);

  async function remove() {
    // El backend impide eliminar la categoría si aún tiene servicios asociados.
    const confirmed = await confirmServiceAction({
      title: "Eliminar categoría",
      message: `¿Quieres eliminar “${category.name}”? Si tiene servicios, el backend rechazará la operación.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!confirmed) return;

    const deleted = await deleteCategory(id);
    if (deleted) navigate("/categories");
  }

  async function restore() {
    const confirmed = await confirmServiceAction({
      title: "Restaurar categoría",
      message: `¿Quieres restaurar “${category.name}”?`,
      confirmText: "Restaurar",
    });
    if (!confirmed) return;

    const restored = await restoreCategory(id);
    if (restored) setCategory(restored);
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando categoría">
        <Skeleton className="mb-5 h-4 w-36" />
        <div className="card detail-body space-y-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="metadata">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </section>
    );
  }

  if (!category) {
    return (
      <section>
        <ErrorState
          title="Categoría no disponible"
          message="No se encontró la categoría solicitada."
        />
        <Link className="back-link" to="/categories">
          Volver a categorías
        </Link>
      </section>
    );
  }

  return (
    <section className="detail-page">
      <Link className="back-link" to="/categories">
        ← Volver a categorías
      </Link>

      <div className="page-header compact">
        <div>
          <p className="eyebrow">CATEGORÍA</p>
          <h1>{category.name}</h1>
          <p className="muted">Slug: {category.slug}</p>
        </div>
      </div>

      {category.deletedAt && (
        <div className="service-deleted-notice" role="status">
          <p>
            Eliminada el {new Date(category.deletedAt).toLocaleString("es-ES")}.
          </p>
          <Button disabled={submitting} onClick={restore}>
            <RotateCcwIcon aria-hidden="true" />
            Restaurar categoría
          </Button>
        </div>
      )}

      <div className="card detail-body">
        <h2>Descripción</h2>
        <p>{category.description || "Sin descripción."}</p>

        <dl className="metadata">
          <div>
            <dt>Estado</dt>
            <dd>{category.active ? "Activa" : "Inactiva"}</dd>
          </div>
          <div>
            <dt>Servicios asociados</dt>
            <dd>{category.serviceCount ?? 0}</dd>
          </div>
          <div>
            <dt>Creada</dt>
            <dd>{new Date(category.createdAt).toLocaleString("es-ES")}</dd>
          </div>
        </dl>

        {!category.deletedAt && (
          <div className="form-actions">
            <Link className="button" to={`/categories/${id}/edit`}>
              Editar
            </Link>
            <Button variant="destructive" onClick={remove}>
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}