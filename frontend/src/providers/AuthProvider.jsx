import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { getCurrentUser, login } from "@/services/authService";

const AuthContext = createContext(null);
const TOKEN_KEY = "fixly-token";
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
  const requestId = useRef(0);

  const signOut = useCallback(() => {
    // Sin revocación en servidor, un JWT emitido puede seguir válido hasta caducar.
    requestId.current += 1;
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSessionError("");
    setStatus("anonymous");
  }, []);

  const restoreSession = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const token = sessionStorage.getItem(TOKEN_KEY);
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
      setUser(currentUser);
      setStatus("authenticated");
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      if (error?.status === 401 || error?.status === 403 || !error?.status && !error?.type) {
        sessionStorage.removeItem(TOKEN_KEY);
        setStatus("anonymous");
      } else {
        // Un fallo de conexión no demuestra que el token haya caducado.
        setSessionError(error?.message || "No se pudo comprobar la sesión.");
        setStatus("unavailable");
      }
    }
  }, []);

  useEffect(() => {
    void restoreSession();
    return () => {
      requestId.current += 1;
    };
  }, [restoreSession]);

  const signIn = useCallback(async (credentials) => {
    const currentRequest = ++requestId.current;
    // Guardamos el token únicamente después de verificar la identidad y el rol.
    const result = await login(credentials);
    if (typeof result?.token !== "string" || !result.token) {
      throw new Error("El servidor no devolvió un token válido.");
    }
    const currentUser = assertAllowedUser(await getCurrentUser(result.token));
    if (currentRequest !== requestId.current) return;
    sessionStorage.setItem(TOKEN_KEY, result.token);
    setUser(currentUser);
    setSessionError("");
    setStatus("authenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, sessionError, signIn, signOut, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  return context;
}