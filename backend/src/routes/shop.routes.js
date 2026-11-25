import { Router } from "express";
import { checkExact, query } from "express-validator";

import { shopController } from "../controllers/shop.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  assertShopPriceRange,
  parseShopCategories,
  parseShopInteger,
  parseShopPrice,
  parseShopSearch,
  SHOP_SORT_VALUES,
} from "../utils/shop-filters.util.js";

const router = Router();

// checkExact ejecuta estas cadenas y marca parámetros no incluidos en la lista.
function parseWithValidator(parser, value) {
  parser(value);
  return true;
}

const listQueryChecks = [
  query("categories")
    .optional()
    .custom((value) => parseWithValidator(parseShopCategories, value))
    .withMessage("categories must contain valid comma-separated slugs"),
  query("search")
    .optional()
    .custom((value) => parseWithValidator(parseShopSearch, value))
    .withMessage("search must be a string of at most 100 characters"),
  query("minPrice")
    .optional()
    .custom((value) => parseWithValidator((raw) => parseShopPrice(raw, "minPrice"), value))
    .withMessage("minPrice must be a finite non-negative number")
    .bail()
    .customSanitizer((value) => parseShopPrice(value, "minPrice")),
  query("maxPrice")
    .optional()
    .custom((value) => parseWithValidator((raw) => parseShopPrice(raw, "maxPrice"), value))
    .withMessage("maxPrice must be a finite non-negative number")
    .bail()
    .custom((maxValue, { req }) => {
      const minPrice = parseShopPrice(req.query.minPrice, "minPrice");
      const maxPrice = parseShopPrice(maxValue, "maxPrice");
      return assertShopPriceRange(minPrice, maxPrice);
    })
    .withMessage("minPrice cannot be greater than maxPrice")
    .bail()
    .customSanitizer((value) => parseShopPrice(value, "maxPrice")),
  query("sort")
    .optional()
    .isIn(SHOP_SORT_VALUES)
    .withMessage(`sort must be one of ${SHOP_SORT_VALUES.join(", ")}`),
  query("limit")
    .optional()
    .custom((value) =>
      parseWithValidator((raw) => parseShopInteger(raw, "limit", 1, 50), value),
    )
    .withMessage("limit must be an integer between 1 and 50")
    .bail()
    .customSanitizer((value) => parseShopInteger(value, "limit", 1, 50)),
  query("offset")
    .optional()
    .custom((value) =>
      parseWithValidator(
        (raw) => parseShopInteger(raw, "offset", 0, Number.MAX_SAFE_INTEGER),
        value,
      ),
    )
    .withMessage("offset must be a non-negative safe integer")
    .bail()
    .customSanitizer((value) =>
      parseShopInteger(value, "offset", 0, Number.MAX_SAFE_INTEGER),
    ),
];

const filterOptionQueryChecks = listQueryChecks.slice(0, 2);
const listValidation = [
  checkExact(listQueryChecks, {
    locations: ["query"],
    message: "Unexpected query parameter",
  }),
  validateRequest,
];
const filterOptionsValidation = [
  checkExact(filterOptionQueryChecks, {
    locations: ["query"],
    message: "Unexpected query parameter",
  }),
  validateRequest,
];

/**
 * @openapi
 * /api/shop/filters:
 *   get:
 *     summary: Obtener categorías y rango adaptativo de precios
 *     description: >-
 *       Endpoint público. Las categorías siempre son globales; el rango min/max
 *       considera categories y search, pero ignora precio, orden y paginación.
 *       Devuelve límites null cuando no hay variantes aplicables.
 *     tags: [Shop]
 *     parameters:
 *       - in: query
 *         name: categories
 *         description: Slugs CSV; OR entre categorías. Se eliminan duplicados.
 *         schema: { type: string, example: "limpieza,carpinteria" }
 *       - in: query
 *         name: search
 *         description: Búsqueda parcial sin distinción de mayúsculas ni acentos, máximo 100 caracteres.
 *         schema: { type: string, maxLength: 100, example: "vivienda" }
 *     responses:
 *       200:
 *         description: Opciones de filtro públicas.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ShopFilterOptions' }
 *             example:
 *               categories:
 *                 - { name: "Limpieza", slug: "limpieza" }
 *               priceRange: { min: 25, max: 125 }
 *       400:
 *         description: Parámetros inválidos o desconocidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { message: "Unexpected query parameter: sort" }
 *       500: { description: Error inesperado }
 */
router.get("/filters", filterOptionsValidation, shopController.getFilterOptions);

/**
 * @openapi
 * /api/shop/services:
 *   get:
 *     summary: Buscar servicios públicos para Shop List
 *     description: >-
 *       OR entre categories y AND entre grupos de filtros. Si el texto coincide
 *       solo con variantes, esa misma variante debe cumplir el rango de precio.
 *       La ordenación se aplica antes de paginar y total cuenta servicios.
 *     tags: [Shop]
 *     parameters:
 *       - in: query
 *         name: categories
 *         description: Slugs separados por comas; OR dentro del grupo.
 *         schema: { type: string, example: "limpieza,carpinteria" }
 *       - in: query
 *         name: search
 *         description: Máximo 100 caracteres; búsqueda parcial sin acentos ni distinción de mayúsculas.
 *         schema: { type: string, maxLength: 100, example: "vivienda" }
 *       - in: query
 *         name: minPrice
 *         description: Límite inclusivo opcional, finito y no negativo.
 *         schema: { type: number, minimum: 0, example: 20 }
 *       - in: query
 *         name: maxPrice
 *         description: Límite inclusivo opcional, finito y no negativo.
 *         schema: { type: number, minimum: 0, example: 100 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name-asc, name-desc, price-asc, price-desc]
 *           default: name-asc
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 12 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Servicios filtrados y paginados.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ShopServicesPage' }
 *             example:
 *               items:
 *                 - name: "Limpieza de hogar"
 *                   slug: "limpieza_de_hogar"
 *                   description: "Limpieza de espacios domésticos."
 *                   category: { name: "Limpieza", slug: "limpieza" }
 *                   image: { url: "https://example.invalid/limpieza.jpg", alt: "Vivienda limpia" }
 *                   priceFrom: 25
 *               total: 1
 *               limit: 12
 *               offset: 0
 *       400:
 *         description: Parámetros inválidos o desconocidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { message: "minPrice cannot be greater than maxPrice" }
 *       500: { description: Error inesperado }
 */
router.get("/services", listValidation, shopController.listServices);

export default router;