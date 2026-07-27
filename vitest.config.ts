import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so the app build config stays untouched: these
// are pure-logic service tests, so none of the app plugins (react, tailwind) are
// needed and skipping them keeps the run fast.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Serves public/*.json to the services' `fetch` calls; see the file for why.
    setupFiles: ["src/test/setup.ts"],
  },
});
