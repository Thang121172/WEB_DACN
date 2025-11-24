import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { ToastProvider } from "./components/Toast";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
