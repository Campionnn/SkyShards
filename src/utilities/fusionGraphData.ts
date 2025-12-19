import type { Node, Edge } from "@xyflow/react";

/**
 * Shard properties from fusion-properties.json
 */
export interface ShardProperty {
  name: string;
  rarity: string;
  category: string;
  family: string[];
  input1: string;
  input2: string;
  id_result: string;
  id_origin: string[];
}

export type ShardProperties = Record<string, ShardProperty>;

/**
 * Custom node data for shard nodes
 */
export interface ShardNodeData {
  label: string;
  shardId: string;
  rarity: string;
  category: string;
  family: string[];
  isHighlighted: boolean;
  isDimmed: boolean;
}

/**
 * Rarity order for layout positioning
 */
const RARITY_ORDER: Record<string, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
};

/**
 * Rarity colors for styling
 */
export const RARITY_COLORS: Record<string, string> = {
  Common: "#ffffff",
  Uncommon: "#4ade80",
  Rare: "#60a5fa",
  Epic: "#c084fc",
  Legendary: "#fbbf24",
};

/**
 * Build graph nodes and edges from fusion properties
 */
export function buildFusionGraph(properties: ShardProperties): {
  nodes: Node<ShardNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<ShardNodeData>[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // Prevent duplicate edges

  // Group shards by rarity for layout
  const shardsByRarity: Record<string, string[]> = {
    Common: [],
    Uncommon: [],
    Rare: [],
    Epic: [],
    Legendary: [],
  };

  // First pass: categorize shards by rarity
  for (const [id, prop] of Object.entries(properties)) {
    const rarity = prop.rarity;
    if (shardsByRarity[rarity]) {
      shardsByRarity[rarity].push(id);
    }
  }

  // Sort each rarity group by ID number for consistent layout
  for (const rarity of Object.keys(shardsByRarity)) {
    shardsByRarity[rarity].sort((a, b) => {
      const aNum = parseInt(a.slice(1));
      const bNum = parseInt(b.slice(1));
      return aNum - bNum;
    });
  }

  // Calculate positions - horizontal layers by rarity
  const LAYER_HEIGHT = 150;
  const NODE_SPACING = 120;
  const START_X = 50;

  // Create nodes with positions
  for (const [rarity, shardIds] of Object.entries(shardsByRarity)) {
    const y = RARITY_ORDER[rarity] * LAYER_HEIGHT + 50;

    shardIds.forEach((id, index) => {
      const prop = properties[id];
      const x = START_X + index * NODE_SPACING;

      nodes.push({
        id,
        type: "shardNode",
        position: { x, y },
        data: {
          label: prop.name,
          shardId: id,
          rarity: prop.rarity,
          category: prop.category,
          family: prop.family,
          isHighlighted: false,
          isDimmed: false,
        },
      });
    });
  }

  // Create edges based on id_result (shard → what it becomes)
  for (const [id, prop] of Object.entries(properties)) {
    if (prop.id_result && prop.id_result !== "") {
      // Find the target shard ID by name
      const targetId = findShardIdByName(properties, prop.id_result);
      if (targetId) {
        const edgeId = `${id}->${targetId}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: id,
            target: targetId,
            type: "smoothstep",
            animated: false,
            style: { stroke: "#64748b", strokeWidth: 2 },
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Find shard ID by name
 */
function findShardIdByName(
  properties: ShardProperties,
  name: string
): string | null {
  for (const [id, prop] of Object.entries(properties)) {
    if (prop.name === name) {
      return id;
    }
  }
  return null;
}

/**
 * Get the complete chain for a shard (ancestors and descendants)
 */
export function getChainIds(
  properties: ShardProperties,
  shardId: string
): Set<string> {
  const chain = new Set<string>();
  chain.add(shardId);

  // Get ancestors (what this shard came from)
  const getAncestors = (id: string) => {
    const prop = properties[id];
    if (!prop) return;

    for (const originName of prop.id_origin) {
      const originId = findShardIdByName(properties, originName);
      if (originId && !chain.has(originId)) {
        chain.add(originId);
        getAncestors(originId);
      }
    }
  };

  // Get descendants (what this shard becomes)
  const getDescendants = (id: string) => {
    const prop = properties[id];
    if (!prop || !prop.id_result) return;

    const resultId = findShardIdByName(properties, prop.id_result);
    if (resultId && !chain.has(resultId)) {
      chain.add(resultId);
      getDescendants(resultId);
    }
  };

  getAncestors(shardId);
  getDescendants(shardId);

  return chain;
}

/**
 * Get edges that are part of a chain
 */
export function getChainEdgeIds(
  edges: Edge[],
  chainNodeIds: Set<string>
): Set<string> {
  const chainEdges = new Set<string>();

  for (const edge of edges) {
    if (chainNodeIds.has(edge.source) && chainNodeIds.has(edge.target)) {
      chainEdges.add(edge.id);
    }
  }

  return chainEdges;
}

/**
 * Get the linear path from a shard to its final form
 */
export function getLinearPath(
  properties: ShardProperties,
  shardId: string
): string[] {
  const path: string[] = [];
  let currentId: string | null = shardId;

  while (currentId) {
    path.push(currentId);
    const prop = properties[currentId];
    if (!prop || !prop.id_result) break;

    currentId = findShardIdByName(properties, prop.id_result);
  }

  return path;
}

/**
 * Get the linear path backwards to origins
 */
export function getOriginPath(
  properties: ShardProperties,
  shardId: string
): string[] {
  const path: string[] = [];

  const traverse = (id: string) => {
    const prop = properties[id];
    if (!prop) return;

    // Get first origin (main path)
    if (prop.id_origin.length > 0) {
      const originId = findShardIdByName(properties, prop.id_origin[0]);
      if (originId) {
        traverse(originId);
      }
    }
    path.push(id);
  };

  traverse(shardId);
  return path;
}

/**
 * Format chain path for display
 */
export function formatChainPath(
  properties: ShardProperties,
  shardIds: string[]
): string {
  return shardIds
    .map((id) => {
      const prop = properties[id];
      return prop ? `${prop.name} (${id})` : id;
    })
    .join(" → ");
}
