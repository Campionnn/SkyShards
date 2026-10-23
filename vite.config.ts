import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { SITE_ROUTES, SITE_URL, buildRedirects } from "./src/seo/routes";
import { buildNotFoundPage, buildRoutePages, buildSitemap } from "./src/seo/staticPages";

// Cloudflare Pages serves /x from dist/x.html with a 200 and falls back to dist/404.html
// (with a 404 status) for anything else. So every route gets its own HTML file; otherwise
// Search Console reports 404s and Analytics records every deep link as the home page.
// Writes dist/<route>.html, dist/404.html (noindex app shell), dist/_redirects (old URLs)
// and dist/sitemap.xml, all from src/seo/routes.ts.
const staticPagesPlugin = () => ({
  name: "static-pages",
  apply: "build" as const,
  // writeBundle runs only after a successful write, so a failed build keeps its own error.
  writeBundle(options: { dir?: string }) {
    const dist = options.dir ?? resolve(__dirname, "dist");
    const template = readFileSync(resolve(dist, "index.html"), "utf-8");
    // Hand-written pages in public/ (client-privacy-policy.html, linked for advertisers) win.
    const pages = buildRoutePages(template).filter((page) => !existsSync(resolve(dist, page.file)));
    for (const page of pages) writeFileSync(resolve(dist, page.file), page.html);
    writeFileSync(resolve(dist, "404.html"), buildNotFoundPage(template));
    writeFileSync(resolve(dist, "_redirects"), buildRedirects());
    const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    const urls = SITE_ROUTES.filter((route) => route.indexed).map((route) => `${SITE_URL}${route.path}`);
    writeFileSync(resolve(dist, "sitemap.xml"), buildSitemap(urls, lastmod));
    console.log(`static-pages: wrote ${pages.length} route pages and ${urls.length} sitemap URLs`);
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isGitHubPages = mode === "production" && env.GITHUB_PAGES === "true";

  return {
    // The static pages are for the Cloudflare Pages deploy at skyshards.com, not the /SkyShards/ GitHub Pages build.
    plugins: [react(), tailwindcss(), ...(isGitHubPages ? [] : [staticPagesPlugin()])],
    // GITHUB_PAGES=true builds for the /SkyShards/ project path; the router derives its basename from BASE_URL.
    base: isGitHubPages ? "/SkyShards/" : "/",
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
