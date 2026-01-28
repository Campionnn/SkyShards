// Design encoding/decoding utilities for sharing greenhouse designs
// Uses grid-based encoding + deflate compression + URL-safe base64 for compact shareable strings
//
// Format (compact with predefined IDs):
// - String format: "inputIndices|targetIndices|grid"
// - Unified index encoding for both inputs and targets:
//   - Indices 0-16 = CROP_IDS (basic crops)
//   - Indices 17-56 = MUTATION_IDS with offset (idx - 17 = mutation index 0-39)
//   - This allows mutations to be used as inputs for higher-tier mutations
// - Grid: 100 or 200 chars (single/double char mode)
// - Requires CROP_IDS and MUTATION_IDS to be defined in cropMapping.ts
//
// This format is highly compressible due to repeated characters in the grid.

import { deflateRaw, inflateRaw } from "pako";
import { CROP_IDS, MUTATION_IDS, CROP_TO_INDEX, MUTATION_TO_INDEX } from "../constants/cropMapping";

// =============================================================================
// Constants
// =============================================================================

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Character set for encoding (letters only - case distinguishes input vs target)
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const MAX_SINGLE_CROPS = 26; // a-z
const MAX_DOUBLE_CROPS = 26 * 26; // aa-zz = 676

// =============================================================================
// Character encoding helpers
// =============================================================================

/**
 * Converts an index to a two-character code (aa, ab, ac, ... zz)
 */
function indexToDouble(idx: number): string {
  const first = LETTERS[Math.floor(idx / LETTERS.length)];
  const second = LETTERS[idx % LETTERS.length];
  return first + second;
}

/**
 * Converts a two-character code back to an index
 */
function doubleToIndex(chars: string): number {
  const firstIdx = LETTERS.indexOf(chars[0].toLowerCase());
  const secondIdx = LETTERS.indexOf(chars[1].toLowerCase());
  if (firstIdx === -1 || secondIdx === -1) return -1;
  return firstIdx * LETTERS.length + secondIdx;
}

// =============================================================================
// URL-safe Base64 helpers
// =============================================================================

function toUrlSafeBase64(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafeBase64(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Grid encoding helpers
// =============================================================================

interface GroupedPlacements {
  [cropId: string]: number[]; // positions as flat indices (row * 10 + col)
}

function groupPlacements(
  placements: Array<{ cropId: string; position: [number, number] }>
): GroupedPlacements {
  const grouped: GroupedPlacements = {};
  for (const p of placements) {
    if (!grouped[p.cropId]) grouped[p.cropId] = [];
    grouped[p.cropId].push(p.position[0] * GRID_SIZE + p.position[1]);
  }
  return grouped;
}

function encodeGridString(
  inputs: GroupedPlacements,
  targets: GroupedPlacements
): string {
  const inputCrops = Object.keys(inputs);
  const targetCrops = Object.keys(targets);

  // Get indices of used crops/mutations from the predefined lists
  // For inputs, check both CROP_IDS and MUTATION_IDS (mutations can be inputs for higher-tier mutations)
  // Encode as: crop index (0-16) or (17 + mutation index) for mutations
  const inputIndices: number[] = [];
  const inputCropsList: string[] = [];
  
  for (const cropId of inputCrops) {
    let idx = CROP_TO_INDEX[cropId];
    if (idx !== undefined) {
      inputIndices.push(idx);
      inputCropsList.push(cropId);
    } else {
      // Check if it's a mutation being used as an input
      idx = MUTATION_TO_INDEX[cropId];
      if (idx !== undefined) {
        // Offset by number of crops to distinguish from regular crops
        inputIndices.push(CROP_IDS.length + idx);
        inputCropsList.push(cropId);
      }
    }
  }

  // For targets, use the same unified index scheme
  const targetIndices: number[] = [];
  const targetCropsList: string[] = [];
  
  for (const mutationId of targetCrops) {
    const idx = MUTATION_TO_INDEX[mutationId];
    if (idx !== undefined) {
      // Use offset scheme: 17 + mutation index
      targetIndices.push(CROP_IDS.length + idx);
      targetCropsList.push(mutationId);
    }
  }

  // Validate crop counts
  if (inputCropsList.length > MAX_DOUBLE_CROPS) {
    throw new Error(`Too many input crops: ${inputCropsList.length} (max ${MAX_DOUBLE_CROPS})`);
  }
  if (targetCropsList.length > MAX_DOUBLE_CROPS) {
    throw new Error(`Too many target crops: ${targetCropsList.length} (max ${MAX_DOUBLE_CROPS})`);
  }

  // Use double mode if either category exceeds single-char limit
  const useDouble = inputCropsList.length > MAX_SINGLE_CROPS || targetCropsList.length > MAX_SINGLE_CROPS;
  const emptyChar = useDouble ? ".." : ".";

  // Build grid using local indices (order in the used lists)
  const grid = new Array<string>(TOTAL_CELLS).fill(emptyChar);

  // Assign characters to input crops (lowercase)
  inputCropsList.forEach((crop, localIdx) => {
    const chars = useDouble ? indexToDouble(localIdx) : LETTERS[localIdx];
    for (const pos of inputs[crop]) {
      grid[pos] = chars;
    }
  });

  // Assign characters to target crops (uppercase)
  targetCropsList.forEach((mutation, localIdx) => {
    const chars = useDouble ? indexToDouble(localIdx).toUpperCase() : LETTERS[localIdx].toUpperCase();
    for (const pos of targets[mutation]) {
      grid[pos] = chars;
    }
  });

  // Format: inputIndices|targetIndices|grid
  // Indices are base36-encoded (0-9a-z) separated by commas to avoid ambiguity
  const inputIdx = inputIndices.map((i) => i.toString(36)).join(",");
  const targetIdx = targetIndices.map((i) => i.toString(36)).join(",");
  return inputIdx + "|" + targetIdx + "|" + grid.join("");
}

function decodeGridString(str: string): {
  inputs: GroupedPlacements;
  targets: GroupedPlacements;
} {
  const parts = str.split("|");
  if (parts.length !== 3) {
    throw new Error("Invalid format: expected 3 parts separated by pipes");
  }

  const [inputIdxStr, targetIdxStr, gridStr] = parts;

  // Parse indices (base36, comma-separated)
  const inputIndices = inputIdxStr ? inputIdxStr.split(",").map((c) => parseInt(c, 36)) : [];
  const targetIndices = targetIdxStr ? targetIdxStr.split(",").map((c) => parseInt(c, 36)) : [];

  // Map indices to crop/mutation IDs
  // Indices 0-16 are crops, 17+ are mutations (offset by CROP_IDS.length)
  const inputCrops = inputIndices.map((idx) => {
    if (idx < CROP_IDS.length) {
      return CROP_IDS[idx];
    } else {
      return MUTATION_IDS[idx - CROP_IDS.length];
    }
  }).filter(Boolean);
  
  const targetCrops = targetIndices.map((idx) => {
    // Use unified index scheme (0-16 = crops, 17+ = mutations with offset)
    if (idx < CROP_IDS.length) {
      return CROP_IDS[idx];
    } else {
      return MUTATION_IDS[idx - CROP_IDS.length];
    }
  }).filter(Boolean);

  // Detect mode from grid length: 100 = single, 200 = double
  const useDouble = gridStr.length === TOTAL_CELLS * 2;
  const charWidth = useDouble ? 2 : 1;
  const expectedGridLength = TOTAL_CELLS * charWidth;

  if (gridStr.length !== expectedGridLength) {
    throw new Error(`Invalid grid: expected ${TOTAL_CELLS} or ${TOTAL_CELLS * 2} characters, got ${gridStr.length}`);
  }

  const emptyChar = useDouble ? ".." : ".";

  const inputs: GroupedPlacements = {};
  const targets: GroupedPlacements = {};

  // Initialize empty arrays for each crop
  inputCrops.forEach((crop) => {
    inputs[crop] = [];
  });
  targetCrops.forEach((crop) => {
    targets[crop] = [];
  });

  // Parse grid
  for (let pos = 0; pos < TOTAL_CELLS; pos++) {
    const chars = gridStr.slice(pos * charWidth, (pos + 1) * charWidth);
    if (chars === emptyChar) continue;

    // All uppercase = target, all lowercase = input
    const isTarget = chars === chars.toUpperCase() && chars !== chars.toLowerCase();
    const isInput = chars === chars.toLowerCase() && chars !== chars.toUpperCase();

    if (!isTarget && !isInput) continue;

    let idx: number;
    if (useDouble) {
      idx = doubleToIndex(chars);
    } else {
      idx = LETTERS.indexOf(chars.toLowerCase());
    }

    if (idx === -1) continue;

    if (isTarget && idx < targetCrops.length) {
      targets[targetCrops[idx]].push(pos);
    } else if (isInput && idx < inputCrops.length) {
      inputs[inputCrops[idx]].push(pos);
    }
  }

  return { inputs, targets };
}

function ungroupPlacements(
  grouped: GroupedPlacements
): Array<{ cropId: string; position: [number, number] }> {
  const placements: Array<{ cropId: string; position: [number, number] }> = [];
  for (const [cropId, positions] of Object.entries(grouped)) {
    for (const pos of positions) {
      const row = Math.floor(pos / GRID_SIZE);
      const col = pos % GRID_SIZE;
      placements.push({ cropId, position: [row, col] });
    }
  }
  return placements;
}

// =============================================================================
// Encoding
// =============================================================================

/**
 * Encodes a design into a compact URL-safe string for sharing.
 * Uses predefined crop/mutation indices + grid-based encoding + deflate compression + URL-safe base64.
 * Produces highly compact output (~64 chars for typical designs).
 *
 * Supports up to 676 input crops and 676 target crops.
 * Uses single-char mode (smaller) when ≤26 crops per category.
 */
export function encodeDesign(
  inputPlacements: Array<{ cropId: string; position: [number, number] }>,
  targetPlacements: Array<{ cropId: string; position: [number, number] }>
): string {
  // Group placements by crop
  const inputs = groupPlacements(inputPlacements);
  const targets = groupPlacements(targetPlacements);

  // Encode to grid string format
  const gridString = encodeGridString(inputs, targets);

  // Compress with deflate (max compression)
  const compressed = deflateRaw(gridString, { level: 9 });

  // Convert to URL-safe base64
  return toUrlSafeBase64(compressed);
}

// =============================================================================
// Decoding
// =============================================================================

/**
 * Decodes a compact URL-safe string back into design data.
 * Uses predefined crop/mutation indices from cropMapping.ts.
 * Automatically detects single-char vs double-char mode from grid length.
 */
export function decodeDesign(encoded: string): {
  inputs: Array<{ cropId: string; position: [number, number] }>;
  targets: Array<{ cropId: string; position: [number, number] }>;
} {
  try {
    // Decode from URL-safe base64
    const compressed = fromUrlSafeBase64(encoded);

    // Decompress
    const gridString = inflateRaw(compressed, { to: "string" });

    // Decode grid string
    const { inputs, targets } = decodeGridString(gridString);

    // Convert back to placement arrays
    return {
      inputs: ungroupPlacements(inputs),
      targets: ungroupPlacements(targets),
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to decode design: ${err.message}`);
    }
    throw new Error("Failed to decode design: Invalid format");
  }
}

