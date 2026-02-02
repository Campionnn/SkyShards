import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { writeFileSync, readFileSync } from "fs";

const isProd = process.env.NODE_ENV === "production";
const isGitHubPages = process.env.GITHUB_PAGES === "true";

// Plugin to copy index.html to 404.html for SPA routing on Cloudflare Pages
const copy404Plugin = () => ({
  name: "copy-404",
  closeBundle() {
    const distPath = resolve(__dirname, "dist");
    const indexPath = resolve(distPath, "index.html");
    const notFoundPath = resolve(distPath, "404.html");
    
    try {
      const indexContent = readFileSync(indexPath, "utf-8");
      writeFileSync(notFoundPath, indexContent);
    } catch (err) {
      console.warn("Could not copy 404.html:", err);
    }
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copy404Plugin()],
  base: isProd && isGitHubPages ? "/SkyShards/" : "/",
  server: {
    proxy: {
      // Proxy API requests in development to avoid CORS issues
      "/api": {
        target: "https://api.skyshards.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          icons: ["lucide-react"],
        },
      },
    },
    target: "es2015",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
});
