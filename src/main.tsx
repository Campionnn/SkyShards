import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Handle redirect from 404.html
const pathToRedirect = sessionStorage.getItem('pathToRedirect');
if (pathToRedirect) {
  sessionStorage.removeItem('pathToRedirect');
  history.replaceState(null, '', pathToRedirect);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
