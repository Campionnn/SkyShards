import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  // Build output and local design-sync tooling caches.
  globalIgnores(["dist", ".design-sync", ".ds-sync"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs["recommended-latest"], reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // Node-side code: build scripts and tool configs.
    files: ["scripts/**/*.ts", "*.config.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
