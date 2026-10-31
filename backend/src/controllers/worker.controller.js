import { workerService } from "../services/worker.service.js";

export const workerController = {
  async list(req, res, next) {
    try {
      const filters = {};
      if (req.query.active !== undefined) filters.active = req.query.active === "true";
      if (req.query.deleted !== undefined) filters.deleted = req.query.deleted === "true";
      res.json(await workerService.list(filters));
    } catch (error) {
      next(error);
    }
  },
  async listAvailable(_req, res, next) {
    try {
      res.json(await workerService.listAvailable());
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await workerService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await workerService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await workerService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async setActive(req, res, next) {
    try {
      res.json(await workerService.setActive(req.params.id, req.body.active));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await workerService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async restore(req, res, next) {
    try {
      res.json(await workerService.restore(req.params.id));
    } catch (error) {
      next(error);
    }
  },
};
