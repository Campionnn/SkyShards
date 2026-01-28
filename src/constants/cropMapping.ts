// Predefined crop and mutation IDs for compact encoding
// This allows encoding designs without storing crop names in the encoded string

export const CROP_IDS = [
  "wheat",
  "potato",
  "carrot",
  "pumpkin",
  "melon",
  "cocoa_beans",
  "sugar_cane",
  "cactus",
  "nether_wart",
  "red_mushroom",
  "brown_mushroom",
  "moonflower",
  "sunflower",
  "wild_rose",
  "fire",
  "dead_plant",
  "fermento",
] as const;

export const MUTATION_IDS = [
  "ashwreath",
  "choconut",
  "dustgrain",
  "gloomgourd",
  "lonelily",
  "scourroot",
  "shadevine",
  "veilshroom",
  "witherbloom",
  "chocoberry",
  "cindershade",
  "coalroot",
  "creambloom",
  "duskbloom",
  "thornshade",
  "blastberry",
  "cheesebite",
  "chloronite",
  "do_not_eat_shroom",
  "fleshtrap",
  "magic_jellybean",
  "noctilume",
  "snoozling",
  "soggybud",
  "chorus_fruit",
  "plantboy_advance",
  "puffercloud",
  "shellfruit",
  "startlevine",
  "stoplight_petal",
  "thunderling",
  "turtlellini",
  "zombud",
  "all_in_aloe",
  "devourer",
  "glasscorn",
  "godseed",
  "jerryflower",
  "phantomleaf",
  "timestalk",
] as const;

// Create reverse lookup maps
export const CROP_TO_INDEX: Record<string, number> = {};
CROP_IDS.forEach((id, index) => {
  CROP_TO_INDEX[id] = index;
});

export const MUTATION_TO_INDEX: Record<string, number> = {};
MUTATION_IDS.forEach((id, index) => {
  MUTATION_TO_INDEX[id] = index;
});
