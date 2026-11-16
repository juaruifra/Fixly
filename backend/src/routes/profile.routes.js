import { Router } from "express";
import { body, header, param } from "express-validator";

import { profileController } from "../controllers/profile.controller.js";
import { authenticateRequired } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
router.use(authenticateRequired);

const idValidation = [
  param("id").isMongoId().withMessage("Invalid profile id"),
  validateRequest,
];
const nameValidation = body("name")
  .exists({ values: "falsy" })
  .withMessage("name is required")
  .bail()
  .isString()
  .withMessage("name must be a string")
  .bail()
  .trim()
  .notEmpty()
  .withMessage("name cannot be empty")
  .bail()
  .isLength({ max: 120 })
  .withMessage("name is too long");
const avatarCreateValidation = [
  ...idValidation.slice(0, 1),
  body("url")
    .exists({ values: "falsy" })
    .withMessage("url is required")
    .bail()
    .isString()
    .withMessage("url must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage("url must be between 1 and 2048 characters")
    .bail()
    .isURL({ protocols: ["http", "https"], require_protocol: true, require_tld: false })
    .withMessage("url must be an absolute HTTP or HTTPS URL"),
  body("alt")
    .exists({ values: "falsy" })
    .withMessage("alt is required")
    .bail()
    .isString()
    .withMessage("alt must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("alt cannot be empty")
    .bail()
    .isLength({ max: 250 })
    .withMessage("alt must be at most 250 characters"),
  validateRequest,
];
const avatarUpdateValidation = [
  ...idValidation.slice(0, 1),
  body("url")
    .optional()
    .isString()
    .withMessage("url must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage("url must be between 1 and 2048 characters")
    .bail()
    .isURL({ protocols: ["http", "https"], require_protocol: true, require_tld: false })
    .withMessage("url must be an absolute HTTP or HTTPS URL"),
  body("alt")
    .optional()
    .isString()
    .withMessage("alt must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("alt cannot be empty")
    .bail()
    .isLength({ max: 250 })
    .withMessage("alt must be at most 250 characters"),
  validateRequest,
];

/**
 * @openapi
 * /api/profiles/{id}/avatar:
 *   get:
 *     summary: Consultar el avatar propio de un perfil
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectid }
 *     responses:
 *       200:
 *         description: Lista vacía o con el único avatar del perfil
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Image' }, maxItems: 1 }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil no encontrado }
 */
router.get("/:id/avatar", idValidation, profileController.getAvatar);

/**
 * @openapi
 * /api/profiles/{id}/avatar:
 *   post:
 *     summary: Añadir el avatar único a un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProfileAvatarInput' }
 *     responses:
 *       201: { description: Avatar creado }
 *       400: { description: Datos no válidos }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil no encontrado }
 *       409: { description: El perfil ya tiene un avatar }
 */
router.post("/:id/avatar", avatarCreateValidation, profileController.createAvatar);

/**
 * @openapi
 * /api/profiles/{id}/avatar:
 *   patch:
 *     summary: Editar el avatar de un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ImagePatchInput' }
 *     responses:
 *       200: { description: Avatar actualizado }
 *       400: { description: Datos no válidos }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil o avatar no encontrado }
 */
router.patch("/:id/avatar", avatarUpdateValidation, profileController.updateAvatar);

/**
 * @openapi
 * /api/profiles/{id}/avatar:
 *   delete:
 *     summary: Eliminar el avatar de un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectid }
 *     responses:
 *       204: { description: Avatar eliminado }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil no encontrado }
 */
router.delete("/:id/avatar", idValidation, profileController.removeAvatar);

/**
 * @openapi
 * /api/profiles:
 *   get:
 *     summary: Listar los perfiles propios
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Perfiles del usuario autenticado
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Profile' } }
 *       401: { description: Se requiere autenticación }
 */
router.get("/", profileController.list);

/**
 * @openapi
 * /api/profiles:
 *   post:
 *     summary: Crear un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         description: UUID v4 reutilizado al reintentar la misma creación.
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProfileInput' }
 *     responses:
 *       201:
 *         description: Perfil creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Profile' }
 *       400: { description: Datos no válidos o campos no permitidos }
 *       401: { description: Se requiere autenticación }
 */
router.post(
  "/",
  nameValidation,
  header("Idempotency-Key")
    .optional()
    .isUUID(4)
    .withMessage("Idempotency-Key must be a UUID v4"),
  validateRequest,
  profileController.create,
);

/**
 * @openapi
 * /api/profiles/{id}:
 *   get:
 *     summary: Obtener un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Perfil encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Profile' }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil no encontrado }
 */
router.get("/:id", idValidation, profileController.getById);

/**
 * @openapi
 * /api/profiles/{id}:
 *   patch:
 *     summary: Actualizar un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProfileInput' }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Profile' }
 *       400: { description: Datos no válidos o campos no permitidos }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil no encontrado }
 */
router.patch("/:id", idValidation[0], nameValidation, validateRequest, profileController.update);

/**
 * @openapi
 * /api/profiles/{id}:
 *   delete:
 *     summary: Eliminar un perfil propio
 *     tags: [Profiles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Perfil eliminado }
 *       401: { description: Se requiere autenticación }
 *       404: { description: Perfil no encontrado }
 */
router.delete("/:id", idValidation, profileController.remove);

export default router;