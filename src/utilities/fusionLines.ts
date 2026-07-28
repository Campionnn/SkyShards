import type { Data, Recipe } from "../types/types";
import { MAX_QUANTITIES } from "../constants";

// Recipes split into three kinds (matches recipeUtils.classifyFusion): chameleon
// (an input is L4, ignored entirely), special (outputQuantity === 2, curated
// same-family upgrades), and id (everything else, fuse-with-any-catalyst). Within
// a family the raw recipe graph is near-complete and bidirectional, so "X is an
// input to Y" alone is meaningless — the signal is DOMINANCE: a real parent shows
// up in most of an output's recipes while catalysts are noise. Keeping only
// dominant edges collapses the graph to the canonical lines, e.g.
// Gecko -> Iguana -> Komodo Dragon -> Wyvern (special) and
// Ghost -> Sphinx -> King Minos (id).

export type FusionEdgeType = "special" | "id";

export interface FusionGraph {
  /** special: from -> outputs reachable via a dominant special (qty=2) edge. */
  special: Map<string, Set<string>>;
  /** id: from -> outputs reachable via a dominant id edge. */
  id: Map<string, Set<string>>;
  /** reverse special: output -> dominant special parents. */
  specialRev: Map<string, Set<string>>;
  /** reverse id: output -> dominant id parents. */
  idRev: Map<string, Set<string>>;
}

export interface BuildFusionGraphOptions {
  /** Minimum fraction of an output's (per-quantity) recipes an input must appear in. */
  dominanceThreshold?: number;
  /** Minimum raw recipe count an input must appear in (kills tiny-block noise). */
  minCount?: number;
  /** Structural obtainability predicate (base rates.json, rate > 0). When provided,
   * roots that are never directly obtainable are pruned out as noise. */
  isDirectlyObtainable?: (id: string) => boolean;
  /** Min cost to obtain each shard (CalculationService.computeMinCosts). When
   * provided, drops edges from a pricier shard into a cheaper one — such an edge
   * can never lie on an optimal path. */
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


/** Build the dominance-pruned, type-tagged fusion graph. Chameleon recipes are
 * excluded. An edge X -> Y is added when X appears in at least `dominanceThreshold`
 * of Y's recipes (for that output quantity) and at least `minCount` of them. */
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

/** Drop edges `from -> to` where the source costs more than the target — you'd
 * never spend a pricier shard to fuse a cheaper one. For id edges this removes
 * every backward edge; for special (family backbone) edges it only removes one
 * that's part of a cycle, so one-directional chains like Gecko -> Iguana survive
 * even when Gecko is itself expensive. */
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

/** Iteratively strip edges from roots (no incoming edge of either type) that
 * aren't directly obtainable — a line that starts at a shard you can never
 * acquire is noise. Removing a root's edges can orphan its children into new
 * dead roots, so this repeats until the graph stabilizes. */
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

/** Shards reachable downstream from `shardId` over special edges only, including
 * the shard itself — its family-backbone fusion line, excluding id-fusion jumps
 * into unrelated targets. Cycle-safe. */
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

/** Shards that are "freely usable" from inventory: a shard qualifies when it and
 * everything it upgrades into along its special-fusion line are all maxed in the
 * player's attributes, so there's no progression left to hoard for and the
 * inventory layer can drop the scarcity penalty. Empty `ownedAttributes` returns
 * an empty set. */
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
    const cap = MAX_QUANTITIES[shard.rarity.toLowerCase() as keyof typeof MAX_QUANTITIES] ?? MAX_QUANTITIES.common;
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
