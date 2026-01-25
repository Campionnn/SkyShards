// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CropDefinition {
  name: string;
  size: number;
  priority: number;
  ground?: string; // Ground type from API (farmland, sand, soul_sand, mycelium, netherrack, end_stone)
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
  ground?: string; // Ground type from API
}

export interface MutationGoal {
  mutation: string;
  maximize: boolean;
  count: number | null;
}

export interface SolveRequest {
  cells: [number, number][];
  targets: MutationGoal[];
  priorities?: Record<string, number>;
}

// Unified placement/mutation format - uses position/size
export interface CropPlacement {
  crop: string;
  position: [number, number];
  size: number;
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
// Image Mapping Helpers
// =============================================================================

// Get crop image path
export function getCropImagePath(cropName: string): string {
  return `/greenhouse/crops/${cropName}.png`;
}

// Get ground texture image path
export function getGroundImagePath(groundType: string): string {
  return `/greenhouse/ground/${groundType}.png`;
}
