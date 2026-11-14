import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppRouter } from "@/routes/AppRouter";

function App() {
  return (
    <BrowserRouter>
      {/* La sesión se comprueba antes de cargar las páginas privadas. */}
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
