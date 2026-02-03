import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppWithRedirect } from "./components/AppWithRedirect";

// Clean up legacy/unused localStorage keys
const VALID_KEYS = [
  "calculator_data",
  "calculator_save_enabled",
  "customRates",
  "skyshards_profile_type",
  "greenhouse_modal_seen"
];
function cleanupLocalStorage() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && !VALID_KEYS.includes(key)) {
      localStorage.removeItem(key);
    }
  }
}
cleanupLocalStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWithRedirect />
  </StrictMode>
);
