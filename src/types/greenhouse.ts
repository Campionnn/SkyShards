// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CropDefinition {
  name: string;
  size: number;
  priority: number;
  isMutation?: boolean;
}

export interface MutationRequirement {
  crop: string;
  count: number;
}

export interface MutationDefinition {
  name: string;
  size: number;
  requirements: MutationRequirement[];
  requires_zero_adjacent?: boolean;
}

export interface MutationGoal {
  mutation: string;
  maximize: boolean;
  count: number | null;
}

export interface SolveRequest {
  cells: [number, number][];
  targets: MutationGoal[];
}

export interface CropPlacement {
  crop: string;
  cells: [number, number][];
  count: number;
}

export interface MutationResult {
  mutation: string;
  count: number;
  eligible_cells: [number, number][];
}

export interface SolveResponse {
  status: string;
  total_cells_used: number;
  placements: CropPlacement[];
  mutations: MutationResult[];
  cache_hit?: string;
}

export interface ExpansionRequest {
  unlocked_cells: [number, number][];
  locked_cells: [number, number][];
}

export interface ExpansionStep {
  order: number;
  cell: [number, number];
  gloomgourd_potential: number;
  gloomgourd_gain: number;
}

export interface ExpansionResponse {
  steps: ExpansionStep[];
  total_steps: number;
  final_gloomgourd_count: number;
}

export interface DefaultsResponse {
  crops: CropDefinition[];
  mutations: MutationDefinition[];
}

// =============================================================================
// Grid State Types
// =============================================================================

export type CellState = "locked" | "unlocked";

export interface GridCell {
  row: number;
  col: number;
  state: CellState;
}

// =============================================================================
// UI State Types
// =============================================================================

export interface SelectedMutation {
  name: string;
  mode: "maximize" | "target";
  targetCount: number;
}

export interface SolverState {
  isLoading: boolean;
  error: string | null;
  result: SolveResponse | null;
}

export interface ExpansionState {
  isLoading: boolean;
  error: string | null;
  steps: ExpansionStep[];
  showOverlay: boolean;
}

// =============================================================================
// Color Mapping Types
// =============================================================================

export const CROP_COLORS: Record<string, string> = {
  pumpkin: "#ff8c00",
  melon: "#32cd32",
  carrot: "#ff6347",
  wheat: "#f4a460",
  potato: "#deb887",
  cocoa: "#8b4513",
  sugar_cane: "#98fb98",
  cactus: "#228b22",
  nether_wart: "#8b0000",
  mushroom: "#cd853f",
};

// Generate a consistent color for unknown crops based on name
export function getCropColor(cropName: string): string {
  if (CROP_COLORS[cropName]) {
    return CROP_COLORS[cropName];
  }
  // Generate a hue based on the crop name for consistency
  let hash = 0;
  for (let i = 0; i < cropName.length; i++) {
    hash = cropName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
