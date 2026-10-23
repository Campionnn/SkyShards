// Every top-level page of skyshards.com with the title and description it should
// have before the app loads. One source for:
//   - document.title while the app runs (usePageTitle),
//   - the build-time dist/<route>.html files (scripts/static-pages.ts), which
//     Cloudflare Pages serves with a 200 at /<route>. Without them every deep link
//     falls through to 404.html: a 404 for Search Console, and the home page's
//     title and canonical URL for Analytics and link previews.
//
// Pure (no DOM, no React): vite.config.ts imports it.

export interface SiteRoute {
  /** "/" or "/recipes"; no trailing slash. */
  path: string;
  /** Short name used in the in-app title, "SkyShards · <name>". */
  name: string;
  title: string;
  description: string;
  /** Listed in sitemap.xml. */
  indexed: boolean;
}

export const SITE_URL = "https://skyshards.com";

export const SITE_ROUTES: SiteRoute[] = [
  {
    path: "/",
    name: "Calculator",
    title: "SkyShards - Hypixel SkyBlock Fusion Calculator",
    description: "Hypixel SkyBlock fusion calculator. Calculate optimal shard fusion recipes.",
    indexed: true,
  },
  {
    path: "/recipes",
    name: "Recipes",
    title: "Shard Fusion Recipes | SkyShards",
    description: "Every Hypixel SkyBlock shard fusion recipe: what you can make with a shard, and how to make it.",
    indexed: true,
  },
  {
    path: "/shards",
    name: "Shards",
    title: "Shard Overview, Rates and Prices | SkyShards",
    description: "Every Hypixel SkyBlock attribute shard with its rarity, family, collection rate and price.",
    indexed: true,
  },
  {
    path: "/fusion-lines",
    name: "Fusion Lines",
    title: "Shard Fusion Lines | SkyShards",
    description: "An interactive graph of Hypixel SkyBlock shard fusion lines and how shards connect.",
    indexed: true,
  },
  {
    path: "/guide",
    name: "Guide",
    title: "Fusion Calculator Guide | SkyShards",
    description: "How to use the SkyShards fusion calculator to plan your Hypixel SkyBlock shard fusions.",
    indexed: true,
  },
  { path: "/about", name: "About", title: "About | SkyShards", description: "About SkyShards, the Hypixel SkyBlock fusion calculator.", indexed: true },
  { path: "/contact", name: "Contact", title: "Contact | SkyShards", description: "How to contact the SkyShards team.", indexed: true },
  { path: "/privacy-policy", name: "Privacy Policy", title: "Privacy Policy | SkyShards", description: "The SkyShards privacy policy.", indexed: true },
  {
    // Linked from every page for advertisers; same content as /privacy-policy.
    path: "/client-privacy-policy",
    name: "Client Privacy Policy",
    title: "Privacy Policy | SkyShards",
    description: "The SkyShards privacy policy.",
    indexed: false,
  },
];

/** In-app title for the current location; unknown paths redirect to "/". */
export function titleForPath(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const route = SITE_ROUTES.find((r) => r.path === path) ?? SITE_ROUTES[0];
  return `SkyShards · ${route.name}`;
}

/**
 * Cloudflare Pages _redirects: permanent redirects for URLs that used to exist
 * (old sitemaps, removed pages, the old greenhouse pages), so Google drops them
 * instead of reporting them as 404s.
 */
export const LEGACY_REDIRECTS: Array<[from: string, to: string]> = [
  ["/smart", "/"],
  ["/calculator", "/"],
  ["/missing", "/"],
  ["/cost", "/"],
  ["/settings", "/shards"],
  ["/prices", "/shards"],
  ["/shard-prices", "/shards"],
  ["/fusion-guide", "/guide"],
  ["/privacy", "/privacy-policy"],
  ["/designer", "https://greenhouse.skyshards.com/designer"],
  ["/greenhouse", "https://greenhouse.skyshards.com/"],
];

export function buildRedirects(): string {
  const lines = ["# Generated at build time from src/seo/routes.ts. Edit there, not in dist/."];
  for (const [from, to] of LEGACY_REDIRECTS) lines.push(`${from} ${to} 301`);
  return `${lines.join("\n")}\n`;
}
