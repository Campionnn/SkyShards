import { computeFreelyUsableShards } from "../utilities";
import type {
  CalculationParams,
  Data,
  FusionTreeNode,
  InventoryCalculationResult,
  InventoryRecipeTree,
  Recipe,
  RecipeChoice,
  RecipeOverride,
  RecipeTree,
} from "../types/types";
import { areRecipesEqual, calculateMultipliers, craftsForQuantity, getEffectiveOutputQuantity, snapToInteger } from "./fusionMath";
import { computeExclusivityScores, computeMinCosts, findCycleNodesIfNeeded } from "./minCostSolver";
import { assignQuantities, buildQuantifiedTree, calculateTotalTimeFromQuantities, collectTreeStats, emptyCalculationResult } from "./recipeTree";
import { CalculationService } from "./calculationService";

type InventoryRecipeNode = FusionTreeNode<InventoryRecipeTree>;
type InventoryLeafOrNode = Exclude<InventoryRecipeTree, InventoryRecipeTree[]>;

/**
 * Tiny residual opportunity-cost factor applied to "freely usable" inventory shards
 * (whose special-fusion line is fully maxed). Far smaller than the farm cost it avoids,
 * so inventory still wins over farming, but it scales with the shard's real minCost so
 * cheaper freely-usable shards are consumed first.
 */
const FREELY_USABLE_RESIDUAL = 0.02;

/** Everything about one inventory calculation that stays fixed while the tree is rewritten. */
interface InventoryContext {
  data: Data;
  params: CalculationParams;
  choices: Map<string, RecipeChoice>;
  cycleNodes: string[][];
  recipeOverrides: RecipeOverride[];
  minCosts: Map<string, number>;
  /** How irreplaceable each shard is as an input (computeExclusivityScores). */
  exclusivityScores: Map<string, number>;
  /** Shards whose fusion line is maxed, so hoarding them has no value. */
  freelyUsableShards: Set<string>;
  crocodileMultiplier: number;
  craftPenalty: number;
}

/**
 * Inventory-aware calculation. Builds the normal min-cost tree, then rewrites it so
 * owned shards replace farming and crafting where they can (see InventorySubstitution).
 */
export class InvCalculationService {
  private static instance: InvCalculationService | undefined;

  public static getInstance(): InvCalculationService {
    return (InvCalculationService.instance ??= new InvCalculationService());
  }

  // Shares the CalculationService singleton so fusion-data.json is built once app-wide.
  private service = CalculationService.getInstance();

  async calculateOptimalPath(
    targetShard: string,
    requiredQuantity: number,
    params: CalculationParams,
    inventory: Map<string, number>,
    recipeOverrides: RecipeOverride[] = [],
    ownedAttributes: Map<string, number> = new Map(),
  ): Promise<InventoryCalculationResult> {
    const data = await this.service.parseData(params);
    if (!data.shards[targetShard]) return emptyCalculationResult(targetShard);

    const { minCosts, choices } = computeMinCosts(data, params, recipeOverrides);
    const defaultRates = this.service.getDefaultRates();
    const { crocodileMultiplier, craftPenalty } = calculateMultipliers(params);

    const ctx: InventoryContext = {
      data,
      params,
      choices,
      cycleNodes: findCycleNodesIfNeeded(choices, params, recipeOverrides),
      recipeOverrides,
      minCosts,
      exclusivityScores: computeExclusivityScores(data, minCosts),
      freelyUsableShards: computeFreelyUsableShards(
        data,
        ownedAttributes,
        (id) => (defaultRates[id] ?? 0) > 0,
        (id) => minCosts.get(id) ?? Infinity,
      ),
      crocodileMultiplier,
      craftPenalty,
    };

    const evaluate = (allowAlternatives: boolean) => {
      const remainingInventory = new Map(inventory);
      const plainTree: InventoryRecipeTree = buildQuantifiedTree(data, targetShard, requiredQuantity, choices, ctx.cycleNodes, params);
      const tree = new InventorySubstitution(ctx, remainingInventory, plainTree).run(allowAlternatives);
      const { craftsNeeded, craftTime, totalQuantities } = collectTreeStats(tree, params);
      const totalTime = calculateTotalTimeFromQuantities(totalQuantities, craftTime, data, params);
      return { tree, remainingInventory, craftsNeeded, craftTime, totalQuantities, totalTime };
    };

    // The alternative-recipe machinery is heuristic and can occasionally pick a
    // globally worse restructuring. Plain substitution only ever replaces work with
    // owned shards, so taking the better of the two guarantees "Use Inventory" never
    // increases the total time.
    const withAlternatives = evaluate(true);
    const substitutionOnly = evaluate(false);
    const best = withAlternatives.totalTime <= substitutionOnly.totalTime ? withAlternatives : substitutionOnly;

    return {
      timePerShard: requiredQuantity > 0 ? best.totalTime / requiredQuantity : 0,
      totalTime: best.totalTime,
      totalShardsProduced: requiredQuantity,
      craftsNeeded: best.craftsNeeded,
      totalQuantities: best.totalQuantities,
      craftTime: best.craftTime,
      tree: best.tree,
      remainingInventory: best.remainingInventory,
    };
  }
}

/**
 * One pass of rewriting a quantified tree against an inventory, consuming from
 * `inventory` as it goes. Walks top-down; for each node, in order:
 *  1. satisfy it from inventory, fully or partially (the rest is crafted/farmed);
 *  2. otherwise, if it is a recipe node, try splitting it into segments made by
 *     alternative recipes whose inputs are owned (tryAlternatives);
 *  3. otherwise recurse into its inputs.
 * Owning a shard beats any recipe for it, which is why (1) comes before (2).
 *
 * `path` holds the shards being produced further up the current branch: a shard is
 * never taken from inventory, or fed into an alternative, inside its own subtree —
 * that is a net-negative loop that only looks cheap locally.
 */
class InventorySubstitution {
  /** Total quantity the tree demands per shard, so alternatives don't steal shards needed elsewhere. */
  private readonly treeDemand: Map<string, number>;
  private readonly processedNodes = new WeakMap<object, InventoryRecipeTree>();
  private readonly ctx: InventoryContext;
  private readonly inventory: Map<string, number>;
  private readonly tree: InventoryRecipeTree;

  constructor(ctx: InventoryContext, inventory: Map<string, number>, tree: InventoryRecipeTree) {
    this.ctx = ctx;
    this.inventory = inventory;
    this.tree = tree;
    this.treeDemand = collectTreeDemand(tree);
  }

  /**
   * Re-runs assignQuantities for a new quantity. Only ever called on nodes whose
   * subtree hasn't been substituted yet (still a plain RecipeTree), since
   * substitution works top-down and processes a node before its children.
   */
  private requantify(node: InventoryLeafOrNode, quantity: number): void {
    assignQuantities(node as RecipeTree, quantity, this.ctx.data, { total: 0 }, this.ctx.crocodileMultiplier);
  }

  run(allowAlternatives: boolean): InventoryRecipeTree {
    return mergeTreeSegments(this.processNode(this.tree, allowAlternatives));
  }

  private processNode(node: InventoryRecipeTree, allowAlternatives = true, path: Set<string> = new Set()): InventoryRecipeTree {
    if (Array.isArray(node)) {
      return node.map((element) => this.processNode(element, allowAlternatives, path));
    }
    if (node.method === "inventory") return node;
    if (node.method !== "direct") {
      const processed = this.processedNodes.get(node);
      if (processed) return processed;
    }

    const owned = path.has(node.shard) ? 0 : this.inventory.get(node.shard) || 0;

    if (owned >= node.quantity) {
      this.inventory.set(node.shard, owned - node.quantity);
      return this.remember(node, { shard: node.shard, method: "inventory", quantity: node.quantity });
    }

    if (owned > 0) {
      const fromInventory: InventoryRecipeTree = { shard: node.shard, method: "inventory", quantity: owned };
      const remainingQuantity = node.quantity - owned;
      this.inventory.set(node.shard, 0);

      if (node.method === "direct") {
        return [fromInventory, { shard: node.shard, method: "direct", quantity: remainingQuantity }];
      }

      // Requantify a clone so the caller's node survives intact, then process the
      // remainder as a whole node so it can still pick up recipe alternatives (its
      // shard's inventory is 0 now, so no re-entry).
      const crafted: InventoryLeafOrNode = JSON.parse(JSON.stringify(node));
      this.requantify(crafted, remainingQuantity);
      return this.remember(node, [fromInventory, this.processNode(crafted, allowAlternatives, path)]);
    }

    if (node.method === "direct") return node;

    if (allowAlternatives && node.method === "recipe") {
      const split = this.tryAlternatives(node, path);
      if (split) return this.remember(node, split);
    }

    this.processChildren(node, allowAlternatives, path);
    return this.remember(node, node);
  }

  private remember(node: InventoryLeafOrNode, result: InventoryRecipeTree): InventoryRecipeTree {
    if (node.method !== "direct") this.processedNodes.set(node, result);
    return result;
  }

  private processChildren(node: InventoryLeafOrNode, allowAlternatives: boolean, path: Set<string>): void {
    if (node.method === "recipe") {
      node.inputs[0] = this.processNode(node.inputs[0], allowAlternatives, path);
      node.inputs[1] = this.processNode(node.inputs[1], allowAlternatives, path);
    } else if (node.method === "cycle") {
      node.inputRecipe = this.processNode(node.inputRecipe, allowAlternatives, path);
      for (let i = 0; i < node.cycleInputs.length; i++) {
        node.cycleInputs[i] = this.processNode(node.cycleInputs[i], allowAlternatives, path);
      }
    }
  }

  /**
   * Greedily carves `node` into segments made by alternative recipes that owned
   * shards make cheaper, cheapest first, until no alternative helps; whatever is left
   * stays on the original recipe. Returns null when no alternative was used.
   */
  private tryAlternatives(node: InventoryRecipeNode, path: Set<string>): InventoryRecipeTree | null {
    const { data, recipeOverrides } = this.ctx;
    if (path.has(node.shard)) return null;

    const availableRecipes = data.recipes[node.shard] || [];
    if (availableRecipes.length <= 1) return null;
    if (recipeOverrides.some((override) => override.shardId === node.shard)) return null;

    const alternatives = availableRecipes.filter((recipe) => !areRecipesEqual(recipe, node.recipe));
    if (alternatives.length === 0) return null;

    const childPath = new Set(path).add(node.shard);
    let remainingQuantity = node.quantity;
    const segments: InventoryRecipeTree[] = [];

    while (remainingQuantity > 0) {
      const surplus = this.surplusInventory();
      let best: AlternativeCandidate | null = null;
      for (const recipe of alternatives) {
        const candidate = this.evaluateAlternative(recipe, node, remainingQuantity, surplus, path);
        if (candidate && (!best || candidate.effectiveCost < best.effectiveCost)) best = candidate;
      }
      if (!best || best.segmentCrafts <= 0) break;

      const quantityProduced = Math.min(remainingQuantity, Math.floor(snapToInteger(best.segmentCrafts * best.outputQuantity)));
      if (quantityProduced <= 0) break;

      const segment = this.buildRecipeNode(node.shard, best.recipe, best.segmentCrafts, quantityProduced);
      // The chosen node isn't re-evaluated, but its inputs may still swap their own.
      this.processChildren(segment, true, childPath);
      segments.push(segment);
      remainingQuantity -= quantityProduced;
    }

    if (segments.length === 0) return null;

    if (remainingQuantity > 0) {
      this.requantify(node, remainingQuantity);
      this.processChildren(node, true, childPath);
      segments.push(node);
    }

    return segments.length === 1 ? segments[0] : segments;
  }

  /**
   * Inventory free to divert into an alternative recipe: only what exceeds the tree's
   * own demand. This holds even for freely-usable shards — a maxed line removes the
   * hoarding penalty, but a shard that is scarce for THIS build still isn't free.
   * Exclusive shards the tree doesn't use at all are kept back entirely.
   */
  private surplusInventory(): Map<string, number> {
    const { exclusivityScores, freelyUsableShards } = this.ctx;
    const surplus = new Map<string, number>();
    for (const [shardId, qty] of this.inventory) {
      const totalDemand = this.treeDemand.get(shardId) || 0;
      const exclusivity = exclusivityScores.get(shardId) || 0;
      const keepBack = !freelyUsableShards.has(shardId) && exclusivity > 0 && totalDemand === 0;
      surplus.set(shardId, keepBack ? 0 : Math.max(0, qty - totalDemand));
    }
    return surplus;
  }

  /** Prices `recipe` against the current recipe over the segment it could fill; null if it doesn't apply or isn't cheaper. */
  private evaluateAlternative(
    recipe: Recipe,
    node: InventoryRecipeNode,
    remainingQuantity: number,
    surplus: Map<string, number>,
    path: Set<string>,
  ): AlternativeCandidate | null {
    const { data, crocodileMultiplier, exclusivityScores, freelyUsableShards } = this.ctx;

    // Never feed the shard being produced (or an ancestor) back into its own
    // production: e.g. Titanoboa = Tortoise + Megalith, where Megalith = Tortoise +
    // Titanoboa, burns more Titanoboa than it makes.
    if (recipe.inputs.some((inputId) => inputId === node.shard || path.has(inputId))) return null;

    // Inputs shared with the current recipe are consumed either way, so they use the
    // full working inventory, cost nothing extra and don't limit the segment. Inputs
    // unique to the alternative may only draw on surplus.
    const sharedInputs = new Set(node.recipe.inputs);
    const fairInventory = new Map<string, number>();
    for (const inputId of recipe.inputs) {
      fairInventory.set(inputId, (sharedInputs.has(inputId) ? this.inventory.get(inputId) : surplus.get(inputId)) || 0);
    }
    if (!recipe.inputs.some((inputId) => (fairInventory.get(inputId) || 0) >= data.shards[inputId].fuse_amount)) return null;

    // Unique inputs are discounted by surplus / (surplus + demand); shared and
    // freely-usable inputs fully.
    const surplusDiscounts = new Map<string, number>();
    for (const inputId of recipe.inputs) {
      if (sharedInputs.has(inputId) || freelyUsableShards.has(inputId)) {
        surplusDiscounts.set(inputId, 1);
      } else {
        const available = surplus.get(inputId) || 0;
        const demand = this.treeDemand.get(inputId) || 0;
        surplusDiscounts.set(inputId, available + demand > 0 ? available / (available + demand) : 0);
      }
    }

    const craftLimits: number[] = [];
    for (const inputId of recipe.inputs) {
      if (sharedInputs.has(inputId)) continue;
      const available = surplus.get(inputId) || 0;
      const fuseAmount = data.shards[inputId].fuse_amount;
      if (available >= fuseAmount) craftLimits.push(Math.floor(available / fuseAmount));
    }
    const craftsSupported = craftLimits.length > 0 ? Math.min(...craftLimits) : 0;
    if (craftsSupported <= 0) return null;

    // Price both recipes over the SAME batch — the segment this alternative could fill.
    // Comparing against the current recipe over the whole remainder let a token amount
    // of its input (50 Rat against 2500 needed) price it as free and veto everything.
    const outputQuantity = getEffectiveOutputQuantity(recipe, crocodileMultiplier);
    const segmentCrafts = Math.min(craftsSupported, craftsForQuantity(remainingQuantity, outputQuantity));
    const segmentQuantity = Math.min(remainingQuantity, segmentCrafts * outputQuantity);

    const currentOutputQuantity = getEffectiveOutputQuantity(node.recipe, crocodileMultiplier);
    const currentCost = this.effectiveCost(node.recipe, this.inventory, { craftsNeeded: craftsForQuantity(segmentQuantity, currentOutputQuantity) });
    const effectiveCost = this.effectiveCost(recipe, fairInventory, {
      craftsNeeded: segmentCrafts,
      surplusDiscounts,
      exclusivityScores,
      freelyUsableShards,
      sharedInputs,
    });
    if (effectiveCost >= currentCost) return null;

    return { recipe, outputQuantity, segmentCrafts, effectiveCost };
  }

  /**
   * Cost per output unit of `recipe`, with each input discounted by the share of its
   * requirement that `inventory` covers (scaled by `surplusDiscounts`, default full).
   *
   * With `exclusivityScores`, consuming an owned input also carries an opportunity
   * cost: `minCost * exclusivity`, or a small residual for freely-usable shards. Inputs
   * in `sharedInputs` are exempt — the recipe being compared against consumes them too.
   */
  private effectiveCost(recipe: Recipe, inventory: Map<string, number>, options: EffectiveCostOptions): number {
    const { craftsNeeded, surplusDiscounts, exclusivityScores, freelyUsableShards, sharedInputs } = options;
    const { data, minCosts, crocodileMultiplier, craftPenalty } = this.ctx;

    const inputCost = (inputId: string) => {
      const fuse = data.shards[inputId].fuse_amount;
      const owned = inventory.get(inputId) || 0;
      const baseCost = (minCosts.get(inputId) || Infinity) * fuse;
      if (owned < fuse) return { cost: baseCost, opportunity: 0 };

      const coverage = craftsNeeded > 0 ? Math.min(1, owned / (fuse * craftsNeeded)) : 1;
      const cost = (1 - coverage * (surplusDiscounts?.get(inputId) ?? 1)) * baseCost;

      let opportunity = 0;
      if (exclusivityScores && !sharedInputs?.has(inputId)) {
        if (freelyUsableShards?.has(inputId)) {
          opportunity = baseCost * FREELY_USABLE_RESIDUAL;
        } else {
          const exclusivity = exclusivityScores.get(inputId) || 0;
          if (exclusivity > 0) opportunity = baseCost * exclusivity;
        }
      }
      return { cost, opportunity };
    };

    const input1 = inputCost(recipe.inputs[0]);
    const input2 = inputCost(recipe.inputs[1]);
    const opportunityCost = input1.opportunity + input2.opportunity;
    return (input1.cost + input2.cost + opportunityCost + craftPenalty) / getEffectiveOutputQuantity(recipe, crocodileMultiplier);
  }

  /** A recipe node for `crafts` crafts of `recipe`, with freshly built, quantified input trees. */
  private buildRecipeNode(shard: string, recipe: Recipe, craftsNeeded: number, quantity: number): InventoryRecipeNode {
    const { data, params, choices, cycleNodes } = this.ctx;
    const [input1, input2] = recipe.inputs;
    return {
      shard,
      method: "recipe",
      recipe,
      quantity,
      craftsNeeded,
      inputs: [
        buildQuantifiedTree(data, input1, craftsNeeded * data.shards[input1].fuse_amount, choices, cycleNodes, params),
        buildQuantifiedTree(data, input2, craftsNeeded * data.shards[input2].fuse_amount, choices, cycleNodes, params),
      ],
    };
  }
}

interface AlternativeCandidate {
  recipe: Recipe;
  outputQuantity: number;
  /** Crafts of this recipe in the segment: limited by owned surplus and by what is still needed. */
  segmentCrafts: number;
  effectiveCost: number;
}

interface EffectiveCostOptions {
  craftsNeeded: number;
  surplusDiscounts?: Map<string, number>;
  exclusivityScores?: Map<string, number>;
  freelyUsableShards?: Set<string>;
  sharedInputs?: Set<string>;
}

/** Total quantity demanded per shard across every node of the tree. */
const collectTreeDemand = (tree: InventoryRecipeTree): Map<string, number> => {
  const demand = new Map<string, number>();

  const walk = (node: InventoryRecipeTree) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    demand.set(node.shard, (demand.get(node.shard) || 0) + node.quantity);
    if (node.method === "recipe") {
      walk(node.inputs[0]);
      walk(node.inputs[1]);
    } else if (node.method === "cycle") {
      walk(node.inputRecipe);
      node.cycleInputs.forEach(walk);
    }
  };

  walk(tree);
  return demand;
};

/**
 * Tidies the substituted tree bottom-up: flattens nested split arrays and merges
 * adjacent segments for the same shard and method (and recipe), so e.g. two inventory
 * pulls of one shard become one leaf. Cycle nodes are never merged.
 */
const mergeTreeSegments = (tree: InventoryRecipeTree): InventoryRecipeTree => {
  if (Array.isArray(tree)) {
    const merged: InventoryLeafOrNode[] = [];
    for (const element of tree) {
      const result = mergeTreeSegments(element);
      for (const node of Array.isArray(result) ? (result as InventoryLeafOrNode[]) : [result]) {
        const prev = merged[merged.length - 1];
        if (prev && canMergeNodes(prev, node)) {
          merged[merged.length - 1] = mergeNodes(prev, node);
        } else {
          merged.push(node);
        }
      }
    }
    return merged.length === 1 ? merged[0] : merged;
  }

  if (tree.method === "recipe") {
    return { ...tree, inputs: [mergeTreeSegments(tree.inputs[0]), mergeTreeSegments(tree.inputs[1])] };
  }
  if (tree.method === "cycle") {
    return { ...tree, inputRecipe: mergeTreeSegments(tree.inputRecipe), cycleInputs: tree.cycleInputs.map(mergeTreeSegments) };
  }
  return tree;
};

const canMergeNodes = (a: InventoryLeafOrNode, b: InventoryLeafOrNode): boolean => {
  if (a.shard !== b.shard || a.method !== b.method) return false;
  if (a.method === "direct" || a.method === "inventory") return true;
  if (a.method === "recipe" && b.method === "recipe") return areRecipesEqual(a.recipe, b.recipe);
  return false;
};

/** Precondition: canMergeNodes(a, b). Recipe nodes merge their input subtrees pairwise. */
const mergeNodes = (a: InventoryLeafOrNode, b: InventoryLeafOrNode): InventoryLeafOrNode => {
  if (a.method === "recipe" && b.method === "recipe") {
    return {
      shard: a.shard,
      method: "recipe",
      quantity: a.quantity + b.quantity,
      recipe: a.recipe,
      inputs: [mergeTreeSegments([a.inputs[0], b.inputs[0]]), mergeTreeSegments([a.inputs[1], b.inputs[1]])],
      craftsNeeded: a.craftsNeeded + b.craftsNeeded,
    };
  }
  if (a.method === "direct" || a.method === "inventory") {
    return { shard: a.shard, method: a.method, quantity: a.quantity + b.quantity };
  }
  return a;
};
