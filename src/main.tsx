import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { pruneUnknownStorageKeys } from "./utilities";

// Deep links (/recipes, /shards, ...) are served directly as dist/<route>.html (see
// vite.config.ts), so the URL the app boots on is already the page's real URL.
pruneUnknownStorageKeys();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
