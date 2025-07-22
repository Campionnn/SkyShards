import type {
  AlternativeRecipeOption,
  AlternativeSelectionContext,
  CalculationParams,
  CalculationResult,
  Data,
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
        let rate = params.customRates[shardId] ?? defaultRates[shardId] ?? 0;

        // Handle Kuudra rates for L15
        if (shardId === "L15" && rate === 0) {
          // If moneyPerHour is null, treat as Infinity (ignore key cost)
          const moneyPerHour = params.moneyPerHour == null ? Infinity : params.moneyPerHour;
          rate = this.calculateKuudraRate(params.kuudraTier, moneyPerHour);
        }

        if (rate > 0) {
          // Apply wooden bait modifier - reduce rate but don't exclude completely
          if (params.noWoodenBait && WOODEN_BAIT_SHARDS.includes(shardId)) {
            rate *= 0.05; // Reduce rate to 5% when wooden bait is excluded
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

  private calculateKuudraRate(kuudraTier: string, moneyPerHour: number): number {
    const tierData: Record<string, { baseTime: number; cost: number; multiplier: number }> = {
      t1: { baseTime: 135, cost: 155000, multiplier: 1 },
      t2: { baseTime: 135, cost: 310000, multiplier: 1 },
      t3: { baseTime: 135, cost: 582000, multiplier: 2 },
      t4: { baseTime: 135, cost: 1164000, multiplier: 2 },
      t5: { baseTime: 165, cost: 2328000, multiplier: 3 },
    };

    const tier = tierData[kuudraTier];
    if (!tier) return 0;

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
    return tier.multiplier * (3600 / (tier.baseTime + costTime));
  }

  public calculateMultipliers(params: CalculationParams) {
    const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + ((2 * params.seaSerpentLevel) / 100) * tiamatMultiplier;
    const crocodileMultiplier = 1 + ((2 * params.crocodileLevel) / 100) * seaSerpentMultiplier;
    const pythonMultiplier = ((2 * params.pythonLevel) / 100) * seaSerpentMultiplier;
    const kingCobraMultiplier = (params.kingCobraLevel / 100) * seaSerpentMultiplier;
    const craftPenalty = 0.8 / 3600;

    return {
      tiamatMultiplier,
      seaSerpentMultiplier,
      crocodileMultiplier,
      pythonMultiplier,
      kingCobraMultiplier,
      craftPenalty,
    };
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

    effectiveFortune += rarityBonuses[shard.rarity] || 0;

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

  computeMinCosts(
    data: Data,
    crocodileLevel: number,
    seaSerpentLevel: number,
    tiamatLevel: number,
    recipeOverrides: RecipeOverride[] = []
  ): { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> } {
    const minCosts = new Map<string, number>();
    const choices = new Map<string, RecipeChoice>();
    const shards = Object.keys(data.shards);
    const multipliers = this.calculateMultipliers({ crocodileLevel, seaSerpentLevel, tiamatLevel } as CalculationParams);
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
        effectiveOutputQty: recipes.map((recipe) => (recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity)),
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
      const cost = data.shards[shard].rate > 0 ? 1 / data.shards[shard].rate : Infinity;
      minCosts.set(shard, cost);
      choices.set(shard, { recipe: null });
    });

    const queue: string[] = [...shards];
    const inQueue = new Set<string>(queue);
    const tolerance = 1e-10;

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
          const directCost = data.shards[outputShard].rate > 0 ? 1 / data.shards[outputShard].rate : Infinity;
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
        const effectiveOutputQuantity = overrideRecipe.isReptile ? overrideRecipe.outputQuantity * crocodileMultiplier : overrideRecipe.outputQuantity;
        const newCost = totalCost / effectiveOutputQuantity;

        if (Math.abs(newCost - currentCost) > tolerance) {
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

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
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
    const effectiveOutput = recipe.isReptile ? recipe.outputQuantity * context.crocodileMultiplier : recipe.outputQuantity;

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
    const { minCosts } = this.computeMinCosts(data, params.crocodileLevel, params.seaSerpentLevel, params.tiamatLevel, recipeOverrides);
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
      const directCost = data.shards[outputShard].rate > 0 ? 1 / data.shards[outputShard].rate : Infinity;
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

  private buildCycle(shard: string, choices: Map<string, RecipeChoice>, cycleNodes: string[][]): { outputShard: string; recipe: Recipe }[][] {
    const cycleSteps: { outputShard: string; recipe: Recipe }[][] = [];

    for (const cycle of cycleNodes) {
      if (cycle.includes(shard)) {
        const steps: { outputShard: string; recipe: Recipe }[] = [];
        for (const node of cycle) {
          const choice = choices.get(node);
          if (choice?.recipe) {
            steps.push({ outputShard: node, recipe: choice.recipe });
          }
        }
        cycleSteps.push(steps);
      }
    }

    return cycleSteps;
  }

  buildRecipeTree(
    data: Data,
    shard: string,
    choices1: Map<string, RecipeChoice>,
    cycleNodes: string[][],
    recipeOverrides: RecipeOverride[] = [],
    minCostsCache?: { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> }
  ): RecipeTree {
    if (!minCostsCache) {
      const result = this.computeMinCosts(data, 0, 0, 0, recipeOverrides);
      minCostsCache = { minCosts: result.minCosts, choices: result.choices };
    }

    if (cycleNodes.flat().includes(shard)) {
      const cycleSteps = this.buildCycle(shard, choices1, cycleNodes);
      const minCosts = minCostsCache.minCosts;
      const choices = minCostsCache.choices;
      const targetShard = cycleNodes.flat().reduce((minShard, shard) => {
        return minCosts.get(shard)! < minCosts.get(minShard)! ? shard : minShard;
      }, cycleNodes.flat()[0]);

      const tree = this.buildRecipeTree(data, targetShard, choices, [], recipeOverrides, minCostsCache);
      const craftCounter = { total: 0 };
      this.assignQuantities(tree, data.shards[targetShard].fuse_amount, data, craftCounter, choices, 1, recipeOverrides);

      return {
        shard,
        method: "cycle",
        quantity: 0,
        cycles: cycleSteps.map((steps) => ({
          steps,
          // These will be populated in assignQuantities
          expectedCrafts: 0,
          expectedOutput: 0,
          baseOutput: 0,
          multiplier: 1,
        })),
        craftsNeeded: 0,
        inputRecipe: tree,
      };
    }

    const choice = choices1.get(shard)!;
    if (choice.recipe === null) {
      return { shard, method: "direct", quantity: 0 };
    } else {
      const recipe = choice.recipe;
      const [input1, input2] = recipe.inputs;
      const tree1 = this.buildRecipeTree(data, input1, choices1, cycleNodes, recipeOverrides, minCostsCache);
      const tree2 = this.buildRecipeTree(data, input2, choices1, cycleNodes, recipeOverrides, minCostsCache);

      if (cycleNodes.flat().includes(shard)) {
        return {
          shard,
          method: "cycleNode",
          recipe,
          inputs: [tree1, tree2],
          quantity: 0,
          craftsNeeded: 0,
        };
      }

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
    recipeOverrides: RecipeOverride[] = []
  ): void {
    tree.quantity = requiredQuantity;

    switch (tree.method) {
      case "recipe": {
        const recipe = tree.recipe;
        const outputQuantity = recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity;
        const craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
        tree.craftsNeeded = craftsNeeded;
        craftCounter.total += craftsNeeded;

        const [input1, input2] = recipe.inputs;
        const fuse1 = data.shards[input1].fuse_amount;
        const fuse2 = data.shards[input2].fuse_amount;
        const input1Quantity = craftsNeeded * fuse1;
        const input2Quantity = craftsNeeded * fuse2;

        this.assignQuantities(tree.inputs[0], input1Quantity, data, craftCounter, choices, crocodileMultiplier, recipeOverrides);
        this.assignQuantities(tree.inputs[1], input2Quantity, data, craftCounter, choices, crocodileMultiplier, recipeOverrides);
        break;
      }
      case "cycleNode": {
        const recipe = tree.recipe;
        const outputQuantity = recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity;
        const craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
        tree.craftsNeeded = craftsNeeded;
        craftCounter.total += craftsNeeded;

        const [input1, input2] = recipe.inputs;
        const fuse1 = data.shards[input1].fuse_amount;
        const fuse2 = data.shards[input2].fuse_amount;

        this.assignQuantities(tree.inputs[0], fuse1, data, craftCounter, choices, crocodileMultiplier, recipeOverrides);
        this.assignQuantities(tree.inputs[1], fuse2, data, craftCounter, choices, crocodileMultiplier, recipeOverrides);
        break;
      }

      case "cycle":
        for (const cycle of tree.cycles) {
          const outputStep = cycle.steps.find((step) => step.outputShard === tree.shard);
          if (!outputStep) continue;

          const recipe = outputStep.recipe;
          const baseOutput = recipe.outputQuantity;
          const expectedOutput = recipe.isReptile ? baseOutput * crocodileMultiplier : baseOutput;

          // Calculate net output per cycle (gross output minus inputs consumed in the cycle)
          let totalInputsConsumed = 0;
          cycle.steps.forEach((step) => {
            step.recipe.inputs.forEach((inputId) => {
              if (inputId === tree.shard) {
                const inputShard = data.shards[inputId];
                totalInputsConsumed += inputShard.fuse_amount;
              }
            });
          });

          const netOutputPerCycle = expectedOutput - totalInputsConsumed;
          const expectedCrafts = netOutputPerCycle > 0 ? Math.ceil(requiredQuantity / netOutputPerCycle) : Math.ceil(requiredQuantity / expectedOutput);

          // Update cycle info
          cycle.expectedCrafts = expectedCrafts;
          cycle.expectedOutput = expectedOutput;
          cycle.baseOutput = baseOutput;
          cycle.multiplier = crocodileMultiplier;

          // Add total crafts for this cycle (not multiplied by steps - each cycle runs once)
          craftCounter.total += expectedCrafts;
        }
        tree.craftsNeeded = tree.cycles.reduce((sum, c) => sum + (c.expectedCrafts || 0), 0);

        // For cycles, we need to calculate the total quantities needed for external inputs
        // based on the number of cycles that will be run
        if (tree.cycles.length > 0) {
          const totalCycles = tree.cycles[0].expectedCrafts;

          // Calculate total quantities needed for each input shard across all cycles
          const inputQuantities = new Map<string, number>();

          // First, get all outputs produced within this cycle
          const outputShards = new Set(tree.cycles[0].steps.map((step) => step.outputShard));

          tree.cycles[0].steps.forEach((step) => {
            step.recipe.inputs.forEach((inputId) => {
              // Only count external inputs (not produced within the cycle)
              if (!outputShards.has(inputId)) {
                const inputShard = data.shards[inputId];
                const currentQuantity = inputQuantities.get(inputId) || 0;
                inputQuantities.set(inputId, currentQuantity + inputShard.fuse_amount);
              }
            });
          });

          // Assign quantities for each external input
          inputQuantities.forEach((quantityPerCycle, inputId) => {
            // This is an external input - calculate total needed
            const totalQuantityNeeded = quantityPerCycle * totalCycles;
            const inputChoice = choices.get(inputId);
            if (inputChoice && inputChoice.recipe) {
              const inputTree = this.buildRecipeTree(data, inputId, choices, [], recipeOverrides);
              this.assignQuantities(inputTree, totalQuantityNeeded, data, craftCounter, choices, crocodileMultiplier, recipeOverrides);
            }
          });
        }
        break;
    }
  }

  public collectTotalQuantities(tree: RecipeTree, data: Data): Map<string, number> {
    const totals = new Map<string, number>();

    const traverse = (node: RecipeTree) => {
      switch (node.method) {
        case "direct":
          totals.set(node.shard, (totals.get(node.shard) || 0) + node.quantity);
          break;

        case "recipe":
        case "cycleNode":
          node.inputs.forEach(traverse);
          break;

        case "cycle":
          if (node.cycles.length > 0) {
            for (const cycleRecipes of node.cycles) {
              // Use the correct number of cycles for this specific cycle
              const totalCrafts = cycleRecipes.expectedCrafts;

              // Get all outputs produced within this cycle
              const outputShardIds = new Set(cycleRecipes.steps.map((step) => step.outputShard));

              // Use a Set to avoid counting the same external input multiple times
              const externalInputs = new Set<string>();

              cycleRecipes.steps.forEach((recipe) => {
                const [input1, input2] = recipe.recipe.inputs;

                // Only count external inputs (not produced within the cycle)
                if (!outputShardIds.has(input1)) {
                  externalInputs.add(input1);
                }
                if (!outputShardIds.has(input2)) {
                  externalInputs.add(input2);
                }
              });

              // Now count each external input only once per cycle
              externalInputs.forEach((inputId) => {
                const inputShard = data.shards[inputId];
                if (inputShard) {
                  const quantity = inputShard.fuse_amount;
                  totals.set(inputId, (totals.get(inputId) || 0) + quantity * totalCrafts);
                }
              });
            }
            traverse(node.inputRecipe);
          }
          break;
      }
    };

    traverse(tree);
    return totals;
  }

  async calculateOptimalPath(targetShard: string, requiredQuantity: number, params: CalculationParams, recipeOverrides: RecipeOverride[] = []): Promise<CalculationResult> {
    const data = await this.parseData(params);

    if (!data.shards[targetShard]) {
      return {
        timePerShard: 0,
        totalTime: 0,
        totalShardsProduced: 0,
        craftsNeeded: 0,
        totalQuantities: new Map<string, number>(),
        totalFusions: 0,
        craftTime: 0,
        tree: { shard: targetShard, method: "direct", quantity: 0 },
      };
    }

    const { minCosts, choices } = this.computeMinCosts(data, params.crocodileLevel, params.seaSerpentLevel, params.tiamatLevel, recipeOverrides);
    const cycleNodes = params.crocodileLevel > 0 || recipeOverrides.length > 0 ? this.findCycleNodes(choices) : [];
    const tree = this.buildRecipeTree(data, targetShard, choices, cycleNodes, recipeOverrides);
    const craftCounter = { total: 0 };
    const multipliers = this.calculateMultipliers(params);
    const { crocodileMultiplier } = multipliers;
    this.assignQuantities(tree, requiredQuantity, data, craftCounter, choices, crocodileMultiplier, recipeOverrides);

    const totalQuantities = this.collectTotalQuantities(tree, data);

    let totalShardsProduced = requiredQuantity;
    let craftsNeeded = 1;
    const choice = choices.get(targetShard);

    if (choice?.recipe) {
      const outputQuantity = choice.recipe.isReptile ? choice.recipe.outputQuantity * crocodileMultiplier : choice.recipe.outputQuantity;
      craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
      totalShardsProduced = craftsNeeded * outputQuantity;
    }

    const timePerShard = minCosts.get(targetShard) ?? 0;
    const totalTime = timePerShard * totalShardsProduced;
    const craftTime = (craftCounter.total * 0.8) / 3600;

    return {
      timePerShard,
      totalTime,
      totalShardsProduced,
      craftsNeeded,
      totalQuantities,
      totalFusions: craftCounter.total,
      craftTime,
      tree,
    };
  }

  // Recipe overrides management
  async applyRecipeOverride(
    shardId: string,
    selectedRecipe: Recipe | null,
    targetShard: string,
    requiredQuantity: number,
    params: CalculationParams,
    existingOverrides: RecipeOverride[] = []
  ): Promise<CalculationResult> {
    // Create new override
    const newOverride: RecipeOverride = {
      shardId,
      recipe: selectedRecipe,
    };

    // Remove any existing override for this shard and add the new one
    const updatedOverrides = existingOverrides.filter((o) => o.shardId !== shardId);
    updatedOverrides.push(newOverride);

    // Recalculate with the new overrides
    return await this.calculateOptimalPath(targetShard, requiredQuantity, params, updatedOverrides);
  }
}

// Create and export a default instance
export const calculationService = new CalculationService();
export default calculationService;
