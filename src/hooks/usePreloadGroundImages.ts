import { useEffect } from "react";
import { getGroundImagePath } from "../types/greenhouse";

/**
 * List of all ground types used in the game
 */
const GROUND_TYPES = [
  "farmland",
  "mycelium",
  "netherrack",
  "sand",
  "soul_sand",
  "end_stone",
];

/**
 * Hook to preload ground texture images on app mount
 * This prevents delayed loading when placing crops
 */
export const usePreloadGroundImages = () => {
  useEffect(() => {
    // Preload all ground images
    GROUND_TYPES.forEach((groundType) => {
      const img = new Image();
      img.src = getGroundImagePath(groundType);
    });
  }, []);
};
