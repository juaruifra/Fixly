import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ErrorState from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryForm from "@/features/categories/components/CategoryForm";
import { useCategories } from "@/hooks/useCategories";

export default function CategoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const { getCategoryById, updateCategory, loading, submitting } =
    useCategories();

  useEffect(() => {
    // La ficha se carga por ID aunque no esté en el listado compartido.
    getCategoryById(id).then(setCategory);
  }, [getCategoryById, id]);

  async function update(data) {
    const updated = await updateCategory(id, data);
    if (updated) navigate(`/categories/${id}`);
  }

  if (loading) {
    return (
      <section role="status" aria-label="Cargando formulario de categoría">
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
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-5 w-36" />
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

  if (category.deletedAt) {
    // Primero hay que restaurar una categoría para poder editarla.
    return (
      <section>
        <ErrorState
          title="Categoría eliminada"
          message="Restaura la categoría antes de editarla."
        />
        <Link className="back-link" to={`/categories/${id}`}>
          Ver detalle y restaurar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link className="back-link" to={`/categories/${id}`}>
        ← Volver al detalle
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">EDITAR</p>
          <h1>Editar categoría</h1>
          <p className="muted">Actualiza los datos de la categoría.</p>
        </div>
      </div>
      <CategoryForm
        initialValues={category}
        onSubmit={update}
        submitLabel="Guardar cambios"
        submitting={submitting}
      />
    </section>
  );
}