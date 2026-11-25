import { Router } from "express";

import { homeController } from "../controllers/home.controller.js";

const router = Router();

/**
 * @openapi
 * /api/home/categories:
 *   get:
 *     summary: Listar categorías de la página de inicio
 *     description: >-
 *       Endpoint público. Solo devuelve categorías activas y no eliminadas que
 *       tengan al menos un servicio activo, publicado y no eliminado con una
 *       variante activa, publicada y no eliminada. La respuesta incluye la
 *       primera imagen por orden de creación o null si no existe.
 *     tags: [Home]
 *     responses:
 *       200:
 *         description: Categorías disponibles ordenadas por nombre.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/HomeCategory' }
 *       500: { description: Error inesperado }
 */
router.get("/categories", homeController.listCategories);

export default router;