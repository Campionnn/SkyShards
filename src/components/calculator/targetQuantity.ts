import { maxQuantityForRarity } from "../../constants";

/**
 * Default quantity when picking a target shard: what is still needed to max its
 * attribute, or a full max again once it is already maxed.
 */
export const remainingToMax = (rarity: string, owned = 0): number => {
  const max = maxQuantityForRarity(rarity);
  return owned >= max ? max : Math.max(1, max - owned);
};
