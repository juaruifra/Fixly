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
  /**
   * Lista las mismas categorías elegibles sin recuperar imágenes.
   *
   * Shop Filters reutiliza esta regla, pero solo necesita nombres y slugs; no
   * cargar galerías reduce trabajo innecesario al construir sus opciones.
   *
   * @returns {Promise<Array<{name: string, slug: string}>>} Categorías disponibles.
   */
  listCategoryOptions: () => homeRepository.findAvailableCategoryOptions(),
};