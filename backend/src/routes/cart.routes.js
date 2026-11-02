import { Router } from "express";
import { body, param } from "express-validator";

import { cartController } from "../controllers/cart.controller.js";
import { authenticateRequired } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
// El carrito siempre necesita un usuario real, incluso con el bypass local activo.
router.use(authenticateRequired);

/**
 * @openapi
 * /api/cart:
 *   get:
 *     summary: Obtener o crear el carrito del usuario autenticado
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Carrito propio con variantes actuales
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *       401: { description: Se requiere autenticación }
 */
router.get("/", cartController.get);

/**
 * @openapi
 * /api/cart/items:
 *   post:
 *     summary: Añadir una variante al carrito
 *     description: Si ya está en el carrito, suma la cantidad. Los precios del cliente se ignoran.
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variant, quantity]
 *             properties:
 *               variant: { type: string, format: objectid }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Carrito actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *       409: { description: Variante no disponible o checkout en curso }
 */
router.post(
  "/items",
  [
    body("variant").exists({ values: "falsy" }).isMongoId().withMessage("variant must be a valid id"),
    body("quantity").exists({ values: "null" }).isInt({ min: 1 }).withMessage("quantity must be a positive integer").toInt(),
    validateRequest,
  ],
  cartController.addVariant,
);

/**
 * @openapi
 * /api/cart/items/{variantId}:
 *   patch:
 *     summary: Cambiar la cantidad de una variante del carrito
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [quantity], properties: { quantity: { type: integer, minimum: 1 } } }
 *     responses:
 *       200:
 *         description: Carrito actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *       404: { description: Variante no está en el carrito }
 */
router.patch(
  "/items/:variantId",
  [
    param("variantId").isMongoId().withMessage("Invalid variant id"),
    body("quantity").exists({ values: "null" }).isInt({ min: 1 }).withMessage("quantity must be a positive integer").toInt(),
    validateRequest,
  ],
  cartController.setQuantity,
);

/**
 * @openapi
 * /api/cart/items/{variantId}:
 *   delete:
 *     summary: Quitar una variante del carrito
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Carrito actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 */
router.delete(
  "/items/:variantId",
  [param("variantId").isMongoId().withMessage("Invalid variant id"), validateRequest],
  cartController.removeVariant,
);

/**
 * @openapi
 * /api/cart:
 *   delete:
 *     summary: Vaciar el carrito del usuario autenticado
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Carrito vacío
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 */
router.delete("/", cartController.clear);

/**
 * @openapi
 * /api/cart/checkout:
 *   post:
 *     summary: Crear un pedido a partir del carrito
 *     description: Revalida disponibilidad y calcula todos los precios en el servidor.
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Pedido creado con datos históricos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       409: { description: Carrito vacío o variante no disponible }
 */
router.post("/checkout", cartController.checkout);

export default router;
