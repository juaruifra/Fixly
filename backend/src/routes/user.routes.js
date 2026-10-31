import { Router } from "express";
import { body, param, query } from "express-validator";

import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));

const idValidation = [
  param("id").isMongoId().withMessage("Invalid user id"),
  validateRequest,
];
const userFieldsValidation = [
  body("name").optional().isString().withMessage("name must be a string").bail().trim().notEmpty(),
  body("email").optional().isEmail().withMessage("email must be valid"),
  body("password")
    .optional()
    .isString()
    .withMessage("password must be a string")
    .isLength({ min: 8, max: 128 })
    .withMessage("password must contain between 8 and 128 characters"),
  body("role").optional().isMongoId().withMessage("role must be a valid role id"),
  validateRequest,
];

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Listar usuarios
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios sin hashes
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/User' } }
 *       403: { description: Se requiere rol ADMIN }
 */
router.get(
  "/",
  [
    query("active").optional().isIn(["true", "false"]),
    query("deleted").optional().isIn(["true", "false"]),
    validateRequest,
  ],
  userController.list,
);

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Crear un usuario desde administración
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserAdminInput' }
 *     responses:
 *       201:
 *         description: Usuario creado sin exponer su hash
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       409: { description: Email duplicado }
 */
router.post(
  "/",
  [
    body("name").exists({ values: "falsy" }).isString().withMessage("name is required").bail().trim().notEmpty(),
    body("email").exists({ values: "falsy" }).isEmail().withMessage("email must be valid"),
    body("password").exists({ values: "null" }).isString().isLength({ min: 8, max: 128 }).withMessage("password must contain between 8 and 128 characters"),
    body("role").exists({ values: "falsy" }).isMongoId().withMessage("role must be a valid role id"),
    ...userFieldsValidation,
  ],
  userController.create,
);

/**
 * @openapi
 * /api/users/{id}/restore:
 *   patch:
 *     summary: Restaurar un usuario
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario restaurado sin exponer su hash
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       409: { description: El usuario no estaba eliminado }
 */
router.patch("/:id/restore", idValidation, userController.restore);
/**
 * @openapi
 * /api/users/{id}/active:
 *   patch:
 *     summary: Activar o desactivar un usuario
 *     tags: [Users]
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
 *             schema: { $ref: '#/components/schemas/User' }
 */
router.patch(
  "/:id/active",
  [
    ...idValidation.slice(0, 1),
    body("active").exists().isBoolean().withMessage("active must be a boolean").toBoolean(),
    validateRequest,
  ],
  userController.setActive,
);
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario sin su hash
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404: { description: Usuario no encontrado }
 */
router.get("/:id", idValidation, userController.getById);
/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     summary: Actualizar datos, contraseña o rol de un usuario
 *     tags: [Users]
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
 *           schema: { $ref: '#/components/schemas/UserAdminInput' }
 *     responses:
 *       200:
 *         description: Usuario actualizado sin exponer el hash
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       409: { description: Email duplicado, rol no disponible o usuario eliminado }
 */
router.patch("/:id", [...idValidation.slice(0, 1), ...userFieldsValidation], userController.update);
/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar lógicamente un usuario
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Usuario eliminado }
 *       409: { description: El usuario ya estaba eliminado }
 */
router.delete("/:id", idValidation, userController.remove);

export default router;
