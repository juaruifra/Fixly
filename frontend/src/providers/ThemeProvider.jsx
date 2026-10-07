import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// Este contexto permitirá consultar y cambiar el tema desde cualquier componente.
const ThemeProviderContext = createContext(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "fixly-theme",
}) {
  // Recuperamos el tema guardado. Si es la primera vez, usamos el del sistema.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;

    // Quitamos el tema anterior antes de aplicar el nuevo.
    root.classList.remove("light", "dark");

    // Si está en "system", usamos el tema claro u oscuro del dispositivo.
    if (theme === "system") {
      const systemTheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    // Si el usuario eligió light o dark, lo aplicamos directamente.
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,

    // Guardamos la elección para mantenerla al volver a abrir Fixly.
    setTheme: (newTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Hook para poder hacer useTheme() desde cualquier componente.
export function useTheme() {
  const context = useContext(ThemeProviderContext);

  // Nos avisa si usamos useTheme() fuera del ThemeProvider por error.
  if (context === undefined) {
    throw new Error(
      "useTheme debe utilizarse dentro de un ThemeProvider"
    );
  }

  return context;
}