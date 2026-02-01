/**
 * Shared style constants to ensure consistency across the application
 */

/**
 * Glow filter for dark crops on farmland background
 * Used for crops like choconut, chocoberry, and dead_plant
 */
export const CROP_IMAGE_GLOW_FILTER = "drop-shadow(0 0 5px rgba(255, 255, 255, 0.7))";

/**
 * Crops that need a white glow when placed on farmland
 * These crops are dark and blend into the farmland texture
 */
export const CROPS_NEEDING_GLOW = ["choconut", "chocoberry", "dead_plant"] as const;

/**
 * Check if a crop needs glow effect on the given ground type
 */
export function needsCropGlow(cropId: string, groundType: string): boolean {
  return CROPS_NEEDING_GLOW.includes(cropId as any) && groundType === "farmland";
}
