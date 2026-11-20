import type { CalculationParams, CalculationResult, CycleStep, Data, InventoryRecipeTree, RecipeChoice, RecipeTree } from "../types/types";
import { calculateMultipliers, computeCycleQuantities, craftsForQuantity, getDirectCost, getEffectiveOutputQuantity, snapToInteger } from "./fusionMath";
import { computeMinCosts, type MinCostResult } from "./minCostSolver";

/**
 * Min costs solved without crocodile (and without overrides), memoised per Data. A
 * cycle is entered through its cheapest member, and these costs pick that member and
 * build the tree that enters the loop. Only the craft penalty and cost mode feed
 * computeMinCosts besides the Data, so those form the memo key.
 */
const noCrocodileMinCosts = new WeakMap<Data, { key: string; result: MinCostResult }>();

const getNoCrocodileMinCosts = (data: Data, params: CalculationParams): MinCostResult => {
  const key = `${params.craftPenalty}|${params.rateAsCoinValue}`;
  const memo = noCrocodileMinCosts.get(data);
  if (memo && memo.key === key) return memo.result;

  const result = computeMinCosts(data, { ...params, seaSerpentLevel: 0, tiamatLevel: 0, crocodileLevel: 0 });
  noCrocodileMinCosts.set(data, { key, result });
  return result;
};

/**
 * Builds the tree of how `shard` is obtained under `choices`, with every quantity left
 * at 0; `assignQuantities` fills them in. Shards inside one of `cycleNodes` become a
 * single cycle node.
 */
export const buildRecipeTree = (
  data: Data,
  shard: string,
  choices: Map<string, RecipeChoice>,
  cycleNodes: string[][],
  params: CalculationParams,
): RecipeTree => {
  const cycle = cycleNodes.find((nodes) => nodes.includes(shard));
  if (cycle) return buildCycleNode(data, shard, choices, cycle, params);

  const recipe = choices.get(shard)!.recipe;
  if (recipe === null) {
    return { shard, method: "direct", quantity: 0 };
  }

  const [input1, input2] = recipe.inputs;
  return {
    shard,
    method: "recipe",
    recipe,
    inputs: [buildRecipeTree(data, input1, choices, cycleNodes, params), buildRecipeTree(data, input2, choices, cycleNodes, params)],
    quantity: 0,
    craftsNeeded: 0,
  };
};

const buildCycleNode = (data: Data, shard: string, choices: Map<string, RecipeChoice>, cycle: string[], params: CalculationParams): RecipeTree => {
  const steps: CycleStep[] = [];
  for (const node of cycle) {
    const recipe = choices.get(node)?.recipe;
    if (recipe) steps.push({ outputShard: node, recipe });
  }

  const noCroc = getNoCrocodileMinCosts(data, params);

  // Enter the loop through its cheapest member, built with one fuse's worth of it.
  let entryShard = shard;
  let entryCost = noCroc.minCosts.get(shard) || Infinity;
  for (const step of steps) {
    const cost = noCroc.minCosts.get(step.outputShard) || Infinity;
    if (cost < entryCost) {
      entryCost = cost;
      entryShard = step.outputShard;
    }
  }
  const inputRecipe = buildRecipeTree(data, entryShard, noCroc.choices, [], params);
  assignQuantities(inputRecipe, data.shards[entryShard].fuse_amount, data, { total: 0 }, 1);

  const cycleInputs = externalCycleInputs(steps, data).map((inputShard) => buildRecipeTree(data, inputShard, noCroc.choices, [], params));

  return {
    shard,
    method: "cycle",
    quantity: 0,
    steps,
    multiplier: 1,
    craftsNeeded: 0,
    inputRecipe,
    cycleInputs,
  };
};

/** Inputs consumed by the loop that are not produced inside it, in first-seen order. */
const externalCycleInputs = (steps: CycleStep[], data: Data): string[] => {
  const outputShards = new Set(steps.map((step) => step.outputShard));
  const inputs = new Set<string>();
  for (const step of steps) {
    for (const inputId of step.recipe.inputs) {
      if (!outputShards.has(inputId) && data.shards[inputId]) inputs.add(inputId);
    }
  }
  return [...inputs];
};

/**
 * Fills in quantities top-down: each recipe node crafts enough to cover its quantity,
 * and its inputs need `crafts * fuse_amount`. Every craft is added to `craftCounter`.
 */
export const assignQuantities = (
  tree: RecipeTree,
  requiredQuantity: number,
  data: Data,
  craftCounter: { total: number },
  crocodileMultiplier: number,
): void => {
  tree.quantity = requiredQuantity;

  switch (tree.method) {
    case "recipe": {
      const craftsNeeded = craftsForQuantity(requiredQuantity, getEffectiveOutputQuantity(tree.recipe, crocodileMultiplier));
      tree.craftsNeeded = craftsNeeded;
      craftCounter.total += craftsNeeded;

      const [input1, input2] = tree.recipe.inputs;
      assignQuantities(tree.inputs[0], craftsNeeded * data.shards[input1].fuse_amount, data, craftCounter, crocodileMultiplier);
      assignQuantities(tree.inputs[1], craftsNeeded * data.shards[input2].fuse_amount, data, craftCounter, crocodileMultiplier);
      break;
    }

    case "cycle": {
      const cycle = computeCycleQuantities(tree.shard, tree.steps, requiredQuantity, data, crocodileMultiplier);
      if (!cycle) break;

      tree.multiplier = crocodileMultiplier;
      craftCounter.total += cycle.roundedCrafts;
      tree.craftsNeeded = cycle.roundedCrafts;

      for (const cycleInput of tree.cycleInputs) {
        assignQuantities(cycleInput, cycle.quantityForInput(cycleInput.shard), data, craftCounter, crocodileMultiplier);
      }
      break;
    }
  }
};

/** `buildRecipeTree` + `assignQuantities` for `quantity` of `shard`. */
export const buildQuantifiedTree = (
  data: Data,
  shard: string,
  quantity: number,
  choices: Map<string, RecipeChoice>,
  cycleNodes: string[][],
  params: CalculationParams,
): RecipeTree => {
  const tree = buildRecipeTree(data, shard, choices, cycleNodes, params);
  assignQuantities(tree, quantity, data, { total: 0 }, calculateMultipliers(params).crocodileMultiplier);
  return tree;
};

/**
 * Totals over a quantified tree: crafts (and the time they cost) and how much of each
 * shard has to be farmed or bought directly. Inventory leaves cost nothing; a cycle's
 * entry tree counts towards crafts but not materials.
 */
export const collectTreeStats = (
  tree: RecipeTree | InventoryRecipeTree,
  params: CalculationParams,
): { craftsNeeded: number; craftTime: number; totalQuantities: Map<string, number> } => {
  let craftsNeeded = 0;
  const totalQuantities = new Map<string, number>();

  const traverse = (node: RecipeTree | InventoryRecipeTree) => {
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }

    switch (node.method) {
      case "direct":
        totalQuantities.set(node.shard, (totalQuantities.get(node.shard) || 0) + node.quantity);
        break;
      case "inventory":
        break;
      case "recipe":
        craftsNeeded += node.craftsNeeded || 0;
        node.inputs.forEach(traverse);
        break;
      case "cycle":
        craftsNeeded += node.craftsNeeded || 0;
        traverse(node.inputRecipe);
        node.cycleInputs.forEach(traverse);
        break;
    }
  };

  traverse(tree);
  return { craftsNeeded, craftTime: craftsNeeded * calculateMultipliers(params).craftPenalty, totalQuantities };
};

/** Cost of acquiring `totalQuantities` directly, plus `craftTime`. */
export const calculateTotalTimeFromQuantities = (totalQuantities: Map<string, number>, craftTime: number, data: Data, params: CalculationParams): number => {
  let materialTime = 0;
  for (const [shardId, quantity] of totalQuantities) {
    const shard = data.shards[shardId];
    if (shard) materialTime += getDirectCost(shard, params.rateAsCoinValue) * quantity;
  }
  return materialTime + craftTime;
};

/**
 * Shards the final craft actually yields: whole crafts times the expected output, so a
 * reptile recipe can over-produce (and fractionally — the .2 in "7.2 shards" is real).
 */
const totalShardsProduced = (requiredQuantity: number, recipe: RecipeChoice["recipe"] | undefined, crocodileMultiplier: number): number => {
  if (!recipe) return requiredQuantity;
  const outputQuantity = getEffectiveOutputQuantity(recipe, crocodileMultiplier);
  return snapToInteger(craftsForQuantity(requiredQuantity, outputQuantity) * outputQuantity);
};

/** The result for a shard that isn't in the data. */
export const emptyCalculationResult = (targetShard: string): CalculationResult => ({
  timePerShard: 0,
  totalTime: 0,
  totalShardsProduced: 0,
  craftsNeeded: 0,
  totalQuantities: new Map<string, number>(),
  craftTime: 0,
  tree: { shard: targetShard, method: "direct", quantity: 0 },
});

/** Full calculation for one target, given already-solved choices. */
export const calculatePath = (
  data: Data,
  targetShard: string,
  requiredQuantity: number,
  choices: Map<string, RecipeChoice>,
  cycleNodes: string[][],
  params: CalculationParams,
): CalculationResult => {
  if (!data.shards[targetShard]) return emptyCalculationResult(targetShard);

  const tree = buildQuantifiedTree(data, targetShard, requiredQuantity, choices, cycleNodes, params);
  const { craftsNeeded, craftTime, totalQuantities } = collectTreeStats(tree, params);
  const produced = totalShardsProduced(requiredQuantity, choices.get(targetShard)?.recipe, calculateMultipliers(params).crocodileMultiplier);
  const totalTime = calculateTotalTimeFromQuantities(totalQuantities, craftTime, data, params);

  return {
    timePerShard: totalTime / produced,
    totalTime,
    totalShardsProduced: produced,
    craftsNeeded,
    totalQuantities,
    craftTime,
    tree,
  };
};
