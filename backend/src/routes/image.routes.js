import { Router } from "express";
import { body, param } from "express-validator";
import { imageController } from "../controllers/image.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
const entityTypes = ["category", "service", "variant"];

const imageIdValidation = [
  param("id").isMongoId().withMessage("Invalid image id"),
  validateRequest,
];

const createValidation = [
  body("entityType")
    .exists()
    .withMessage("entityType is required")
    .bail()
    .isString()
    .withMessage("entityType must be a string")
    .bail()
    .isIn(entityTypes)
    .withMessage("entityType must be category, service or variant"),
  body("entityId")
    .exists()
    .withMessage("entityId is required")
    .bail()
    .isMongoId()
    .withMessage("entityId must be a valid ObjectId"),
  body("url")
    .exists()
    .withMessage("url is required")
    .bail()
    .isString()
    .withMessage("url must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage("url must be between 1 and 2048 characters")
    .bail()
    .isURL({
      protocols: ["http", "https"],
      require_protocol: true,
      require_tld: false,
    })
    .withMessage("url must be an absolute HTTP or HTTPS URL"),
  body("alt")
    .exists()
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

const updateValidation = [
  ...imageIdValidation.slice(0, 1),
  body("entityType")
    .not()
    .exists()
    .withMessage("entityType cannot be changed"),
  body("entityId")
    .not()
    .exists()
    .withMessage("entityId cannot be changed"),
  body("url")
    .optional()
    .isString()
    .withMessage("url must be a string")
    .bail()
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage("url must be between 1 and 2048 characters")
    .bail()
    .isURL({
      protocols: ["http", "https"],
      require_protocol: true,
      require_tld: false,
    })
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
 * /api/images:
 *   get:
 *     summary: Listar imágenes
 *     description: Devuelve todas las imágenes registradas. Ruta abierta, sin autenticación.
 *     tags: [Images]
 *     responses:
 *       200:
 *         description: Lista de imágenes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Image' }
 *       500: { description: Error inesperado }
 */
router.get("/", imageController.list);

/**
 * @openapi
 * /api/images/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Listar imágenes de una entidad
 *     description: Devuelve una colección vacía si la entidad no tiene imágenes. Ruta abierta.
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string, enum: [category, service, variant] }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: objectid }
 *     responses:
 *       200:
 *         description: Imágenes asociadas a la entidad
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Image' }
 *       400: { description: Tipo de entidad o identificador inválido }
 *       500: { description: Error inesperado }
 */
router.get(
  "/entity/:entityType/:entityId",
  param("entityType")
    .isIn(entityTypes)
    .withMessage("entityType must be category, service or variant"),
  param("entityId").isMongoId().withMessage("Invalid entityId"),
  validateRequest,
  imageController.listByEntity,
);

/**
 * @openapi
 * /api/images:
 *   post:
 *     summary: Crear una imagen
 *     description: Usa un entityId existente y una URL pública real que el navegador pueda cargar. La API solo valida su formato; esta ruta es abierta.
 *     tags: [Images]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ImageInput' }
 *     responses:
 *       201: { description: Imagen creada }
 *       400: { description: Datos inválidos }
 *       404: { description: Entidad relacionada inexistente }
 *       409: { description: La entidad relacionada está eliminada lógicamente }
 *       500: { description: Error inesperado }
 */
router.post("/", createValidation, imageController.create);

/**
 * @openapi
 * /api/images/{id}:
 *   get:
 *     summary: Obtener una imagen por ID
 *     description: Ruta abierta, sin autenticación.
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectid }
 *     responses:
 *       200:
 *         description: Imagen encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Image' }
 *       400: { description: Identificador inválido }
 *       404: { description: Imagen inexistente }
 *       500: { description: Error inesperado }
 */
router.get("/:id", imageIdValidation, imageController.getById);

/**
 * @openapi
 * /api/images/{id}:
 *   patch:
 *     summary: Actualizar una imagen
 *     description: Solo permite cambiar url o alt; la relación con la entidad es inmutable. Ruta abierta.
 *     tags: [Images]
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
 *       200: { description: Imagen actualizada }
 *       400: { description: Datos inválidos o campos no permitidos }
 *       404: { description: Imagen inexistente }
 *       500: { description: Error inesperado }
 */
router.patch("/:id", updateValidation, imageController.update);

/**
 * @openapi
 * /api/images/{id}:
 *   delete:
 *     summary: Eliminar definitivamente una imagen
 *     description: Borra el documento de MongoDB; no elimina archivos externos ni ofrece restauración. Ruta abierta.
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectid }
 *     responses:
 *       204: { description: Imagen eliminada físicamente }
 *       400: { description: Identificador inválido }
 *       404: { description: Imagen inexistente }
 *       500: { description: Error inesperado }
 */
router.delete("/:id", imageIdValidation, imageController.remove);

export default router;