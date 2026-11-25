import { useEffect, useState } from "react";

import { getHomeCategories } from "@/services/homeService";

export function useHomeCategories() {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignora también las respuestas tardías al desmontar o reintentar.
    const controller = new AbortController();
    setStatus("loading");
    setError("");

    getHomeCategories(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCategories(result);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError?.message || "No se pudieron cargar las categorías.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [attempt]);

  return { categories, status, error, retry: () => setAttempt((value) => value + 1) };
}