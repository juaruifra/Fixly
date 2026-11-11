import { imageService } from "../services/image.service.js";

export const imageController = {
  async list(_req, res, next) {
    try {
      res.json(await imageService.list());
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await imageService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async listByEntity(req, res, next) {
    try {
      res.json(
        await imageService.listByEntity(
          req.params.entityType,
          req.params.entityId,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await imageService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await imageService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await imageService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};