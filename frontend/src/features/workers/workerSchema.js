import { z } from "zod";

const phonePattern = /^\+?[0-9\s()-]+$/;

export const workerSchema = z
  .object({
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
    phone: z
      .string()
      .trim()
      .max(30, "El teléfono admite un máximo de 30 caracteres.")
      .superRefine((phone, context) => {
        if (!phone) return;
        if (!phonePattern.test(phone)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Usa solo dígitos, espacios, paréntesis, guiones y un + inicial.",
          });
          return;
        }

        const digitCount = phone.replace(/\D/g, "").length;
        if (digitCount < 7 || digitCount > 15) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El teléfono debe contener entre 7 y 15 dígitos.",
          });
        }
      }),
  })
  .strict();