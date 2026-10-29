import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "@/providers/AppProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppRouter } from "@/routes/AppRouter";

function App() {
  return (
    <BrowserRouter>
      {/* Los providers comparten tema y datos con todas las páginas. */}
      <ThemeProvider defaultTheme="system">
        <AppProvider>
          <AppRouter />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
