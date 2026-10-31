import { Router } from "express";
import { body, param, query } from "express-validator";

import { roleController } from "../controllers/role.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));

const idValidation = [
  param("id").isMongoId().withMessage("Invalid role id"),
  validateRequest,
];
const roleFieldsValidation = [
  body("name")
    .optional()
    .isString()
    .withMessage("name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("name cannot be empty"),
  body("description")
    .optional()
    .isString()
    .withMessage("description must be a string")
    .bail()
    .trim(),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("active must be a boolean")
    .toBoolean(),
  validateRequest,
];

/**
 * @openapi
 * /api/roles:
 *   get:
 *     summary: Listar roles
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Role' } }
 *       403: { description: Se requiere rol ADMIN }
 */
router.get(
  "/",
  [
    query("active").optional().isIn(["true", "false"]),
    query("deleted").optional().isIn(["true", "false"]),
    validateRequest,
  ],
  roleController.list,
);

/**
 * @openapi
 * /api/roles:
 *   post:
 *     summary: Crear un rol
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RoleInput' }
 *     responses:
 *       201:
 *         description: Rol creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 *       409: { description: El nombre ya existe }
 */
router.post(
  "/",
  [
    body("name")
      .exists({ values: "falsy" })
      .withMessage("name is required")
      .bail()
      .isString()
      .withMessage("name must be a string")
      .bail()
      .trim()
      .notEmpty(),
    ...roleFieldsValidation,
  ],
  roleController.create,
);

/**
 * @openapi
 * /api/roles/{id}/restore:
 *   patch:
 *     summary: Restaurar un rol
 *     tags: [Roles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rol restaurado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 *       409: { description: El rol no estaba eliminado }
 */
router.patch("/:id/restore", idValidation, roleController.restore);
/**
 * @openapi
 * /api/roles/{id}/active:
 *   patch:
 *     summary: Activar o desactivar un rol
 *     tags: [Roles]
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
 *           schema: { type: object, required: [active], properties: { active: { type: boolean } } }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 *       403: { description: Se requiere rol ADMIN }
 */
router.patch(
  "/:id/active",
  [
    ...idValidation.slice(0, 1),
    body("active").exists().isBoolean().withMessage("active must be a boolean").toBoolean(),
    validateRequest,
  ],
  roleController.setActive,
);
/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     summary: Obtener un rol
 *     tags: [Roles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rol encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 *       404: { description: Rol no encontrado }
 */
router.get("/:id", idValidation, roleController.getById);
/**
 * @openapi
 * /api/roles/{id}:
 *   patch:
 *     summary: Editar un rol
 *     tags: [Roles]
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
 *           schema: { $ref: '#/components/schemas/RoleInput' }
 *     responses:
 *       200:
 *         description: Rol actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Role' }
 *       409: { description: Nombre duplicado o rol eliminado }
 */
router.patch("/:id", [...idValidation.slice(0, 1), ...roleFieldsValidation], roleController.update);
/**
 * @openapi
 * /api/roles/{id}:
 *   delete:
 *     summary: Eliminar lógicamente un rol
 *     tags: [Roles]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Rol eliminado }
 *       409: { description: El rol está asignado a usuarios }
 */
router.delete("/:id", idValidation, roleController.remove);

export default router;
