import { useCallback, useState } from "react";

import * as variantService from "@/services/variantService";
import { showApiErrorAlert } from "@/utils/errorHandler";

export function useVariants() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // El listado se carga desde la ruta administrativa que incluye todos los estados.
  const loadVariants = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");

    try {
      const result = await variantService.getVariants(params);
      setVariants(result);
      return result;
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVariantById = useCallback(async (id) => {
    setLoading(true);
    setError("");

    try {
      return await variantService.getVariantById(id);
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualiza el listado local solo cuando el servidor confirma la operación.
  const runMutation = useCallback(async (operation, onSuccess, onError) => {
    setSubmitting(true);
    setError("");

    try {
      const result = await operation();
      onSuccess?.(result);
      return result;
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      onError?.(normalizedError);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const createVariant = useCallback(
    (data, onError) =>
      runMutation(() => variantService.createVariant(data), (created) => {
        setVariants((current) => [created, ...current]);
      }, onError),
    [runMutation],
  );

  const updateVariant = useCallback(
    (id, data) =>
      runMutation(() => variantService.updateVariant(id, data), (updated) => {
        setVariants((current) =>
          current.map((variant) => (variant._id === id ? updated : variant)),
        );
      }),
    [runMutation],
  );

  const changeVariantActive = useCallback(
    (id, active) =>
      runMutation(
        () => variantService.changeVariantActive(id, active),
        (updated) =>
          setVariants((current) =>
            current.map((variant) => (variant._id === id ? updated : variant)),
          ),
      ),
    [runMutation],
  );

  const changeVariantStatus = useCallback(
    (id, status) =>
      runMutation(
        () => variantService.changeVariantStatus(id, status),
        (updated) =>
          setVariants((current) =>
            current.map((variant) => (variant._id === id ? updated : variant)),
          ),
      ),
    [runMutation],
  );

  const deleteVariant = useCallback(
    (id) =>
      runMutation(async () => {
        await variantService.deleteVariant(id);
        return { id, deletedAt: new Date().toISOString() };
      }, ({ id: deletedId, deletedAt }) => {
        setVariants((current) =>
          current.map((variant) =>
            variant._id === deletedId
              ? { ...variant, deletedAt, active: false }
              : variant,
          ),
        );
      }),
    [runMutation],
  );

  const restoreVariant = useCallback(
    (id) =>
      runMutation(() => variantService.restoreVariant(id), (restored) => {
        setVariants((current) =>
          current.map((variant) =>
            variant._id === id ? restored : variant,
          ),
        );
      }),
    [runMutation],
  );

  return {
    variants,
    loading,
    error,
    submitting,
    loadVariants,
    getVariantById,
    createVariant,
    updateVariant,
    changeVariantActive,
    changeVariantStatus,
    deleteVariant,
    restoreVariant,
  };
}