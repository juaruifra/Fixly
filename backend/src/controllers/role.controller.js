import { roleService } from "../services/role.service.js";

export const roleController = {
  async list(req, res, next) {
    try {
      const filters = {};
      if (req.query.active !== undefined) filters.active = req.query.active === "true";
      if (req.query.deleted !== undefined) filters.deleted = req.query.deleted === "true";
      res.json(await roleService.list(filters));
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await roleService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await roleService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await roleService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async setActive(req, res, next) {
    try {
      res.json(await roleService.setActive(req.params.id, req.body.active));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await roleService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async restore(req, res, next) {
    try {
      res.json(await roleService.restore(req.params.id));
    } catch (error) {
      next(error);
    }
  },
};
