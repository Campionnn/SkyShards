import type {
  DefaultsResponse,
  SolveRequest,
  SolveResponse,
  ExpansionRequest,
  ExpansionResponse,
} from "../types/greenhouse";

// In development, use the Vite proxy to avoid CORS issues
// In production, call the API directly
const API_BASE = import.meta.env.DEV ? "/api" : "https://api.skyshards.com";

export async function getDefaults(): Promise<DefaultsResponse> {
  const response = await fetch(`${API_BASE}/defaults`);
  if (!response.ok) {
    throw new Error(`Failed to fetch defaults: ${response.statusText}`);
  }
  return response.json();
}

export async function solveGreenhouse(request: SolveRequest): Promise<SolveResponse> {
  const response = await fetch(`${API_BASE}/greenhouse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Solver error: ${response.statusText}`);
  }
  
  return response.json();
}

export async function optimizeExpansion(request: ExpansionRequest): Promise<ExpansionResponse> {
  const response = await fetch(`${API_BASE}/greenhouse/expansion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `Expansion optimizer error: ${response.statusText}`);
  }
  
  return response.json();
}
