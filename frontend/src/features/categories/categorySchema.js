import { z } from "zod";

// El backend calcula el slug; el formulario solo valida los campos editables.
export const categorySchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio."),
    description: z.string().trim().optional(),
    active: z.boolean(),
  })
  .strict();