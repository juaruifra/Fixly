import { cartService } from "../services/cart.service.js";

export const cartController = {
  async get(req, res, next) {
    try {
      res.json(await cartService.get(req.authUser.id));
    } catch (error) {
      next(error);
    }
  },
  async addVariant(req, res, next) {
    try {
      const cart = await cartService.addVariant(
        req.authUser.id,
        req.body.variant,
        req.body.quantity,
      );
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },
  async setQuantity(req, res, next) {
    try {
      res.json(
        await cartService.setQuantity(
          req.authUser.id,
          req.params.variantId,
          req.body.quantity,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
  async removeVariant(req, res, next) {
    try {
      res.json(await cartService.removeVariant(req.authUser.id, req.params.variantId));
    } catch (error) {
      next(error);
    }
  },
  async clear(req, res, next) {
    try {
      res.json(await cartService.clear(req.authUser.id));
    } catch (error) {
      next(error);
    }
  },
  async checkout(req, res, next) {
    try {
      res.status(201).json(await cartService.checkout(req.authUser.id));
    } catch (error) {
      next(error);
    }
  },
};
