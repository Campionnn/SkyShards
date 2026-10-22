import type { AlternativeRecipeOption, Data } from "../../types/types";
import { NAME_AND_FAMILY_FILTER_CONFIG, matchesSearchQuery } from "../../utilities";

export type Alternatives = { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> };

const byCurrentThenTime = (a: AlternativeRecipeOption, b: AlternativeRecipeOption) => {
  if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
  return a.timePerShard - b.timePerShard;
};

/**
 * Drop mirrored recipes (same inputs in either order, same output and time), then group
 * every recipe under whichever of its inputs appears in the most recipes (the left one on a tie).
 */
const regroup = (grouped: Record<string, AlternativeRecipeOption[]>): Record<string, AlternativeRecipeOption[]> => {
  const seen = new Set<string>();
  const deduped = Object.values(grouped)
    .flat()
    .filter((option) => {
      if (!option.recipe) return false;
      const inputs = [...option.recipe.inputs].sort();
      const key = `${inputs[0]}-${inputs[1]}-${option.recipe.outputQuantity}-${option.timePerShard}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const inputCounts: Record<string, number> = {};
  for (const option of deduped) {
    for (const shard of option.recipe!.inputs) inputCounts[shard] = (inputCounts[shard] || 0) + 1;
  }

  const regrouped: Record<string, AlternativeRecipeOption[]> = {};
  for (const option of deduped) {
    const [a, b] = option.recipe!.inputs;
    const key = (inputCounts[a] ?? 0) >= (inputCounts[b] ?? 0) ? a : b;
    (regrouped[key] ??= []).push(option);
  }
  return regrouped;
};

/** Regroup the alternatives and apply the modal's search (which matches either input shard). */
export const processAlternatives = (alternatives: Alternatives, shards: Data["shards"] | undefined, searchQuery: string): Alternatives => {
  if (!alternatives || !shards) return { direct: null, grouped: {} };

  const grouped = regroup(alternatives.grouped);
  const query = searchQuery.trim() ? searchQuery.toLowerCase() : "";
  if (!query) return { direct: alternatives.direct, grouped };

  const filtered: Record<string, AlternativeRecipeOption[]> = {};
  for (const [groupShard, group] of Object.entries(grouped)) {
    const matching = group.filter((option) =>
      option.recipe!.inputs.some((inputId) => !!shards[inputId] && matchesSearchQuery(shards[inputId], query, NAME_AND_FAMILY_FILTER_CONFIG)),
    );
    if (matching.length > 0) filtered[groupShard] = matching;
  }
  // The direct option only survives a search for it by name.
  return { direct: alternatives.direct && "direct collection".includes(query) ? alternatives.direct : null, grouped: filtered };
};

/** Group keys, fastest group (by its best option) first. */
export const sortedGroupKeys = (grouped: Record<string, AlternativeRecipeOption[]>) => {
  const fastest = (key: string) => Math.min(...grouped[key].map((option) => option.timePerShard));
  return Object.keys(grouped).sort((a, b) => fastest(a) - fastest(b));
};

/** A group's options, fastest first; on a tie the current recipe leads. */
export const sortGroup = (group: AlternativeRecipeOption[]) =>
  [...group].sort((a, b) => a.timePerShard - b.timePerShard || (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

/** Recipe partners from the same reptile line are interchangeable, so only the best of each line stays near the top. */
const REPTILE_LINES: Record<string, string[]> = {
  Turtle: ["Shellwise", "Leatherback", "Tortoise", "Megalith"],
  Amphibian: ["Newt", "Salamander", "Lizard king", "Leviathan"],
  Snake: ["Viper", "Python", "King cobra", "Basilisk"],
  Lizard: ["Gecko", "Iguana", "Komodo dragon", "Wyvern"],
  Crocodilian: ["Crocodile", "Alligator", "Caiman", "Tiamat"],
};

const RARITY_ORDER: Record<string, number> = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 };

/**
 * Order of a group's dropdown when not searching: the current recipe first, then by time,
 * except that all but the best option of each reptile line are moved to the bottom.
 * Note the partner here is always the recipe's *second* input.
 */
export const dropdownOrder = (group: AlternativeRecipeOption[], shards: Data["shards"]): AlternativeRecipeOption[] => {
  const reptileLines: Record<string, AlternativeRecipeOption[]> = {};
  const nonReptiles: AlternativeRecipeOption[] = [];

  for (const option of group) {
    if (!option.recipe) continue;
    const partner = shards[option.recipe.inputs[1]];
    if (!partner?.family?.includes("Reptile")) {
      nonReptiles.push(option);
      continue;
    }
    const name = partner.name.toLowerCase();
    const line = Object.keys(REPTILE_LINES).find((key) => REPTILE_LINES[key].some((member) => name.includes(member.toLowerCase()))) ?? "Other";
    (reptileLines[line] ??= []).push(option);
  }

  const partnerRarity = (option: AlternativeRecipeOption) => {
    const rarity = shards[option.recipe!.inputs[1]]?.rarity;
    return rarity ? RARITY_ORDER[rarity] || 999 : undefined;
  };

  const kept: AlternativeRecipeOption[] = [];
  const demoted: AlternativeRecipeOption[] = [];
  for (const options of Object.values(reptileLines)) {
    // Current first, then fastest, then the lower-rarity partner.
    options.sort((a, b) => {
      const order = byCurrentThenTime(a, b);
      if (order !== 0) return order;
      const rarityA = partnerRarity(a);
      const rarityB = partnerRarity(b);
      return rarityA !== undefined && rarityB !== undefined ? rarityA - rarityB : 0;
    });
    kept.push(options[0]);
    demoted.push(...options.slice(1));
  }

  return [...[...nonReptiles, ...kept].sort(byCurrentThenTime), ...demoted.sort(byCurrentThenTime)];
};
