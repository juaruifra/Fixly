import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getCategories } from "@/services/categoryService";
import { getServices } from "@/services/serviceService";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const servicesRequestId = useRef(0);
  const categoriesRequestId = useRef(0);
  const initialLoadStarted = useRef(false);

  // Cada listado tiene su propia carga y error: un fallo no bloquea al otro.
  const loadServices = useCallback(async (params = {}) => {
    const requestId = ++servicesRequestId.current;
    setServicesLoading(true);
    setServicesError("");

    try {
      const result = await getServices(params);
      if (requestId !== servicesRequestId.current) return null;
      setServices(result);
      return result;
    } catch (requestError) {
      if (requestId !== servicesRequestId.current) return null;
      setServicesError(requestError?.message || "No se pudieron cargar los servicios.");
      return null;
    } finally {
      if (requestId === servicesRequestId.current) setServicesLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async (params = {}) => {
    const requestId = ++categoriesRequestId.current;
    setCategoriesLoading(true);
    setCategoriesError("");

    try {
      const result = await getCategories(params);
      if (requestId !== categoriesRequestId.current) return null;
      setCategories(result);
      return result;
    } catch (requestError) {
      if (requestId !== categoriesRequestId.current) return null;
      setCategoriesError(requestError?.message || "No se pudieron cargar las categorías.");
      return null;
    } finally {
      if (requestId === categoriesRequestId.current) setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Evita duplicar la carga inicial cuando StrictMode repite efectos en desarrollo.
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;

    void loadServices();
    void loadCategories();
  }, [loadCategories, loadServices]);

  const value = useMemo(
    () => ({
      services,
      setServices,
      servicesLoading,
      servicesError,
      loadServices,
      categories,
      setCategories,
      categoriesLoading,
      categoriesError,
      loadCategories,
    }),
    [
      services,
      servicesLoading,
      servicesError,
      loadServices,
      categories,
      categoriesLoading,
      categoriesError,
      loadCategories,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData debe utilizarse dentro de AppProvider");
  }
  return context;
}