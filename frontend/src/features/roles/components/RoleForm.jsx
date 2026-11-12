import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { roleSchema } from "@/features/roles/roleSchema";

const EMPTY_VALUES = {
  name: "",
  description: "",
  active: true,
};

// Solo se muestran campos editables que acepta el contrato de Role.
function getFormValues(values = {}) {
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

export default function RoleForm({
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
    resolver: zodResolver(roleSchema),
    defaultValues: getFormValues(initialValues),
  });

  useEffect(() => {
    // Los datos de edición pueden llegar después de montar el formulario.
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  const isSaving = submitting || isSubmitting;

  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit((data) =>
        onSubmit({
          ...data,
          name: data.name.trim().toUpperCase(),
          description: data.description.trim(),
        }),
      )}
      noValidate
    >
      <div className="form-grid">
        <label htmlFor="role-name">
          <span>Nombre *</span>
          <input
            id="role-name"
            maxLength={60}
            placeholder="EDITOR"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "role-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="role-name-error" message={errors.name?.message} />
        </label>

        <label className="full-width" htmlFor="role-description">
          <span>Descripción</span>
          <textarea
            id="role-description"
            maxLength={250}
            rows={4}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "role-description-error" : undefined
            }
            {...register("description")}
          />
          <FieldError
            id="role-description-error"
            message={errors.description?.message}
          />
        </label>

        <label className="checkbox-row full-width" htmlFor="role-active">
          <input id="role-active" type="checkbox" {...register("active")} />
          <span>Rol activo</span>
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