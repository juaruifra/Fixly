import { useCallback, useRef, useState } from "react";

import * as serviceService from "@/services/serviceService";
import { showApiErrorAlert } from "@/utils/errorHandler";

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const latestListRequest = useRef(0);

  const loadServices = useCallback(
    async (params = {}, { notifyOnError = true } = {}) => {
      const requestId = latestListRequest.current + 1;
      latestListRequest.current = requestId;
      setLoading(true);
      setError("");

      try {
        const result = await serviceService.getServices(params);
        if (requestId !== latestListRequest.current) return null;

        setServices(result);
        return result;
      } catch (requestError) {
        if (requestId !== latestListRequest.current) return null;

        if (notifyOnError) {
          const normalizedError = await showApiErrorAlert(requestError);
          if (requestId !== latestListRequest.current) return null;
          setError(
            getErrorMessage(
              normalizedError,
              "No se pudieron cargar los servicios.",
            ),
          );
        } else {
          setError(
            getErrorMessage(
              requestError,
              "No se pudieron cargar los servicios.",
            ),
          );
        }

        return null;
      } finally {
        if (requestId === latestListRequest.current) setLoading(false);
      }
    },
    [],
  );

  const getServiceById = useCallback(async (id) => {
    setLoading(true);
    setError("");

    try {
      return await serviceService.getServiceById(id);
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(getErrorMessage(normalizedError, "No se pudo cargar el servicio."));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const runMutation = useCallback(async (operation, onSuccess) => {
    setSubmitting(true);
    setError("");

    try {
      const result = await operation();
      onSuccess?.(result);
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
      runMutation(() => serviceService.createService(data), (created) => {
        setServices((currentServices) => [...currentServices, created]);
      }),
    [runMutation],
  );

  const updateService = useCallback(
    (id, data) =>
      runMutation(() => serviceService.updateService(id, data), (updated) => {
        setServices((currentServices) =>
          currentServices.map((service) =>
            service._id === id ? updated : service,
          ),
        );
      }),
    [runMutation],
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
    [runMutation],
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
    [runMutation],
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
    [runMutation],
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
    [runMutation],
  );

  return {
    services,
    loading,
    error,
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