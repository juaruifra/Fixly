import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";

import { ThemeProvider } from "@/providers/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* El tema envuelve toda la aplicación para que esté disponible en cualquier página. */}
    <ThemeProvider defaultTheme="system">
      {/* BrowserRouter sigue encargándose de la navegación de Fixly. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
