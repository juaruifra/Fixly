import axios from "axios";

import { normalizeAxiosError } from "@/utils/errorHandler";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const apiService = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Normaliza errores que ocurren antes de recibir una respuesta del servidor.
apiService.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(normalizeAxiosError(error)),
);

// Devuelve las respuestas sin cambios y usa el mismo formato para los errores HTTP.
apiService.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeAxiosError(error)),
);