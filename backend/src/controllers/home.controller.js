import { homeService } from "../services/home.service.js";

/**
 * Expone las operaciones de Home mediante respuestas HTTP públicas.
 *
 * Este controlador no aplica autenticación ni reglas de disponibilidad:
 * la ruta es de solo lectura y `homeService` delega la consulta comercial.
 */
export const homeController = {
  /**
   * Devuelve las categorías que deben mostrarse en la página de inicio.
   *
   * @param {import("express").Request} _req - Petición sin parámetros.
   * @param {import("express").Response} res - Respuesta JSON de categorías.
   * @param {import("express").NextFunction} next - Middleware central de errores.
   * @returns {Promise<void>} Responde 200 o delega el error al middleware.
   */
  async listCategories(_req, res, next) {
    try {
      res.json(await homeService.listCategories());
    } catch (error) {
      next(error);
    }
  },
};