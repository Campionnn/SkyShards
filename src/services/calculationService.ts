import type {
  AlternativeRecipeOption,
  AlternativeSelectionContext,
  CalculationParams,
  Data,
  InventoryRecipeTree,
  Recipe,
  RecipeChoice,
  RecipeOverride,
  Recipes,
  RecipeTree,
  Shard,
  Shards,
} from "../types/types";
import { BLACK_HOLE_SHARD, NO_FORTUNE_SHARDS, WOODEN_BAIT_SHARDS } from "../constants";

export class CalculationService {
  private static instance: CalculationService;
  private dataCache: Map<string, Data> = new Map();

  public static getInstance(): CalculationService {
    if (!CalculationService.instance) {
      CalculationService.instance = new CalculationService();
    }
    return CalculationService.instance;
  }

  private getCacheKey(params: CalculationParams): string {
    return JSON.stringify({
      customRates: params.customRates,
      hunterFortune: params.hunterFortune,
      excludeChameleon: params.excludeChameleon,
      frogBonus: params.frogBonus,
      newtLevel: params.newtLevel,
      salamanderLevel: params.salamanderLevel,
      lizardKingLevel: params.lizardKingLevel,
      leviathanLevel: params.leviathanLevel,
      pythonLevel: params.pythonLevel,
      kingCobraLevel: params.kingCobraLevel,
      seaSerpentLevel: params.seaSerpentLevel,
      tiamatLevel: params.tiamatLevel,
      crocodileLevel: params.crocodileLevel,
      kuudraTier: params.kuudraTier,
      moneyPerHour: params.moneyPerHour,
      customKuudraTime: params.customKuudraTime,
      kuudraTimeSeconds: params.kuudraTimeSeconds,
      noWoodenBait: params.noWoodenBait,
    });
  }

  async parseData(params: CalculationParams): Promise<Data> {
    const cacheKey = this.getCacheKey(params);

    // Check cache first
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey)!;
    }

    try {
      const [fusionResponse, ratesResponse] = await Promise.all([fetch(`${import.meta.env.BASE_URL}fusion-data.json`), fetch(`${import.meta.env.BASE_URL}rates.json`)]);

      const fusionJson = await fusionResponse.json();
      const defaultRates = await ratesResponse.json();

      const recipes: Recipes = {};
      for (const outputShard in fusionJson.recipes) {
        recipes[outputShard] = [];
        for (const qtyStr in fusionJson.recipes[outputShard]) {
          const qty = parseInt(qtyStr);
          const recipeList = fusionJson.recipes[outputShard][qtyStr];
          recipeList.forEach((inputs: [string, string]) => {
            const isReptile = inputs.some((input) => fusionJson.shards[input].family.includes("Reptile"));
            recipes[outputShard].push({ inputs, outputQuantity: qty, isReptile: isReptile });
          });
        }
      }

      const shards: Shards = {};
      for (const shardId in fusionJson.shards) {
        let rate = params.rateAsCoinValue ? (params.customRates[shardId] ?? Infinity) : (params.customRates[shardId] ?? defaultRates[shardId] ?? 0);

        // skip rate modification if rate is a coin value
        if (params.rateAsCoinValue) {
          shards[shardId] = {
            ...fusionJson.shards[shardId],
            id: shardId,
            rate,
          };
          continue;
        }

        // Handle Kuudra rates for L15
        if (shardId === "L15" && rate === 0) {
          // If moneyPerHour is null, treat as Infinity (ignore key cost)
          const moneyPerHour = params.moneyPerHour == null ? Infinity : params.moneyPerHour;
          rate = this.calculateKuudraRate(params.kuudraTier, moneyPerHour, params.customKuudraTime ? params.kuudraTimeSeconds : null);
        }

        if (rate > 0) {
          // Apply wooden bait modifier - different rates for shiny fish vs other wooden bait
          if (params.noWoodenBait && WOODEN_BAIT_SHARDS.includes(shardId)) {
            if (shardId === "L23") {
              rate *= 0.1; // Reduce rate to 10% for shiny fish when wooden bait is excluded
            } else {
              rate *= 0.05; // Reduce rate to 5% for other wooden bait shards
            }
          }

          // Apply fortune calculations
          if (!NO_FORTUNE_SHARDS.includes(shardId)) {
            rate = this.applyFortuneModifiers(rate, shardId, fusionJson.shards[shardId], params);
          }
        }

        // Exclude chameleon
        if (params.excludeChameleon && shardId === "L4") {
          rate = 0;
        }

        shards[shardId] = {
          ...fusionJson.shards[shardId],
          id: shardId,
          rate,
        };
      }

      const result = { recipes, shards };

      // Cache the result (limit cache size to prevent memory issues)
      if (this.dataCache.size > 50) {
        const firstKey = this.dataCache.keys().next().value;
        if (firstKey) {
          this.dataCache.delete(firstKey);
        }
      }
      this.dataCache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw new Error(`Failed to parse data: ${error}`);
    }
  }

  private calculateKuudraRate(kuudraTier: string, moneyPerHour: number, customTimeSeconds: number | null = null): number {
    const tierData: Record<string, { baseTime: number; cost: number; multiplier: number }> = {
      t1: { baseTime: 60, cost: 155000, multiplier: 1 },
      t2: { baseTime: 60, cost: 310000, multiplier: 1 },
      t3: { baseTime: 60, cost: 582000, multiplier: 1 },
      t4: { baseTime: 60, cost: 1164000, multiplier: 1.25 },
      t5: { baseTime: 100, cost: 2328000, multiplier: 1.5 },
    };

    const tier = tierData[kuudraTier];
    if (!tier) return 0;

    const downtime = 25; // Fixed downtime between runs in seconds

    // Use custom time if provided, otherwise use default baseTime
    // Always add downtime to the total time per run
    const runTime = customTimeSeconds !== null ? customTimeSeconds : tier.baseTime;
    const totalTime = runTime + downtime;

    // If moneyPerHour is Infinity, ignore key cost (costTime = 0)
    // If moneyPerHour is 0, treat as lowest possible rate (costTime very large)
    let costTime: number;
    if (moneyPerHour === Infinity) {
      costTime = 0;
    } else if (moneyPerHour === 0) {
      costTime = 1e12; // effectively makes the rate approach zero
    } else {
      costTime = (tier.cost / moneyPerHour) * 3600;
    }
    return tier.multiplier * (3600 / (totalTime + costTime));
  }

  public calculateMultipliers(params: CalculationParams) {
    const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + ((2 * params.seaSerpentLevel) / 100) * tiamatMultiplier;
    const crocodileMultiplier = 1 + ((2 * params.crocodileLevel) / 100) * seaSerpentMultiplier;
    const pythonMultiplier = ((5 * params.pythonLevel) / 100) * seaSerpentMultiplier;
    const kingCobraMultiplier = (params.kingCobraLevel / 100) * seaSerpentMultiplier;
    let craftPenalty: number;
    if (params.rateAsCoinValue) {
      craftPenalty = params.craftPenalty;
    } else {
      craftPenalty = params.craftPenalty / 3600; // convert seconds to hours
    }
    return {
      tiamatMultiplier,
      seaSerpentMultiplier,
      crocodileMultiplier,
      pythonMultiplier,
      kingCobraMultiplier,
      craftPenalty,
    };
  }

  public getEffectiveOutputQuantity(recipe: { isReptile: boolean; outputQuantity: number }, crocodileMultiplier: number): number {
    return recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity;
  }

  private applyFortuneModifiers(rate: number, shardId: string, shard: Shard, params: CalculationParams): number {
    let effectiveFortune = params.hunterFortune;
    const multipliers = this.calculateMultipliers(params);

    // Apply rarity bonuses
    const rarityBonuses = {
      common: 2 * params.newtLevel,
      uncommon: 2 * params.salamanderLevel,
      rare: params.lizardKingLevel,
      epic: params.leviathanLevel,
      legendary: 0,
    };

    effectiveFortune += rarityBonuses[shard.rarity] * multipliers.seaSerpentMultiplier || 0;

    // Apply frog bonus
    if (params.frogBonus) {
      rate *= 1.1;
    }

    // Apply black hole shard bonuses
    if (shardId in BLACK_HOLE_SHARD) {
      if (BLACK_HOLE_SHARD[shardId]) {
        rate *= 1 + multipliers.pythonMultiplier;
      }
      effectiveFortune *= 1 + multipliers.kingCobraMultiplier;
    }

    return rate * (1 + effectiveFortune / 100);
  }

  private areRecipesEqual(a: Recipe | null, b: Recipe | null | undefined): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;

    // Check if inputs match in any order (since inputs could be swapped)
    const aInputsSorted = [...a.inputs].sort();
    const bInputsSorted = [...b.inputs].sort();
    const inputsMatch = aInputsSorted[0] === bInputsSorted[0] && aInputsSorted[1] === bInputsSorted[1];

    return inputsMatch && a.outputQuantity === b.outputQuantity && a.isReptile === b.isReptile;
  }

  getDirectCost(shard: Shard, ratesAsCoinValue: boolean): number {
    if (shard.rate <= 0) return Infinity;
    return ratesAsCoinValue ? shard.rate : 1 / shard.rate;
  }

  computeMinCosts(
    data: Data,
    params: CalculationParams,
    recipeOverrides: RecipeOverride[] = []
  ): { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> } {
    const minCosts = new Map<string, number>();
    const choices = new Map<string, RecipeChoice>();
    const shards = Object.keys(data.shards);
    const multipliers = this.calculateMultipliers(params);
    const { crocodileMultiplier, craftPenalty } = multipliers;

    const precomputed: Record<
      string,
      {
        recipes: Recipe[];
        effectiveOutputQty: number[];
        fuseAmounts: [number, number][];
      }
    > = {};
    for (const shard of shards) {
      const recipes = data.recipes[shard] || [];
      precomputed[shard] = {
        recipes,
        effectiveOutputQty: recipes.map((recipe) => this.getEffectiveOutputQuantity(recipe, crocodileMultiplier)),
        fuseAmounts: recipes.map((recipe) => [data.shards[recipe.inputs[0]].fuse_amount, data.shards[recipe.inputs[1]].fuse_amount]),
      };
    }

    // Build reverse dependency graph: for each shard, which shards depend on it as input
    const dependents: Record<string, Set<string>> = {};
    for (const shard of shards) dependents[shard] = new Set();
    for (const outputShard of shards) {
      const recipes = precomputed[outputShard].recipes;
      for (const recipe of recipes) {
        for (const input of recipe.inputs) {
          dependents[input].add(outputShard);
        }
      }
    }

    // Initialize with direct costs
    shards.forEach((shard) => {
      const cost = this.getDirectCost(data.shards[shard], params.rateAsCoinValue);
      minCosts.set(shard, cost);
      choices.set(shard, { recipe: null });
    });

    // prevent infinite costs from being stuck when overrides create cycles
    if (recipeOverrides.length > 0) {
      // graph of override dependencies
      const overrideGraph = new Map<string, string[]>();
      for (const override of recipeOverrides) {
        if (override.recipe !== null) {
          overrideGraph.set(override.shardId, override.recipe.inputs);
          choices.set(override.shardId, { recipe: override.recipe });
        }
      }

      const cyclesInOverrides = this.findCycleNodes(choices);

      // if all cycle nodes have infinite cost, initialize with temporary cost
      for (const cycle of cyclesInOverrides) {
        const allInfinite = cycle.every(shardId => !isFinite(minCosts.get(shardId) || Infinity));

        if (allInfinite) {
          for (const shardId of cycle) {
            minCosts.set(shardId, 1e10);
          }
        }
      }

      // reset choices back to direct for the main loop
      shards.forEach((shard) => {
        const hasOverride = recipeOverrides.some(ro => ro.shardId === shard);
        if (!hasOverride) {
          choices.set(shard, { recipe: null });
        }
      });
    }

    const queue: string[] = [...shards];
    const inQueue = new Set<string>(queue);
    const tolerance = params.rateAsCoinValue ? 1e-2 : 1e-10;

    while (queue.length > 0) {
      const outputShard = queue.shift()!;
      inQueue.delete(outputShard);

      const currentCost = minCosts.get(outputShard)!;
      const currentChoice = choices.get(outputShard)!;

      // Handle recipe overrides
      const recipeOverride = recipeOverrides.find((ro) => ro.shardId === outputShard);
      if (recipeOverride) {
        const overrideRecipe = recipeOverride.recipe;
        if (overrideRecipe === null) {
          const directCost = this.getDirectCost(data.shards[outputShard], params.rateAsCoinValue);
          if (Math.abs(directCost - currentCost) > tolerance) {
            minCosts.set(outputShard, directCost);
            choices.set(outputShard, { recipe: null });
            for (const dep of dependents[outputShard]) {
              if (!inQueue.has(dep)) {
                queue.push(dep);
                inQueue.add(dep);
              }
            }
          }
          continue;
        }
        const [input1, input2] = overrideRecipe.inputs;
        const fuse1 = data.shards[input1].fuse_amount;
        const fuse2 = data.shards[input2].fuse_amount;
        const costInput1 = minCosts.get(input1)! * fuse1;
        const costInput2 = minCosts.get(input2)! * fuse2;
        const totalCost = costInput1 + costInput2 + craftPenalty;
        const effectiveOutputQuantity = this.getEffectiveOutputQuantity(overrideRecipe, crocodileMultiplier);
        const newCost = totalCost / effectiveOutputQuantity;

        if (newCost < currentCost - tolerance || !this.areRecipesEqual(overrideRecipe, currentChoice.recipe)) {
          minCosts.set(outputShard, newCost);
          choices.set(outputShard, { recipe: overrideRecipe });
          for (const dep of dependents[outputShard]) {
            if (!inQueue.has(dep)) {
              queue.push(dep);
              inQueue.add(dep);
            }
          }
        }
        continue;
      }

      const { recipes, effectiveOutputQty, fuseAmounts } = precomputed[outputShard];
      let bestCost = currentCost;
      let bestRecipe: Recipe | null = currentChoice.recipe;
      // recipes was being mutated in the loop somewhere, so make a copy. idk why
      const arr = recipes.slice()

      for (let i = 0; i < arr.length; i++) {
        const recipe = arr[i];
        const [fuse1, fuse2] = fuseAmounts[i];
        const [input1, input2] = recipe.inputs;
        const costInput1 = minCosts.get(input1)! * fuse1;
        const costInput2 = minCosts.get(input2)! * fuse2;
        const totalCost = costInput1 + costInput2 + craftPenalty;
        const costPerUnit = totalCost / effectiveOutputQty[i];

        if (costPerUnit < bestCost - tolerance) {
          bestCost = costPerUnit;
          bestRecipe = recipe;
        }
      }

      if (bestCost < currentCost - tolerance || bestRecipe !== currentChoice.recipe) {
        minCosts.set(outputShard, bestCost);
        choices.set(outputShard, { recipe: bestRecipe });
        for (const dep of dependents[outputShard]) {
          if (!inQueue.has(dep)) {
            queue.push(dep);
            inQueue.add(dep);
          }
        }
      }
    }

    return { minCosts, choices };
  }

  private getCostCalculationContext(params: CalculationParams) {
    const multipliers = this.calculateMultipliers(params);
    return {
      craftPenalty: multipliers.craftPenalty,
      crocodileMultiplier: multipliers.crocodileMultiplier,
    };
  }

  private calculateRecipeCost(recipe: Recipe, context: ReturnType<typeof this.getCostCalculationContext>, data: Data, minCosts: Map<string, number>): number {
    const [input1, input2] = recipe.inputs;
    const fuse1 = data.shards[input1].fuse_amount;
    const fuse2 = data.shards[input2].fuse_amount;

    const cost1 = minCosts.get(input1) || Infinity;
    const cost2 = minCosts.get(input2) || Infinity;

    const totalCost = cost1 * fuse1 + cost2 * fuse2 + context.craftPenalty;
    const effectiveOutput = this.getEffectiveOutputQuantity(recipe, context.crocodileMultiplier);

    return totalCost / effectiveOutput;
  }

  private groupAlternativeRecipes(alternatives: AlternativeRecipeOption[]): { direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> } {
    // Separate direct option from fusion recipes
    const directOption = alternatives.find((alt) => alt.recipe === null) || null;
    const fusionAlts = alternatives.filter((alt) => alt.recipe !== null);

    // Build a set of valid input pairs for normalization check
    const validPairs = new Set<string>();
    for (const alt of fusionAlts) {
      if (alt.recipe) {
        const [a, b] = alt.recipe.inputs;
        validPairs.add(`${a}-${b}-${alt.recipe.outputQuantity}`);
      }
    }

    // Count how many times each shard appears in any input slot
    const shardCount: Record<string, number> = {};
    for (const alt of fusionAlts) {
      if (alt.recipe) {
        for (const shard of alt.recipe.inputs) {
          shardCount[shard] = (shardCount[shard] || 0) + 1;
        }
      }
    }

    // For each recipe, put the most common shard in the first slot,
    // but only if the normalized recipe exists
    const normalized: AlternativeRecipeOption[] = fusionAlts.map((alt) => {
      if (!alt.recipe) return alt;
      const [a, b] = alt.recipe.inputs;
      // If b is more common than a, and the swapped recipe exists, swap
      if ((shardCount[b] ?? 0) > (shardCount[a] ?? 0)) {
        const swappedKey = `${b}-${a}-${alt.recipe.outputQuantity}`;
        if (validPairs.has(swappedKey)) {
          return {
            ...alt,
            recipe: {
              ...alt.recipe,
              inputs: [b, a],
            },
          };
        }
      }
      return alt;
    });

    // Remove mirrored recipes (same pair, different order)
    const seen = new Set<string>();
    const deduped: AlternativeRecipeOption[] = [];
    for (const alt of normalized) {
      if (!alt.recipe) continue;
      const key = `${alt.recipe.inputs[0]}-${alt.recipe.inputs[1]}-${alt.recipe.outputQuantity}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(alt);
      }
    }

    // Group by first input shard
    const grouped: Record<string, AlternativeRecipeOption[]> = {};
    for (const alt of deduped) {
      if (!alt.recipe) continue;
      const first = alt.recipe.inputs[0];
      if (!grouped[first]) grouped[first] = [];
      grouped[first].push(alt);
    }

    // Sort each group by efficiency
    for (const shardId in grouped) {
      grouped[shardId].sort((a, b) => a.timePerShard - b.timePerShard);
    }

    return { direct: directOption, grouped };
  }

  private async getAlternativeRecipe(
    outputShard: string,
    params: CalculationParams,
    recipeOverrides: RecipeOverride[] = [],
    recipeFilter?: (recipe: Recipe) => boolean
  ): Promise<{ direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> }> {
    const data = await this.parseData(params);
    const { minCosts } = this.computeMinCosts(data, params, recipeOverrides);
    const context = this.getCostCalculationContext(params);
    const alternatives: AlternativeRecipeOption[] = [];
    const recipes = data.recipes[outputShard] || [];

    // Calculate costs for filtered recipes
    for (const recipe of recipes) {
      if (!recipeFilter || recipeFilter(recipe)) {
        const cost = this.calculateRecipeCost(recipe, context, data, minCosts);
        alternatives.push({ recipe, cost, timePerShard: cost, isCurrent: false });
      }
    }

    // Add direct option for recipe alternatives (not for direct input alternatives)
    if (!recipeFilter) {
      const directCost = this.getDirectCost(data.shards[outputShard], params.rateAsCoinValue);
      alternatives.push({ recipe: null, cost: directCost, timePerShard: directCost, isCurrent: false });
    }

    return this.groupAlternativeRecipes(alternatives);
  }

  async getAlternativeRecipeWithContext(
    outputShard: string,
    params: CalculationParams,
    currentRecipe?: Recipe | null,
    recipeOverrides: RecipeOverride[] = []
  ): Promise<{ direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> }> {
    const result = await this.getAlternativeRecipe(outputShard, params, recipeOverrides);

    // Mark the current recipe
    if (result.direct) {
      result.direct.isCurrent = this.areRecipesEqual(result.direct.recipe, currentRecipe);
    }
    for (const group of Object.values(result.grouped)) {
      for (const alt of group) {
        alt.isCurrent = this.areRecipesEqual(alt.recipe, currentRecipe);
      }
    }
    return result;
  }

  // Method to get alternatives while handling cycle nodes properly
  async getAlternativesForTreeNode(
    shardId: string,
    params: CalculationParams,
    context: AlternativeSelectionContext,
    recipeOverrides: RecipeOverride[] = []
  ): Promise<{ direct: AlternativeRecipeOption | null; grouped: Record<string, AlternativeRecipeOption[]> }> {
    try {
      if (context?.isDirectInput) {
        return await this.getAlternativeRecipe(shardId, params, recipeOverrides, () => true);
      }

      return await this.getAlternativeRecipeWithContext(shardId, params, context.currentRecipe, recipeOverrides);
    } catch (error) {
      console.error("Error getting alternatives for tree node:", error);
      return { direct: null, grouped: {} };
    }
  }

  public findCycleNodes(choices: Map<string, RecipeChoice>): string[][] {
    const graph = new Map<string, string[]>();

    for (const [shard, choice] of choices) {
      if (choice.recipe) {
        graph.set(shard, choice.recipe.inputs);
      }
    }

    let index = 0;
    const indices = new Map<string, number>();
    const lowLinks = new Map<string, number>();
    const onStack = new Map<string, boolean>();
    const stack: string[] = [];
    const cycles: string[][] = [];

    const strongConnect = (node: string) => {
      indices.set(node, index);
      lowLinks.set(node, index);
      index++;
      stack.push(node);
      onStack.set(node, true);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!graph.has(neighbor)) continue;

        if (!indices.has(neighbor)) {
          strongConnect(neighbor);
          lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(neighbor)!));
        } else if (onStack.get(neighbor)) {
          lowLinks.set(node, Math.min(lowLinks.get(node)!, indices.get(neighbor)!));
        }
      }

      if (lowLinks.get(node) === indices.get(node)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.set(w, false);
          scc.push(w);
        } while (w !== node);

        if (scc.length > 1 || (scc.length === 1 && graph.get(node)?.includes(node))) {
          cycles.push(scc);
        }
      }
    };

    for (const node of graph.keys()) {
      if (!indices.has(node)) {
        strongConnect(node);
      }
    }

    return cycles;
  }

  private buildCycle(shard: string, choices: Map<string, RecipeChoice>, cycleNodes: string[][]): { outputShard: string; recipe: Recipe }[] {
    for (const cycle of cycleNodes) {
      if (cycle.includes(shard)) {
        const steps: { outputShard: string; recipe: Recipe }[] = [];
        for (const node of cycle) {
          const choice = choices.get(node);
          if (choice?.recipe) {
            steps.push({ outputShard: node, recipe: choice.recipe });
          }
        }
        return steps;
      }
    }

    return [];
  }

  private findExternalCycleInputs(
    steps: { outputShard: string; recipe: Recipe }[],
    data: Data
  ): { shard: Shard; quantityPerCraft: number }[] {
    const outputShards = new Set(steps.map((step) => step.outputShard));
    const inputTotals: Map<string, { shard: Shard; quantityPerCraft: number }> = new Map();

    steps.forEach((step) => {
      step.recipe.inputs.forEach((inputId) => {
        if (outputShards.has(inputId)) return;
        const shard = data.shards[inputId];
        if (!shard) return;

        if (!inputTotals.has(inputId)) {
          inputTotals.set(inputId, { shard, quantityPerCraft: 0 });
        }
        inputTotals.get(inputId)!.quantityPerCraft += shard.fuse_amount / Math.max(1, steps.length);
      });
    });
    return Array.from(inputTotals.values());
  }

  public buildRecipeTree(
    data: Data,
    shard: string,
    choices1: Map<string, RecipeChoice>,
    cycleNodes: string[][],
    params: CalculationParams,
    recipeOverrides: RecipeOverride[] = [],
    minCostsCache?: { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> }
  ): RecipeTree {
    if (!minCostsCache) {
      const dummyParams: CalculationParams = {
        ...params,
        seaSerpentLevel: 0,
        tiamatLevel: 0,
        crocodileLevel: 0,
      };
      const result = this.computeMinCosts(data, dummyParams);
      minCostsCache = { minCosts: result.minCosts, choices: result.choices };
    }

    if (cycleNodes.flat().includes(shard)) {
      const steps = this.buildCycle(shard, choices1, cycleNodes);
      const minCosts = minCostsCache.minCosts;
      const choices = minCostsCache.choices;
      let targetShard = shard;
      let minCost = minCosts.get(shard) || Infinity;
      for (const node of steps.map((step) => step.outputShard)) {
        const cost = minCosts.get(node) || Infinity;
        if (cost < minCost) {
          minCost = cost;
          targetShard = node;
        }
      }

      const inputTree = this.buildRecipeTree(data, targetShard, choices, [], params, recipeOverrides, minCostsCache);
      const craftCounter = { total: 0 };
      this.assignQuantities(inputTree, data.shards[targetShard].fuse_amount, data, craftCounter, choices, 1, params, recipeOverrides);

      const externalInputs = this.findExternalCycleInputs(steps, data);
      const cycleInputs: RecipeTree[] = [];
      for (const extInput of externalInputs) {
        const extTree = this.buildRecipeTree(data, extInput.shard.id, choices, [], params, recipeOverrides, minCostsCache);
        cycleInputs.push(extTree);
      }

      return {
        shard,
        method: "cycle",
        quantity: 0,
        steps,
        multiplier: 1,
        craftsNeeded: 0,
        inputRecipe: inputTree,
        cycleInputs: cycleInputs,
      };
    }

    const choice = choices1.get(shard)!;
    if (choice.recipe === null) {
      return { shard, method: "direct", quantity: 0 };
    } else {
      const recipe = choice.recipe;
      const [input1, input2] = recipe.inputs;
      const tree1 = this.buildRecipeTree(data, input1, choices1, cycleNodes, params, recipeOverrides, minCostsCache);
      const tree2 = this.buildRecipeTree(data, input2, choices1, cycleNodes, params, recipeOverrides, minCostsCache);

      return {
        shard,
        method: "recipe",
        recipe,
        inputs: [tree1, tree2],
        quantity: 0,
        craftsNeeded: 0,
      };
    }
  }

  assignQuantities(
    tree: RecipeTree,
    requiredQuantity: number,
    data: Data,
    craftCounter: { total: number },
    choices: Map<string, RecipeChoice>,
    crocodileMultiplier: number,
    params: CalculationParams,
    recipeOverrides: RecipeOverride[] = [],
  ): void {
    tree.quantity = requiredQuantity;

    switch (tree.method) {
      case "recipe": {
        const recipe = tree.recipe;
        const outputQuantity = this.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
        const craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
        tree.craftsNeeded = craftsNeeded;
        craftCounter.total += craftsNeeded;

        const [input1, input2] = recipe.inputs;
        const fuse1 = data.shards[input1].fuse_amount;
        const fuse2 = data.shards[input2].fuse_amount;
        const input1Quantity = craftsNeeded * fuse1;
        const input2Quantity = craftsNeeded * fuse2;

        this.assignQuantities(tree.inputs[0], input1Quantity, data, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);
        this.assignQuantities(tree.inputs[1], input2Quantity, data, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);
        break;
      }

      case "cycle":
        { const outputStep = tree.steps.find((step) => step.outputShard === tree.shard);
        if (!outputStep) break;

        const recipe = outputStep.recipe;
        const baseOutput = recipe.outputQuantity;
        const expectedOutput = recipe.isReptile ? baseOutput * crocodileMultiplier : baseOutput;

        // Calculate net output per cycle
        let totalInputsConsumed = 0;
        tree.steps.forEach((step) => {
          step.recipe.inputs.forEach((inputId) => {
            if (inputId === tree.shard) {
              const inputShard = data.shards[inputId];
              totalInputsConsumed += inputShard.fuse_amount;
            }
          });
        });

        const netOutputPerCycle = expectedOutput - totalInputsConsumed;
        const expectedCrafts = netOutputPerCycle > 0 ? Math.ceil(requiredQuantity / netOutputPerCycle) : Math.ceil(requiredQuantity / expectedOutput);
        const stepCount = tree.steps.length;
        const roundedCrafts = Math.ceil(expectedCrafts / stepCount) * stepCount;

        tree.multiplier = crocodileMultiplier;
        craftCounter.total += roundedCrafts;
        tree.craftsNeeded = roundedCrafts;

        const inputQuantities = new Map<string, number>();
        const outputShards = new Set(tree.steps.map((step) => step.outputShard));

        tree.steps.forEach((step) => {
          step.recipe.inputs.forEach((inputId) => {
            if (!outputShards.has(inputId)) {
              const inputShard = data.shards[inputId];
              const currentQuantity = inputQuantities.get(inputId) || 0;
              inputQuantities.set(inputId, currentQuantity + inputShard.fuse_amount);
            }
          });
        });

        tree.cycleInputs.forEach((cycleInput) => {
          const inputQuantity = inputQuantities.get(cycleInput.shard) || 0;
          const totalInputQuantity = inputQuantity * (roundedCrafts / stepCount);
          this.assignQuantities(cycleInput, totalInputQuantity, data, craftCounter, choices, crocodileMultiplier, params, recipeOverrides);
        });
        break; }
    }
  }

  public collectTreeStats(
    tree: RecipeTree | InventoryRecipeTree,
    params: CalculationParams
  ): {
    craftsNeeded: number;
    craftTime: number;
    totalQuantities: Map<string, number>;
  } {
    let craftsNeeded = 0;
    const totalQuantities = new Map<string, number>();
    const { craftPenalty } = this.calculateMultipliers(params);

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

        case "recipe": {
          const crafts = node.craftsNeeded || 0;
          craftsNeeded += crafts;
          node.inputs.forEach(traverse);
          break;
        }

        case "cycle": {
          const crafts = node.craftsNeeded || 0;
          craftsNeeded += crafts;
          traverse(node.inputRecipe);
          node.cycleInputs.forEach(traverse);
          break;
        }
      }
    };

    traverse(tree);
    const craftTime = craftsNeeded * craftPenalty;

    return { craftsNeeded, craftTime, totalQuantities };
  }

  private calculateShardWeights(
    totalQuantities: Map<string, number>,
    data: Data,
    params: CalculationParams,
    getDirectCostFn?: (shard: Shard, asCoin: boolean) => number
  ): Map<string, number> {
    const shardWeights = new Map<string, number>();
    const costFn = getDirectCostFn || this.getDirectCost.bind(this);

    for (const [shardId, quantity] of totalQuantities.entries()) {
      const shard = data.shards[shardId];
      if (shard) {
        const weight = costFn(shard, params.rateAsCoinValue) * quantity;
        shardWeights.set(shardId, weight);
      }
    }
    return shardWeights;
  }

  public calculateShardProductionStats({
   requiredQuantity,
   targetShard,
   choices,
   crocodileMultiplier,
   totalQuantities,
   data,
   params,
   getDirectCostFn
  }: {
    requiredQuantity: number;
    targetShard: string;
    choices: Map<string, RecipeChoice>;
    crocodileMultiplier: number;
    totalQuantities: Map<string, number>;
    data: Data;
    params: CalculationParams;
    getDirectCostFn: (shard: Shard, asCoin: boolean) => number;
  }) {
    let totalShardsProduced = requiredQuantity;
    let craftsNeeded = 1;
    const choice = choices.get(targetShard);
    if (choice?.recipe) {
      const outputQuantity = choice.recipe.isReptile ? choice.recipe.outputQuantity * crocodileMultiplier : choice.recipe.outputQuantity;
      craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
      totalShardsProduced = craftsNeeded * outputQuantity;
    }
    const shardWeights = this.calculateShardWeights(totalQuantities, data, params, getDirectCostFn);
    return { totalShardsProduced, craftsNeeded, shardWeights };
  }

  public calculateTotalTimeFromQuantities(
    totalQuantities: Map<string, number>,
    craftTime: number,
    data: Data,
    params: CalculationParams
  ): number {
    const shardWeights = this.calculateShardWeights(totalQuantities, data, params);
    const materialTime = Array.from(shardWeights.values()).reduce((sum, weight) => sum + weight, 0);
    return materialTime + craftTime;
  }

  // Recipe overrides management
  applyRecipeOverride(
    shardId: string,
    selectedRecipe: Recipe | null,
    existingOverrides: RecipeOverride[] = []
  ): RecipeOverride[] {
    // Create new override
    const newOverride: RecipeOverride = {
      shardId,
      recipe: selectedRecipe,
    };

    // Remove any existing override for this shard and add the new one
    const updatedOverrides = existingOverrides.filter((o) => o.shardId !== shardId);
    updatedOverrides.push(newOverride);

    return updatedOverrides;
  }
}

// Create and export a default instance
const calculationService = new CalculationService();
export default calculationService;
