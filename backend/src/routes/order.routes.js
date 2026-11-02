import { Router } from "express";
import { body, param, query } from "express-validator";

import { orderController } from "../controllers/order.controller.js";
import { authenticateRequired } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

const router = Router();
// El bypass local no cambia la propiedad ni el acceso a pedidos.
router.use(authenticateRequired);
const statuses = ["pending", "confirmed", "cancelled", "completed"];

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: Listar los pedidos propios o, como ADMIN, todos los pedidos
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, confirmed, cancelled, completed] }
 *     responses:
 *       200:
 *         description: Lista de pedidos visibles para el usuario
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Order' } }
 */
router.get(
  "/",
  [
    query("status").optional().isIn(statuses).withMessage("Invalid order status"),
    query("user").optional().isMongoId().withMessage("Invalid user id"),
    validateRequest,
  ],
  orderController.list,
);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener un pedido propio o, como ADMIN, cualquier pedido
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pedido con instantánea de compra
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       404: { description: Pedido no encontrado o no pertenece al usuario }
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid order id"), validateRequest],
  orderController.getById,
);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Cambiar el estado de un pedido como ADMIN
 *     tags: [Orders]
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
 *           schema: { type: object, required: [status], properties: { status: { type: string, enum: [pending, confirmed, cancelled, completed] } } }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       403: { description: Se requiere rol ADMIN }
 *       409: { description: Transición de estado no permitida }
 */
router.patch(
  "/:id/status",
  requireRole("ADMIN"),
  [
    param("id").isMongoId().withMessage("Invalid order id"),
    body("status").exists().isIn(statuses).withMessage("Invalid order status"),
    validateRequest,
  ],
  orderController.setStatus,
);

export default router;
