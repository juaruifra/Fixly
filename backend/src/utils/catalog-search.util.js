/**
 * Normaliza texto de catálogo para búsquedas parciales insensibles a acentos.
 *
 * NFD separa caracteres como `á` en `a` y una marca combinante; retirar las
 * marcas permite que ambos textos se comparen como `a`. Se unen los campos
 * antes de colapsar espacios para que búsquedas puedan cruzar sus límites.
 * Ejemplo: `"Pintura  rápida"` y `"Pintura rapida"` producen el mismo valor.
 *
 * @param {...unknown} values - Fragmentos de nombre o descripción.
 * @returns {string} Texto en minúsculas, sin marcas diacríticas ni espacios sobrantes.
 */
export function normalizeCatalogSearchText(...values) {
  return values
    .filter((value) => typeof value === "string")
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapa metacaracteres antes de utilizar una búsqueda como expresión regular.
 *
 * Así un término como `a+b` se interpreta literalmente y no como una expresión
 * proporcionada por el cliente.
 *
 * @param {string} value - Texto ya normalizado que se quiere buscar.
 * @returns {string} Texto seguro para usar como patrón regex literal.
 */
export function escapeSearchRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}