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

function parsePrice(value) {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!value || !pricePattern.test(value) || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Los precios deben ser números no negativos.");
  }
  return parsed;
}

function parseInteger(value, minimum, maximum, fallback) {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!integerPattern.test(value) || !Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error("La paginación no es válida.");
  }
  return parsed;
}

export function parseShopQuery(params) {
  for (const key of params.keys()) {
    if (!allowedKeys.has(key) || params.getAll(key).length !== 1) {
      throw new Error("La dirección contiene filtros desconocidos o repetidos.");
    }
  }

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

export function buildShopRequestParams(filters, optionsOnly = false) {
  const params = new URLSearchParams();
  if (filters.categories.length) params.set("categories", filters.categories.join(","));
  if (filters.search) params.set("search", filters.search);
  if (!optionsOnly) {
    if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
    params.set("sort", filters.sort);
    params.set("limit", String(filters.limit));
    params.set("offset", String(filters.offset));
  }
  return params;
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