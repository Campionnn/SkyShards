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
    let totalTime = 0;
    const plan: InventoryRecipeTree[] = [];
    const totalQuantities = new Map<string, number>();
    let totalFusions = 0;

    // Use inventory first if available
    if (inventory.get(targetShard)! > 0) {
      const available = inventory.get(targetShard) || 0;
      const usedFromInventory = Math.min(available, requiredQuantity);
      workingInventory.set(targetShard, available - usedFromInventory);
      requiredQuantity -= usedFromInventory;

      plan.push({
        shard: targetShard,
        method: "inventory",
        quantity: usedFromInventory,
      });
    }

    if (requiredQuantity > 0) {

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
