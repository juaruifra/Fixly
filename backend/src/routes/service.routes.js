import { Router } from "express";
import { body, param, query } from "express-validator";
import { serviceController } from "../controllers/service.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
const statuses = ["draft", "published", "paused", "discontinued"];
const idValidation = [
  param("id").isMongoId().withMessage("Invalid service id"),
  validateRequest
];
const slugValidation = [
  param("slug").isString().trim().notEmpty().withMessage("slug is required"),
  validateRequest
];
const listValidation = [
  query("active").optional().isIn(["true", "false"]).withMessage("active must be true or false"),
  query("status").optional().isIn(statuses).withMessage("Invalid service status"),
  query("deleted").optional().isIn(["true", "false"]).withMessage("deleted must be true or false"),
  validateRequest
];
const createValidation = [
  body("name").exists({ values: "falsy" }).withMessage("name is required").bail().isString().withMessage("name must be a string").bail().trim().notEmpty().withMessage("name cannot be empty").isLength({ max: 120 }).withMessage("name must be at most 120 characters"),
  body("category").exists({ values: "falsy" }).withMessage("category is required").bail().isString().withMessage("category must be a string").bail().trim().notEmpty().withMessage("category cannot be empty").isLength({ max: 80 }).withMessage("category must be at most 80 characters"),
  body("price").exists({ values: "null" }).withMessage("price is required").bail().isFloat({ min: 0 }).withMessage("price must be a number greater than or equal to 0").toFloat(),
  body("duration").exists({ values: "null" }).withMessage("duration is required").bail().isInt({ min: 15 }).withMessage("duration must be an integer greater than or equal to 15").toInt(),
  body("description").optional().isString().withMessage("description must be a string").bail().trim().isLength({ max: 500 }).withMessage("description must be at most 500 characters"),
  body("active").optional().isBoolean().withMessage("active must be a boolean").toBoolean(),
  validateRequest
];
const updateValidation = [
  ...idValidation.slice(0, 1),
  body("name").optional().isString().withMessage("name must be a string").bail().trim().notEmpty().withMessage("name cannot be empty").isLength({ max: 120 }).withMessage("name must be at most 120 characters"),
  body("category").optional().isString().withMessage("category must be a string").bail().trim().notEmpty().withMessage("category cannot be empty").isLength({ max: 80 }).withMessage("category must be at most 80 characters"),
  body("price").optional().isFloat({ min: 0 }).withMessage("price must be a number greater than or equal to 0").toFloat(),
  body("duration").optional().isInt({ min: 15 }).withMessage("duration must be an integer greater than or equal to 15").toInt(),
  body("description").optional().isString().withMessage("description must be a string").bail().trim().isLength({ max: 500 }).withMessage("description must be at most 500 characters"),
  body("active").optional().isBoolean().withMessage("active must be a boolean").toBoolean(),
  validateRequest
];
const activeValidation = [
  ...idValidation.slice(0, 1),
  body("active").exists().withMessage("active is required").bail().isBoolean().withMessage("active must be a boolean").toBoolean(),
  validateRequest
];
const statusValidation = [
  ...idValidation.slice(0, 1),
  body("status").exists().withMessage("status is required").bail().isIn(statuses).withMessage("Invalid service status"),
  validateRequest
];

/**
 * @openapi
 * /api/services/public:
 *   get:
 *     summary: Listar servicios disponibles públicamente
 *     description: Devuelve únicamente servicios activos, publicados y no eliminados.
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Lista pública de servicios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Service' }
 */
router.get("/public", serviceController.listPublic);

/**
 * @openapi
 * /api/services/slug/{slug}:
 *   get:
 *     summary: Obtener un servicio público por slug
 *     description: Solo encuentra servicios activos, publicados y no eliminados.
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Servicio encontrado }
 *       404: { description: Servicio no encontrado }
 */
router.get("/slug/:slug", slugValidation, serviceController.getPublicBySlug);

/**
 * @openapi
 * /api/services:
 *   get:
 *     summary: Listar servicios para administración
 *     description: Incluye servicios inactivos y eliminados. Esta ruta administrativa deberá protegerse al incorporar autenticación.
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, paused, discontinued] }
 *       - in: query
 *         name: deleted
 *         description: Filtra servicios eliminados (true) o no eliminados (false).
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de servicios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Service' }
 */
router.get("/", listValidation, serviceController.list);

/**
 * @openapi
 * /api/services:
 *   post:
 *     summary: Crear un servicio
 *     description: Genera un slug único a partir del nombre. Esta ruta administrativa deberá protegerse al incorporar autenticación.
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ServiceInput' }
 *     responses:
 *       201: { description: Servicio creado }
 *       409: { description: Conflicto al crear el servicio }
 */
router.post("/", createValidation, serviceController.create);

/**
 * @openapi
 * /api/services/{id}/restore:
 *   patch:
 *     summary: Restaurar un servicio eliminado
 *     description: Esta ruta administrativa deberá protegerse al incorporar autenticación.
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Servicio restaurado }
 *       404: { description: Servicio no encontrado }
 *       409: { description: El servicio no está eliminado }
 */
router.patch("/:id/restore", idValidation, serviceController.restore);

/**
 * @openapi
 * /api/services/{id}/active:
 *   patch:
 *     summary: Activar o desactivar un servicio
 *     description: Cambia solo active. No permite activar servicios eliminados. Ruta administrativa pendiente de proteger con autenticación.
 *     tags: [Services]
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
 *       409: { description: No se puede activar un servicio eliminado }
 */
router.patch("/:id/active", activeValidation, serviceController.setActive);

/**
 * @openapi
 * /api/services/{id}/status:
 *   patch:
 *     summary: Cambiar el estado de un servicio
 *     description: Ruta administrativa pendiente de proteger con autenticación.
 *     tags: [Services]
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
 *       400: { description: Estado no válido }
 */
router.patch("/:id/status", statusValidation, serviceController.setStatus);

/**
 * @openapi
 * /api/services/{id}:
 *   get:
 *     summary: Obtener un servicio por ID para administración
 *     description: Incluye servicios inactivos y eliminados. Esta ruta deberá protegerse al incorporar autenticación.
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Servicio encontrado }
 *       404: { description: Servicio no encontrado }
 */
router.get("/:id", idValidation, serviceController.getById);

/**
 * @openapi
 * /api/services/{id}:
 *   patch:
 *     summary: Actualizar los datos editables de un servicio
 *     description: Permite modificar active; no recalcula el slug al cambiar el nombre. Ruta administrativa pendiente de proteger con autenticación.
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ServiceInput' }
 *     responses:
 *       200: { description: Servicio actualizado }
 *       404: { description: Servicio no encontrado }
 *       409: { description: No se puede activar un servicio eliminado }
 */
router.patch("/:id", updateValidation, serviceController.update);

/**
 * @openapi
 * /api/services/{id}:
 *   delete:
 *     summary: Eliminar lógicamente un servicio
 *     description: Marca deletedAt y active=false sin borrar el documento. Ruta administrativa pendiente de proteger con autenticación.
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Servicio eliminado lógicamente }
 *       409: { description: El servicio ya estaba eliminado }
 */
router.delete("/:id", idValidation, serviceController.remove);

export default router;
