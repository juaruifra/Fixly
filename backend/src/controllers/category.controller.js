import { categoryService } from "../services/category.service.js";

// El controlador traduce la petición HTTP y deja las reglas en categoryService.
export const categoryController = {
  async list(req, res, next) {
    try {
      // Express entrega los query params como texto; aquí los convertimos a booleanos.
      const filters = {};
      if (req.query.active !== undefined) {
        filters.active = req.query.active === "true";
      }
      if (req.query.deleted !== undefined) {
        filters.deleted = req.query.deleted === "true";
      }
      res.json(await categoryService.list(filters));
    } catch (error) {
      next(error);
    }
  },
  // Endpoint separado para opciones que sí pueden asignarse a servicios nuevos.
  async listAvailable(_req, res, next) {
    try {
      res.json(await categoryService.listAvailable());
    } catch (error) {
      next(error);
    }
  },
  async getAvailableBySlug(req, res, next) {
    try {
      res.json(await categoryService.getAvailableBySlug(req.params.slug));
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await categoryService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(await categoryService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await categoryService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await categoryService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async restore(req, res, next) {
    try {
      res.json(await categoryService.restore(req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async setActive(req, res, next) {
    try {
      res.json(await categoryService.setActive(req.params.id, req.body.active));
    } catch (error) {
      next(error);
    }
  },
};