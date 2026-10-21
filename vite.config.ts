import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    // GITHUB_PAGES=true builds for the /SkyShards/ project path; the router derives its basename from BASE_URL.
    base: mode === "production" && env.GITHUB_PAGES === "true" ? "/SkyShards/" : "/",
    server: {
      proxy: {
        // In dev, hypixelService calls /api so the backend needs no CORS setup. Target is set in .env.local.
        "/api": {
          target: env.VITE_API_TARGET || "https://api.skyshards.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            icons: ["lucide-react"],
          },
        },
      },
      target: "es2015",
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
  };
});
