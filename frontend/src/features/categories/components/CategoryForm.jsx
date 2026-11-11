import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { categorySchema } from "@/features/categories/categorySchema";
import ImageManager from "@/features/images/components/ImageManager";
import { useEntityImages } from "@/features/images/useEntityImages";

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
  entityId,
  savedEntityId,
  submissionBlocked = false,
}) {
  // El mismo gestor distingue creación local y edición según reciba un ID.
  const imageManager = useEntityImages("category", Boolean(entityId));
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
    // Los datos de la categoría pueden llegar después de montar el formulario.
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  useEffect(() => {
    // En edición esperamos la galería antes de permitir guardar.
    if (entityId) void imageManager.loadImages(entityId);
  }, [entityId, imageManager.loadImages]);

  // El botón espera tanto al guardado de categoría como al de imágenes.
  const isSaving = submitting || isSubmitting || imageManager.saving;
  // Evitamos enviar el formulario si falta la galería o la creación es incierta.
  const canSubmit = imageManager.ready && !submissionBlocked && !isSaving;

  return (
    <form
      className="card form-card"
      // React Hook Form valida los datos normales antes de llamar a la página.
      onSubmit={handleSubmit((data) => onSubmit(data, imageManager))}
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
        <ImageManager
          manager={imageManager}
          entityType="category"
          entityId={entityId ?? savedEntityId}
        />
      </div>

      <div className="form-actions">
        <button className="button" type="submit" disabled={!canSubmit}>
          {isSaving ? "Guardando…" : submitLabel}
        </button>
      </div>
      {(entityId || savedEntityId) && imageManager.saveError && (
        <p className="full-width muted" role="status">
          La categoría ya está guardada. Solo quedan pendientes las imágenes;
          volver a guardar no creará otra categoría.
        </p>
      )}
    </form>
  );
}