import { Router } from "express";
import { param } from "express-validator";

import { shopDetailController } from "../controllers/shop-detail.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
const serviceSlugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const serviceSlugValidation = [
  param("slug")
    .isString()
    .bail()
    .trim()
    .matches(serviceSlugPattern)
    .withMessage("slug must be a valid service slug"),
  validateRequest,
];

/**
 * @openapi
 * /api/shopDetail/services/{slug}/variants:
 *   get:
 *     summary: Listar variantes disponibles de un servicio
 *     description: >-
 *       Endpoint público. Comprueba Service y Category padre y devuelve solo
 *       variantes activas, publicadas y no eliminadas. No expone SKU ni IDs.
 *     tags: [Shop Detail]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, example: "limpieza_de_hogar" }
 *     responses:
 *       200:
 *         description: Variantes disponibles ordenadas por fecha de creación descendente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ShopVariantOption' }
 *             example:
 *               - name: "Limpieza profunda"
 *                 description: "Eliminación de suciedad incrustada."
 *                 duration: 180
 *                 price: 125
 *                 image: null
 *       400: { description: Slug con formato inválido }
 *       404: { description: Servicio sin disponibilidad comercial }
 *       500: { description: Error inesperado }
 */
router.get(
  "/services/:slug/variants",
  serviceSlugValidation,
  shopDetailController.getAvailableVariants,
);

/**
 * @openapi
 * /api/shopDetail/services/{slug}:
 *   get:
 *     summary: Obtener detalle público de un servicio
 *     description: >-
 *       Devuelve Service, Category, todas las imágenes y el precio inicial de
 *       todas sus variantes disponibles. Si Service, Category o todas las
 *       variantes no están disponibles responde 404.
 *     tags: [Shop Detail]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, example: "limpieza_de_hogar" }
 *     responses:
 *       200:
 *         description: Detalle público del servicio.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ShopServiceDetail' }
 *             example:
 *               name: "Limpieza de hogar"
 *               slug: "limpieza_de_hogar"
 *               description: "Limpieza de espacios domésticos."
 *               category: { name: "Limpieza", slug: "limpieza" }
 *               images: []
 *               priceFrom: 25
 *       400: { description: Slug con formato inválido }
 *       404: { description: Servicio sin disponibilidad comercial }
 *       500: { description: Error inesperado }
 */
router.get(
  "/services/:slug",
  serviceSlugValidation,
  shopDetailController.getServiceDetail,
);

export default router;