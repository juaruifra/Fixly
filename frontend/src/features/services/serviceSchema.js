import { z } from "zod";

export const SERVICE_STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "paused", label: "Pausado" },
  { value: "discontinued", label: "Retirado" },
];

export const serviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(120, "El nombre admite un máximo de 120 caracteres."),
    category: z
      .string()
      .trim()
      .min(1, "La categoría es obligatoria.")
      .max(80, "La categoría admite un máximo de 80 caracteres."),
    price: z
      .number({ invalid_type_error: "Indica un precio válido." })
      .finite("Indica un precio válido.")
      .min(0, "El precio debe ser mayor o igual que 0."),
    duration: z
      .number({ invalid_type_error: "Indica una duración válida." })
      .int("La duración debe ser un número entero.")
      .min(15, "La duración mínima es 15 minutos."),
    description: z
      .string()
      .max(500, "La descripción admite un máximo de 500 caracteres."),
    active: z.boolean(),
    status: z.enum(["draft", "published", "paused", "discontinued"]),
  })
  .strict();