import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { categorySchema } from "@/features/categories/categorySchema";

const EMPTY_VALUES = {
  name: "",
  description: "",
  active: true,
};

function getFormValues(values = {}) {
  // Completa los campos para que crear y editar usen el mismo formulario.
  return {
    name: values.name ?? EMPTY_VALUES.name,
    description: values.description ?? EMPTY_VALUES.description,
    active: values.active ?? EMPTY_VALUES.active,
  };
}

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <small id={id} className="field-error">
      {message}
    </small>
  );
}

export default function CategoryForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = "Guardar",
  submitting = false,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: getFormValues(initialValues),
  });

  useEffect(() => {
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  const isSaving = submitting || isSubmitting;

  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="form-grid">
        <label htmlFor="category-name">
          <span>Nombre *</span>
          <input
            id="category-name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "category-name-error" : undefined}
            placeholder="Fontanería"
            {...register("name")}
          />
          <FieldError
            id="category-name-error"
            message={errors.name?.message}
          />
        </label>

        <label className="full-width" htmlFor="category-description">
          <span>Descripción</span>
          <textarea
            id="category-description"
            rows="5"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "category-description-error" : undefined
            }
            placeholder="Describe esta categoría..."
            {...register("description")}
          />
          <FieldError
            id="category-description-error"
            message={errors.description?.message}
          />
        </label>

        <label className="checkbox-row full-width" htmlFor="category-active">
          <input
            id="category-active"
            type="checkbox"
            {...register("active")}
          />
          <span>Categoría activa</span>
        </label>
      </div>

      <div className="form-actions">
        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}