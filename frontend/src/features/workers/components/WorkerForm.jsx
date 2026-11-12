import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { workerSchema } from "@/features/workers/workerSchema";

const EMPTY_VALUES = {
  name: "",
  email: "",
  phone: "",
};

// El formulario representa únicamente campos editables aceptados por Worker.
function getFormValues(values = {}) {
  return {
    name: values.name ?? EMPTY_VALUES.name,
    email: values.email ?? EMPTY_VALUES.email,
    phone: values.phone ?? EMPTY_VALUES.phone,
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

export default function WorkerForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = "Guardar",
  submitting = false,
  creating = false,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(workerSchema),
    defaultValues: getFormValues(initialValues),
  });

  useEffect(() => {
    // Los datos de edición pueden llegar después de que se monte la página.
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  async function submit(values) {
    // El backend normaliza el correo y usa el teléfono vacío como campo omitido.
    const workerData = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
    };
    if (values.phone.trim()) workerData.phone = values.phone.trim();
    await onSubmit(workerData);
  }

  const isSaving = submitting || isSubmitting;

  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <div className="form-grid">
        <label htmlFor="worker-name">
          <span>Nombre *</span>
          <input
            id="worker-name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "worker-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="worker-name-error" message={errors.name?.message} />
        </label>

        <label htmlFor="worker-email">
          <span>Correo electrónico *</span>
          <input
            id="worker-email"
            type="email"
            maxLength={254}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "worker-email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="worker-email-error" message={errors.email?.message} />
        </label>

        <label className="full-width" htmlFor="worker-phone">
          <span>Teléfono</span>
          <input
            id="worker-phone"
            type="tel"
            maxLength={30}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={
              errors.phone ? "worker-phone-error" : "worker-phone-help"
            }
            {...register("phone")}
          />
          {!errors.phone && (
            <small id="worker-phone-help" className="muted">
              Opcional. Usa entre 7 y 15 dígitos; admite espacios, paréntesis,
              guiones y un + inicial.
              {!creating && " Déjalo vacío para conservar el teléfono actual."}
            </small>
          )}
          <FieldError id="worker-phone-error" message={errors.phone?.message} />
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