import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const getTitle = () => {
      const path = location.pathname;

      switch (path) {
        case "/":
          return "SkyShards · Calculator";
        case "/recipes":
          return "SkyShards · Recipes";
        case "/shards":
          return "SkyShards · Shards";
        default:
          return "SkyShards · Calculator";
      }
    };

    document.title = getTitle();
  }, [location.pathname]);
};
