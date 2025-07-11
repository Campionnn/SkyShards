import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Component to handle the redirect from 404.html
const AppWithRedirect = () => {
  useEffect(() => {
    // Handle redirect from 404.html - restore the original path
    const pathToRedirect = sessionStorage.getItem("pathToRedirect");
    if (pathToRedirect && pathToRedirect !== window.location.pathname + window.location.search + window.location.hash) {
      sessionStorage.removeItem("pathToRedirect");
      // Navigate to the correct path
      window.history.replaceState(null, "", pathToRedirect);
      // Force a navigation event so React Router picks up the change
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, []);

  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWithRedirect />
  </StrictMode>
);
