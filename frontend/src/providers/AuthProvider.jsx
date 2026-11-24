import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { getCurrentUser, login, logout } from "@/services/authService";
import { onUnauthorized, SESSION_TOKEN_KEY } from "@/services/apiService";

const AuthContext = createContext(null);
const ALLOWED_ROLES = ["ADMIN", "CLIENT"];

// Los permisos provienen de /auth/me, no de los datos del JWT sin verificar.
function assertAllowedUser(user) {
  if (!ALLOWED_ROLES.includes(user?.role?.name)) {
    throw new Error("La cuenta no tiene acceso a esta aplicación.");
  }
  return user;
}

// Conserva el token solo durante la sesión de la pestaña y el usuario en React.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");
  const [sessionError, setSessionError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const requestId = useRef(0);
  const logoutPromise = useRef(null);
  const currentUserId = useRef(null);

  const clearSession = useCallback((expectedToken) => {
    // Una respuesta vieja no debe borrar una sesión nueva iniciada en otra pestaña.
    if (expectedToken && sessionStorage.getItem(SESSION_TOKEN_KEY) !== expectedToken) {
      return false;
    }
    requestId.current += 1;
    currentUserId.current = null;
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setUser(null);
    setSessionError("");
    setStatus("anonymous");
    return true;
  }, []);

  const signOut = useCallback(() => {
    if (logoutPromise.current) return logoutPromise.current;

    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      clearSession();
      return Promise.resolve();
    }

    const logoutRequestId = ++requestId.current;
    let pendingLogout;
    pendingLogout = (async () => {
      setIsLoggingOut(true);
      try {
        // Conservamos el token si no podemos confirmar la revocación para permitir reintentar.
        await logout();
        if (requestId.current === logoutRequestId) clearSession(token);
      } catch (error) {
        if (error?.status === 401) {
          clearSession(token);
          return;
        }
        throw error;
      } finally {
        if (logoutPromise.current === pendingLogout) {
          logoutPromise.current = null;
          setIsLoggingOut(false);
        }
      }
    })();
    logoutPromise.current = pendingLogout;
    return pendingLogout;
  }, [clearSession]);

  const restoreSession = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    currentUserId.current = null;
    setUser(null);
    setSessionError("");

    if (!token) {
      setStatus("anonymous");
      return;
    }

    setStatus("checking");
    try {
      const currentUser = assertAllowedUser(await getCurrentUser(token));
      if (currentRequest !== requestId.current) return;
      currentUserId.current = String(currentUser._id);
      setUser(currentUser);
      setStatus("authenticated");
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      if (error?.status === 401 || error?.status === 403 || !error?.status && !error?.type) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setStatus("anonymous");
      } else {
        // Un fallo de conexión no demuestra que el token haya caducado.
        setSessionError(error?.message || "No se pudo comprobar la sesión.");
        setStatus("unavailable");
      }
    }
  }, []);

  // Ignora respuestas de edición que pertenezcan a una sesión anterior.
  const updateCurrentUser = useCallback((updatedUser, expectedUserId) => {
    const activeUserId = currentUserId.current;
    if (
      !activeUserId ||
      String(expectedUserId) !== activeUserId ||
      String(updatedUser?._id) !== activeUserId
    ) {
      return false;
    }
    setUser(assertAllowedUser(updatedUser));
    return true;
  }, []);

  useEffect(() => {
    void restoreSession();
    return () => {
      requestId.current += 1;
    };
  }, [restoreSession]);

  useEffect(() => onUnauthorized(clearSession), [clearSession]);

  const signIn = useCallback(async (credentials) => {
    const currentRequest = ++requestId.current;
    // Guardamos el token únicamente después de verificar la identidad y el rol.
    const result = await login(credentials);
    if (typeof result?.token !== "string" || !result.token) {
      throw new Error("El servidor no devolvió un token válido.");
    }
    const currentUser = assertAllowedUser(await getCurrentUser(result.token));
    if (currentRequest !== requestId.current) return;
    sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
    currentUserId.current = String(currentUser._id);
    setUser(currentUser);
    setSessionError("");
    setStatus("authenticated");
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      status,
      sessionError,
      isLoggingOut,
      signIn,
      signOut,
      clearSession,
      updateCurrentUser,
      restoreSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  return context;
}