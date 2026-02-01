/**
 * Color mapping for crop/mutation preview in the layout load modal
 * These colors are used ONLY for the mini grid preview to show layout structure
 */

export const CROP_PREVIEW_COLORS: Record<string, string> = {
  // Default colors
  _default_input: '#10b981',      // emerald - for all input crops
  _default_target: '#6b7280',     // gray - for unknown mutations
  
  wheat: '#C2A459',
  potato: '#D9AA51',
  carrot: '#FF8E09',
  pumpkin: '#F3831D',
  melon: '#50BD21',
  cocoa_beans: '#803C11',
  sugar_cane: '#589430',
  cactus: '#527C29',
  nether_wart: '#992126',
  red_mushroom: '#E30C24',
  brown_mushroom: '#9A735D',
  moonflower: '#43EAFD',
  sunflower: '#FFFD49',
  wild_rose: '#C6283A',
  fire: '#C86E02',
  dead_plant: '#67502C',
  fermento: '#8A0037',

  ashwreath: '#282727',
  choconut: '#76582F',
  dustgrain: '#DCBB65',
  gloomgourd: '#D59421',
  lonelily: '#E046AE',
  scourroot: '#65531E',
  shadevine: '#153019',
  veilshroom: '#B28C70',
  witherbloom: '#2A2429',
  chocoberry: '#552F20',
  cindershade: '#C62A1E',
  coalroot: '#171717',
  creambloom: '#DEE3F0',
  duskbloom: '#632E64',
  thornshade: '#378531',
  blastberry: '#E23535',
  cheesebite: '#FFEC4F',
  chloronite: '#2EAB40',
  do_not_eat_shroom: '#008E8F',
  fleshtrap: '#E7956F',
  magic_jellybean: '#FC619E',
  noctilume: '#2D455D',
  snoozling: '#2FA6CE',
  soggybud: '#009CBF',
  chorus_fruit: '#8D638A',
  plantboy_advance: '#BEB2A7',
  puffercloud: '#0EBE29',
  shellfruit: '#2EDDC6',
  startlevine: '#FFE517',
  stoplight_petal: '#259E17',
  thunderling: '#FFFB67',
  turtlellini: '#47BF4A',
  zombud: '#497135',
  all_in_aloe: '#3F8D1F',
  devourer: '#55AB2D',
  glasscorn: '#FED410',
  godseed: '#FFFB67',
  jerryflower: '#B78272',
  phantomleaf: '#00C0ED',
    timestalk: '#36597D',
};

/**
 * Get preview color for a crop/mutation in the grid preview
 * @param cropId - The crop/mutation ID
 * @param isTarget - Whether this is a target mutation (vs input crop)
 * @returns Hex color string
 */
export function getCropPreviewColor(cropId: string, isTarget: boolean = false): string {
  // Check if this crop/mutation has a specific color defined
  if (CROP_PREVIEW_COLORS[cropId]) {
    return CROP_PREVIEW_COLORS[cropId];
  }
  
  // Fallback: targets get gray, inputs get emerald
  return isTarget ? CROP_PREVIEW_COLORS._default_target : CROP_PREVIEW_COLORS._default_input;
}
