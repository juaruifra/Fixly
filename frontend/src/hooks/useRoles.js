import { useCallback, useState } from "react";

import * as roleService from "@/services/roleService";
import { showApiErrorAlert } from "@/utils/errorHandler";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // El listado administrativo permite filtrar activos y eliminados desde la página.
  const loadRoles = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");

    try {
      const result = await roleService.getRoles(params);
      setRoles(result);
      return result;
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRoleById = useCallback(async (id) => {
    setLoading(true);
    setError("");

    try {
      return await roleService.getRoleById(id);
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualiza el estado compartido de esta pantalla solo tras éxito del servidor.
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

  const createRole = useCallback(
    (data) =>
      runMutation(() => roleService.createRole(data), (created) => {
        setRoles((current) => [created, ...current]);
      }),
    [runMutation],
  );

  const updateRole = useCallback(
    (id, data) =>
      runMutation(() => roleService.updateRole(id, data), (updated) => {
        setRoles((current) =>
          current.map((role) => (role._id === id ? updated : role)),
        );
      }),
    [runMutation],
  );

  const changeRoleActive = useCallback(
    (id, active) =>
      runMutation(
        () => roleService.changeRoleActive(id, active),
        (updated) =>
          setRoles((current) =>
            current.map((role) => (role._id === id ? updated : role)),
          ),
      ),
    [runMutation],
  );

  const deleteRole = useCallback(
    (id) =>
      runMutation(async () => {
        await roleService.deleteRole(id);
        return { id, deletedAt: new Date().toISOString() };
      }, ({ id: deletedId, deletedAt }) => {
        setRoles((current) =>
          current.map((role) =>
            role._id === deletedId
              ? { ...role, deletedAt, active: false }
              : role,
          ),
        );
      }),
    [runMutation],
  );

  const restoreRole = useCallback(
    (id) =>
      runMutation(() => roleService.restoreRole(id), (restored) => {
        setRoles((current) =>
          current.map((role) => (role._id === id ? restored : role)),
        );
      }),
    [runMutation],
  );

  return {
    roles,
    loading,
    error,
    submitting,
    loadRoles,
    getRoleById,
    createRole,
    updateRole,
    changeRoleActive,
    deleteRole,
    restoreRole,
  };
}