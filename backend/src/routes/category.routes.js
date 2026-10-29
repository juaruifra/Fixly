import { Router } from "express";
import { body, param, query } from "express-validator";
import { categoryController } from "../controllers/category.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();

// Comprobamos el ObjectId antes de pasar la petición al controlador.
const idValidation = [
  param("id").isMongoId().withMessage("Invalid category id"),
  validateRequest,
];
const slugValidation = [
  param("slug").isString().trim().notEmpty().withMessage("slug is required"),
  validateRequest,
];

// Los filtros llegan como texto en la URL y solo aceptamos true o false.
const listValidation = [
  query("active")
    .optional()
    .isIn(["true", "false"])
    .withMessage("active must be true or false"),
  query("deleted")
    .optional()
    .isIn(["true", "false"])
    .withMessage("deleted must be true or false"),
  validateRequest,
];

// En una categoría nueva solo el nombre es obligatorio.
const createValidation = [
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

// Al editar, todos los campos son opcionales, pero se validan si se envían.
const updateValidation = [
  ...idValidation.slice(0, 1),
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

// Este endpoint recibe únicamente el nuevo valor de active.
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

// Esta ruta específica debe ir antes de /:id para que "available" no se lea como ID.
/**
 * @openapi
 * /api/categories/available:
 *   get:
 *     summary: Listar categorías disponibles para servicios
 *     description: Devuelve categorías activas y no eliminadas.
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Lista de categorías disponibles
 */
router.get("/available", categoryController.listAvailable);

/**
 * @openapi
 * /api/categories/slug/{slug}:
 *   get:
 *     summary: Obtener una categoría disponible por slug
 *     description: Solo encuentra categorías activas y no eliminadas.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Categoría encontrada }
 *       404: { description: Categoría no disponible }
 */
router.get(
  "/slug/:slug",
  slugValidation,
  categoryController.getAvailableBySlug,
);

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Listar categorías para administración
 *     description: Incluye categorías inactivas y eliminadas si no se aplican filtros.
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: deleted
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Lista de categorías }
 */
// Listado administrativo; sin filtros incluye también inactivas y eliminadas.
router.get("/", listValidation, categoryController.list);

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Crear una categoría
 *     description: Genera un slug único a partir del nombre.
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoryInput' }
 *     responses:
 *       201: { description: Categoría creada }
 *       409: { description: Conflicto al crear la categoría }
 */
// Validamos el cuerpo antes de crear la categoría y devolver HTTP 201.
router.post("/", createValidation, categoryController.create);

/**
 * @openapi
 * /api/categories/{id}/restore:
 *   patch:
 *     summary: Restaurar una categoría eliminada
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Categoría restaurada }
 *       404: { description: Categoría no encontrada }
 *       409: { description: La categoría no está eliminada }
 */
// La restauración solo se intenta después de validar el identificador.
router.patch("/:id/restore", idValidation, categoryController.restore);

/**
 * @openapi
 * /api/categories/{id}/active:
 *   patch:
 *     summary: Activar o desactivar una categoría
 *     tags: [Categories]
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
 *       409: { description: No se puede modificar una categoría eliminada }
 */
router.patch(
  "/:id/active",
  activeValidation,
  categoryController.setActive,
);

/**
 * @openapi
 * /api/categories/{id}:
 *   get:
 *     summary: Obtener una categoría por ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Categoría encontrada }
 *       404: { description: Categoría no encontrada }
 */
// Las rutas con :id quedan después de las rutas fijas para evitar ambigüedades.
router.get("/:id", idValidation, categoryController.getById);

/**
 * @openapi
 * /api/categories/{id}:
 *   patch:
 *     summary: Actualizar una categoría
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CategoryInput' }
 *     responses:
 *       200: { description: Categoría actualizada }
 *       404: { description: Categoría no encontrada }
 *       409: { description: No se puede editar una categoría eliminada }
 */
router.patch("/:id", updateValidation, categoryController.update);

/**
 * @openapi
 * /api/categories/{id}:
 *   delete:
 *     summary: Eliminar lógicamente una categoría
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Categoría eliminada lógicamente }
 *       409: { description: La categoría ya está eliminada }
 */
router.delete("/:id", idValidation, categoryController.remove);

export default router;