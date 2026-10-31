import { variantService } from "../services/variant.service.js";

export const variantController = {
  async list(req, res, next) {
    try {
      const filters = {};
      if (req.query.service !== undefined) filters.service = req.query.service;
      if (req.query.active !== undefined) {
        filters.active = req.query.active === "true";
      }
      if (req.query.status !== undefined) filters.status = req.query.status;
      if (req.query.deleted !== undefined) {
        filters.deleted = req.query.deleted === "true";
      }
      res.json(await variantService.list(filters));
    } catch (error) {
      next(error);
    }
  },
  async listPublic(req, res, next) {
    try {
      res.json(await variantService.listPublic(req.query.serviceId));
    } catch (error) {
      next(error);
    }
  },
  async listByService(req, res, next) {
    try {
      res.json(await variantService.listByService(req.params.serviceId));
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await variantService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await variantService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await variantService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await variantService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async restore(req, res, next) {
    try {
      res.json(await variantService.restore(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async setActive(req, res, next) {
    try {
      res.json(await variantService.setActive(req.params.id, req.body.active));
    } catch (error) {
      next(error);
    }
  },
  async setStatus(req, res, next) {
    try {
      res.json(await variantService.setStatus(req.params.id, req.body.status));
    } catch (error) {
      next(error);
    }
  },
};