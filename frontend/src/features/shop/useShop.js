import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { buildShopRequestParams, parseShopQuery, updateShopQuery } from "@/features/shop/shopQuery";
import { getShopFilters, getShopServices } from "@/services/shopService";

/**
 * Coordina la URL y las dos consultas independientes de Shop List.
 *
 * No recibe parámetros: `useSearchParams` lee los filtros aplicados de la URL,
 * por lo que atrás/adelante restauran ese estado. Los borradores de búsqueda y
 * precio viven en ShopFilters y solo llegan aquí al aplicarse; las categorías,
 * orden y paginación actualizan la URL directamente.
 *
 * @returns {Object} `filters` normalizados o `queryError`; `list` y `options`
 *   contienen estado loading/ready/error, datos o error. También devuelve
 *   `update`, `clear`, `retryList` y `retryOptions` para las acciones de UI.
 */
export function useShop() {
  const [params, setParams] = useSearchParams();
  const [listState, setListState] = useState({ status: "loading" });
  const [optionsState, setOptionsState] = useState({ status: "loading" });
  const [listAttempt, setListAttempt] = useState(0);
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  // Una URL inválida no se corrige sola: el consumidor muestra el error y
  // ofrece limpiar. En ese caso no se construye ninguna clave de petición.
  let filters;
  let queryError = "";
  try {
    filters = parseShopQuery(params);
  } catch (error) {
    queryError = error.message;
  }
  // Las cadenas serializadas tienen igualdad por valor entre renderizados.
  // listKey incluye precio, orden y página; optionsKey solo categoría y texto.
  // Por eso esos otros cambios no disparan `/shop/filters` de nuevo.
  const listKey = filters ? buildShopRequestParams(filters).toString() : null;
  const optionsKey = filters ? buildShopRequestParams(filters, true).toString() : null;

  useEffect(() => {
    if (listKey === null) return;
    // Cada cambio de listKey o reintento inicia `/shop/services`. La limpieza
    // aborta la petición anterior al cambiar filtros o desmontar el componente.
    const controller = new AbortController();
    setListState({ key: listKey, status: "loading" });
    getShopServices(new URLSearchParams(listKey), controller.signal)
      .then((data) => {
        // Aunque una respuesta llegue tarde, la señal impide publicar datos
        // obsoletos. La clave guardada también identifica qué URL los produjo.
        if (!controller.signal.aborted) setListState({ key: listKey, status: "ready", data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setListState({ key: listKey, status: "error", error: error.message });
      });
    return () => controller.abort();
  }, [listKey, listAttempt]);

  useEffect(() => {
    if (optionsKey === null) return;
    // `/shop/filters` depende solo de categoría/búsqueda y de su propio contador
    // de reintentos. Tiene cancelación y estados separados de la lista.
    const controller = new AbortController();
    setOptionsState({ key: optionsKey, status: "loading" });
    getShopFilters(new URLSearchParams(optionsKey), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOptionsState({ key: optionsKey, status: "ready", data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setOptionsState({ key: optionsKey, status: "error", error: error.message });
      });
    return () => controller.abort();
  }, [optionsKey, optionsAttempt]);

  // Actualizar URL conserva parámetros no modificados; updateShopQuery borra
  // offset al cambiar filtros u orden y lo conserva cuando se pagina.
  function update(changes) {
    setParams(updateShopQuery(params, changes));
  }

  return {
    filters,
    queryError,
    // Antes de que se ejecute un nuevo efecto, una respuesta de otra clave se
    // presenta como carga y nunca como resultados de la URL actual.
    list: listState.key === listKey ? listState : { status: "loading" },
    options: optionsState.key === optionsKey ? optionsState : { status: "loading" },
    update,
    clear: () => setParams(new URLSearchParams()),
    // Incrementar cada contador vuelve a ejecutar solo su efecto, incluso si
    // la clave y la URL permanecen iguales.
    retryList: () => setListAttempt((value) => value + 1),
    retryOptions: () => setOptionsAttempt((value) => value + 1),
  };
}