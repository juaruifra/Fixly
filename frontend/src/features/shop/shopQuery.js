export const SHOP_SORT_OPTIONS = [
  { value: "name-asc", label: "Nombre: A a Z" },
  { value: "name-desc", label: "Nombre: Z a A" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
];

const allowedKeys = new Set(["categories", "search", "minPrice", "maxPrice", "sort", "limit", "offset"]);
const slugPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const pricePattern = /^[+-]?(?:[0-9]+)?(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?$/;
const integerPattern = /^[+-]?[0-9]+$/;

/**
 * Interpreta un precio opcional de la URL sin confundir cero con ausencia.
 * Acepta decimales y exponentes según el contrato del backend; rechaza valores
 * no finitos, negativos o con texto adicional.
 *
 * @param {string|null} value - Texto recibido de URLSearchParams o null.
 * @returns {number|undefined} Importe numérico o undefined si no se envió.
 * @throws {Error} Si el precio no es válido.
 */
function parsePrice(value) {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!value || !pricePattern.test(value) || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Los precios deben ser números no negativos.");
  }
  return parsed;
}

/**
 * Valida un entero seguro dentro del rango permitido para limit u offset.
 *
 * @param {string|null} value - Valor textual de la URL o null si falta.
 * @param {number} minimum - Límite inclusivo inferior.
 * @param {number} maximum - Límite inclusivo superior.
 * @param {number} fallback - Valor predeterminado si no se proporcionó.
 * @returns {number} Entero validado o fallback.
 * @throws {Error} Si el valor no es un entero seguro en el rango.
 */
function parseInteger(value, minimum, maximum, fallback) {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!integerPattern.test(value) || !Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error("La paginación no es válida.");
  }
  return parsed;
}

/**
 * Lee y valida los filtros aplicados en una URL de Shop List.
 * Rechaza claves extra, repetidas y valores inválidos; no modifica la URL.
 * Deduplica slugs CSV y recorta la búsqueda, cuya normalización de acentos y
 * mayúsculas corresponde al backend. Los precios ausentes son undefined.
 *
 * @param {URLSearchParams} params - Parámetros de la dirección actual.
 * @returns {{categories:string[],search:string,minPrice:(number|undefined),maxPrice:(number|undefined),sort:string,limit:number,offset:number}}
 *   Filtros seguros; por defecto sort=name-asc, limit=12 y offset=0.
 * @throws {Error} Si la dirección no respeta el contrato de Shop.
 * @example parseShopQuery(new URLSearchParams("categories=limpieza&minPrice=0"))
 * // Devuelve categories: ["limpieza"], minPrice: 0 y los defaults.
 */
export function parseShopQuery(params) {
  for (const key of params.keys()) {
    if (!allowedKeys.has(key) || params.getAll(key).length !== 1) {
      throw new Error("La dirección contiene filtros desconocidos o repetidos.");
    }
  }

  // El backend acepta un único parámetro CSV; `Set` elimina duplicados sin
  // convertir categorías desconocidas pero sintácticamente válidas en errores.
  const categoryValue = params.get("categories") ?? "";
  const categories = categoryValue.trim() ? categoryValue.split(",").map((slug) => slug.trim()) : [];
  if (categories.some((slug) => !slugPattern.test(slug))) {
    throw new Error("La categoría indicada en la dirección no es válida.");
  }

  const search = (params.get("search") ?? "").trim();
  if ([...search].length > 100) throw new Error("La búsqueda no puede superar 100 caracteres.");
  const minPrice = parsePrice(params.get("minPrice"));
  const maxPrice = parsePrice(params.get("maxPrice"));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new Error("El precio mínimo no puede superar al máximo.");
  }
  const sort = params.get("sort") ?? "name-asc";
  if (!SHOP_SORT_OPTIONS.some((option) => option.value === sort)) {
    throw new Error("La ordenación indicada no es válida.");
  }

  return {
    categories: [...new Set(categories)],
    search,
    minPrice,
    maxPrice,
    sort,
    limit: parseInteger(params.get("limit"), 1, 50, 12),
    offset: parseInteger(params.get("offset"), 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

/**
 * Construye parámetros para las peticiones y sus claves de dependencia.
 * Las categorías se serializan como CSV. El listado incluye precios, sort,
 * limit y offset; las opciones adaptativas solo aceptan categorías y búsqueda.
 *
 * @param {Object} filters - Resultado validado de parseShopQuery.
 * @param {boolean} [optionsOnly=false] - Si es true prepara `/shop/filters`;
 *   si es false prepara `/shop/services`.
 * @returns {URLSearchParams} Parámetros nuevos, sin mutar los filtros.
 * @example buildShopRequestParams(filters, true).toString()
 * // Puede devolver "categories=limpieza&search=hogar".
 */
export function buildShopRequestParams(filters, optionsOnly = false) {
  const params = new URLSearchParams();
  if (filters.categories.length) params.set("categories", filters.categories.join(","));
  if (filters.search) params.set("search", filters.search);
  if (!optionsOnly) {
    // La comparación explícita conserva el precio 0 como límite válido.
    if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
    params.set("sort", filters.sort);
    params.set("limit", String(filters.limit));
    params.set("offset", String(filters.offset));
  }
  return params;
}

/**
 * Copia y actualiza la query sin perder los filtros no modificados.
 * Si no se proporciona `offset`, elimina el anterior para volver a la primera
 * página; al paginar se pasa `offset` explícitamente. Arrays se convierten en
 * CSV y valores vacíos o ausentes eliminan su clave.
 *
 * @param {URLSearchParams} current - Query aplicada antes del cambio.
 * @param {Object} changes - Claves y valores que se quieren sustituir.
 * @returns {URLSearchParams} Nueva query para setSearchParams.
 * @example updateShopQuery(new URLSearchParams("search=hogar&offset=12"), {offset: 24})
 * // Conserva search=hogar y cambia offset a 24.
 */
/**
 * Cuenta los filtros comerciales efectivamente aplicados en Shop List.
 * Las categorías se cuentan individualmente, la búsqueda una sola vez y
 * el rango de precios una vez aunque contenga uno o ambos límites.
 *
 * @param {Object} filters - Filtros normalizados obtenidos de la URL.
 * @param {string[]} filters.categories - Categorías seleccionadas.
 * @param {string} filters.search - Búsqueda aplicada ya normalizada.
 * @param {number|undefined} filters.minPrice - Precio mínimo aplicado.
 * @param {number|undefined} filters.maxPrice - Precio máximo aplicado.
 * @returns {number} Cantidad de filtros activos; cero no cuenta como ausente.
 * @example countAppliedShopFilters({categories:["limpieza","pintura"],search:"hogar",minPrice:0,maxPrice:undefined})
 * // Devuelve 4.
 */
export function countAppliedShopFilters(filters) {
  const categoryCount = filters.categories?.length ?? 0;
  const searchCount = filters.search?.trim() ? 1 : 0;
  const priceCount = filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0;
  return categoryCount + searchCount + priceCount;
}

export function updateShopQuery(current, changes) {
  const next = new URLSearchParams(current);
  if (!Object.hasOwn(changes, "offset")) next.delete("offset");
  for (const [key, value] of Object.entries(changes)) {
    const text = Array.isArray(value) ? value.join(",") : String(value ?? "");
    if (text === "") next.delete(key);
    else next.set(key, text);
  }
  return next;
}