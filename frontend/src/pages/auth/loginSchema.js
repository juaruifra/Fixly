import { z } from "zod";

// La API exige un correo válido y una contraseña de entre 8 caracteres y 72 bytes.
export const loginSchema = z.object({
  email: z.string().trim().email("Introduce un correo electrónico válido.").max(254),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .refine((value) => new TextEncoder().encode(value).length <= 72, {
      message: "La contraseña no puede superar 72 bytes en UTF-8.",
    }),
});