// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CropDefinition {
  id: string; // The key used in API and for images (e.g., "wheat", "potato")
  name: string; // Display name (e.g., "Wheat", "Potato")
  size: number;
  priority: number;
  ground: string; // Ground type (farmland, sand, soul_sand, mycelium, netherrack, end_stone)
  growth_stages: number | null;
  positive_buffs: string[];
  negative_buffs: string[];
  isMutation?: boolean;
}

export interface MutationRequirement {
  crop: string; // This is the crop ID (key), not display name
  count: number;
}

export interface MutationDefinition {
  id: string; // The key used in API and for images (e.g., "ashwreath")
  name: string; // Display name (e.g., "Ashwreath")
  size: number;
  ground: string;
  requirements: MutationRequirement[];
  special?: string; // Special spawn conditions
  rarity: string;
  growth_stages: number;
  positive_buffs: string[];
  negative_buffs: string[];
  drops: Record<string, number>;
}

export interface MutationGoal {
  mutation: string;
  maximize: boolean;
  count: number | null;
}

// Lock object for pre-placed crops/mutations
export interface LockDefinition {
  name: string; // Crop/mutation ID
  size: number;
  position: [number, number];
}

export interface SolveRequest {
  cells: [number, number][];
  targets: MutationGoal[];
  priorities?: Record<string, number>;
  locks?: LockDefinition[];
}

// Unified placement/mutation format - uses position/size
export interface CropPlacement {
  crop: string;
  position: [number, number];
  size: number;
  locked?: boolean;
}

export interface MutationResult {
  mutation: string;
  position: [number, number];
  size: number;
}

export interface SolveResponse {
  status: string;
  total_cells_used?: number;
  placements: CropPlacement[];
  mutations: MutationResult[];
  cache_hit?: string;
  solver_approach?: string;
}

// =============================================================================
// Job System Types
// =============================================================================

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface JobProgress {
  phase: string;
  percentage: number | null;
  solutions_found: number;
  best_objective: number | null;
  best_bound: number | null;
  current_activity: string;
  elapsed_seconds: number;
  // Live preview of current best solution
  preview_placements: CropPlacement[] | null;
  preview_mutations: MutationResult[] | null;
  preview_cells_used: number | null;
}

export interface JobSubmitRequest {
  type: "greenhouse" | "greenhouse_expansion";
  params: Record<string, unknown>;
}

export interface JobSubmitResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  progress: JobProgress | null;
  queue_position: number | null;
  result: SolveResponse | null;
  error: string | null;
}

// =============================================================================
// Expansion Types
// =============================================================================

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
  id: string; // The mutation ID (key), used for API calls
  name: string; // Display name for UI
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
// Locked Placements Types
// =============================================================================

export interface LockedPlacement {
  id: string; // Unique ID for React keys and tracking
  crop: string; // Crop/mutation ID (e.g., "pumpkin", "gloomgourd")
  position: [number, number];
  size: number;
  ground: string; // Ground type for rendering texture
}

// Filter categories for crop/mutation list
export type CropFilterCategory =
  | "all"
  | "crops"
  | "mutations"
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

// Selected crop for placement mode
export interface SelectedCropForPlacement {
  id: string;
  name: string;
  size: number;
  ground: string;
}

// =============================================================================
// Image Mapping Helpers
// =============================================================================

// Get crop image path (uses crop ID, not display name)
export function getCropImagePath(cropId: string): string {
  return `/greenhouse/crops/${cropId}.png`;
}

// Get ground texture image path
export function getGroundImagePath(groundType: string): string {
  return `/greenhouse/ground/${groundType}.png`;
}
