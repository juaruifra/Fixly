import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppRouter } from "@/routes/routes";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="system">
        <AppRouter />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
