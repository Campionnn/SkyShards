import type {
  Data,
  RecipeChoice,
  RecipeTree,
  CalculationParams,
  CalculationResult,
  Shards,
  Recipes,
  Shard
} from "../types";
import { NO_FORTUNE_SHARDS, WOODEN_BAIT_SHARDS, BLACK_HOLE_SHARD } from "../constants";

export class CalculationService {
  private static instance: CalculationService;

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
            const isReptile = inputs.some(input => fusionJson.shards[input].family.includes("Reptile"));
            recipes[outputShard].push({ inputs, outputQuantity: qty, isReptile: isReptile });
          });
        }
      }

      const shards: Shards = {};
      for (const shardId in fusionJson.shards) {
        let rate = params.customRates[shardId] ?? defaultRates[shardId] ?? 0;

        // Handle Kuudra rates for L15
        if (shardId === "L15" && rate === 0) {
          rate = this.calculateKuudraRate(params.kuudraTier, params.moneyPerHour);
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

    const costTime = moneyPerHour === 0 ? 0 : (tier.cost / moneyPerHour) * 3600;
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

  computeMinCosts(data: Data, crocodileLevel: number): { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> } {
    const minCosts = new Map<string, number>();
    const choices = new Map<string, RecipeChoice>();
    const shards = Object.keys(data.shards);
    const crocodileMultiplier = 1 + ((2 * crocodileLevel) / 100);
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
      shards.forEach((outputShard) => {
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
      });
    }

    return { minCosts, choices };
  }

  buildRecipeTree(shard: string, choices: Map<string, RecipeChoice>): RecipeTree {
    const choice = choices.get(shard)!;
    if (choice.recipe === null) {
      return { shard, method: "direct", quantity: 0 };
    } else {
      const recipe = choice.recipe;
      const [input1, input2] = recipe.inputs;
      const tree1 = this.buildRecipeTree(input1, choices);
      const tree2 = this.buildRecipeTree(input2, choices);
      return { shard, method: "recipe", recipe, inputs: [tree1, tree2], quantity: 0 };
    }
  }

  assignQuantities(tree: RecipeTree, requiredQuantity: number, data: Data, craftCounter: { total: number }, crocodileMultiplier: number): void {
    tree.quantity = requiredQuantity;
    if (tree.method === "recipe") {
      const recipe = tree.recipe!;
      const outputQuantity = recipe.isReptile ? recipe.outputQuantity * crocodileMultiplier : recipe.outputQuantity;
      const craftsNeeded = Math.ceil(requiredQuantity / outputQuantity);
      craftCounter.total += craftsNeeded;
      const [input1, input2] = recipe.inputs;
      const fuse1 = data.shards[input1].fuse_amount;
      const fuse2 = data.shards[input2].fuse_amount;
      const input1Quantity = craftsNeeded * fuse1;
      const input2Quantity = craftsNeeded * fuse2;
      this.assignQuantities(tree.inputs![0], input1Quantity, data, craftCounter, crocodileMultiplier);
      this.assignQuantities(tree.inputs![1], input2Quantity, data, craftCounter, crocodileMultiplier);
    }
  }

  collectTotalQuantities(tree: RecipeTree): Map<string, number> {
    const totals = new Map<string, number>();
    const traverse = (node: RecipeTree) => {
      if (node.method === "direct") {
        const current = totals.get(node.shard) || 0;
        totals.set(node.shard, current + node.quantity);
      } else {
        node.inputs!.forEach(traverse);
      }
    };
    traverse(tree);
    return totals;
  }

  decimalHoursToHoursMinutes(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    if (hours === 0) {
      return `${minutes} minutes`;
    }
    if (minutes === 0 || isNaN(minutes)) {
      return `${hours} hours`;
    }
    return `${hours} hours ${minutes} minutes`;
  }

  async calculateOptimalPath(targetShard: string, requiredQuantity: number, params: CalculationParams): Promise<CalculationResult> {
    const data = await this.parseData(params);

    if (!data.shards[targetShard]) {
      // Return empty result instead of throwing to prevent console noise
      return {
        timePerShard: 0,
        totalTime: 0,
        totalShardsProduced: 0,
        craftsNeeded: 0,
        totalQuantities: new Map<string, number>(),
        totalFusions: 0,
        craftTime: 0,
        tree: { shard: targetShard, method: "direct", quantity: 0, inputs: [] },
      };
    }

    const { minCosts, choices } = this.computeMinCosts(data, params.crocodileLevel);
    console.log(choices);
    const tree = this.buildRecipeTree(targetShard, choices);
    const craftCounter = { total: 0 };
    const crocodileMultiplier = 1 + ((2 * params.crocodileLevel) / 100);
    this.assignQuantities(tree, requiredQuantity, data, craftCounter, crocodileMultiplier);
    const totalQuantities = this.collectTotalQuantities(tree);

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
