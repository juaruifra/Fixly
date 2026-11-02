import { orderService } from "../services/order.service.js";

export const orderController = {
  async list(req, res, next) {
    try {
      if (req.authUser.role === "ADMIN") {
        const filters = {};
        if (req.query.status !== undefined) filters.status = req.query.status;
        if (req.query.user !== undefined) filters.user = req.query.user;
        res.json(await orderService.listAll(filters));
        return;
      }
      res.json(await orderService.listForUser(req.authUser.id));
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await orderService.getById(req.params.id, req.authUser));
    } catch (error) {
      next(error);
    }
  },
  async setStatus(req, res, next) {
    try {
      res.json(await orderService.setStatus(req.params.id, req.body.status));
    } catch (error) {
      next(error);
    }
  },
};
