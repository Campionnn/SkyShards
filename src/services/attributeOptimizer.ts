import { maxQuantityForRarity } from "../constants";
import type { InventoryRecipeTree, Shard } from "../types/types";
import type { InventoryPlanner } from "./invCalculationService";

/*
 * "Optimize inventory": turn the shards a player owns into as many maxed attributes as
 * possible, as cheaply as possible, without wasting any.
 *
 *  1. Absorb. Every owned shard whose own attribute is not maxed goes into that
 *     attribute, up to the cap. This is free progress, and it means a shard is never
 *     fused away while its own attribute still needs it.
 *  2. Complete from inventory. What is left is pure surplus (shards of maxed
 *     attributes, or more than the cap needs). Attributes that surplus alone can
 *     finish, with no farming or buying, are completed first, rarity by rarity in the
 *     player's chosen order, cheapest (fewest fusions) first within a rarity.
 *  3. Complete with extra materials. Then attributes the surplus gets part of the way,
 *     in the same rarity order, cheapest extra cost first. Only where the surplus saves
 *     at least the player's minimum share of the cost, so a token 20 shards never pull
 *     in a 26-hour farm, and it stops once nothing can use the surplus left.
 *
 * Chameleon has no attribute to put shards into, so it is never a target.
 *
 * Within a rarity the choice is greedy with lazy re-evaluation: a plan only gets more
 * expensive as the inventory shrinks, so a stale cost is a lower bound and only the
 * front of the queue ever needs re-planning.
 */

export type Rarity = Shard["rarity"];

/** Default rarity order of completion: commons first, legendaries last. */
export const RARITY_ORDER: readonly Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

/** Default share of an attribute's normal cost the surplus must save for a completion that still needs farming or buying. */
export const MIN_SAVINGS_SHARE = 0.25;

/** Shards with no attribute to fuse into: they are never absorbed or completed. */
export const NON_ATTRIBUTE_SHARDS: ReadonlySet<string> = new Set(["L4"]); // Chameleon

/** Owned shards put straight into their own attribute. */
export interface AbsorbStep {
  shardId: string;
  quantity: number;
  fusedBefore: number;
  fusedAfter: number;
  /** This alone maxes the attribute. */
  completes: boolean;
}

/** One attribute maxed by fusing: `quantity` shards made from `inventoryUsed` plus `materials`. */
export interface CompletionStep {
  shardId: string;
  /** Shards to make; what the attribute still needed after absorbing. */
  quantity: number;
  fusedBefore: number;
  /** Surplus inventory consumed, by shard. */
  inventoryUsed: Map<string, number>;
  /** Shards to farm or buy, by shard. Empty for a completion from inventory alone. */
  materials: Map<string, number>;
  craftsNeeded: number;
  /** Cost of the fusions alone (craft penalty), in the same unit as `extraCost`. */
  craftCost: number;
  /** Materials plus fusions: hours in ironman mode, coins otherwise. */
  extraCost: number;
  /** What maxing it would cost with no inventory at all, same unit. */
  baselineCost: number;
  /** Made from surplus alone (step 2), rather than with extra materials (step 3). */
  fromInventoryOnly: boolean;
  /** Inventory left once this step is done; the tree's "remaining" counts. */
  remainingInventory: Map<string, number>;
  tree: InventoryRecipeTree | null;
}

export interface AttributeOptimization {
  absorbs: AbsorbStep[];
  completions: CompletionStep[];
  /** Fused count per attribute once every step is done. */
  attributes: Map<string, number>;
  /** Inventory left after every step. */
  remainingInventory: Map<string, number>;
  totals: {
    attributesMaxed: number;
    extraCost: number;
    craftsNeeded: number;
    shardsAbsorbed: number;
    inventoryUsed: number;
  };
}

export interface OptimizeOptions {
  /** Rarities in the order to complete them; rarities left out are skipped. Default RARITY_ORDER. */
  rarityOrder?: readonly Rarity[];
  /** Minimum share (0-1) of the normal cost the surplus must save in step 3. Default MIN_SAVINGS_SHARE. */
  minSavingsShare?: number;
  /** Aborting stops at the next yield and rejects with an AbortError. */
  signal?: AbortSignal;
  /** Called with the share of planning done, 0-1. */
  onProgress?: (fraction: number) => void;
}

/** Plans between yields to the event loop, so the page stays responsive on the main thread. */
const PLANS_PER_YIELD = 8;

const sumValues = (map: Map<string, number>) => [...map.values()].reduce((sum, value) => sum + value, 0);

/** What `before` lost to become `after`. */
const consumed = (before: Map<string, number>, after: Map<string, number>): Map<string, number> => {
  const used = new Map<string, number>();
  for (const [shardId, quantity] of before) {
    const delta = quantity - (after.get(shardId) ?? 0);
    if (delta > 0) used.set(shardId, delta);
  }
  return used;
};

interface Candidate {
  shardId: string;
  step: CompletionStep;
  remainingInventory: Map<string, number>;
  /** Inventory version the plan was made against; stale when it differs. */
  version: number;
}

const byCost = (a: Candidate, b: Candidate) =>
  a.step.extraCost - b.step.extraCost || sumValues(b.step.inventoryUsed) - sumValues(a.step.inventoryUsed) || a.shardId.localeCompare(b.shardId);

export async function optimizeAttributes(
  planner: InventoryPlanner,
  inventory: Map<string, number>,
  ownedAttributes: Map<string, number>,
  { signal, onProgress, rarityOrder = RARITY_ORDER, minSavingsShare = MIN_SAVINGS_SHARE }: OptimizeOptions = {},
): Promise<AttributeOptimization> {
  const { data } = planner;
  const cap = (shardId: string) => maxQuantityForRarity(data.shards[shardId].rarity);
  const hasAttribute = (shardId: string) => !NON_ATTRIBUTE_SHARDS.has(shardId);
  const rarityRank = (shardId: string) => {
    const index = rarityOrder.indexOf(data.shards[shardId].rarity.toLowerCase() as Rarity);
    return index === -1 ? rarityOrder.length : index;
  };

  const attributes = new Map(ownedAttributes);
  let working = new Map([...inventory].filter(([shardId, quantity]) => quantity > 0 && data.shards[shardId]));
  let version = 0;

  // 1. Absorb owned shards into their own attributes.
  const absorbs: AbsorbStep[] = [];
  for (const [shardId, owned] of working) {
    if (!hasAttribute(shardId)) continue;
    const fusedBefore = attributes.get(shardId) ?? 0;
    const quantity = Math.min(owned, cap(shardId) - fusedBefore);
    if (quantity <= 0) continue;
    const fusedAfter = fusedBefore + quantity;
    absorbs.push({ shardId, quantity, fusedBefore, fusedAfter, completes: fusedAfter >= cap(shardId) });
    attributes.set(shardId, fusedAfter);
    working.set(shardId, owned - quantity);
  }
  absorbs.sort((a, b) => Number(b.completes) - Number(a.completes) || rarityRank(a.shardId) - rarityRank(b.shardId) || a.shardId.localeCompare(b.shardId));
  working = new Map([...working].filter(([, quantity]) => quantity > 0));
  // Attributes maxed by absorbing free up their lines' surplus.
  planner.updateOwnedAttributes(attributes);

  const unfinished = Object.keys(data.shards).filter((shardId) => hasAttribute(shardId) && (attributes.get(shardId) ?? 0) < cap(shardId));
  const tiers = rarityOrder.map((rarity) => unfinished.filter((shardId) => data.shards[shardId].rarity.toLowerCase() === rarity));
  // Every unfinished attribute is planned at least once per pass; progress counts those.
  const totalInitialPlans = Math.max(1, tiers.reduce((sum, tier) => sum + tier.length, 0) * 2);
  let plansDone = 0;
  let sinceYield = 0;

  const tick = async (initial: boolean) => {
    if (initial) onProgress?.(Math.min(1, ++plansDone / totalInitialPlans));
    if (++sinceYield >= PLANS_PER_YIELD) {
      sinceYield = 0;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    signal?.throwIfAborted();
  };

  // Fused counts only change when an attribute is completed, so the no-inventory cost of a candidate never changes.
  const baselines = new Map<string, number>();
  const baselineCost = (shardId: string, quantity: number) => {
    let cost = baselines.get(shardId);
    if (cost === undefined) baselines.set(shardId, (cost = planner.plan(shardId, quantity, new Map()).totalTime));
    return cost;
  };

  const planFor = (shardId: string, fromInventoryOnly: boolean): Candidate => {
    const fusedBefore = attributes.get(shardId) ?? 0;
    const quantity = cap(shardId) - fusedBefore;
    const result = planner.plan(shardId, quantity, working);
    const remainingInventory = result.remainingInventory ?? working;
    return {
      shardId,
      version,
      remainingInventory,
      step: {
        shardId,
        quantity,
        fusedBefore,
        inventoryUsed: consumed(working, remainingInventory),
        materials: new Map([...result.totalQuantities].filter(([, q]) => q > 0)),
        craftsNeeded: result.craftsNeeded,
        craftCost: result.craftTime,
        extraCost: result.totalTime,
        baselineCost: fromInventoryOnly ? result.totalTime : baselineCost(shardId, quantity),
        fromInventoryOnly,
        remainingInventory,
        tree: result.tree,
      },
    };
  };

  const completions: CompletionStep[] = [];
  const done = new Set<string>();

  /** Greedy over one rarity: commit the cheapest acceptable plan, re-planning stale ones lazily. */
  const runTier = async (shardIds: string[], fromInventoryOnly: boolean) => {
    const acceptable = ({ step }: Candidate) => {
      if (step.inventoryUsed.size === 0 || !Number.isFinite(step.extraCost)) return false;
      if (fromInventoryOnly) return step.materials.size === 0;
      return step.baselineCost - step.extraCost >= minSavingsShare * step.baselineCost;
    };

    const queue: Candidate[] = [];
    for (const shardId of shardIds) {
      if (done.has(shardId)) continue;
      const candidate = planFor(shardId, fromInventoryOnly);
      await tick(true);
      if (acceptable(candidate)) queue.push(candidate);
    }

    while (queue.length > 0) {
      queue.sort(byCost);
      const front = queue.shift()!;
      if (front.version !== version) {
        const fresh = planFor(front.shardId, fromInventoryOnly);
        await tick(false);
        // Inventory only shrinks, so plans only get worse: an unacceptable plan stays out.
        if (acceptable(fresh)) queue.push(fresh);
        continue;
      }
      completions.push(front.step);
      done.add(front.shardId);
      attributes.set(front.shardId, cap(front.shardId));
      working = new Map([...front.remainingInventory].filter(([, quantity]) => quantity > 0));
      version++;
    }
  };

  // 2. Completions from inventory alone, then 3. completions that need extra materials.
  for (const fromInventoryOnly of [true, false]) {
    for (const tier of tiers) {
      await runTier(tier, fromInventoryOnly);
      if (working.size === 0) break;
    }
    if (working.size === 0) break;
  }
  onProgress?.(1);

  const shardsAbsorbed = absorbs.reduce((sum, step) => sum + step.quantity, 0);
  return {
    absorbs,
    completions,
    attributes,
    remainingInventory: working,
    totals: {
      attributesMaxed: absorbs.filter((step) => step.completes).length + completions.length,
      extraCost: completions.reduce((sum, step) => sum + step.extraCost, 0),
      craftsNeeded: completions.reduce((sum, step) => sum + step.craftsNeeded, 0),
      shardsAbsorbed,
      inventoryUsed: shardsAbsorbed + completions.reduce((sum, step) => sum + sumValues(step.inventoryUsed), 0),
    },
  };
}
