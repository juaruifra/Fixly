import { useEffect, useState } from "react";

import { getShopDetail, getShopVariants } from "@/services/shopDetailService";

export function useShopDetail(slug) {
  const [state, setState] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ slug, status: "loading" });

    // Ambas respuestas deben corresponder al mismo servicio antes de mostrarlas.
    Promise.all([getShopDetail(slug, controller.signal), getShopVariants(slug, controller.signal)])
      .then(([detail, variants]) => {
        if (!controller.signal.aborted) setState({ slug, status: "ready", detail, variants });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ slug, status: error?.status === 404 ? "not-found" : "error", error: error?.message });
        controller.abort();
      });

    return () => controller.abort();
  }, [slug, attempt]);

  return {
    ...(state.slug === slug ? state : { status: "loading" }),
    retry: () => setAttempt((value) => value + 1),
  };
}