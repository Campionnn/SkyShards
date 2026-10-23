// Build-time HTML for each route: the app shell (dist/index.html) with the
// route's own title, description and canonical URL. Pure string work; the
// file I/O is in vite.config.ts.

import { SITE_ROUTES, SITE_URL } from "./routes";

export interface StaticPage {
  /** Path inside dist/, e.g. "recipes.html". */
  file: string;
  url: string;
  html: string;
}

/** dist/<route>.html for every route except "/" (that is index.html itself). */
export function buildRoutePages(template: string, siteUrl: string = SITE_URL): StaticPage[] {
  return SITE_ROUTES.filter((route) => route.path !== "/").map((route) => {
    const url = `${siteUrl}${route.path}`;
    let html = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(route.title)}</title>`);
    html = setMeta(html, "name", "description", route.description);
    html = setMeta(html, "property", "og:url", url);
    html = setMeta(html, "property", "og:title", route.title);
    html = setMeta(html, "property", "og:description", route.description);
    html = setMeta(html, "property", "twitter:url", url);
    html = setMeta(html, "property", "twitter:title", route.title);
    html = setMeta(html, "property", "twitter:description", route.description);
    html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, () => `<link rel="canonical" href="${escapeAttr(url)}" />`);
    if (!route.indexed) html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex, follow" />');
    return { file: `${route.path.slice(1)}.html`, url, html };
  });
}

/**
 * dist/404.html: the app shell (it redirects unknown paths to "/"), but marked
 * noindex and without a canonical URL so a 404 is never reported as a copy of
 * the home page.
 */
export function buildNotFoundPage(template: string): string {
  let html = template.replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, "");
  html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex" />');
  html = html.replace(/\s*<meta name="googlebot" content="[^"]*"\s*\/?>/, "");
  return html;
}

export function buildSitemap(urls: string[], lastmod: string): string {
  const entries = urls.map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}</urlset>\n`;
}

function setMeta(html: string, attr: "name" | "property", key: string, value: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\s+${attr}="${escapedKey}"\\s+content="[^"]*"\\s*\\/?>`);
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace(/<\/head>/, `  ${tag}\n  </head>`);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
