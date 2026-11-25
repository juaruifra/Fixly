import { shopDetailService } from "../services/shop-detail.service.js";

/**
 * Controladores HTTP del módulo Shop Detail.
 *
 * Routes entrega slugs validados; este controller solo delega al service,
 * serializa el resultado y propaga errores al middleware común.
 */
export const shopDetailController = {
  /**
   * Devuelve el detalle público de un servicio.
   *
   * @param {import("express").Request} req - Slug del servicio en params.
   * @param {import("express").Response} res - Respuesta JSON de detalle.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 200 o delega el error.
   */
  async getServiceDetail(req, res, next) {
    try {
      res.json(await shopDetailService.getServiceDetail(req.params.slug));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Devuelve las variantes públicas de un servicio.
   *
   * @param {import("express").Request} req - Slug del servicio en params.
   * @param {import("express").Response} res - Respuesta JSON de variantes.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 200 o delega el error.
   */
  async getAvailableVariants(req, res, next) {
    try {
      res.json(await shopDetailService.getAvailableVariants(req.params.slug));
    } catch (error) {
      next(error);
    }
  },
};