import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ProfilesProvider } from "@/providers/ProfilesProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppRouter } from "@/routes/AppRouter";

function App() {
  return (
    <BrowserRouter>
      {/* La sesión se comprueba antes de cargar las páginas privadas. */}
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          {/* Perfiles disponibles en público y páginas personales sin cargar datos administrativos. */}
          <ProfilesProvider>
            <AppRouter />
          </ProfilesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
