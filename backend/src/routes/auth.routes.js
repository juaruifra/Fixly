import { Router } from "express";
import { body } from "express-validator";

import { authController } from "../controllers/auth.controller.js";
import { authenticateRequired } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
const credentialsValidation = [
  body("email")
    .exists({ values: "falsy" })
    .withMessage("email is required")
    .bail()
    .isEmail()
    .withMessage("email must be valid"),
  body("password")
    .exists({ values: "null" })
    .withMessage("password is required")
    .bail()
    .isString()
    .withMessage("password must be a string")
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage("password must contain between 8 and 72 characters"),
  validateRequest,
];

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registrar una cuenta de cliente
 *     description: El servidor asigna el rol CLIENT; cualquier rol enviado se ignora.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Ana García" }
 *               email: { type: string, format: email, example: "ana@example.com" }
 *               password: { type: string, minLength: 8, maxLength: 128 }
 *     responses:
 *       201:
 *         description: Cuenta y token creados
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       409: { description: El correo ya está registrado }
 */
router.post(
  "/register",
  [
    body("name")
      .exists({ values: "falsy" })
      .withMessage("name is required")
      .bail()
      .isString()
      .withMessage("name must be a string")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("name cannot be empty"),
    ...credentialsValidation,
  ],
  authController.register,
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Token emitido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Credenciales no válidas }
 */
router.post("/login", credentialsValidation, authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Obtener el usuario autenticado
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario actual
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { description: Token ausente o no válido }
 */
router.get("/me", authenticateRequired, authController.me);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Revocar la sesión actual
 *     description: Revoca únicamente el JWT usado en esta petición. Las peticiones que ya superaron la autenticación pueden terminar.
 *     tags: [Authentication]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       204: { description: Token revocado }
 *       401: { description: Token ausente, inválido, caducado o ya revocado }
 *       500: { description: No se pudo confirmar la revocación }
 */
router.post("/logout", authenticateRequired, authController.logout);

/**
 * @openapi
 * /api/auth/password:
 *   patch:
 *     summary: Cambiar la contraseña de la cuenta autenticada
 *     description: Requiere la contraseña actual e invalida todas las sesiones anteriores del usuario.
 *     tags: [Authentication]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password, writeOnly: true }
 *               newPassword: { type: string, format: password, writeOnly: true, minLength: 8, maxLength: 72 }
 *     responses:
 *       204: { description: Contraseña actualizada }
 *       400: { description: Datos inválidos o contraseña actual incorrecta }
 *       401: { description: Token ausente o inválido }
 *       409: { description: La cuenta cambió durante la operación }
 */
router.patch(
  "/password",
  authenticateRequired,
  [
    body("currentPassword").exists().isString().withMessage("currentPassword is required"),
    body("newPassword").exists().isString().withMessage("newPassword is required"),
    validateRequest,
  ],
  authController.changePassword,
);

export default router;
