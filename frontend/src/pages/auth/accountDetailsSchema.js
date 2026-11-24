import { z } from "zod";

export const accountDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre admite un máximo de 120 caracteres."),
  email: z
    .string()
    .trim()
    .email("Introduce un correo electrónico válido.")
    .max(254, "El correo admite un máximo de 254 caracteres."),
}).strict();