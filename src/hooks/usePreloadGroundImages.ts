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
    // Preload all ground images and wait for them to load
    const imagePromises = GROUND_TYPES.map((groundType) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`Failed to preload ground image: ${groundType}`);
          resolve(); // Resolve anyway to not block other images
        };
        img.src = getGroundImagePath(groundType);
      });
    });

    Promise.all(imagePromises).then(() => {});
  }, []);
};
