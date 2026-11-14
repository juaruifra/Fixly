import { z } from "zod";

// La API limita la contraseña a 72 bytes UTF-8 y exige al menos 8 caracteres.
const passwordField = z.string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, {
    message: "La contraseña no puede superar 72 bytes en UTF-8.",
  });

export const accountPasswordSchema = z.object({
  currentPassword: passwordField,
  newPassword: passwordField,
  confirmPassword: z.string().min(1, "Confirma la nueva contraseña."),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden.",
});