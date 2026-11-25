import { homeRepository } from "../repositories/home.repository.js";

/**
 * Coordina la recuperación de los datos públicos que necesita Home.
 *
 * La regla de disponibilidad y la consulta viven en el repositorio para que
 * el controlador solo traduzca el resultado a una respuesta HTTP.
 */
export const homeService = {
  /**
   * Lista las categorías con al menos una oferta comercial disponible.
   *
   * @returns {Promise<Array<{name: string, slug: string, image: Object|null}>>}
   *   Datos mínimos para las tarjetas de categoría de Home.
   */
  listCategories: () => homeRepository.findAvailableCategories(),
};