import { AppError } from "./app-error.js";
import { normalizeCatalogSearchText } from "./catalog-search.util.js";

const LIST_QUERY_KEYS = new Set([
  "categories",
  "search",
  "minPrice",
  "maxPrice",
  "sort",
  "limit",
  "offset",
]);
const FILTER_QUERY_KEYS = new Set(["categories", "search"]);
export const SHOP_SORT_VALUES = Object.freeze([
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
]);
const allowedSorts = new Set(SHOP_SORT_VALUES);
const categorySlugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const floatValuePattern = /^[+-]?(?:[0-9]+)?(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?$/;
const integerValuePattern = /^[+-]?[0-9]+$/;

/**
 * Rechaza estructuras de query inesperadas antes de construir filtros Mongo.
 *
 * Las claves se comparan contra la whitelist del endpoint; los valores
 * repetidos/objeto se validan después por `readSingleString`.
 *
 * @param {Object} query - Parámetros de Express.
 * @param {Set<string>} allowedKeys - Claves públicas permitidas para esa ruta.
 * @returns {void}
 * @throws {AppError} HTTP 400 si la query no es un objeto o contiene claves extra.
 */
function assertQueryObject(query, allowedKeys) {
  if (query === null || typeof query !== "object" || Array.isArray(query)) {
    throw new AppError("Query parameters must be an object", 400);
  }

  const unexpected = Object.keys(query).find((key) => !allowedKeys.has(key));
  if (unexpected) {
    throw new AppError(`Unexpected query parameter: ${unexpected}`, 400);
  }
}

/**
 * Exige que un parámetro opcional llegue una sola vez y como texto.
 *
 * Express puede representar claves repetidas como arrays y query parsers
 * extendidos pueden producir objetos; ambos casos se rechazan antes de Mongo.
 *
 * @param {Object} query - Query string ya interpretada por Express.
 * @param {string} key - Nombre del parámetro HTTP.
 * @returns {string|undefined} Valor original o undefined si no se envió.
 * @throws {AppError} HTTP 400 para arrays, objetos u otros tipos.
 */
function readSingleString(query, key) {
  const value = query[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new AppError(`${key} must be provided once as a string`, 400);
  }
  return value;
}

/**
 * Convierte la lista CSV de categorías en slugs únicos y validados.
 *
 * Una categoría inexistente pero con slug válido se conserva para la consulta;
 * así no invalida otros slugs que sí existan. Un segmento vacío o mal formado
 * se rechaza para que typos en la URL no se conviertan en filtros silenciosos.
 *
 * @param {string|undefined} value - Parámetro categories separado por comas.
 * @returns {string[]} Slugs válidos, sin espacios externos ni duplicados.
 * @throws {AppError} Si un slug no coincide con el formato usado por Fixly.
 */
export function parseShopCategories(value) {
  if (value !== undefined && typeof value !== "string") {
    throw new AppError("categories must be a comma-separated string", 400);
  }
  if (value === undefined || value.trim() === "") return [];

  const slugs = value.split(",").map((slug) => slug.trim());
  if (slugs.some((slug) => !categorySlugPattern.test(slug))) {
    throw new AppError("categories must contain valid category slugs", 400);
  }
  return [...new Set(slugs)];
}

/**
 * Convierte un precio usando el formato decimal admitido por las rutas.
 *
 * Se aceptan signo positivo, decimales y exponente (`+2`, `.5`, `1e2`), tal y
 * como `validator.isFloat` aceptaba antes. No se aceptan espacios externos,
 * hexadecimales ni cadenas parcialmente numéricas (`0x10`, `12abc`).
 *
 * @param {string|number|undefined} rawValue - Valor del query o interno.
 * @param {string} [key="price"] - Nombre usado en el mensaje HTTP 400.
 * @returns {number|undefined} Precio finito no negativo, o undefined si falta.
 * @throws {AppError} Si el formato no corresponde a un precio.
 */
export function parseShopPrice(rawValue, key = "price") {
  if (rawValue === undefined) return undefined;
  if (
    typeof rawValue !== "number" &&
    (typeof rawValue !== "string" ||
      !rawValue ||
      !floatValuePattern.test(rawValue))
  ) {
    throw new AppError(`${key} must be a finite non-negative number`, 400);
  }

  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(`${key} must be a finite non-negative number`, 400);
  }
  return value;
}

/**
 * Convierte un parámetro entero usando la misma gramática que la ruta HTTP.
 *
 * Se conserva el formato histórico de `validator.isInt`: signo opcional y
 * ceros iniciales, pero sin decimales ni notación científica.
 *
 * @param {string|number|undefined} rawValue - Valor del query o interno.
 * @param {string} key - Nombre del parámetro para el mensaje HTTP 400.
 * @param {number} minimum - Mínimo permitido.
 * @param {number} maximum - Máximo permitido.
 * @param {number|undefined} fallback - Default cuando el parámetro no existe.
 * @returns {number} Entero validado.
 * @throws {AppError} Si el formato, seguridad o rango no son válidos.
 */
export function parseShopInteger(rawValue, key, minimum, maximum, fallback) {
  if (rawValue === undefined) return fallback;
  if (
    (typeof rawValue === "string" && !integerValuePattern.test(rawValue)) ||
    (typeof rawValue !== "string" && typeof rawValue !== "number")
  ) {
    throw new AppError(`${key} must be a non-negative integer`, 400);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new AppError(`${key} must be between ${minimum} and ${maximum}`, 400);
  }
  return value;
}

/**
 * Normaliza search para que ruta y servicio compartan longitud y semántica.
 *
 * @param {string|undefined} value - Texto original de búsqueda.
 * @returns {string} Texto con trim, sin diacríticos y en minúsculas.
 * @throws {AppError} HTTP 400 si no es texto o supera 100 caracteres.
 */
export function parseShopSearch(value) {
  if (value === undefined) return "";
  if (typeof value !== "string") {
    throw new AppError("search must be a string", 400);
  }
  const trimmed = value.trim();
  if ([...trimmed].length > 100) {
    throw new AppError("search must be at most 100 characters", 400);
  }
  return normalizeCatalogSearchText(trimmed);
}

/**
 * Comprueba que dos límites de precio opcionales formen un rango coherente.
 *
 * @param {number|undefined} minPrice - Límite inclusivo inferior ya parseado.
 * @param {number|undefined} maxPrice - Límite inclusivo superior ya parseado.
 * @returns {true} Valor útil para validadores Express.
 * @throws {AppError} Si el mínimo supera al máximo.
 */
export function assertShopPriceRange(minPrice, maxPrice) {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError("minPrice cannot be greater than maxPrice", 400);
  }
  return true;
}

/**
 * Valida y normaliza todos los parámetros de GET /shop/services.
 *
 * Nunca devuelve objetos enviados por el cliente para utilizarlos directamente
 * en MongoDB. Los valores quedan reducidos a arrays, números y enums conocidos.
 *
 * @param {Object} query - `req.query` sin parsear de Express.
 * @returns {{categories:string[],search:string,minPrice?:number,maxPrice?:number,sort:string,limit:number,offset:number}}
 *   Filtros seguros con valores predeterminados.
 * @throws {AppError} HTTP 400 para tipos, rangos o parámetros desconocidos.
 */
export function parseShopListFilters(query) {
  assertQueryObject(query, LIST_QUERY_KEYS);
  const categories = parseShopCategories(readSingleString(query, "categories"));
  const search = parseShopSearch(readSingleString(query, "search"));
  const minPrice = parseShopPrice(query.minPrice, "minPrice");
  const maxPrice = parseShopPrice(query.maxPrice, "maxPrice");
  const sort = readSingleString(query, "sort") ?? "name-asc";

  if (!allowedSorts.has(sort)) {
    throw new AppError("sort must be name-asc, name-desc, price-asc or price-desc", 400);
  }
  assertShopPriceRange(minPrice, maxPrice);

  return {
    categories,
    search,
    minPrice,
    maxPrice,
    sort,
    limit: parseShopInteger(query.limit, "limit", 1, 50, 12),
    offset: parseShopInteger(query.offset, "offset", 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

/**
 * Valida los parámetros aceptados por GET /shop/filters.
 *
 * Las opciones adaptativas dependen solo de categorías y búsqueda; precio,
 * orden y paginación no son filtros admitidos en este endpoint.
 *
 * @param {Object} query - `req.query` sin parsear de Express.
 * @returns {{categories:string[],search:string}} Filtros seguros para los límites.
 * @throws {AppError} HTTP 400 para parámetros desconocidos o inválidos.
 */
export function parseShopFilterOptions(query) {
  assertQueryObject(query, FILTER_QUERY_KEYS);
  return {
    categories: parseShopCategories(readSingleString(query, "categories")),
    search: parseShopSearch(readSingleString(query, "search")),
  };
}