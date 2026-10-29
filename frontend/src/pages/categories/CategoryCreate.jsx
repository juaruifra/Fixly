import { Link, useNavigate } from "react-router-dom";

import CategoryForm from "@/features/categories/components/CategoryForm";
import { useCategories } from "@/hooks/useCategories";

export default function CategoryCreate() {
  const navigate = useNavigate();
  const { createCategory, submitting } = useCategories();

  // Tras crearla, abrimos la ficha para que el resultado quede visible.
  async function create(data) {
    const category = await createCategory(data);
    if (category) navigate(`/categories/${category._id}`);
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
        submitLabel="Crear categoría"
        submitting={submitting}
      />
    </section>
  );
}