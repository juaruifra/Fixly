import { z } from "zod";

// El backend normaliza el nombre a mayúsculas y acepta letras, números, _ y -.
export const roleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(60, "El nombre admite un máximo de 60 caracteres.")
      .regex(
        /^[A-Za-z][A-Za-z0-9_-]*$/,
        "Empieza por una letra y usa solo letras, números, guiones o guiones bajos.",
      ),
    description: z
      .string()
      .max(250, "La descripción admite un máximo de 250 caracteres."),
    active: z.boolean(),
  })
  .strict();