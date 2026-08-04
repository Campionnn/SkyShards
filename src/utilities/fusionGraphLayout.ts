import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { Data, FusionJson, Recipes } from "../types/types";
import { buildFusionGraph, type FusionEdgeType, type FusionGraph } from "./fusionLines";

// React Flow / dagre layout for the fusion-lines graph: turns the dominance-pruned
// graph from fusionLines.ts into positioned nodes and typed edges for the
// interactive graph page.

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 52;

/** Colors per edge kind. special = family-backbone upgrades, id = cross-family ladders. */
export const EDGE_COLORS: Record<FusionEdgeType, string> = {
  special: "#a855f7", // purple
  id: "#34d399", // emerald
};

export interface ShardNodeData extends Record<string, unknown> {
  shardId: string;
  name: string;
  rarity: string;
  /** Has more than one dominant parent (special or id). */
  shared: boolean;
  /** Participates in at least one special / id edge (used by the edge-type filter). */
  inSpecial: boolean;
  inId: boolean;
  /** Faded because another shard's line is highlighted. */
  dimmed: boolean;
}

export interface FusionEdgeData extends Record<string, unknown> {
  edgeType: FusionEdgeType;
}

/** Which edge kinds the view is currently showing / highlighting along. */
export type EdgeFilter = "both" | "special" | "id";

export type ShardNode = Node<ShardNodeData, "shard">;
export type FusionEdge = Edge<FusionEdgeData>;

/** Convert the raw fusion-data.json shape (recipes nested by output quantity) into
 * the `Data` type consumed by `buildFusionGraph`. Mirrors `CalculationService.buildData`,
 * minus the rate/fortune work the graph never uses. */
export function fusionDataToData(fusionJson: FusionJson, rates?: Record<string, number>): Data {
  const recipes: Recipes = {};
  for (const output in fusionJson.recipes) {
    recipes[output] = [];
    for (const qtyStr in fusionJson.recipes[output]) {
      const outputQuantity = parseInt(qtyStr, 10);
      for (const inputs of fusionJson.recipes[output][qtyStr]) {
        recipes[output].push({ inputs, outputQuantity, isReptile: false });
      }
    }
  }
  const shards: Data["shards"] = fusionJson.shards;
  if (rates) {
    for (const id in shards) shards[id] = { ...shards[id], rate: rates[id] ?? 0 };
  }
  return { recipes, shards };
}

/** The shard's fusion line: its strict ancestors plus strict descendants plus
 * itself. Unlike a weakly-connected component this doesn't zig-zag through
 * siblings, so it stays a readable lineage even though id-fusions link much of
 * the graph together. `filter` limits which edge kinds are followed so the
 * highlight matches what's on screen. Cycle-safe. */
export function getConnectedLine(shardId: string, graph: FusionGraph, filter: EdgeFilter = "both"): Set<string> {
  const fwd: Map<string, Set<string>>[] = [];
  const rev: Map<string, Set<string>>[] = [];
  if (filter !== "id") {
    fwd.push(graph.special);
    rev.push(graph.specialRev);
  }
  if (filter !== "special") {
    fwd.push(graph.id);
    rev.push(graph.idRev);
  }

  const result = new Set<string>([shardId]);
  const walk = (maps: Map<string, Set<string>>[]) => {
    const stack = [shardId];
    while (stack.length > 0) {
      const node = stack.pop()!;
      for (const map of maps) {
        for (const next of map.get(node) ?? []) {
          if (!result.has(next)) {
            result.add(next);
            stack.push(next);
          }
        }
      }
    }
  };
  walk(fwd); // descendants
  walk(rev); // ancestors
  return result;
}

/** Build positioned nodes + typed edges from the fusion graph. Layout runs once via
 * dagre (left-to-right). Returned nodes carry static data only — the page applies
 * `dimmed` per interaction. */
export function buildGraphElements(data: Data, graph: FusionGraph): { nodes: ShardNode[]; edges: FusionEdge[] } {
  // Collect every node id that takes part in a kept edge.
  const ids = new Set<string>();
  const collect = (m: Map<string, Set<string>>) => {
    for (const [from, tos] of m) {
      ids.add(from);
      for (const to of tos) ids.add(to);
    }
  };
  collect(graph.special);
  collect(graph.id);

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 100, marginx: 24, marginy: 24, ranker: "longest-path" });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of ids) g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });

  const edges: FusionEdge[] = [];
  // Special edges get a much higher weight so dagre keeps family chains tight; id
  // edges stay low weight so they bend out of the way instead of dragging members across.
  const addEdges = (m: Map<string, Set<string>>, edgeType: FusionEdgeType) => {
    const weight = edgeType === "special" ? 12 : 1;
    for (const [from, tos] of m) {
      for (const to of tos) {
        g.setEdge(from, to, { weight, minlen: 1 });
        edges.push({
          id: `${edgeType}-${from}-${to}`,
          source: from,
          target: to,
          sourceHandle: "r",
          targetHandle: "l",
          data: { edgeType },
          type: "bezier",
        });
      }
    }
  };
  addEdges(graph.special, "special");
  addEdges(graph.id, "id");

  dagre.layout(g);

  const nodes: ShardNode[] = [];
  for (const id of ids) {
    const pos = g.node(id);
    const shard = data.shards[id];
    nodes.push({
      id,
      type: "shard",
      position: { x: (pos?.x ?? 0) - NODE_WIDTH / 2, y: (pos?.y ?? 0) - NODE_HEIGHT / 2 },
      // `measured` must be set explicitly, or React Flow resets handle bounds on every
      // re-adopt and edge arrows float up-and-left of the node.
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      data: {
        shardId: id,
        name: shard?.name ?? id,
        rarity: shard?.rarity ?? "common",
        shared: (graph.specialRev.get(id)?.size ?? 0) > 1 || (graph.idRev.get(id)?.size ?? 0) > 1,
        inSpecial: graph.special.has(id) || graph.specialRev.has(id),
        inId: graph.id.has(id) || graph.idRev.has(id),
        dimmed: false,
      },
    });
  }

  return { nodes, edges };
}

export { buildFusionGraph };
export type { FusionGraph, FusionEdgeType };
