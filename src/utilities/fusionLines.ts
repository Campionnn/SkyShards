import type { Data } from "../types/types";
import { MAX_QUANTITIES } from "../constants";

/**
 * Fusion-graph analysis.
 *
 * Recipes come in three kinds (same classification as recipeUtils.classifyFusion
 * and the SkyShards-Parser script):
 *   - chameleon: an input is "L4" (Chameleon). Ignored entirely.
 *   - special:   outputQuantity === 2. Curated upgrades, mostly same-family.
 *   - id:        everything else. A shard id-fuses into a fixed result with *any*
 *                second shard acting as a throwaway catalyst.
 *
 * Within a family the raw recipe graph is near-complete and bidirectional
 * (Ghost + almost anything -> Sphinx; Sphinx + almost anything -> King Minos),
 * so "X is an input to Y" is meaningless. The signal is DOMINANCE: a meaningful
 * parent appears in a large fraction of an output's recipes (Hellwisp in 364/369
 * of Power Dragon), while catalysts appear ~0.6%. We keep only dominant edges,
 * tagged special vs id. This collapses ~tens-of-thousands of garbage paths to a
 * clean ~222-edge graph that reproduces the canonical lines:
 *   special: Gecko -> Iguana -> Komodo Dragon -> Wyvern
 *   id:      Ghost -> Sphinx -> King Minos,  Hellwisp -> Power Dragon -> Apex Dragon
 *
 * This module is pure (no React / no I/O) so it can be shared by the calculator,
 * the standalone debug script, and a future UI graph view.
 */

export type FusionEdgeType = "special" | "id";

export interface FusionGraph {
  /** special: from -> set of outputs reachable via a dominant special (qty=2) edge. */
  special: Map<string, Set<string>>;
  /** id: from -> set of outputs reachable via a dominant id edge. */
  id: Map<string, Set<string>>;
  /** reverse special: output -> set of dominant special parents. */
  specialRev: Map<string, Set<string>>;
  /** reverse id: output -> set of dominant id parents. */
  idRev: Map<string, Set<string>>;
}

export interface BuildFusionGraphOptions {
  /** Minimum fraction of an output's (per-quantity) recipes an input must appear in. */
  dominanceThreshold?: number;
  /** Minimum raw recipe count an input must appear in (kills tiny-block noise). */
  minCount?: number;
  /**
   * Structural "can this shard ever be obtained directly?" predicate, sourced from
   * the base `rates.json` (rate > 0) — NOT the param-modified per-run rate. When
   * provided, the graph is post-pruned so no remaining root (a node with no incoming
   * edge of *either* type) is directly-unobtainable: a fusion line that starts from a
   * shard you can never acquire is meaningless, so its outgoing edges are dropped.
   * Omit it to skip pruning entirely (backward compatible).
   */
  isDirectlyObtainable?: (id: string) => boolean;
  /**
   * Minimum cost to obtain each shard (from `CalculationService.computeMinCosts`).
   * When provided, an edge `from -> to` is dropped if `minCost(from) > minCost(to)`:
   * a higher-cost shard is never used to make a strictly cheaper one (e.g. Starborn
   * for Blizzard, Inferno Demonlord for Ghost). Such an edge can never lie on an
   * optimal path — the input alone already costs more than the whole output's
   * minimum — so removing it is loss-free. Omit to skip cost pruning.
   */
  minCost?: (id: string) => number;
}

const DEFAULT_DOMINANCE_THRESHOLD = 0.2;
const DEFAULT_MIN_COUNT = 2;
const CHAMELEON_ID = "L4";

const addEdge = (fwd: Map<string, Set<string>>, rev: Map<string, Set<string>>, from: string, to: string) => {
  let f = fwd.get(from);
  if (!f) {
    f = new Set();
    fwd.set(from, f);
  }
  f.add(to);
  let r = rev.get(to);
  if (!r) {
    r = new Set();
    rev.set(to, r);
  }
  r.add(from);
};

/**
 * Build the dominance-pruned, type-tagged fusion graph. Chameleon recipes are
 * excluded. An edge X -> Y (special|id) is added when X appears in at least
 * `dominanceThreshold` of Y's recipes (for that output quantity) and at least
 * `minCount` of them.
 */
export function buildFusionGraph(data: Data, opts: BuildFusionGraphOptions = {}): FusionGraph {
  const threshold = opts.dominanceThreshold ?? DEFAULT_DOMINANCE_THRESHOLD;
  const minCount = opts.minCount ?? DEFAULT_MIN_COUNT;

  const graph: FusionGraph = {
    special: new Map(),
    id: new Map(),
    specialRev: new Map(),
    idRev: new Map(),
  };

  for (const output of Object.keys(data.recipes)) {
    // Group this output's recipes by output quantity (special = qty 2, else id).
    const byQuantity = new Map<number, Recipe[]>();
    for (const recipe of data.recipes[output]) {
      const list = byQuantity.get(recipe.outputQuantity);
      if (list) list.push(recipe);
      else byQuantity.set(recipe.outputQuantity, [recipe]);
    }

    for (const [quantity, recipes] of byQuantity) {
      // Exclude chameleon recipes.
      const usable = recipes.filter((r) => r.inputs[0] !== CHAMELEON_ID && r.inputs[1] !== CHAMELEON_ID);
      if (usable.length === 0) continue;

      const counts = new Map<string, number>();
      for (const recipe of usable) {
        for (const input of recipe.inputs) {
          counts.set(input, (counts.get(input) ?? 0) + 1);
        }
      }

      const type: FusionEdgeType = quantity === 2 ? "special" : "id";
      const fwd = type === "special" ? graph.special : graph.id;
      const rev = type === "special" ? graph.specialRev : graph.idRev;

      for (const [input, count] of counts) {
        if (input === output) continue;
        if (count < minCount) continue;
        if (count / usable.length < threshold) continue;
        addEdge(fwd, rev, input, output);
      }
    }
  }

  // Cost pruning first: dropping a backwards (expensive -> cheap) edge can orphan its
  // target into a dead rate-0 root, which the obtainability cascade then cleans up.
  if (opts.minCost) pruneHigherCostEdges(graph, opts.minCost);
  if (opts.isDirectlyObtainable) pruneUnobtainableRoots(graph, opts.isDirectlyObtainable);

  return graph;
}

const removeEdge = (fwd: Map<string, Set<string>>, rev: Map<string, Set<string>>, from: string, to: string) => {
  const f = fwd.get(from);
  if (f) {
    f.delete(to);
    if (f.size === 0) fwd.delete(from);
  }
  const r = rev.get(to);
  if (r) {
    r.delete(from);
    if (r.size === 0) rev.delete(to);
  }
};

const canReach = (fwd: Map<string, Set<string>>, start: string, goal: string): boolean => {
  const visited = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === goal) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const next of fwd.get(node) ?? []) stack.push(next);
  }
  return false;
};

const pruneBackwardEdges = (
  fwd: Map<string, Set<string>>,
  rev: Map<string, Set<string>>,
  minCost: (id: string) => number,
  allow: (from: string, to: string) => boolean
) => {
  const doomed: [string, string][] = [];
  for (const [from, tos] of fwd) {
    const cf = minCost(from);
    for (const to of tos) {
      if (cf > minCost(to) && allow(from, to)) doomed.push([from, to]);
    }
  }
  for (const [from, to] of doomed) removeEdge(fwd, rev, from, to);
};

/**
 * Drop edges `from -> to` where the source is strictly more costly than the target —
 * you would never spend a pricier shard to fuse a cheaper one (e.g. Inferno
 * Demonlord for Ghost, Starborn for Blizzard). Such an edge can never be on an
 * optimal path (the input alone exceeds the output's minimum cost), so removal is
 * loss-free.
 *
 * The two edge kinds need different handling:
 *   - id (cross-family) edges: remove every backward one outright.
 *   - special (family backbone) edges: only remove a backward edge when the target
 *     can reach the source via other special edges (i.e., the edge is part of a
 *     cycle). This catches indirect cycles like Hideonring → Hideongift where
 *     Hideongift → Hideondra → Hideonring creates the loop. One-directional
 *     backbone edges are preserved even when the base shard is expensive to acquire
 *     (e.g. Gecko → Iguana — Iguana has no path back to Gecko, so it is kept).
 */
function pruneHigherCostEdges(graph: FusionGraph, minCost: (id: string) => number): void {
  pruneBackwardEdges(graph.id, graph.idRev, minCost, () => true);
  pruneBackwardEdges(graph.special, graph.specialRev, minCost, (from, to) => canReach(graph.special, to, from));
}

const removeFrom = (fwd: Map<string, Set<string>>, rev: Map<string, Set<string>>, from: string) => {
  const tos = fwd.get(from);
  if (!tos) return;
  for (const to of tos) {
    const r = rev.get(to);
    if (r) {
      r.delete(from);
      if (r.size === 0) rev.delete(to);
    }
  }
  fwd.delete(from);
};

/**
 * Iteratively strip edges that originate from a "dead" root: a node with outgoing
 * edges, no incoming edge of *either* type (so it anchors a line), and that is not
 * directly obtainable. Such a line begins at a shard you can never acquire, so it is
 * pure noise. Removing its edges can orphan its former children into new dead roots,
 * so we repeat until the graph stabilises. The combined-type incoming check keeps
 * nodes that are reachable via the other edge kind (e.g. Power Dragon, a special root
 * but reachable via its id parent Hellwisp).
 */
function pruneUnobtainableRoots(graph: FusionGraph, isDirectlyObtainable: (id: string) => boolean): void {
  for (;;) {
    const dead: string[] = [];
    const candidates = new Set<string>([...graph.special.keys(), ...graph.id.keys()]);
    for (const id of candidates) {
      const hasOut = (graph.special.get(id)?.size ?? 0) > 0 || (graph.id.get(id)?.size ?? 0) > 0;
      const hasIn = (graph.specialRev.get(id)?.size ?? 0) > 0 || (graph.idRev.get(id)?.size ?? 0) > 0;
      if (hasOut && !hasIn && !isDirectlyObtainable(id)) dead.push(id);
    }
    if (dead.length === 0) break;
    for (const id of dead) {
      removeFrom(graph.special, graph.specialRev, id);
      removeFrom(graph.id, graph.idRev, id);
    }
  }
}

// Local alias so we don't depend on the exact import name elsewhere.
type Recipe = Data["recipes"][string][number];

/**
 * Shards reachable downstream from `shardId` over SPECIAL edges only, INCLUDING
 * the shard itself. This is the shard's "fusion line" for completion purposes —
 * the family backbone it upgrades along, excluding id-fusion jumps into unrelated
 * targets (e.g. Cavernshade -> Sphinx -> King Minos). Cycle-safe.
 */
export function getSpecialDownstreamClosure(
  shardId: string,
  graph: FusionGraph,
  memo?: Map<string, Set<string>>
): Set<string> {
  if (memo?.has(shardId)) return memo.get(shardId)!;

  const closure = new Set<string>([shardId]);
  const stack = [...(graph.special.get(shardId) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (closure.has(node)) continue;
    closure.add(node);
    for (const next of graph.special.get(node) ?? []) {
      if (!closure.has(next)) stack.push(next);
    }
  }

  memo?.set(shardId, closure);
  return closure;
}

/**
 * Set of shards that are "freely usable" from inventory: a shard qualifies when
 * itself and everything it upgrades into along its special-fusion line (its
 * special-only downstream closure) are all maxed in the player's attributes. For
 * such shards there is no remaining progression to hoard for, so the inventory
 * layer drops the exclusivity ("scarcity") penalty that would otherwise refuse to
 * consume them.
 *
 * Empty `ownedAttributes` => empty set => behavior identical to before.
 */
export function computeFreelyUsableShards(
  data: Data,
  ownedAttributes: Map<string, number>,
  isDirectlyObtainable?: (id: string) => boolean,
  minCost?: (id: string) => number
): Set<string> {
  if (ownedAttributes.size === 0) return new Set();

  const graph = buildFusionGraph(data, { isDirectlyObtainable, minCost });
  const memo = new Map<string, Set<string>>();

  const isMaxed = (id: string): boolean => {
    const shard = data.shards[id];
    if (!shard) return false;
    const cap =
      MAX_QUANTITIES[shard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES] ??
      MAX_QUANTITIES.common;
    return (ownedAttributes.get(id) ?? 0) >= cap;
  };

  const result = new Set<string>();
  for (const id of Object.keys(data.shards)) {
    const closure = getSpecialDownstreamClosure(id, graph, memo);
    let allMaxed = true;
    for (const member of closure) {
      if (!isMaxed(member)) {
        allMaxed = false;
        break;
      }
    }
    if (allMaxed) result.add(id);
  }

  return result;
}

// ── Display structures ────────────────────────────────────────────────────────

export interface FusionTreeNode {
  id: string;
  name: string;
  rarity: Data["shards"][string]["rarity"];
  /** Edge type from this node's parent (undefined for roots). */
  edgeType?: FusionEdgeType;
  /** True if this node has more than one dominant parent of this edge type. */
  sharedParents?: boolean;
  /** True if this node's subtree was already expanded under another root (children omitted here). */
  ref?: boolean;
  children: FusionTreeNode[];
}

export interface FusionLines {
  /** Family-backbone trees over special edges (e.g. Gecko -> Iguana -> ...). */
  specialTrees: FusionTreeNode[];
  /** Cross-family id ladders (e.g. Ghost -> Sphinx -> King Minos). */
  idLadders: FusionTreeNode[];
}

const makeNode = (
  data: Data,
  id: string,
  edgeType: FusionEdgeType | undefined,
  sharedParents: boolean,
  ref: boolean
): FusionTreeNode => ({
  id,
  name: data.shards[id]?.name ?? id,
  rarity: data.shards[id]?.rarity ?? "common",
  ...(edgeType ? { edgeType } : {}),
  ...(sharedParents ? { sharedParents: true } : {}),
  ...(ref ? { ref: true } : {}),
  children: [],
});

/**
 * Build rooted display trees for one edge type. Roots are nodes that have
 * outgoing edges of this type but no incoming edge of this type. Each node's
 * subtree is expanded exactly once (globally) — when a node is reached again via
 * a different converging parent it is emitted as a leaf `ref` (its full subtree
 * lives under the first root). This keeps the output bounded (the id graph is a
 * convergent forest where many parents feed shared sinks like XYZ). Nodes flagged
 * `sharedParents` have more than one dominant parent (e.g. Sphinx <- Ghost &
 * Cavernshade). Cycle-safe.
 */
function buildTrees(
  data: Data,
  fwd: Map<string, Set<string>>,
  rev: Map<string, Set<string>>,
  type: FusionEdgeType
): FusionTreeNode[] {
  const nodes = new Set<string>([...fwd.keys(), ...rev.keys()]);
  const roots = [...nodes].filter((id) => (fwd.get(id)?.size ?? 0) > 0 && (rev.get(id)?.size ?? 0) === 0).sort();
  const expanded = new Set<string>();

  const expand = (id: string, edgeType: FusionEdgeType | undefined): FusionTreeNode => {
    const shared = (rev.get(id)?.size ?? 0) > 1;
    if (expanded.has(id)) return makeNode(data, id, edgeType, shared, true);
    expanded.add(id);
    const node = makeNode(data, id, edgeType, shared, false);
    for (const child of [...(fwd.get(id) ?? [])].sort()) {
      node.children.push(expand(child, type));
    }
    return node;
  };

  return roots.map((root) => expand(root, undefined));
}

/**
 * Produce serializable display data: the special-fusion family trees and the
 * id-fusion ladders, kept separate so the picture stays legible. Suitable for a
 * UI graph view or a text dump.
 */
export function computeFusionLines(data: Data, opts?: BuildFusionGraphOptions): FusionLines {
  const graph = buildFusionGraph(data, opts);
  return {
    specialTrees: buildTrees(data, graph.special, graph.specialRev, "special"),
    idLadders: buildTrees(data, graph.id, graph.idRev, "id"),
  };
}
