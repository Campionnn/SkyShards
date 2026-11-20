import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "../seo/routes";

/** Keeps `document.title` as "SkyShards · <page>" for the current route (names live in src/seo/routes.ts). */
export const usePageTitle = (): void => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);
};
