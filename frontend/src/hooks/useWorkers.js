import { useCallback, useState } from "react";

import * as workerService from "@/services/workerService";
import { showApiErrorAlert } from "@/utils/errorHandler";

export function useWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // El listado incluye los estados administrativos para filtrarlos en la pantalla.
  const loadWorkers = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");

    try {
      const result = await workerService.getWorkers(params);
      setWorkers(result);
      return result;
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkerById = useCallback(async (id) => {
    setLoading(true);
    setError("");

    try {
      return await workerService.getWorkerById(id);
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cambia el estado local solo después de que la API confirme la operación.
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

  const createWorker = useCallback(
    (data) =>
      runMutation(() => workerService.createWorker(data), (created) => {
        setWorkers((current) => [created, ...current]);
      }),
    [runMutation],
  );

  const updateWorker = useCallback(
    (id, data) =>
      runMutation(() => workerService.updateWorker(id, data), (updated) => {
        setWorkers((current) =>
          current.map((worker) => (worker._id === id ? updated : worker)),
        );
      }),
    [runMutation],
  );

  const changeWorkerActive = useCallback(
    (id, active) =>
      runMutation(
        () => workerService.changeWorkerActive(id, active),
        (updated) =>
          setWorkers((current) =>
            current.map((worker) => (worker._id === id ? updated : worker)),
          ),
      ),
    [runMutation],
  );

  const deleteWorker = useCallback(
    (id) =>
      runMutation(async () => {
        await workerService.deleteWorker(id);
        return { id, deletedAt: new Date().toISOString() };
      }, ({ id: deletedId, deletedAt }) => {
        setWorkers((current) =>
          current.map((worker) =>
            worker._id === deletedId
              ? { ...worker, deletedAt, active: false }
              : worker,
          ),
        );
      }),
    [runMutation],
  );

  const restoreWorker = useCallback(
    (id) =>
      runMutation(() => workerService.restoreWorker(id), (restored) => {
        setWorkers((current) =>
          current.map((worker) => (worker._id === id ? restored : worker)),
        );
      }),
    [runMutation],
  );

  return {
    workers,
    loading,
    error,
    submitting,
    loadWorkers,
    getWorkerById,
    createWorker,
    updateWorker,
    changeWorkerActive,
    deleteWorker,
    restoreWorker,
  };
}