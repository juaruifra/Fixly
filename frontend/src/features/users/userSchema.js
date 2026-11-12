import { z } from "zod";

const userFields = {
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
  role: z.string().regex(/^[a-f\d]{24}$/i, "Selecciona un rol disponible."),
  password: z.string(),
  confirmPassword: z.string(),
};

function addPasswordValidation(user, context, { required }) {
  if (!user.password && !user.confirmPassword && !required) return;

  if (!user.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "La contraseña es obligatoria.",
    });
  }
  if (!user.confirmPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Confirma la contraseña.",
    });
  }

  if (user.password.length < 8 || user.password.length > 128) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "La contraseña debe tener entre 8 y 128 caracteres.",
    });
  }

  // El backend aplica bcrypt y rechaza contraseñas de más de 72 bytes UTF-8.
  if (new TextEncoder().encode(user.password).length > 72) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "La contraseña no puede superar 72 bytes en UTF-8.",
    });
  }

  if (user.password !== user.confirmPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Las contraseñas no coinciden.",
    });
  }
}

export const createUserSchema = z
  .object(userFields)
  .strict()
  .superRefine((user, context) =>
    addPasswordValidation(user, context, { required: true }),
  );

export const updateUserSchema = z
  .object(userFields)
  .strict()
  .superRefine((user, context) =>
    addPasswordValidation(user, context, { required: false }),
  );