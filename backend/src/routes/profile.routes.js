import { Router } from "express";
import { body, param } from "express-validator";

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
router.post("/", nameValidation, validateRequest, profileController.create);

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