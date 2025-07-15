import type { CalculationParams, CalculationResult, RecipeOverride } from "../types/types";

export interface AsyncCalculationProgress {
  phase: string;
  progress: number;
  message: string;
}

export class AsyncCalculationService {
  private static instance: AsyncCalculationService;
  private abortController: AbortController | null = null;

  public static getInstance(): AsyncCalculationService {
    if (!AsyncCalculationService.instance) {
      AsyncCalculationService.instance = new AsyncCalculationService();
    }
    return AsyncCalculationService.instance;
  }

  private async yieldToUI(intervalMs: number = 5): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  async calculateOptimalPathAsync(
    targetShard: string,
    requiredQuantity: number,
    params: CalculationParams,
    recipeOverrides: RecipeOverride[] = [],
    onProgress?: (progress: AsyncCalculationProgress) => void
  ): Promise<CalculationResult> {
    this.abortController = new AbortController();

    try {
      const { CalculationService } = await import("../services/calculationService");
      const calculationService = CalculationService.getInstance();

      onProgress?.({ phase: "parsing", progress: 0, message: "Parsing shard data..." });

      const data = await calculationService.parseData(params);

      if (this.abortController.signal.aborted) {
        throw new Error("Calculation cancelled");
      }

      onProgress?.({ phase: "parsing", progress: 1, message: "Data parsed successfully" });

      onProgress?.({ phase: "computing", progress: 0, message: "Computing optimal costs..." });

      const shardIds = Object.keys(data.shards);
      let processedShards = 0;

      const originalComputeMinCosts = calculationService.computeMinCosts.bind(calculationService);

      let costComputation: Promise<any>;

      costComputation = new Promise((resolve, reject) => {
        const runComputation = async () => {
          try {
            await this.yieldToUI();

            const result = originalComputeMinCosts(data, params.crocodileLevel, params.seaSerpentLevel, params.tiamatLevel, recipeOverrides);

            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        setTimeout(runComputation, 0);
      });

      const progressInterval = setInterval(() => {
        if (!this.abortController?.signal.aborted) {
          processedShards = Math.min(processedShards + 50, shardIds.length);
          onProgress?.({
            phase: "computing",
            progress: (processedShards / shardIds.length) * 0.8,
            message: `Processing shard calculations... (${processedShards}/${shardIds.length})`,
          });
        }
      }, 100);

      const { minCosts, choices } = await costComputation;
      clearInterval(progressInterval);

      if (this.abortController.signal.aborted) {
        throw new Error("Calculation cancelled");
      }

      onProgress?.({ phase: "computing", progress: 1, message: "Optimal costs computed" });

      onProgress?.({ phase: "building", progress: 0, message: "Building recipe tree..." });

      await this.yieldToUI();

      const cycleNodes = calculationService.findCycleNodes(choices);
      const tree = calculationService.buildRecipeTree(data, targetShard, choices, cycleNodes, recipeOverrides);

      if (this.abortController.signal.aborted) {
        throw new Error("Calculation cancelled");
      }

      onProgress?.({ phase: "building", progress: 0.5, message: "Assigning quantities..." });

      await this.yieldToUI();

      const multipliers = calculationService.calculateMultipliers(params);
      const craftCounter = { total: 0 };

      calculationService.assignQuantities(tree, requiredQuantity, data, craftCounter, choices, multipliers.crocodileMultiplier, recipeOverrides);

      if (this.abortController.signal.aborted) {
        throw new Error("Calculation cancelled");
      }

      onProgress?.({ phase: "building", progress: 1, message: "Recipe tree built" });

      onProgress?.({ phase: "finalizing", progress: 0, message: "Finalizing results..." });

      await this.yieldToUI();

      const totalQuantities = calculationService.collectTotalQuantities(tree, data);
      const timePerShard = minCosts.get(targetShard) || 0;
      const totalTime = timePerShard * requiredQuantity;

      const result: CalculationResult = {
        timePerShard,
        totalTime,
        totalShardsProduced: requiredQuantity,
        craftsNeeded: craftCounter.total,
        totalQuantities,
        totalFusions: craftCounter.total,
        craftTime: totalTime,
        tree,
      };

      onProgress?.({ phase: "finalizing", progress: 1, message: "Calculation complete!" });

      return result;
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        throw new Error("Calculation cancelled");
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  cancelCalculation(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  isCalculating(): boolean {
    return this.abortController !== null;
  }
}

export default AsyncCalculationService;
