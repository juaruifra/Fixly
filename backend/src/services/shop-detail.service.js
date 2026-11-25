import { shopDetailRepository } from "../repositories/shop-detail.repository.js";
import { AppError } from "../utils/app-error.js";

/**
 * Coordina las operaciones públicas de Shop Detail.
 *
 * Recibe un slug ya validado por Routes, delega las consultas al repositorio
 * Shop Detail y traduce resultados no disponibles a 404. No lee filtros de
 * Shop List ni accede al carrito.
 */
export const shopDetailService = {
  /**
   * Recupera el detalle público de un servicio y su galería completa.
   *
   * `priceFrom` se calcula con todas las variantes disponibles, sin conservar
   * límites de precio o texto de Shop List.
   *
   * @param {string} slug - Slug validado del servicio.
   * @returns {Promise<Object>} Service, category, images y precio inicial.
   * @throws {AppError} HTTP 404 cuando no existe una oferta visible.
   */
  async getServiceDetail(slug) {
    const detail = await shopDetailRepository.findServiceDetailBySlug(slug);
    if (!detail) throw new AppError("Service not found", 404);
    return detail;
  },

  /**
   * Recupera las variantes comerciales disponibles de un servicio.
   *
   * El repositorio comprueba también la disponibilidad de Service y Category,
   * de modo que la consulta no revela variantes de un padre oculto.
   *
   * @param {string} slug - Slug validado del servicio padre.
   * @returns {Promise<Array<Object>>} Variantes públicas con su primera imagen.
   * @throws {AppError} HTTP 404 si el servicio carece de variantes disponibles.
   */
  async getAvailableVariants(slug) {
    const variants = await shopDetailRepository.findAvailableVariantsByServiceSlug(slug);
    if (variants.length === 0) throw new AppError("Service not found", 404);
    return variants;
  },
};