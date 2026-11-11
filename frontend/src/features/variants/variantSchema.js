import { z } from "zod";

export const VARIANT_STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Retirado" },
];

// El SKU es obligatorio solo cuando el usuario desactiva su generación automática.
export const variantSchema = z
  .object({
    service: z.string().regex(/^[a-f\d]{24}$/i, "Selecciona un servicio válido."),
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(120, "El nombre admite un máximo de 120 caracteres."),
    sku: z.string().trim(),
    auto: z.boolean(),
    price: z
      .number({ invalid_type_error: "Indica un precio válido." })
      .finite("Indica un precio válido.")
      .min(0, "El precio debe ser mayor o igual que 0."),
    duration: z
      .number({ invalid_type_error: "Indica una duración válida." })
      .int("La duración debe ser un número entero.")
      .min(1, "La duración debe ser al menos 1 minuto."),
    active: z.boolean(),
    status: z.enum(["draft", "published", "paused", "discontinued"]),
    requiresBooking: z.boolean(),
  })
  .superRefine((variant, context) => {
    if (!variant.auto && !variant.sku) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sku"],
        message: "El SKU es obligatorio si desactivas la generación automática.",
      });
    }

    if (
      !variant.auto &&
      variant.sku &&
      !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(variant.sku)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sku"],
        message: "El SKU solo puede contener letras, números y guiones.",
      });
    }
  });