import { Router } from "express";
import { body, param, query } from "express-validator";

import { workerController } from "../controllers/worker.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
const phonePattern = /^\+?[0-9\s()-]+$/;

const idValidation = [
  param("id").isMongoId().withMessage("Invalid worker id"),
  validateRequest,
];
const workerFieldsValidation = [
  body("name").optional().isString().withMessage("name must be a string").bail().trim().notEmpty().isLength({ max: 120 }),
  body("email")
    .optional()
    .isString()
    .withMessage("email must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("email cannot be empty")
    .bail()
    .isEmail()
    .withMessage("email must be valid")
    .bail()
    .isLength({ max: 254 })
    .withMessage("email must be at most 254 characters"),
  body("phone")
    .optional()
    .isString()
    .withMessage("phone must be a string")
    .bail()
    .trim()
    .isLength({ max: 30 })
    .withMessage("phone must be at most 30 characters")
    .bail()
    .custom((phone) => {
      if (!phone) return true;
      if (!phonePattern.test(phone)) {
        throw new Error(
          "phone may contain only digits, spaces, parentheses, hyphens and a leading plus",
        );
      }

      const digitCount = phone.replace(/\D/g, "").length;
      if (digitCount < 7 || digitCount > 15) {
        throw new Error("phone must contain between 7 and 15 digits");
      }
      return true;
    }),
  validateRequest,
];

/**
 * @openapi
 * /api/workers:
 *   get:
 *     summary: Listar trabajadores
 *     tags: [Workers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de trabajadores
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Worker' } }
 */
router.get(
  "/",
  [
    query("active").optional().isIn(["true", "false"]),
    query("deleted").optional().isIn(["true", "false"]),
    validateRequest,
  ],
  workerController.list,
);

/**
 * @openapi
 * /api/workers/available:
 *   get:
 *     summary: Listar trabajadores activos disponibles para asignación
 *     tags: [Workers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de trabajadores activos y no eliminados
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Worker' } }
 */
router.get("/available", workerController.listAvailable);

/**
 * @openapi
 * /api/workers:
 *   post:
 *     summary: Crear un trabajador
 *     tags: [Workers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/WorkerInput' }
 *     responses:
 *       201:
 *         description: Trabajador creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Worker' }
 */
router.post(
  "/",
  [
    body("name").exists({ values: "falsy" }).isString().withMessage("name is required").bail().trim().notEmpty().isLength({ max: 120 }),
    body("email")
      .exists({ values: "falsy" })
      .withMessage("email is required")
      .bail()
      .isString()
      .withMessage("email must be a string")
      .bail()
      .trim()
      .notEmpty()
      .withMessage("email cannot be empty")
      .bail()
      .isEmail()
      .withMessage("email must be valid")
      .bail()
      .isLength({ max: 254 })
      .withMessage("email must be at most 254 characters"),
    ...workerFieldsValidation,
  ],
  workerController.create,
);

/**
 * @openapi
 * /api/workers/{id}/restore:
 *   patch:
 *     summary: Restaurar un trabajador
 *     tags: [Workers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trabajador restaurado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Worker' }
 *       409: { description: El trabajador no estaba eliminado }
 */
router.patch("/:id/restore", idValidation, workerController.restore);
/**
 * @openapi
 * /api/workers/{id}/active:
 *   patch:
 *     summary: Activar o desactivar un trabajador
 *     tags: [Workers]
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
 *             schema: { $ref: '#/components/schemas/Worker' }
 */
router.patch(
  "/:id/active",
  [
    ...idValidation.slice(0, 1),
    body("active").exists().isBoolean().withMessage("active must be a boolean").toBoolean(),
    validateRequest,
  ],
  workerController.setActive,
);
/**
 * @openapi
 * /api/workers/{id}:
 *   get:
 *     summary: Obtener un trabajador
 *     tags: [Workers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trabajador encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Worker' }
 *       404: { description: Trabajador no encontrado }
 */
router.get("/:id", idValidation, workerController.getById);
/**
 * @openapi
 * /api/workers/{id}:
 *   patch:
 *     summary: Editar un trabajador
 *     tags: [Workers]
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
 *           schema: { $ref: '#/components/schemas/WorkerInput' }
 *     responses:
 *       200:
 *         description: Trabajador actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Worker' }
 *       409: { description: El trabajador está eliminado }
 */
router.patch("/:id", [...idValidation.slice(0, 1), ...workerFieldsValidation], workerController.update);
/**
 * @openapi
 * /api/workers/{id}:
 *   delete:
 *     summary: Eliminar lógicamente un trabajador
 *     tags: [Workers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Trabajador eliminado }
 *       409: { description: El trabajador ya estaba eliminado }
 */
router.delete("/:id", idValidation, workerController.remove);

export default router;
