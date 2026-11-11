import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import CategoryForm from "@/features/categories/components/CategoryForm";
import { useCategories } from "@/hooks/useCategories";

export default function CategoryCreate() {
  const navigate = useNavigate();
  // Solo se asigna tras recibir la respuesta confirmada del servidor.
  const [savedCategory, setSavedCategory] = useState(null);
  // Bloquea el POST automático si no sabemos si la primera petición terminó.
  const [uncertainCreate, setUncertainCreate] = useState(false);
  const { createCategory, updateCategory, submitting } = useCategories();

  // Conservamos el ID confirmado para reintentar imágenes sin duplicar la categoría.
  async function create(data, imageManager) {
    let category = savedCategory;

    if (!category) {
      // Si la respuesta de creación es incierta, bloqueamos el reintento automático.
      category = await createCategory(data, (error) => {
        if (error.status === null || error.status >= 500) {
          setUncertainCreate(true);
        }
      });
      if (!category) return;
      setSavedCategory(category);
      setUncertainCreate(false);
    } else {
      // Tras una creación confirmada, un reintento solo actualiza cambios posteriores.
      const hasCategoryChanges =
        data.name !== category.name ||
        (data.description ?? "") !== (category.description ?? "") ||
        data.active !== category.active;

      if (hasCategoryChanges) {
        const updated = await updateCategory(category._id, data);
        if (!updated) return;
        category = updated;
        setSavedCategory(updated);
      }
    }

    // Las imágenes usan el ID confirmado y se sincronizan después de la categoría.
    if (await imageManager.syncImages(String(category._id))) {
      navigate("/categories");
    }
  }

  return (
    <section>
      <Link className="back-link" to="/categories">
        ← Volver a categorías
      </Link>
      <div className="page-header compact">
        <div>
          <p className="eyebrow">NUEVA</p>
          <h1>Crear categoría</h1>
          <p className="muted">Añade una categoría al catálogo de Fixly.</p>
        </div>
      </div>
      <CategoryForm
        onSubmit={create}
        savedEntityId={savedCategory?._id}
        submissionBlocked={uncertainCreate}
        submitLabel={savedCategory ? "Reintentar guardado" : "Crear categoría"}
        submitting={submitting}
      />
      {uncertainCreate && (
        // El usuario comprueba el listado antes de autorizar otro POST de categoría.
        <div className="image-manager-error" role="alert">
          <span>
            No se pudo confirmar si la categoría se creó. Comprueba el listado
            antes de volver a intentarlo.
          </span>
          <Link className="button button-secondary" to="/categories" target="_blank">
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