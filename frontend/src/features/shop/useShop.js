import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { buildShopRequestParams, parseShopQuery, updateShopQuery } from "@/features/shop/shopQuery";
import { getShopFilters, getShopServices } from "@/services/shopService";

export function useShop() {
  const [params, setParams] = useSearchParams();
  const [listState, setListState] = useState({ status: "loading" });
  const [optionsState, setOptionsState] = useState({ status: "loading" });
  const [listAttempt, setListAttempt] = useState(0);
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  let filters;
  let queryError = "";
  try {
    filters = parseShopQuery(params);
  } catch (error) {
    queryError = error.message;
  }
  const listKey = filters ? buildShopRequestParams(filters).toString() : null;
  const optionsKey = filters ? buildShopRequestParams(filters, true).toString() : null;

  useEffect(() => {
    if (listKey === null) return;
    const controller = new AbortController();
    setListState({ key: listKey, status: "loading" });
    getShopServices(new URLSearchParams(listKey), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setListState({ key: listKey, status: "ready", data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setListState({ key: listKey, status: "error", error: error.message });
      });
    return () => controller.abort();
  }, [listKey, listAttempt]);

  useEffect(() => {
    if (optionsKey === null) return;
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

  function update(changes) {
    setParams(updateShopQuery(params, changes));
  }

  return {
    filters,
    queryError,
    list: listState.key === listKey ? listState : { status: "loading" },
    options: optionsState.key === optionsKey ? optionsState : { status: "loading" },
    update,
    clear: () => setParams(new URLSearchParams()),
    retryList: () => setListAttempt((value) => value + 1),
    retryOptions: () => setOptionsAttempt((value) => value + 1),
  };
}