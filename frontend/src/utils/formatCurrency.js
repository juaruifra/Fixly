const currencyFormatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/**
 * Formatea un importe en euros con las convenciones regionales de España.
 * Conserva el comportamiento nativo de Intl ante valores ausentes.
 *
 * @param {number} amount - Importe a mostrar.
 * @returns {string} Importe formateado.
 */
export function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}