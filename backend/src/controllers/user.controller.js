import { userService } from "../services/user.service.js";

export const userController = {
  async list(req, res, next) {
    try {
      const filters = {};
      if (req.query.active !== undefined) filters.active = req.query.active === "true";
      if (req.query.deleted !== undefined) filters.deleted = req.query.deleted === "true";
      res.json(await userService.list(filters));
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await userService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await userService.createByAdmin(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await userService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async setActive(req, res, next) {
    try {
      res.json(await userService.setActive(req.params.id, req.body.active));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await userService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async restore(req, res, next) {
    try {
      res.json(await userService.restore(req.params.id));
    } catch (error) {
      next(error);
    }
  },
};
