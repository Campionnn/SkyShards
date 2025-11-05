import { CalculationService } from "../services";
import type {
  CalculationParams,
  InventoryCalculationResult,
  InventoryRecipeTree,
  Data,
  RecipeChoice,
} from "../types/types";

export class InvCalculationService {
  private static instance: InvCalculationService;
  private service = new CalculationService();

  public static getInstance(): InvCalculationService {
    if (!InvCalculationService.instance) {
      InvCalculationService.instance = new InvCalculationService();
    }
    return InvCalculationService.instance;
  }

  private getInventoryAdjustedCost(
    shardId: string,
    baseCost: number,
    inventory: Map<string, number>,
    fuseAmount: number,
    kValues: Map<string, number>
  ): number {
    const inv = inventory.get(shardId) || 0;
    if (inv >= fuseAmount) {
      const k = kValues.get(shardId) || 0.05;
      return baseCost * (1 / (1 + k * inv));
    }
    return baseCost;
  }

  private buildRecipeTree(
    data: Data,
    targetShard: string,
    requiredQuantity: number,
    minCosts: Map<string, number>,
    choices: Map<string, RecipeChoice>,
    params: CalculationParams,
    inventory: Map<string, number>,
    kValues: Map<string, number>,
  ): InventoryRecipeTree {
    const plan: InventoryRecipeTree[] = [];
    let remaining = requiredQuantity;

    while (remaining > 0) {
      // Check if using inventory is better for the targetShard itself
      const invQty = inventory.get(targetShard) || 0;
      if (invQty > 0) {
        const k = kValues.get(targetShard) || 0.05;
        const invCost = minCosts.get(targetShard)! * (1 / (1 + k * invQty));
        const craftCost = minCosts.get(targetShard)!;
        if (invCost < craftCost) {
          const useFromInventory = Math.min(invQty, remaining);
          inventory.set(targetShard, invQty - useFromInventory);
          plan.push({
            shard: targetShard,
            method: "inventory",
            quantity: useFromInventory,
          });
          remaining -= useFromInventory;
          continue;
        }
      }

      // Check all recipes and find the one with the lowest effective cost
      const allRecipes = data.recipes[targetShard] || [];
      const choice = choices.get(targetShard)!;

      if (choice.recipe === null || allRecipes.length === 0) {
        plan.push({
          shard: targetShard,
          method: "direct",
          quantity: remaining,
        });
        remaining = 0;
        break;
      }

      // Calculate effective cost for each recipe considering inventory
      const { crocodileMultiplier } = this.service.calculateMultipliers(params);

      // Evaluate all recipes and choose the best one
      let bestRecipe = choice.recipe;
      let bestCostPerOutput = Infinity;

      for (const recipe of allRecipes) {
        const [input1Id, input2Id] = recipe.inputs;
        const fuse1 = data.shards[input1Id].fuse_amount;
        const fuse2 = data.shards[input2Id].fuse_amount;

        const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);

        // Calculate the effective cost for each input considering inventory
        const baseCost1 = minCosts.get(input1Id) || 0;
        const baseCost2 = minCosts.get(input2Id) || 0;

        const effectiveCost1 = this.getInventoryAdjustedCost(input1Id, baseCost1, inventory, fuse1, kValues);
        const effectiveCost2 = this.getInventoryAdjustedCost(input2Id, baseCost2, inventory, fuse2, kValues);

        const totalCost = effectiveCost1 * fuse1 + effectiveCost2 * fuse2;
        const costPerOutput = totalCost / outputQuantity;

        if (costPerOutput < bestCostPerOutput) {
          bestCostPerOutput = costPerOutput;
          bestRecipe = recipe;
        }
      }

      // Use the best recipe and determine how many crafts we can do before re-evaluating
      const recipe = bestRecipe;
      const [input1Id, input2Id] = recipe.inputs;
      const fuse1 = data.shards[input1Id].fuse_amount;
      const fuse2 = data.shards[input2Id].fuse_amount;
      const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);

      // Calculate how many crafts we can do with this recipe before inventory runs out
      const inv1 = inventory.get(input1Id) || 0;
      const inv2 = inventory.get(input2Id) || 0;
      const maxCraftsFromInv1 = inv1 >= fuse1 ? Math.floor(inv1 / fuse1) : 0;
      const maxCraftsFromInv2 = inv2 >= fuse2 ? Math.floor(inv2 / fuse2) : 0;

      // Determine how many crafts to batch together
      let craftsNeeded: number;
      if (maxCraftsFromInv1 > 0 && maxCraftsFromInv2 > 0) {
        // Both inputs have inventory - batch until one runs out
        craftsNeeded = Math.min(maxCraftsFromInv1, maxCraftsFromInv2, Math.ceil(remaining / outputQuantity));
      } else if (maxCraftsFromInv1 > 0 || maxCraftsFromInv2 > 0) {
        // Only one input has inventory - batch until it runs out
        craftsNeeded = Math.min(Math.max(maxCraftsFromInv1, maxCraftsFromInv2), Math.ceil(remaining / outputQuantity));
      } else {
        // No inventory for either input - batch all remaining crafts
        craftsNeeded = Math.ceil(remaining / outputQuantity);
      }

      const quantityProduced = Math.min(craftsNeeded * outputQuantity, remaining);
      const input1Quantity = craftsNeeded * fuse1;
      const input2Quantity = craftsNeeded * fuse2;

      const input1Tree = this.buildRecipeTree(
        data,
        input1Id,
        input1Quantity,
        minCosts,
        choices,
        params,
        inventory,
        kValues
      );
      const input2Tree = this.buildRecipeTree(
        data,
        input2Id,
        input2Quantity,
        minCosts,
        choices,
        params,
        inventory,
        kValues
      );

      plan.push({
        shard: targetShard,
        method: "recipe",
        quantity: quantityProduced,
        recipe: recipe,
        inputs: [input1Tree, input2Tree],
        craftsNeeded: craftsNeeded,
      });

      remaining -= quantityProduced;
    }


    return plan.length === 1 ? plan[0] : plan;
  }

  async calculateOptimalPath(
    targetShard: string,
    requiredQuantity: number,
    params: CalculationParams,
    inventory: Map<string, number>,
    kValues: Map<string, number> = new Map()
  ): Promise<InventoryCalculationResult> {
    const parsed = await this.service.parseData(params);

    if (!parsed.shards[targetShard]) {
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

    const { minCosts, choices } = this.service.computeMinCosts(parsed, params, []);

    // Clone inventory to avoid mutating the original
    const workingInventory = new Map(inventory);

    // Track total time and plan
    const totalTime = 0;
    const plan: InventoryRecipeTree[] = [];
    const totalQuantities = new Map<string, number>();
    const totalFusions = 0;

    // Use inventory first if available
    if (inventory.get(targetShard)! > 0) {
      const available = inventory.get(targetShard) || 0;
      const usedFromInventory = Math.min(available, requiredQuantity);
      workingInventory.set(targetShard, available - usedFromInventory);
      requiredQuantity -= usedFromInventory;
      inventory.set(targetShard, available - usedFromInventory);

      plan.push({
        shard: targetShard,
        method: "inventory",
        quantity: usedFromInventory,
      });
    }

    if (requiredQuantity > 0) {
      const tree = this.buildRecipeTree(
        parsed,
        targetShard,
        requiredQuantity,
        minCosts,
        choices,
        params,
        inventory,
        kValues
      )
      plan.push(tree);
    }

    return {
      timePerShard: 0,
      totalTime,
      totalShardsProduced: requiredQuantity,
      craftsNeeded: totalFusions,
      totalQuantities,
      totalFusions,
      craftTime: 0,
      tree: plan.length === 1 ? plan[0] : plan,
    };
  }
}

const invCalculationService = new InvCalculationService();
export default invCalculationService;
