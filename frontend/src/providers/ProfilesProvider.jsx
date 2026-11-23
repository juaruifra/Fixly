import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import * as profileService from "@/services/profileService";
import { normalizeAxiosError } from "@/utils/errorHandler";
import { useAuth } from "@/providers/AuthProvider";

const ProfilesContext = createContext(null);

export function ProfilesProvider({ children }) {
  const { user, status } = useAuth();
  const userId = String(user?._id ?? user?.id ?? "anonymous");
  const sessionKey = status === "authenticated" ? userId : "anonymous";

  return (
    <ProfilesSession key={sessionKey} user={user} status={status}>
      {children}
    </ProfilesSession>
  );
}

// Cada cuenta tiene su propia instancia para no reutilizar datos tras cambiar de usuario.
function ProfilesSession({ children, user, status }) {
  const userId = user?._id ?? user?.id ?? null;
  const [profiles, setProfiles] = useState([]);
  const [defaultProfileId, setDefaultProfileId] = useState(
    () => user?.defaultProfile ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const inFlightLoad = useRef(null);

  const loadProfiles = useCallback(async () => {
    if (!userId || status !== "authenticated") return null;
    if (inFlightLoad.current?.userId === userId) return inFlightLoad.current.promise;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    const promise = (async () => {
      try {
        const result = await profileService.getProfiles();
        if (currentRequest !== requestId.current) return null;
        setProfiles(result);
        return result;
      } catch (requestError) {
        if (currentRequest !== requestId.current) return null;
        setError(normalizeAxiosError(requestError).message);
        return null;
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    })();
    inFlightLoad.current = { userId, promise };
    try {
      return await promise;
    } finally {
      if (inFlightLoad.current?.promise === promise) inFlightLoad.current = null;
    }
  }, [status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      setProfiles([]);
      setDefaultProfileId(null);
      setError("");
      setLoading(false);
      return;
    }
    void loadProfiles();
  }, [loadProfiles, status, userId]);

  const runMutation = useCallback(async (operation, onSuccess) => {
    const mutationUserId = userId;
    setSubmitting(true);
    setError("");
    try {
      const result = await operation();
      if (!result || mutationUserId !== userId) return null;
      onSuccess?.(result);
      return result;
    } catch (requestError) {
      if (mutationUserId === userId) {
        setError(normalizeAxiosError(requestError).message);
      }
      return null;
    } finally {
      if (mutationUserId === userId) setSubmitting(false);
    }
  }, [userId]);

  const createProfile = useCallback(
    (data, creationKey) =>
      runMutation(() => profileService.createProfile(data, creationKey), (created) => {
        setProfiles((current) => [created, ...current]);
      }),
    [runMutation],
  );

  const updateProfile = useCallback(
    (id, data) =>
      runMutation(() => profileService.updateProfile(id, data), (updated) => {
        setProfiles((current) =>
          current.map((profile) => profile.id === id ? updated : profile),
        );
      }),
    [runMutation],
  );

  const deleteProfile = useCallback(
    (id) =>
      runMutation(async () => {
        await profileService.deleteProfile(id);
        return { id };
      }, ({ id: deletedId }) => {
        setProfiles((current) => current.filter((profile) => profile.id !== deletedId));
        setDefaultProfileId((current) => current === deletedId ? null : current);
      }),
    [runMutation],
  );

  // La selección cambia en pantalla solo después de confirmar el guardado en servidor.
  const selectDefaultProfile = useCallback(async (profileId) => {
    if (profileId === defaultProfileId) return true;
    if (profileId !== null && !profiles.some((profile) => profile.id === profileId)) {
      setError("No se encontró el perfil seleccionado.");
      return false;
    }

    const result = await runMutation(
      () => profileService.setDefaultProfile(profileId),
      (updatedUser) => setDefaultProfileId(updatedUser.defaultProfile),
    );
    return Boolean(result);
  }, [defaultProfileId, profiles, runMutation]);

  // Mantiene la vista previa del sidebar sincronizada tras guardar el avatar.
  const setProfileAvatar = useCallback((id, avatar) => {
    setProfiles((current) =>
      current.map((profile) => profile.id === id ? { ...profile, avatar } : profile),
    );
  }, []);

  return (
    <ProfilesContext.Provider value={{
      profiles,
      defaultProfileId,
      loading,
      submitting,
      error,
      loadProfiles,
      createProfile,
      updateProfile,
      deleteProfile,
      selectDefaultProfile,
      setProfileAvatar,
    }}>
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfilesContext() {
  const context = useContext(ProfilesContext);
  if (!context) throw new Error("useProfiles debe usarse dentro de ProfilesProvider");
  return context;
}