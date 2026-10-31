import { Router } from "express";
import { body, param, query } from "express-validator";

import { validateRequest } from "../middlewares/validation.middleware.js";
import { variantController } from "../controllers/variant.controller.js";

const router = Router();
const statuses = ["draft", "published", "paused", "discontinued"];
const idValidation = [
  param("id").isMongoId().withMessage("Invalid variant id"),
  validateRequest,
];
const serviceIdValidation = [
  param("serviceId").isMongoId().withMessage("Invalid service id"),
  validateRequest,
];
const createValidation = [
  body("service")
    .exists({ values: "falsy" })
    .withMessage("service is required")
    .bail()
    .isMongoId()
    .withMessage("service must be a valid service id"),
  body("name")
    .exists({ values: "falsy" })
    .withMessage("name is required")
    .bail()
    .isString()
    .withMessage("name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("name cannot be empty")
    .isLength({ max: 120 })
    .withMessage("name must be at most 120 characters"),
  body("price")
    .exists({ values: "null" })
    .withMessage("price is required")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("price must be a number greater than or equal to 0")
    .toFloat(),
  body("duration")
    .exists({ values: "null" })
    .withMessage("duration is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("duration must be a positive integer")
    .toInt(),
  body("sku")
    .optional()
    .isString()
    .withMessage("sku must be a string"),
  body("auto")
    .optional()
    .isBoolean()
    .withMessage("auto must be a boolean")
    .toBoolean(),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("active must be a boolean")
    .toBoolean(),
  body("status")
    .optional()
    .isIn(statuses)
    .withMessage("Invalid variant status"),
  body("requiresBooking")
    .optional()
    .isBoolean()
    .withMessage("requiresBooking must be a boolean")
    .toBoolean(),
  validateRequest,
];
const updateValidation = [
  ...idValidation.slice(0, 1),
  body("service")
    .optional()
    .isMongoId()
    .withMessage("service must be a valid service id"),
  body("name")
    .optional()
    .isString()
    .withMessage("name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("name cannot be empty")
    .isLength({ max: 120 })
    .withMessage("name must be at most 120 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("price must be a number greater than or equal to 0")
    .toFloat(),
  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("duration must be a positive integer")
    .toInt(),
  body("sku").optional().isString().withMessage("sku must be a string"),
  body("auto")
    .optional()
    .isBoolean()
    .withMessage("auto must be a boolean")
    .toBoolean(),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("active must be a boolean")
    .toBoolean(),
  body("status")
    .optional()
    .isIn(statuses)
    .withMessage("Invalid variant status"),
  body("requiresBooking")
    .optional()
    .isBoolean()
    .withMessage("requiresBooking must be a boolean")
    .toBoolean(),
  validateRequest,
];
const listValidation = [
  query("service").optional().isMongoId().withMessage("Invalid service id"),
  query("active")
    .optional()
    .isIn(["true", "false"])
    .withMessage("active must be true or false"),
  query("status")
    .optional()
    .isIn(statuses)
    .withMessage("Invalid variant status"),
  query("deleted")
    .optional()
    .isIn(["true", "false"])
    .withMessage("deleted must be true or false"),
  query("serviceId").optional().isMongoId().withMessage("Invalid service id"),
  validateRequest,
];
const activeValidation = [
  ...idValidation.slice(0, 1),
  body("active")
    .exists()
    .withMessage("active is required")
    .bail()
    .isBoolean()
    .withMessage("active must be a boolean")
    .toBoolean(),
  validateRequest,
];
const statusValidation = [
  ...idValidation.slice(0, 1),
  body("status")
    .exists()
    .withMessage("status is required")
    .bail()
    .isIn(statuses)
    .withMessage("Invalid variant status"),
  validateRequest,
];

/**
 * @openapi
 * /api/variants/public:
 *   get:
 *     summary: Listar variantes disponibles
 *     description: Solo incluye variantes y servicios activos, publicados y no eliminados, dentro de categorías disponibles.
 *     tags: [Variants]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista pública de variantes }
 */
router.get("/public", listValidation, variantController.listPublic);

/**
 * @openapi
 * /api/variants/service/{serviceId}:
 *   get:
 *     summary: Listar variantes de un servicio para administración
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de variantes }
 *       404: { description: Servicio no encontrado }
 */
router.get(
  "/service/:serviceId",
  serviceIdValidation,
  variantController.listByService,
);

/**
 * @openapi
 * /api/variants:
 *   get:
 *     summary: Listar variantes para administración
 *     tags: [Variants]
 *     parameters:
 *       - in: query
 *         name: service
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, paused, discontinued] }
 *       - in: query
 *         name: deleted
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Lista de variantes }
 */
router.get("/", listValidation, variantController.list);

/**
 * @openapi
 * /api/variants:
 *   post:
 *     summary: Crear una variante
 *     tags: [Variants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VariantInput' }
 *     responses:
 *       201: { description: Variante creada }
 *       400: { description: Datos no válidos }
 *       404: { description: Servicio no encontrado }
 *       409: { description: Conflicto de SKU o servicio no disponible }
 */
router.post("/", createValidation, variantController.create);

/**
 * @openapi
 * /api/variants/{id}/restore:
 *   patch:
 *     summary: Restaurar una variante eliminada
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Variante restaurada }
 *       409: { description: La variante no estaba eliminada }
 */
router.patch("/:id/restore", idValidation, variantController.restore);

/**
 * @openapi
 * /api/variants/{id}/active:
 *   patch:
 *     summary: Activar o desactivar una variante
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active: { type: boolean }
 *     responses:
 *       200: { description: Estado de activación actualizado }
 *       409: { description: La variante está eliminada }
 */
router.patch("/:id/active", activeValidation, variantController.setActive);

/**
 * @openapi
 * /api/variants/{id}/status:
 *   patch:
 *     summary: Cambiar el estado de una variante
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [draft, published, paused, discontinued] }
 *     responses:
 *       200: { description: Estado actualizado }
 */
router.patch("/:id/status", statusValidation, variantController.setStatus);

/**
 * @openapi
 * /api/variants/{id}:
 *   get:
 *     summary: Obtener una variante por ID
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Variante encontrada }
 *       404: { description: Variante no encontrada }
 */
router.get("/:id", idValidation, variantController.getById);

/**
 * @openapi
 * /api/variants/{id}:
 *   patch:
 *     summary: Actualizar una variante
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VariantInput' }
 *     responses:
 *       200: { description: Variante actualizada }
 *       409: { description: Conflicto de SKU o variante eliminada }
 */
router.patch("/:id", updateValidation, variantController.update);

/**
 * @openapi
 * /api/variants/{id}:
 *   delete:
 *     summary: Eliminar lógicamente una variante
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Variante eliminada lógicamente }
 *       409: { description: La variante ya estaba eliminada }
 */
router.delete("/:id", idValidation, variantController.remove);

export default router;