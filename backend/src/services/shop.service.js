import { homeService } from "./home.service.js";
import { shopRepository } from "../repositories/shop.repository.js";
import {
  parseShopFilterOptions,
  parseShopListFilters,
} from "../utils/shop-filters.util.js";

/**
 * Coordina la búsqueda y las opciones adaptativas de Shop List.
 *
 * Los parámetros se convierten en valores permitidos antes de llegar al
 * repositorio. Home comparte la regla que determina las categorías elegibles.
 */
export const shopService = {
  /**
   * Lista servicios que cumplen búsqueda, categorías y rango de precios.
   *
   * @param {Object} rawParams - `req.query` sin normalizar de la ruta.
   * @returns {Promise<Object>} Tarjetas de servicio, total y paginación.
   * @throws {AppError} HTTP 400 si algún filtro no respeta el contrato.
   */
  async listServices(rawParams) {
    const queryParams = parseShopListFilters(rawParams);
    const result = await shopRepository.findServices(queryParams);
    return result;
  },

  /**
   * Recupera categorías globales y el rango de precios adaptado a búsqueda.
   *
   * Las categorías no dependen de los filtros actuales. El rango sí usa los
   * slugs y el texto enviados, pero se calcula sin precio, orden ni paginación.
   *
   * @param {Object} rawParams - `req.query` con categorías y búsqueda.
   * @returns {Promise<Object>} Categorías elegibles y límites min/max o null.
   * @throws {AppError} HTTP 400 ante filtros desconocidos o inválidos.
   */
  async getFilterOptions(rawParams) {
    const queryParams = parseShopFilterOptions(rawParams);
    // Las categorías son globales; el rango solo depende de categorías y texto.
    const [categories, priceRange] = await Promise.all([
      homeService.listCategoryOptions(),
      shopRepository.findAdaptivePriceRange(queryParams),
    ]);

    return { categories, priceRange };
  },
};