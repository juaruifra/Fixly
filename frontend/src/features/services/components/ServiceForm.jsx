import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

import {
  SERVICE_STATUS_OPTIONS,
  serviceSchema,
} from "@/features/services/serviceSchema";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_VALUES = {
  name: "",
  category: "",
  price: "",
  duration: "",
  description: "",
  active: true,
  status: "published",
};

function getFormValues(values) {
  return {
    ...EMPTY_VALUES,
    name: values.name ?? EMPTY_VALUES.name,
    category: getCategoryId(values.category),
    price: values.price ?? EMPTY_VALUES.price,
    duration: values.duration ?? EMPTY_VALUES.duration,
    description: values.description ?? EMPTY_VALUES.description,
    active: values.active ?? EMPTY_VALUES.active,
    status: values.status ?? EMPTY_VALUES.status,
  };
}

function getCategoryId(category) {
  // El formulario trabaja con el ID, aunque el backend devuelva el objeto completo.
  return String(category?._id ?? category ?? "");
}

function getCategoryLabel(category) {
  if (!category) return "";

  const availability = category.deletedAt
    ? " (eliminada)"
    : !category.active
      ? " (inactiva)"
      : "";

  return `${category.name}${availability}`;
}

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <small id={id} className="field-error">
      {message}
    </small>
  );
}

export default function ServiceForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  submitLabel = "Guardar",
  submitting = false,
}) {
  const {
    availableCategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories();
  const currentCategory = initialValues.category;
  const currentCategoryId = getCategoryId(currentCategory);
  const categoryOptions = useMemo(() => {
    const options = [...availableCategories];
    const currentIsListed = options.some(
      (category) => category._id === currentCategoryId,
    );

    // En edición conservamos la categoría asignada aunque ya no esté disponible.
    if (currentCategoryId && !currentIsListed) {
      if (typeof currentCategory === "object" && currentCategory !== null) {
        options.push(currentCategory);
      } else {
        options.push({
          _id: currentCategoryId,
          name: "Categoría actual no disponible",
          active: false,
          deletedAt: null,
        });
      }
    }

    return options;
  }, [availableCategories, currentCategory, currentCategoryId]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: getFormValues(initialValues),
  });

  useEffect(() => {
    reset(getFormValues(initialValues));
  }, [initialValues, reset]);

  const description = watch("description") || "";

  async function submit(values) {
    await onSubmit({
      ...values,
      name: values.name.trim(),
      category: values.category.trim(),
      description: values.description.trim(),
    });
  }

  const isSubmitting = submitting || isFormSubmitting;

  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <div className="form-grid">
        <label htmlFor="service-name">
          <span>Nombre *</span>
          <input
            id="service-name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "service-name-error" : undefined}
            placeholder="Montaje de muebles"
            {...register("name")}
          />
          <FieldError id="service-name-error" message={errors.name?.message} />
        </label>

        <label htmlFor="service-category">
          <span>Categoría *</span>
          {categoriesLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  // El ID se guarda, pero el campo muestra el nombre elegido.
                  itemToStringLabel={(categoryId) =>
                    getCategoryLabel(
                      categoryOptions.find(
                        (category) => category._id === categoryId,
                      ),
                    )
                  }
                  disabled={field.disabled || categoryOptions.length === 0}
                >
                  <SelectTrigger
                    id="service-category"
                    ref={field.ref}
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={
                      errors.category ? "service-category-error" : undefined
                    }
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {getCategoryLabel(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          <FieldError
            id="service-category-error"
            message={errors.category?.message}
          />
          {!categoriesLoading && !categoriesError && categoryOptions.length === 0 && (
            <small className="field-error" role="status">
              No hay categorías disponibles. <Link to="/categories">Administrar categorías</Link>
            </small>
          )}
          {categoriesError && (
            <small className="field-error" role="alert">
              {categoriesError}
            </small>
          )}
        </label>

        <label htmlFor="service-price">
          <span>Precio (€) *</span>
          <input
            id="service-price"
            type="number"
            min="0"
            step="0.01"
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "service-price-error" : undefined}
            {...register("price", { valueAsNumber: true })}
          />
          <FieldError id="service-price-error" message={errors.price?.message} />
        </label>

        <label htmlFor="service-duration">
          <span>Duración (minutos) *</span>
          <input
            id="service-duration"
            type="number"
            min="15"
            step="15"
            aria-invalid={Boolean(errors.duration)}
            aria-describedby={
              errors.duration ? "service-duration-error" : undefined
            }
            {...register("duration", { valueAsNumber: true })}
          />
          <FieldError
            id="service-duration-error"
            message={errors.duration?.message}
          />
        </label>

        <label htmlFor="service-status">
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
                  id="service-status"
                  ref={field.ref}
                  aria-invalid={Boolean(errors.status)}
                  aria-describedby={
                    errors.status ? "service-status-error" : undefined
                  }
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_STATUS_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError
            id="service-status-error"
            message={errors.status?.message}
          />
        </label>

        <label className="full-width" htmlFor="service-description">
          <span>Descripción</span>
          <textarea
            id="service-description"
            maxLength="500"
            rows="6"
            placeholder="Describe qué incluye el servicio..."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "service-description-error" : undefined
            }
            {...register("description")}
          />
          <small className="counter">{description.length}/500</small>
          <FieldError
            id="service-description-error"
            message={errors.description?.message}
          />
        </label>

        <label className="checkbox-row full-width" htmlFor="service-active">
          <input id="service-active" type="checkbox" {...register("active")} />
          <span>Servicio activo</span>
        </label>
      </div>

      <div className="form-actions">
        <button
          className="button"
          type="submit"
          disabled={isSubmitting || categoriesLoading || categoryOptions.length === 0}
        >
          {isSubmitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}