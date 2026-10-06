import { Router } from "express";
import { serviceController } from "../controllers/service.controller.js";
import { body, param } from "express-validator";
import { validateRequest } from "../middlewares/validation.middleware.js";
const router=Router();
const idValidation=[param("id").isMongoId().withMessage("Invalid service id"),validateRequest];
const createValidation=[
 body("name").exists({values:"falsy"}).withMessage("name is required").bail().isString().withMessage("name must be a string").bail().trim().isLength({max:120}).withMessage("name must be at most 120 characters"),
 body("category").exists({values:"falsy"}).withMessage("category is required").bail().isString().withMessage("category must be a string").bail().trim().isLength({max:80}).withMessage("category must be at most 80 characters"),
 body("price").exists({values:"null"}).withMessage("price is required").bail().isFloat({min:0}).withMessage("price must be a number greater than or equal to 0").toFloat(),
 body("duration").exists({values:"null"}).withMessage("duration is required").bail().isInt({min:15}).withMessage("duration must be an integer greater than or equal to 15").toInt(),
 body("description").optional().isString().withMessage("description must be a string").bail().trim().isLength({max:500}).withMessage("description must be at most 500 characters"),
 body("active").optional().isBoolean().withMessage("active must be a boolean").toBoolean(), validateRequest];
const updateValidation=[
 param("id").isMongoId().withMessage("Invalid service id"),
 body("name").optional().isString().withMessage("name must be a string").bail().trim().notEmpty().withMessage("name cannot be empty").isLength({max:120}).withMessage("name must be at most 120 characters"),
 body("category").optional().isString().withMessage("category must be a string").bail().trim().notEmpty().withMessage("category cannot be empty").isLength({max:80}).withMessage("category must be at most 80 characters"),
 body("price").optional().isFloat({min:0}).withMessage("price must be a number greater than or equal to 0").toFloat(),
 body("duration").optional().isInt({min:15}).withMessage("duration must be an integer greater than or equal to 15").toInt(),
 body("description").optional().isString().withMessage("description must be a string").bail().trim().isLength({max:500}).withMessage("description must be at most 500 characters"),
 body("active").optional().isBoolean().withMessage("active must be a boolean").toBoolean(), validateRequest];
/** @openapi
 * /api/services:
 *   get:
 *     summary: Obtener todos los servicios
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Lista de servicios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Service' }
 */
router.get("/",serviceController.list);
/** @openapi
 * /api/services/{id}:
 *   get:
 *     summary: Obtener un servicio por ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Servicio encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Service' }
 *       404: { description: Servicio no encontrado }
 */
router.get("/:id",idValidation,serviceController.getById);
/** @openapi
 * /api/services:
 *   post:
 *     summary: Crear un servicio
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ServiceInput' }
 *     responses:
 *       201:
 *         description: Servicio creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Service' }
 */
router.post("/",createValidation,serviceController.create);
/** @openapi
 * /api/services/{id}:
 *   patch:
 *     summary: Actualizar un servicio
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
 */
router.patch("/:id",updateValidation,serviceController.update);
/** @openapi
 * /api/services/{id}:
 *   delete:
 *     summary: Eliminar un servicio
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Servicio eliminado }
 */
router.delete("/:id",idValidation,serviceController.remove);
export default router;
