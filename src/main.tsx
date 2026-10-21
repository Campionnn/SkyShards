import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { pruneUnknownStorageKeys } from "./utilities";

/**
 * GitHub Pages serves public/404.html for deep links; it stashes the requested path and
 * bounces to "/". Put the original path back and let the (already created) router see it.
 */
const restoreRedirectedPath = () => {
  const target = sessionStorage.getItem("pathToRedirect");
  sessionStorage.removeItem("pathToRedirect");
  if (!target || target === window.location.pathname + window.location.search + window.location.hash) return;
  window.history.replaceState(null, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

pruneUnknownStorageKeys();
restoreRedirectedPath();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
