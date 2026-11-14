import axios from "axios";

import { normalizeAxiosError } from "@/utils/errorHandler";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const SESSION_TOKEN_KEY = "fixly-token";
let unauthorizedHandler = null;

export const apiService = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// El contexto se suscribe para cerrar la sesión si el servidor rechaza su token.
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

// Evita enviar el token por accidente a una dirección de otro origen.
function isApiOrigin(config) {
  const origin = globalThis.location?.origin || "http://localhost";
  const apiUrl = new URL(config.baseURL || baseURL, origin);
  const requestUrl = new URL(config.url || "", apiUrl);
  return apiUrl.origin === requestUrl.origin;
}

// El token se adjunta una sola vez, sin reemplazar una autorización explícita.
apiService.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (
      token &&
      isApiOrigin(config) &&
      !["/auth/login", "/auth/register"].includes(config.url) &&
      !config.headers.has("Authorization")
    ) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(normalizeAxiosError(error)),
);

// Un 401 del token actual cierra la sesión; un 403 no indica que haya caducado.
apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const authorization = error.config?.headers?.get?.("Authorization");
    if (
      error.response?.status === 401 &&
      token &&
      authorization === `Bearer ${token}` &&
      isApiOrigin(error.config)
    ) {
      unauthorizedHandler?.();
    }
    return Promise.reject(normalizeAxiosError(error));
  },
);