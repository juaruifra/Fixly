import { serviceService } from "../services/service.service.js";

export const serviceController = {
  async list(req, res, next) {
    try {
      const filters = {};
      if (req.query.active !== undefined)
        filters.active = req.query.active === "true";
      if (req.query.status !== undefined) filters.status = req.query.status;
      if (req.query.deleted !== undefined)
        filters.deleted = req.query.deleted === "true";
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
  /**
   * Crea un servicio a partir del body validado por `service.routes.js`.
   *
   * El precio y la duración no pertenecen a Service; sus modalidades se crean
   * después mediante las rutas de Variant. La lógica genera el slug y valida
   * de nuevo los datos antes de persistirlos.
   *
   * @param {import("express").Request} req - Petición autenticada de ADMIN.
   * @param {import("express").Response} res - Respuesta HTTP de creación.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 201 o delega el error al middleware.
   */
  async create(req, res, next) {
    try {
      res.status(201).json(await serviceService.create(req.body));
    } catch (error) {
      next(error);
    }
  },
  /**
   * Actualiza solo propiedades propias de Service y devuelve el documento público.
   *
   * `serviceService.update` rechaza explícitamente los antiguos campos
   * comerciales, incluso si un cliente los incluye en un PATCH.
   *
   * @param {import("express").Request} req - ID y campos validados de Service.
   * @param {import("express").Response} res - Respuesta HTTP con el servicio.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 200 o delega el error al middleware.
   */
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
  },
};
