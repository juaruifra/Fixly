import { shopService } from "../services/shop.service.js";

/**
 * Traduce las peticiones públicas de Shop a respuestas JSON.
 * La validación y las reglas de búsqueda se mantienen fuera del controlador.
 */
export const shopController = {
  /**
   * Devuelve resultados paginados para las tarjetas de Shop List.
   *
   * @param {import("express").Request} req - Query params validados por la ruta.
   * @param {import("express").Response} res - Respuesta JSON de resultados.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 200 o delega el error.
   */
  async listServices(req, res, next) {
    try {
      res.json(await shopService.listServices(req.query));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Devuelve categorías y límites de precio para los controles de filtros.
   *
   * @param {import("express").Request} req - Query params categories/search.
   * @param {import("express").Response} res - Respuesta JSON de opciones.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 200 o delega el error.
   */
  async getFilterOptions(req, res, next) {
    try {
      res.json(await shopService.getFilterOptions(req.query));
    } catch (error) {
      next(error);
    }
  },
};