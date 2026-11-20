import type { ElectionData } from "../../types/hypixelApiTypes";

/**
 * Bazaar sale tax. It is 1.25 %, lowered by 0.125 % per level of the Bazaar Flipper account
 * upgrade (Elizabeth's Community Shop), and only charged on sales: instant sells and filled
 * sell offers. Derpy's QUAD TAXES!!! perk multiplies it by 4 while he is mayor.
 * https://hypixelskyblock.minecraft.wiki/w/Bazaar
 */
export const TAX_PRESETS = [
  { label: "Base", percent: 1.25, title: "No Bazaar Flipper upgrade: 1.25 %" },
  { label: "Flipper I", percent: 1.125, title: "Bazaar Flipper I (free upgrade from Elizabeth): 1.125 %" },
  { label: "Flipper II", percent: 1, title: "Bazaar Flipper II (100 gems from Elizabeth): 1 %" },
] as const;

/** Multiplier on Bazaar tax from the current mayor or minister (Derpy: ×4). */
export const taxMultiplierFrom = (election: ElectionData | null | undefined): number => {
  const mayor = election?.mayor;
  if (!mayor) return 1;
  const perks = [...(mayor.perks ?? []), ...(mayor.minister?.perk ? [mayor.minister.perk] : [])];
  return perks.some((perk) => /quad\s*tax/i.test(perk.name)) ? 4 : 1;
};

/** Who causes the multiplier, for the label ("Derpy"), or null without one. */
export const taxMultiplierSource = (election: ElectionData | null | undefined): string | null => {
  const mayor = election?.mayor;
  if (!mayor || taxMultiplierFrom(election) === 1) return null;
  return (mayor.perks ?? []).some((perk) => /quad\s*tax/i.test(perk.name)) ? (mayor.name ?? "The mayor") : (mayor.minister?.name ?? "The minister");
};
