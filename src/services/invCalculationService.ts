import { CalculationService } from "../services";
import type {
  CalculationParams,
  Data,
  InventoryCalculationResult,
  InventoryRecipeTree,
  Recipe,
  RecipeOverride,
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
      const k = kValues.has(shardId) ? kValues.get(shardId)! : 0.05;
      return baseCost * (1 / (1 + k * inv));
    }
    return baseCost;
  }

  public async computeInventoryAdjustedMinCosts(
    params: CalculationParams,
    inventory: Map<string, number>,
    kValues: Map<string, number> = new Map()
  ): Promise<Map<string, number>> {
    const parsed = await this.service.parseData(params);
    const { minCosts } = this.service.computeMinCosts(parsed, params, []);

    // Create adjusted costs map
    const adjustedCosts = new Map<string, number>();

    for (const [shardId, baseCost] of minCosts.entries()) {
      const shard = parsed.shards[shardId];
      if (shard) {
        const adjustedCost = this.getInventoryAdjustedCost(
          shardId,
          baseCost,
          inventory,
          shard.fuse_amount,
          kValues
        );
        adjustedCosts.set(shardId, adjustedCost);
      }
    }

    return adjustedCosts;
  }

  private recalculateTreeQuantities(
    tree: InventoryRecipeTree,
    newQuantity: number,
    parsed: Data,
    params: CalculationParams
  ): void {
    // Skip array nodes
    if (Array.isArray(tree)) {
      return;
    }

    tree.quantity = newQuantity;

    if (tree.method === "recipe") {
      const recipe = tree.recipe;
      const { crocodileMultiplier } = this.service.calculateMultipliers(params);
      const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
      const craftsNeeded = Math.ceil(newQuantity / outputQuantity);
      tree.craftsNeeded = craftsNeeded;

      const [input1Id, input2Id] = recipe.inputs;
      const fuse1 = parsed.shards[input1Id].fuse_amount;
      const fuse2 = parsed.shards[input2Id].fuse_amount;

      this.recalculateTreeQuantities(tree.inputs[0], craftsNeeded * fuse1, parsed, params);
      this.recalculateTreeQuantities(tree.inputs[1], craftsNeeded * fuse2, parsed, params);
    } else if (tree.method === "cycle") {
      const outputStep = tree.steps.find((step) => step.outputShard === tree.shard);
      if (!outputStep) return;

      const { crocodileMultiplier } = this.service.calculateMultipliers(params);
      const recipe = outputStep.recipe;
      const baseOutput = recipe.outputQuantity;
      const expectedOutput = recipe.isReptile ? baseOutput * crocodileMultiplier : baseOutput;

      let totalInputsConsumed = 0;
      tree.steps.forEach((step) => {
        step.recipe.inputs.forEach((inputId) => {
          if (inputId === tree.shard) {
            const inputShard = parsed.shards[inputId];
            totalInputsConsumed += inputShard.fuse_amount;
          }
        });
      });

      const netOutputPerCycle = expectedOutput - totalInputsConsumed;
      const expectedCrafts = netOutputPerCycle > 0 ? Math.ceil(newQuantity / netOutputPerCycle) : Math.ceil(newQuantity / expectedOutput);
      const stepCount = tree.steps.length;
      const roundedCrafts = Math.ceil(expectedCrafts / stepCount) * stepCount;
      tree.craftsNeeded = roundedCrafts;

      const inputQuantities = new Map<string, number>();
      const outputShards = new Set(tree.steps.map((step) => step.outputShard));

      tree.steps.forEach((step) => {
        step.recipe.inputs.forEach((inputId) => {
          if (!outputShards.has(inputId)) {
            const inputShard = parsed.shards[inputId];
            const currentQuantity = inputQuantities.get(inputId) || 0;
            inputQuantities.set(inputId, currentQuantity + inputShard.fuse_amount);
          }
        });
      });

      tree.cycleInputs.forEach((cycleInput) => {
        if (!Array.isArray(cycleInput) && cycleInput.method !== "inventory") {
          const inputQuantity = inputQuantities.get(cycleInput.shard) || 0;
          const totalInputQuantity = inputQuantity * (roundedCrafts / stepCount);
          this.recalculateTreeQuantities(cycleInput, totalInputQuantity, parsed, params);
        }
      });
    }
  }

  private async substituteInventoryBFS(
    tree: InventoryRecipeTree,
    inventory: Map<string, number>,
    params: CalculationParams
  ): Promise<InventoryRecipeTree> {
    const workingInventory = new Map(inventory);
    const parsed = await this.service.parseData(params);

    // Track processed nodes to avoid reprocessing the same object reference
    const processedNodes = new WeakMap<object, InventoryRecipeTree>();

    const processNode = async (node: InventoryRecipeTree, depth: number = 0): Promise<InventoryRecipeTree> => {
      // Handle array nodes by processing each element
      if (Array.isArray(node)) {
        console.log(`${'  '.repeat(depth)}[Array with ${node.length} elements]`);
        const processedArray: InventoryRecipeTree[] = [];
        for (const element of node) {
          processedArray.push(await processNode(element, depth));
        }
        return processedArray as InventoryRecipeTree;
      }

      // Skip inventory nodes
      if (node.method === "inventory") {
        console.log(`${'  '.repeat(depth)}Skipping inventory node: ${node.shard}`);
        return node;
      }

      // Handle direct nodes - try to substitute with inventory
      if (node.method === "direct") {
        const invQty = workingInventory.get(node.shard) || 0;
        console.log(`${'  '.repeat(depth)}Direct node ${node.shard} (qty: ${node.quantity}, inv available: ${invQty})`);

        if (invQty >= node.quantity) {
          // Full replacement
          workingInventory.set(node.shard, invQty - node.quantity);
          console.log(`${'  '.repeat(depth)}  -> Substituting direct node with inventory`);
          const result = {
            shard: node.shard,
            method: "inventory",
            quantity: node.quantity,
          } as InventoryRecipeTree;
          processedNodes.set(node, result);
          return result;
        } else if (invQty > 0) {
          // Partial replacement
          console.log(`${'  '.repeat(depth)}  -> Partial substitution: ${invQty} from inv, ${node.quantity - invQty} still needed`);
          const inventoryPart: InventoryRecipeTree = {
            shard: node.shard,
            method: "inventory",
            quantity: invQty,
          };
          const directPortion: InventoryRecipeTree = {
            shard: node.shard,
            method: "direct",
            quantity: node.quantity - invQty,
          };
          workingInventory.set(node.shard, 0);
          const result = [inventoryPart, directPortion] as InventoryRecipeTree;
          processedNodes.set(node, result);
          return result;
        } else {
          // No inventory available - return as-is
          console.log(`${'  '.repeat(depth)}  -> No inventory available for direct node`);
          processedNodes.set(node, node);
          return node;
        }
      }

      // Check if we've already processed this exact node object
      if (processedNodes.has(node)) {
        const cached = processedNodes.get(node)!;
        console.log(`${'  '.repeat(depth)}CACHE HIT for ${node.shard} - returning cached result`);
        return cached;
      }

      // Check inventory for THIS node
      const invQty = workingInventory.get(node.shard) || 0;
      console.log(`${'  '.repeat(depth)}Processing ${node.shard} (qty: ${node.quantity}, inv available: ${invQty}, method: ${node.method}, depth: ${depth})`);

      // Full replacement with inventory
      if (invQty >= node.quantity) {
        workingInventory.set(node.shard, invQty - node.quantity);
        console.log(`${'  '.repeat(depth)}  -> Full replacement from inventory`);
        const result = {
          shard: node.shard,
          method: "inventory",
          quantity: node.quantity,
        } as InventoryRecipeTree;
        processedNodes.set(node, result);
        return result;
      }

      // Partial replacement
      if (invQty > 0) {
        console.log(`${'  '.repeat(depth)}  -> Partial: ${invQty} from inv, ${node.quantity - invQty} crafted`);
        const inventoryPart: InventoryRecipeTree = {
          shard: node.shard,
          method: "inventory",
          quantity: invQty,
        };

        // Deep copy for crafted portion
        const craftedPortion = JSON.parse(JSON.stringify(node));
        const remainingQuantity = node.quantity - invQty;
        craftedPortion.quantity = remainingQuantity;

        // Consume the inventory we're using
        workingInventory.set(node.shard, 0);

        // Recalculate quantities for crafted portion
        if (craftedPortion.method === "recipe") {
          const recipe = craftedPortion.recipe;
          const { crocodileMultiplier } = this.service.calculateMultipliers(params);
          const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
          const newCraftsNeeded = Math.ceil(remainingQuantity / outputQuantity);
          craftedPortion.craftsNeeded = newCraftsNeeded;

          const [input1Id, input2Id] = recipe.inputs;
          const fuse1 = parsed.shards[input1Id].fuse_amount;
          const fuse2 = parsed.shards[input2Id].fuse_amount;

          this.recalculateTreeQuantities(craftedPortion.inputs[0], newCraftsNeeded * fuse1, parsed, params);
          this.recalculateTreeQuantities(craftedPortion.inputs[1], newCraftsNeeded * fuse2, parsed, params);

          // Process children - they can use remaining inventory
          console.log(`${'  '.repeat(depth)}  -> Processing crafted portion's input 0 (${input1Id})`);
          craftedPortion.inputs[0] = await processNode(craftedPortion.inputs[0], depth + 1);
          console.log(`${'  '.repeat(depth)}  -> Finished input 0, processing input 1 (${input2Id})`);
          craftedPortion.inputs[1] = await processNode(craftedPortion.inputs[1], depth + 1);
          console.log(`${'  '.repeat(depth)}  -> Finished processing both inputs for crafted ${node.shard}`);
        } else if (craftedPortion.method === "cycle") {
          const outputStep = craftedPortion.steps.find((step: { outputShard: string }) => step.outputShard === craftedPortion.shard);
          if (outputStep) {
            const { crocodileMultiplier } = this.service.calculateMultipliers(params);
            const recipe = outputStep.recipe;
            const baseOutput = recipe.outputQuantity;
            const expectedOutput = recipe.isReptile ? baseOutput * crocodileMultiplier : baseOutput;

            let totalInputsConsumed = 0;
            craftedPortion.steps.forEach((step: { recipe: Recipe }) => {
              step.recipe.inputs.forEach((inputId: string) => {
                if (inputId === craftedPortion.shard) {
                  const inputShard = parsed.shards[inputId];
                  totalInputsConsumed += inputShard.fuse_amount;
                }
              });
            });

            const netOutputPerCycle = expectedOutput - totalInputsConsumed;
            const expectedCrafts = netOutputPerCycle > 0
              ? Math.ceil(remainingQuantity / netOutputPerCycle)
              : Math.ceil(remainingQuantity / expectedOutput);
            const stepCount = craftedPortion.steps.length;
            const roundedCrafts = Math.ceil(expectedCrafts / stepCount) * stepCount;
            craftedPortion.craftsNeeded = roundedCrafts;

            const inputQuantities = new Map<string, number>();
            const outputShards = new Set(craftedPortion.steps.map((step: { outputShard: string }) => step.outputShard));

            craftedPortion.steps.forEach((step: { recipe: Recipe }) => {
              step.recipe.inputs.forEach((inputId: string) => {
                if (!outputShards.has(inputId)) {
                  const inputShard = parsed.shards[inputId];
                  const currentQuantity = inputQuantities.get(inputId) || 0;
                  inputQuantities.set(inputId, currentQuantity + inputShard.fuse_amount);
                }
              });
            });

            craftedPortion.cycleInputs.forEach((cycleInput: InventoryRecipeTree) => {
              if (!Array.isArray(cycleInput) && cycleInput.method !== "inventory") {
                const inputQuantity = inputQuantities.get(cycleInput.shard) || 0;
                const totalInputQuantity = inputQuantity * (roundedCrafts / stepCount);
                this.recalculateTreeQuantities(cycleInput, totalInputQuantity, parsed, params);
              }
            });

            // Process children
            craftedPortion.inputRecipe = await processNode(craftedPortion.inputRecipe, depth + 1);
            for (let i = 0; i < craftedPortion.cycleInputs.length; i++) {
              craftedPortion.cycleInputs[i] = await processNode(craftedPortion.cycleInputs[i], depth + 1);
            }
          }
        }

        const result = [inventoryPart, craftedPortion] as InventoryRecipeTree;
        processedNodes.set(node, result);
        return result;
      }

      // No inventory - process children normally
      console.log(`${'  '.repeat(depth)}  -> No inventory for ${node.shard}, checking method: ${node.method}`);
      if (node.method === "recipe") {
        console.log(`${'  '.repeat(depth)}     -> Processing recipe inputs for ${node.shard}`);
        node.inputs[0] = await processNode(node.inputs[0], depth + 1);
        console.log(`${'  '.repeat(depth)}     -> Finished input 0, processing input 1`);
        node.inputs[1] = await processNode(node.inputs[1], depth + 1);
        console.log(`${'  '.repeat(depth)}     -> Finished both inputs for ${node.shard}`);
      } else if (node.method === "cycle") {
        console.log(`${'  '.repeat(depth)}     -> Processing cycle node`);
        node.inputRecipe = await processNode(node.inputRecipe, depth + 1);
        for (let i = 0; i < node.cycleInputs.length; i++) {
          node.cycleInputs[i] = await processNode(node.cycleInputs[i], depth + 1);
        }
      } else {
        console.log(`${'  '.repeat(depth)}     -> Unknown method ${node.method}, no children to process`);
      }

      processedNodes.set(node, node);
      return node;
    };

    const result = await processNode(tree);

    // Update the original inventory map to reflect what was used
    for (const [shard, qty] of workingInventory.entries()) {
      inventory.set(shard, qty);
    }

    return result;
  }

  async calculateOptimalPath(
    targetShard: string,
    requiredQuantity: number,
    params: CalculationParams,
    inventory: Map<string, number>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _kValues: Map<string, number> = new Map(),
    recipeOverrides: RecipeOverride[] = []
  ): Promise<InventoryCalculationResult> {
    const parsed = await this.service.parseData(params);

    if (!parsed.shards[targetShard]) {
      return {
        timePerShard: 0,
        totalTime: 0,
        totalShardsProduced: 0,
        craftsNeeded: 0,
        totalQuantities: new Map<string, number>(),
        craftTime: 0,
        tree: { shard: targetShard, method: "direct", quantity: 0 },
      };
    }

    const { choices } = this.service.computeMinCosts(parsed, params, recipeOverrides);

    // Find cycle nodes to prevent infinite recursion in buildRecipeTree
    const cycleNodes = params.crocodileLevel > 0 || recipeOverrides.length > 0
      ? this.service.findCycleNodes(choices)
      : [];

    const recipeTree = this.service.buildRecipeTree(
      parsed,
      targetShard,
      choices,
      cycleNodes,
      params,
      recipeOverrides
    );
    const craftCounter = { total: 0 };
    const { crocodileMultiplier } = this.service.calculateMultipliers(params);
    this.service.assignQuantities(
      recipeTree,
      requiredQuantity,
      parsed,
      craftCounter,
      choices,
      crocodileMultiplier,
      params,
      recipeOverrides
    );

    let inventoryTree: InventoryRecipeTree = recipeTree;
    const workingInventory = new Map(inventory);

    inventoryTree = await this.substituteInventoryBFS(inventoryTree, workingInventory, params);

    // Collect stats from the tree with inventory substitutions
    const { craftsNeeded, craftTime, totalQuantities } = this.service.collectTreeStats(
      inventoryTree,
      params
    );

    const totalTime = this.service.calculateTotalTimeFromQuantities(
      totalQuantities,
      craftTime,
      parsed,
      params
    );
    const timePerShard = requiredQuantity > 0 ? totalTime / requiredQuantity : 0;

    return {
      timePerShard,
      totalTime,
      totalShardsProduced: requiredQuantity,
      craftsNeeded,
      totalQuantities,
      craftTime,
      tree: inventoryTree,
    };
  }
}
