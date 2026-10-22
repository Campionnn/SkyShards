import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Page name per route (see App.tsx). Unknown paths redirect to "/", so they fall back to the calculator. */
const PAGE_NAMES: Record<string, string> = {
  "/": "Calculator",
  "/shards": "Shards",
  "/recipes": "Recipes",
  "/fusion-lines": "Fusion Lines",
  "/guide": "Guide",
  "/about": "About",
  "/contact": "Contact",
  "/privacy-policy": "Privacy Policy",
  "/client-privacy-policy": "Client Privacy Policy",
};

/** Keeps `document.title` as "SkyShards · <page>" for the current route. */
export const usePageTitle = (): void => {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    document.title = `SkyShards · ${PAGE_NAMES[path] ?? PAGE_NAMES["/"]}`;
  }, [pathname]);
};
