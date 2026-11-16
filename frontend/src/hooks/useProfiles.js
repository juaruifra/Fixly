import { useCallback, useState } from "react";

import * as profileService from "@/services/profileService";
import { normalizeAxiosError } from "@/utils/errorHandler";

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfiles(await profileService.getProfiles());
    } catch (requestError) {
      setError(normalizeAxiosError(requestError).message);
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
      return result ?? true;
    } catch (requestError) {
      setError(normalizeAxiosError(requestError).message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // La clave estable permite repetir el alta si se pierde la respuesta HTTP.
  const createProfile = useCallback(
    (data, creationKey) =>
      runMutation(() => profileService.createProfile(data, creationKey), (created) => {
        setProfiles((current) => [created, ...current]);
      }),
    [runMutation],
  );

  // Actualiza la tarjeta local después de que nombre y avatar se hayan guardado.
  const setProfileAvatar = useCallback((id, avatar) => {
    setProfiles((current) =>
      current.map((profile) => profile.id === id ? { ...profile, avatar } : profile),
    );
  }, []);

  const updateProfile = useCallback(
    (id, data) =>
      runMutation(() => profileService.updateProfile(id, data), (updated) => {
        setProfiles((current) =>
          current.map((profile) => (profile.id === id ? updated : profile)),
        );
      }),
    [runMutation],
  );

  const deleteProfile = useCallback(
    (id) =>
      runMutation(async () => {
        await profileService.deleteProfile(id);
        return id;
      }, (deletedId) => {
        setProfiles((current) => current.filter((profile) => profile.id !== deletedId));
      }),
    [runMutation],
  );

  return {
    profiles,
    loading,
    submitting,
    error,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setProfileAvatar,
  };
}