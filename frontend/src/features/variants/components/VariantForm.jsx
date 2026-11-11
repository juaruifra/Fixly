import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageManager from "@/features/images/components/ImageManager";
import { useEntityImages } from "@/features/images/useEntityImages";
import {
  VARIANT_STATUS_OPTIONS,
  variantSchema,
} from "@/features/variants/variantSchema";
import { useServices } from "@/hooks/useServices";

const EMPTY_VALUES = {
  service: "",
  name: "",
  sku: "",
  auto: true,
  price: "",
  duration: "",
  active: true,
  status: "published",
  requiresBooking: false,
};

// El backend devuelve el servicio poblado; el formulario envía solo su ID.
function getServiceId(service) {
  return String(service?._id ?? service ?? "");
}

function getFormValues(values = {}) {
  return {
    ...EMPTY_VALUES,
    service: getServiceId(values.service),
    name: values.name ?? EMPTY_VALUES.name,
    sku: values.sku ?? EMPTY_VALUES.sku,
    auto: values.auto ?? EMPTY_VALUES.auto,
    price: values.price ?? EMPTY_VALUES.price,
    duration: values.duration ?? EMPTY_VALUES.duration,
    active: values.active ?? EMPTY_VALUES.active,
    status: values.status ?? EMPTY_VALUES.status,
    requiresBooking: values.requiresBooking ?? EMPTY_VALUES.requiresBooking,
  };
}

function getServiceLabel(service) {
  const availability = service.deletedAt
    ? " (eliminado)"
    : !service.active
      ? " (inactivo)"
      : "";
  return `${service.name}${availability}`;
}

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <small id={id} className="field-error">
      {message}
    </small>
  );
}

export default function VariantForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = "Guardar",
  submitting = false,
  entityId,
  savedEntityId,
  submissionBlocked = false,
}) {
  // El gestor carga las imágenes al editar y empieza vacío al crear.
  const imageManager = useEntityImages("variant", Boolean(entityId));
  const {
    services,
    loading: servicesLoading,
    error: servicesError,
  } = useServices();
  const currentService = initialValues.service;
  const currentServiceId = getServiceId(currentService);
  const serviceOptions = useMemo(() => {
    const options = services.filter((service) => !service.deletedAt);
    const currentIsListed = options.some(
      (service) => service._id === currentServiceId,
    );

    // En edición se conserva la relación actual aunque el servicio esté borrado.
    if (currentServiceId && !currentIsListed) {
      if (typeof currentService === "object" && currentService !== null) {
        options.push(currentService);
      } else {
        options.push({
          _id: currentServiceId,
          name: "Servicio actual no disponible",
          active: false,
          deletedAt: null,
        });
      }
    }

    return options;
  }, [currentService, currentServiceId, services]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm({
    resolver: zodResolver(variantSchema),
    defaultValues: getFormValues(initialValues),
  });

  useEffect(() => {
    // La variante puede llegar después de que se monte la página de edición.
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  useEffect(() => {
    // No guardamos una edición hasta cargar su galería completa.
    if (entityId) void imageManager.loadImages(entityId);
  }, [entityId, imageManager.loadImages]);

  const autoSku = watch("auto");

  async function submit(values) {
    // Elimina el SKU del payload automático; el backend lo calcula y lo devuelve.
    const data = {
      ...values,
      name: values.name.trim(),
      service: values.service.trim(),
    };
    if (data.auto) {
      delete data.sku;
    } else {
      data.sku = data.sku.trim();
    }

    await onSubmit(data, imageManager);
  }

  const isSaving = submitting || isFormSubmitting || imageManager.saving;
  const canSubmit =
    imageManager.ready &&
    !submissionBlocked &&
    serviceOptions.length > 0 &&
    !servicesLoading;

  return (
    <form className="card form-card" onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-grid">
        <label htmlFor="variant-name">
          <span>Nombre *</span>
          <input
            id="variant-name"
            maxLength={120}
            placeholder="Limpieza de 2 horas"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "variant-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="variant-name-error" message={errors.name?.message} />
        </label>

        <label htmlFor="variant-service">
          <span>Servicio *</span>
          {servicesLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Controller
              name="service"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  itemToStringLabel={(serviceId) =>
                    getServiceLabel(
                      serviceOptions.find((service) => service._id === serviceId) ?? {
                        name: "Servicio no disponible",
                      },
                    )
                  }
                  disabled={field.disabled || serviceOptions.length === 0}
                >
                  <SelectTrigger
                    id="variant-service"
                    ref={field.ref}
                    aria-invalid={Boolean(errors.service)}
                    aria-describedby={
                      errors.service ? "variant-service-error" : undefined
                    }
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {getServiceLabel(service)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          <FieldError
            id="variant-service-error"
            message={errors.service?.message}
          />
          {!servicesLoading && !servicesError && serviceOptions.length === 0 && (
            <small className="field-error" role="status">
              No hay servicios disponibles para asignar.
            </small>
          )}
          {servicesError && (
            <small className="field-error" role="alert">
              {servicesError}
            </small>
          )}
        </label>

        <label htmlFor="variant-price">
          <span>Precio (€) *</span>
          <input
            id="variant-price"
            type="number"
            min="0"
            step="0.01"
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "variant-price-error" : undefined}
            {...register("price", { valueAsNumber: true })}
          />
          <FieldError id="variant-price-error" message={errors.price?.message} />
        </label>

        <label htmlFor="variant-duration">
          <span>Duración (minutos) *</span>
          <input
            id="variant-duration"
            type="number"
            min="1"
            step="1"
            aria-invalid={Boolean(errors.duration)}
            aria-describedby={
              errors.duration ? "variant-duration-error" : undefined
            }
            {...register("duration", { valueAsNumber: true })}
          />
          <FieldError
            id="variant-duration-error"
            message={errors.duration?.message}
          />
        </label>

        <label className="checkbox-row full-width" htmlFor="variant-auto-sku">
          <input id="variant-auto-sku" type="checkbox" {...register("auto")} />
          <span>Generar SKU automáticamente</span>
        </label>

        {autoSku ? (
          <label className="full-width" htmlFor="variant-sku-generated">
            <span>SKU</span>
            <input
              id="variant-sku-generated"
                value={
                  initialValues.auto && initialValues.sku
                    ? initialValues.sku
                    : "Se generará al guardar"
                }
              readOnly
              aria-describedby="variant-sku-help"
            />
            <small id="variant-sku-help" className="muted">
              El backend genera un SKU único al guardar la variante.
            </small>
          </label>
        ) : (
          <label className="full-width" htmlFor="variant-sku">
            <span>SKU *</span>
            <input
              id="variant-sku"
              aria-invalid={Boolean(errors.sku)}
              aria-describedby={errors.sku ? "variant-sku-error" : undefined}
              {...register("sku")}
            />
            <FieldError id="variant-sku-error" message={errors.sku?.message} />
          </label>
        )}

        <label htmlFor="variant-status">
          <span>Estado</span>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={field.disabled}
              >
                <SelectTrigger
                  id="variant-status"
                  ref={field.ref}
                  aria-invalid={Boolean(errors.status)}
                  aria-describedby={
                    errors.status ? "variant-status-error" : undefined
                  }
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_STATUS_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError
            id="variant-status-error"
            message={errors.status?.message}
          />
        </label>

        <label className="checkbox-row" htmlFor="variant-active">
          <input id="variant-active" type="checkbox" {...register("active")} />
          <span>Variante activa</span>
        </label>

        <label className="checkbox-row full-width" htmlFor="variant-booking">
          <input
            id="variant-booking"
            type="checkbox"
            {...register("requiresBooking")}
          />
          <span>Requiere reserva</span>
        </label>

        <ImageManager
          manager={imageManager}
          entityId={entityId ?? savedEntityId}
          entityType="variant"
        />
      </div>

      <div className="form-actions">
        <button className="button" type="submit" disabled={!canSubmit || isSaving}>
          {isSaving ? "Guardando…" : submitLabel}
        </button>
      </div>
      {(entityId || savedEntityId) && imageManager.saveError && (
        <p className="full-width muted" role="status">
          La variante ya está guardada. Solo quedan pendientes las imágenes;
          volver a guardar no creará otra variante.
        </p>
      )}
    </form>
  );
}
