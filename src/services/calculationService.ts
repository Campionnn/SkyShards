import type {
  CalculationParams,
  CalculationResult,
  Data,
  Recipe,
  RecipeChoice,
  RecipeOverride,
  Recipes,
  RecipeTree,
  Shard,
  Shards
} from "../types";
import {BLACK_HOLE_SHARD, NO_FORTUNE_SHARDS, WOODEN_BAIT_SHARDS} from "../constants";

export class CalculationService {
  private static instance: CalculationService;
  private dataCache?: Data;
  private minCostsCache?: Map<string, number>;

  public static getInstance(): CalculationService {
    if (!CalculationService.instance) {
      CalculationService.instance = new CalculationService();
    }
    return CalculationService.instance;
  }

  async parseData(params: CalculationParams): Promise<Data> {
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
          // Apply wooden bait modifier
          if (params.noWoodenBait && WOODEN_BAIT_SHARDS.includes(shardId)) {
            rate *= 0.05;
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

      return { recipes, shards };
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

  private applyFortuneModifiers(rate: number, shardId: string, shard: Shard, params: CalculationParams): number {
    let effectiveFortune = params.hunterFortune;

    const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + ((2 * params.seaSerpentLevel) / 100) * tiamatMultiplier;
    const pythonMultiplier = ((2 * params.pythonLevel) / 100) * seaSerpentMultiplier;
    const kingCobraMultiplier = (params.kingCobraLevel / 100) * seaSerpentMultiplier;

    // Apply rarity bonuses
    switch (shard.rarity) {
      case "common":
        effectiveFortune += 2 * params.newtLevel;
        break;
      case "uncommon":
        effectiveFortune += 2 * params.salamanderLevel;
        break;
      case "rare":
        effectiveFortune += params.lizardKingLevel;
        break;
      case "epic":
        effectiveFortune += params.leviathanLevel;
        break;
    }

    // Apply frog pet bonus
    if (params.frogPet) {
      rate *= 1.1;
    }

    // Apply black hole shard bonuses
    if (shardId in BLACK_HOLE_SHARD) {
      if (BLACK_HOLE_SHARD[shardId]) {
        rate *= 1 + pythonMultiplier;
      }
      effectiveFortune *= 1 + kingCobraMultiplier;
    }

    return rate * (1 + effectiveFortune / 100);
  }

  private areRecipesEqual(a: Recipe, b: Recipe | null | undefined): boolean {
    if (!b) return false;
    return (
        a.inputs[0] === b.inputs[0] &&
        a.inputs[1] === b.inputs[1] &&
        a.outputQuantity === b.outputQuantity &&
        a.isReptile === b.isReptile
    );
  }

  computeMinCosts(
    data: Data,
    crocodileLevel: number,
    seaSerpentLevel: number,
    tiamatLevel: number,
    recipeOverrides: RecipeOverride[] = [],
  ): { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> } {
    const minCosts = new Map<string, number>();
    const choices = new Map<string, RecipeChoice>();
    const shards = Object.keys(data.shards);
    const tiamatMultiplier = 1 + (5 * tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + (2 * seaSerpentLevel / 100) * tiamatMultiplier;
    const crocodileMultiplier = 1 + (2 * crocodileLevel / 100) * seaSerpentMultiplier;
    const craftPenalty = 0.8 / 3600;

    // Initialize with direct costs
    shards.forEach((shard) => {
      const cost = data.shards[shard].rate > 0 ? 1 / data.shards[shard].rate : Infinity;
      minCosts.set(shard, cost);
      choices.set(shard, { recipe: null });
    });

    // Iteratively find better recipes
    let updated = true;
    while (updated) {
      updated = false;
      for (const outputShard of shards) {
        const recipeOverride = recipeOverrides.find(ro => ro.shardId === outputShard);
        if (recipeOverride) {
          const overrideRecipe = recipeOverride.recipe;
          if (overrideRecipe === null) {
            continue;
          }
          const fuse1 = data.shards[overrideRecipe.inputs[0]].fuse_amount;
          const fuse2 = data.shards[overrideRecipe.inputs[1]].fuse_amount;
          const costInput1 = minCosts.get(overrideRecipe.inputs[0])! * fuse1;
          const costInput2 = minCosts.get(overrideRecipe.inputs[1])! * fuse2;
          const totalCost = costInput1 + costInput2 + craftPenalty;
          const effectiveOutputQuantity = overrideRecipe.isReptile ? overrideRecipe.outputQuantity * crocodileMultiplier : overrideRecipe.outputQuantity;
          const newCost = totalCost / effectiveOutputQuantity;

          const currentCost = minCosts.get(outputShard)!;
          const currentRecipe = choices.get(outputShard)?.recipe;

          const recipeChanged = !this.areRecipesEqual(overrideRecipe, currentRecipe);
          if (newCost !== currentCost || recipeChanged) {
            minCosts.set(outputShard, newCost);
            choices.set(outputShard, { recipe: overrideRecipe });
            updated = true;
          }

          continue;
        }
        const recipes = data.recipes[outputShard] || [];
        recipes.forEach((recipe) => {
          const [input1, input2] = recipe.inputs;
          const fuse1 = data.shards[input1].fuse_amount;
          const fuse2 = data.shards[input2].fuse_amount;
          const costInput1 = minCosts.get(input1)! * fuse1;
          const costInput2 = minCosts.get(input2)! * fuse2;
          const totalCost = costInput1 + costInput2 + craftPenalty;
          const effectiveOutputQuantity = recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity;
          const costPerUnit = totalCost / effectiveOutputQuantity;
          if (costPerUnit < minCosts.get(outputShard)!) {
            minCosts.set(outputShard, costPerUnit);
            choices.set(outputShard, { recipe });
            updated = true;
          }
        });
      }
    }

    return { minCosts, choices };
  }

  private async ensureCache(params: CalculationParams): Promise<void> {
    if (!this.dataCache) {
      this.dataCache = await this.parseData(params);
    }
    if (!this.minCostsCache) {
      const { minCosts } = this.computeMinCosts(
          this.dataCache,
          params.crocodileLevel,
          params.seaSerpentLevel,
          params.tiamatLevel
      );
      this.minCostsCache = minCosts;
    }
  }

  private getCostCalculationContext(params: CalculationParams) {
    const craftPenalty = 0.8 / 3600;
    const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + (2 * params.seaSerpentLevel / 100) * tiamatMultiplier;
    const crocodileMultiplier = 1 + (2 * params.crocodileLevel / 100) * seaSerpentMultiplier;

    return {
      craftPenalty,
      crocodileMultiplier
    };
  }

  private calculateRecipeCost(
      recipe: Recipe,
      context: ReturnType<typeof this.getCostCalculationContext>,
      data: Data,
      minCosts: Map<string, number>
  ): number {
    const [input1, input2] = recipe.inputs;
    const fuse1 = data.shards[input1].fuse_amount;
    const fuse2 = data.shards[input2].fuse_amount;

    const cost1 = minCosts.get(input1) || Infinity;
    const cost2 = minCosts.get(input2) || Infinity;

    const totalCost = (cost1 * fuse1) + (cost2 * fuse2) + context.craftPenalty;
    const effectiveOutput = recipe.isReptile ?
        recipe.outputQuantity * context.crocodileMultiplier :
        recipe.outputQuantity;

    return totalCost / effectiveOutput;
  }

  private processAlternatives(
      alternatives: {recipe: Recipe | null; cost: number}[]
  ): {recipe: Recipe | null; cost: number}[] {
    return alternatives
        .sort((a, b) => a.cost - b.cost)
        .filter((alt, index, self) => {
          if (alt.recipe === null) return true; // Keep direct option

          const isDuplicate = self.findIndex(
              a => a.recipe &&
                  alt.recipe &&
                  a.recipe.inputs.sort().toString() === alt.recipe.inputs.sort().toString()
          ) !== index;

          return !isDuplicate;
        })
        .slice(0, 5);
  }

  async getAlternativeRecipe(
      outputShard: string,
      params: CalculationParams
  ): Promise<{ recipe: Recipe | null; cost: number }[]> {
    await this.ensureCache(params);
    const context = this.getCostCalculationContext(params);
    const alternatives: {recipe: Recipe | null, cost: number}[] = [];

    // Calculate costs for all recipes
    for (const recipe of this.dataCache!.recipes[outputShard] || []) {
      const cost = this.calculateRecipeCost(
          recipe,
          context,
          this.dataCache!,
          this.minCostsCache!
      );
      alternatives.push({ recipe, cost });
    }

    // Add direct option
    const directCost = this.dataCache!.shards[outputShard].rate > 0 ?
        1 / this.dataCache!.shards[outputShard].rate :
        Infinity;
    alternatives.push({ recipe: null, cost: directCost });

    return this.processAlternatives(alternatives);
  }

  async getAlternativeDirect(
      inputShard: string,
      otherInputShard: string,
      outputShard: string,
      params: CalculationParams
  ): Promise<{ recipe: Recipe | null; cost: number; }[]> {
    await this.ensureCache(params);
    const context = this.getCostCalculationContext(params);
    const alternatives: {recipe: Recipe | null, cost: number}[] = [];
    const recipes = this.dataCache!.recipes[outputShard] || [];

    // Find compatible recipes
    for (const recipe of recipes) {
      const [input1, input2] = recipe.inputs;

      if (
          (input1 === otherInputShard || input2 === otherInputShard) &&
          (input1 !== inputShard && input2 !== inputShard)
      ) {
        const cost = this.calculateRecipeCost(
            recipe,
            context,
            this.dataCache!,
            this.minCostsCache!
        );
        alternatives.push({ recipe, cost });
      }
    }

    return this.processAlternatives(alternatives);
  }

  private findCycleNodes(choices: Map<string, RecipeChoice>): string[][] {
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

  buildRecipeTree(data: Data, shard: string, choices1: Map<string, RecipeChoice>, cycleNodes: string[][]): RecipeTree {
    if (cycleNodes.flat().includes(shard)) {
      const cycleSteps = this.buildCycle(shard, choices1, cycleNodes);
      const { minCosts, choices } = this.computeMinCosts(data, 0, 0, 0);
      const targetShard = cycleNodes.flat().reduce((minShard, shard) => {
        return minCosts.get(shard)! < minCosts.get(minShard)! ? shard : minShard;
      }, cycleNodes.flat()[0]);

      const tree = this.buildRecipeTree(data, targetShard, choices, []);
      const craftCounter = { total: 0 };
      this.assignQuantities(tree, data.shards[targetShard].fuse_amount, data, craftCounter, choices, 1);
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
      const tree1 = this.buildRecipeTree(data, input1, choices1, cycleNodes);
      const tree2 = this.buildRecipeTree(data, input2, choices1, cycleNodes);

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

  assignQuantities(tree: RecipeTree, requiredQuantity: number, data: Data, craftCounter: { total: number }, choices: Map<string, RecipeChoice>, crocodileMultiplier: number): void {
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

        this.assignQuantities(tree.inputs[0], input1Quantity, data, craftCounter, choices, crocodileMultiplier);
        this.assignQuantities(tree.inputs[1], input2Quantity, data, craftCounter, choices, crocodileMultiplier);
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

        this.assignQuantities(tree.inputs[0], fuse1, data, craftCounter, choices, crocodileMultiplier);
        this.assignQuantities(tree.inputs[1], fuse2, data, craftCounter, choices, crocodileMultiplier);
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

          craftCounter.total += expectedCrafts * cycle.steps.length;
        }
        tree.craftsNeeded = tree.cycles.reduce((sum, c) => sum + (c.expectedCrafts || 0), 0);

        // For cycles, we need to calculate the total quantities needed for external inputs
        // based on the number of cycles that will be run
        if (tree.cycles.length > 0) {
          const totalCycles = tree.cycles[0].expectedCrafts;

          // Calculate total quantities needed for each input shard across all cycles
          const inputQuantities = new Map<string, number>();

          tree.cycles[0].steps.forEach((step) => {
            step.recipe.inputs.forEach((inputId) => {
              const inputShard = data.shards[inputId];
              const currentQuantity = inputQuantities.get(inputId) || 0;
              inputQuantities.set(inputId, currentQuantity + inputShard.fuse_amount);
            });
          });

          // Assign quantities for each external input (inputs that don't appear as outputs in the cycle)
          const outputShards = new Set(tree.cycles[0].steps.map((step) => step.outputShard));

          inputQuantities.forEach((quantityPerCycle, inputId) => {
            if (!outputShards.has(inputId)) {
              // This is an external input - calculate total needed
              const totalQuantityNeeded = quantityPerCycle * totalCycles;
              const inputChoice = choices.get(inputId);
              if (inputChoice && inputChoice.recipe) {
                const inputTree = this.buildRecipeTree(data, inputId, choices, []);
                this.assignQuantities(inputTree, totalQuantityNeeded, data, craftCounter, choices, crocodileMultiplier);
              }
            }
          });
        }
        break;
    }
  }

  private collectTotalQuantities(tree: RecipeTree, data: Data): Map<string, number> {
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
              // Use the correct number of cycles without additional multiplier
              const totalCrafts = node.cycles[0].expectedCrafts;

              const cycleInputs = new Map<string, number>();
              cycleRecipes.steps.forEach((recipe) => {
                const [input1, input2] = recipe.recipe.inputs;
                const fuse1 = data.shards[input1].fuse_amount;
                const fuse2 = data.shards[input2].fuse_amount;

                if (!data.shards[input1].family.includes("Reptile")) {
                  cycleInputs.set(input1, (cycleInputs.get(input1) || 0) + totalCrafts * fuse1);
                }
                if (!data.shards[input2].family.includes("Reptile")) {
                  cycleInputs.set(input2, (cycleInputs.get(input2) || 0) + totalCrafts * fuse2);
                }
              });

              cycleInputs.forEach((quantity, shard) => {
                totals.set(shard, (totals.get(shard) || 0) + quantity);
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

  async calculateOptimalPath(targetShard: string, requiredQuantity: number, params: CalculationParams): Promise<CalculationResult> {
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

    const recipeOverrides: RecipeOverride[] = [];
    // recipeOverrides.push({shardId: "L44", recipe: { inputs: ["L3", "L41"], outputQuantity: 2, isReptile: false }});

    const { minCosts, choices } = this.computeMinCosts(data, params.crocodileLevel, params.seaSerpentLevel, params.tiamatLevel, recipeOverrides);
    this.dataCache = data;
    this.minCostsCache = minCosts;
    const cycleNodes = params.crocodileLevel > 0 ? this.findCycleNodes(choices) : [];
    const tree = this.buildRecipeTree(data, targetShard, choices, cycleNodes);
    const craftCounter = { total: 0 };
    const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
    const seaSerpentMultiplier = 1 + ((2 * params.seaSerpentLevel) / 100) * tiamatMultiplier;
    const crocodileMultiplier = 1 + ((2 * params.crocodileLevel) / 100) * seaSerpentMultiplier;
    this.assignQuantities(tree, requiredQuantity, data, craftCounter, choices, crocodileMultiplier);

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
}
