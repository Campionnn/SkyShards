import { useEffect } from "react";
import App from "../App";

// Component to handle the redirect from 404.html
export const AppWithRedirect = () => {
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
