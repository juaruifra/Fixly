import { useCallback, useState } from "react";

import * as userService from "@/services/userService";
import { showApiErrorAlert } from "@/utils/errorHandler";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Carga el listado administrativo, incluidos usuarios inactivos y eliminados.
  const loadUsers = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");

    try {
      const result = await userService.getUsers(params);
      setUsers(result);
      return result;
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserById = useCallback(async (id) => {
    setLoading(true);
    setError("");

    try {
      return await userService.getUserById(id);
    } catch (requestError) {
      const normalizedError = await showApiErrorAlert(requestError);
      setError(normalizedError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mantiene el listado sincronizado solo después de confirmar cada operación.
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

  const createUser = useCallback(
    (data) =>
      runMutation(() => userService.createUser(data), (created) => {
        setUsers((current) => [created, ...current]);
      }),
    [runMutation],
  );

  const updateUser = useCallback(
    (id, data) =>
      runMutation(() => userService.updateUser(id, data), (updated) => {
        setUsers((current) =>
          current.map((user) => (user._id === id ? updated : user)),
        );
      }),
    [runMutation],
  );

  const changeUserActive = useCallback(
    (id, active) =>
      runMutation(
        () => userService.changeUserActive(id, active),
        (updated) =>
          setUsers((current) =>
            current.map((user) => (user._id === id ? updated : user)),
          ),
      ),
    [runMutation],
  );

  const deleteUser = useCallback(
    (id) =>
      runMutation(async () => {
        await userService.deleteUser(id);
        return { id, deletedAt: new Date().toISOString() };
      }, ({ id: deletedId, deletedAt }) => {
        setUsers((current) =>
          current.map((user) =>
            user._id === deletedId
              ? { ...user, deletedAt, active: false }
              : user,
          ),
        );
      }),
    [runMutation],
  );

  const restoreUser = useCallback(
    (id) =>
      runMutation(() => userService.restoreUser(id), (restored) => {
        setUsers((current) =>
          current.map((user) => (user._id === id ? restored : user)),
        );
      }),
    [runMutation],
  );

  return {
    users,
    loading,
    error,
    submitting,
    loadUsers,
    getUserById,
    createUser,
    updateUser,
    changeUserActive,
    deleteUser,
    restoreUser,
  };
}