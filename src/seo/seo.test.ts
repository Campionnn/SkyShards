import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS, SITE_ROUTES, buildRedirects, titleForPath } from "./routes";
import { buildNotFoundPage, buildRoutePages, buildSitemap } from "./staticPages";

const template = `<!DOCTYPE html><html><head>
  <title>Home</title>
  <meta name="description" content="site" />
  <meta name="robots" content="index, follow" />
  <meta name="googlebot" content="index, follow" />
  <meta property="og:url" content="https://example.com/" />
  <meta property="og:title" content="site" />
  <link rel="canonical" href="https://example.com/" />
</head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>`;

describe("route pages", () => {
  const pages = buildRoutePages(template, "https://example.com");

  it("writes a page per route except the home page", () => {
    expect(pages.map((p) => p.file)).toEqual(SITE_ROUTES.filter((r) => r.path !== "/").map((r) => `${r.path.slice(1)}.html`));
  });

  it("gives each page its own title, description and canonical URL", () => {
    const recipes = pages.find((p) => p.file === "recipes.html")!;
    expect(recipes.html.match(/<title>/g)).toHaveLength(1);
    expect(recipes.html).toContain("<title>Shard Fusion Recipes | SkyShards</title>");
    expect(recipes.html).toContain('<link rel="canonical" href="https://example.com/recipes" />');
    expect(recipes.html).toContain('<meta property="og:url" content="https://example.com/recipes" />');
    expect(recipes.html).not.toContain('content="site"');
    expect(recipes.html).toContain('<script type="module" src="/assets/app.js"></script>');
  });

  it("marks non-indexed routes noindex", () => {
    expect(pages.find((p) => p.file === "client-privacy-policy.html")!.html).toContain('content="noindex, follow"');
  });
});

describe("routes", () => {
  it("cover every route in App.tsx", () => {
    const app = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");
    const appPaths = [...app.matchAll(/\{ path: "([^"]+)", Page:/g)].map((m) => `/${m[1]}`);
    expect(appPaths.length).toBeGreaterThan(0);
    expect(SITE_ROUTES.map((r) => r.path).sort()).toEqual(["/", ...appPaths].sort());
  });

  it("give titles for the in-app tab", () => {
    expect(titleForPath("/")).toBe("SkyShards · Calculator");
    expect(titleForPath("/recipes/")).toBe("SkyShards · Recipes");
    expect(titleForPath("/nope")).toBe("SkyShards · Calculator");
  });

  it("never redirect a live route", () => {
    const live = new Set(SITE_ROUTES.map((r) => r.path));
    for (const [from] of LEGACY_REDIRECTS) expect(live.has(from), from).toBe(false);
    expect(buildRedirects()).toContain("/smart / 301");
  });
});

describe("404 and sitemap", () => {
  it("makes the 404 page noindex without a canonical URL", () => {
    const html = buildNotFoundPage(template);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("googlebot");
  });

  it("builds a valid sitemap", () => {
    const sitemap = buildSitemap(["https://example.com/", "https://example.com/recipes"], "2026-01-01T00:00:00+00:00");
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemap.match(/<loc>/g)).toHaveLength(2);
  });
});
