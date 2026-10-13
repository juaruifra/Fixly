import { serviceService } from "../services/service.service.js";

export const serviceController = {
  async list(req, res, next) {
    try {
      const filters = {};
      if (req.query.active !== undefined) filters.active = req.query.active === "true";
      if (req.query.status !== undefined) filters.status = req.query.status;
      if (req.query.deleted !== undefined) filters.deleted = req.query.deleted === "true";
      res.json(await serviceService.list(filters));
    } catch (error) {
      next(error);
    }
  },
  async listPublic(_req, res, next) {
    try {
      res.json(await serviceService.listPublic());
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await serviceService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async getPublicBySlug(req, res, next) {
    try {
      res.json(await serviceService.getPublicBySlug(req.params.slug));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await serviceService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await serviceService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await serviceService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async restore(req, res, next) {
    try {
      res.json(await serviceService.restore(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async setActive(req, res, next) {
    try {
      res.json(await serviceService.setActive(req.params.id, req.body.active));
    } catch (error) {
      next(error);
    }
  },
  async setStatus(req, res, next) {
    try {
      res.json(await serviceService.setStatus(req.params.id, req.body.status));
    } catch (error) {
      next(error);
    }
  }
};
