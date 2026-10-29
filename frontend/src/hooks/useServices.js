import { useCallback, useState } from "react";

import { useAppData } from "@/providers/AppProvider";
import * as serviceService from "@/services/serviceService";
import { showApiErrorAlert } from "@/utils/errorHandler";

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function getCategoryId(category) {
  return String(category?._id ?? category ?? "");
}

export function useServices() {
  // El listado vive en AppProvider para que todas las pantallas compartan los cambios.
  const {
    services,
    setServices,
    servicesLoading,
    servicesError,
    loadServices,
    loadCategories,
  } = useAppData();
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getServiceById = useCallback(async (id) => {
    setItemLoading(true);
    setItemError("");

    try {
      return await serviceService.getServiceById(id);
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setItemError(
        getErrorMessage(normalizedError, "No se pudo cargar el servicio."),
      );
      return null;
    } finally {
      setItemLoading(false);
    }
  }, []);

  const runMutation = useCallback(async (operation, onSuccess) => {
    setSubmitting(true);

    try {
      const result = await operation();
      await onSuccess?.(result);
      return result;
    } catch (requestError) {
      await showApiErrorAlert(requestError);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const createService = useCallback(
    (data) =>
      runMutation(
        () => serviceService.createService(data),
        async (created) => {
          setServices((currentServices) => [...currentServices, created]);
          // La nueva relación puede cambiar los contadores de categorías.
          await loadCategories();
        },
      ),
    [loadCategories, runMutation, setServices],
  );

  const updateService = useCallback(
    (id, data) => {
      const currentService = services.find((service) => service._id === id);
      const currentCategoryId = getCategoryId(currentService?.category);
      const nextCategoryId =
        data.category === undefined
          ? currentCategoryId
          : getCategoryId(data.category);
      const categoryChanged = currentCategoryId !== nextCategoryId;

      return runMutation(
        () => serviceService.updateService(id, data),
        async (updated) => {
          setServices((currentServices) =>
            currentServices.map((service) =>
              service._id === id ? updated : service,
            ),
          );
          // Solo recargamos los contadores cuando cambió la categoría asignada.
          if (categoryChanged) await loadCategories();
        },
      );
    },
    [loadCategories, runMutation, services, setServices],
  );

  const deleteService = useCallback(
    (id) =>
      runMutation(async () => {
        await serviceService.deleteService(id);
        return { id, deletedAt: new Date().toISOString() };
      }, ({ id: deletedId, deletedAt }) => {
        setServices((currentServices) =>
          currentServices.map((service) =>
            service._id === deletedId
              ? { ...service, deletedAt, active: false }
              : service,
          ),
        );
      }),
    [runMutation, setServices],
  );

  const restoreService = useCallback(
    (id) =>
      runMutation(() => serviceService.restoreService(id), (restored) => {
        setServices((currentServices) =>
          currentServices.map((service) =>
            service._id === id ? restored : service,
          ),
        );
      }),
    [runMutation, setServices],
  );

  const changeServiceActive = useCallback(
    (id, active) =>
      runMutation(
        () => serviceService.changeServiceActive(id, active),
        (updated) => {
          setServices((currentServices) =>
            currentServices.map((service) =>
              service._id === id ? updated : service,
            ),
          );
        },
      ),
    [runMutation, setServices],
  );

  const changeServiceStatus = useCallback(
    (id, status) =>
      runMutation(
        () => serviceService.changeServiceStatus(id, status),
        (updated) => {
          setServices((currentServices) =>
            currentServices.map((service) =>
              service._id === id ? updated : service,
            ),
          );
        },
      ),
    [runMutation, setServices],
  );

  return {
    services,
    loading: servicesLoading || itemLoading,
    error: itemError || servicesError,
    submitting,
    loadServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    restoreService,
    changeServiceActive,
    changeServiceStatus,
  };
}
