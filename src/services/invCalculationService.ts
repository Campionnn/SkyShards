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

    // BFS queue
    interface QueueItem {
      node: InventoryRecipeTree;
      parent?: {
        parentNode: InventoryRecipeTree;
        inputIndex: 0 | 1;
      };
    }

    const queue: QueueItem[] = [{ node: tree }];
    let newRoot: InventoryRecipeTree = tree;

    while (queue.length > 0) {
      const { node, parent } = queue.shift()!;

      if (Array.isArray(node)) {
        continue;
      }

      // Check if we can substitute this node with inventory
      const invQty = workingInventory.get(node.shard) || 0;
      if (invQty > 0) {
        let replacementNode: InventoryRecipeTree;

        if (invQty >= node.quantity) {
          replacementNode = {
            shard: node.shard,
            method: "inventory",
            quantity: node.quantity,
          };
          workingInventory.set(node.shard, invQty - node.quantity);
        } else {
          const inventoryPart: InventoryRecipeTree = {
            shard: node.shard,
            method: "inventory",
            quantity: invQty,
          };

          // Create a deep copy of the current node for the crafted portion
          const craftedPortion = JSON.parse(JSON.stringify(node));
          craftedPortion.quantity = node.quantity - invQty;

          // Recalculate quantities for the crafted portion based on reduced quantity
          if (craftedPortion.method === "recipe") {
            const recipe = craftedPortion.recipe;
            const { crocodileMultiplier } = this.service.calculateMultipliers(params);
            const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
            const newCraftsNeeded = Math.ceil(craftedPortion.quantity / outputQuantity);
            craftedPortion.craftsNeeded = newCraftsNeeded;

            // Recalculate input quantities based on the new craftsNeeded
            const parsed = await this.service.parseData(params);
            const [input1Id, input2Id] = recipe.inputs;
            const fuse1 = parsed.shards[input1Id].fuse_amount;
            const fuse2 = parsed.shards[input2Id].fuse_amount;

            // Recursively update quantities in the input trees
            this.recalculateTreeQuantities(craftedPortion.inputs[0], newCraftsNeeded * fuse1, parsed, params);
            this.recalculateTreeQuantities(craftedPortion.inputs[1], newCraftsNeeded * fuse2, parsed, params);
          } else if (craftedPortion.method === "cycle") {
            // Recalculate cycle quantities
            const outputStep = craftedPortion.steps.find((step: { outputShard: string }) => step.outputShard === craftedPortion.shard);
            if (outputStep) {
              const { crocodileMultiplier } = this.service.calculateMultipliers(params);
              const recipe = outputStep.recipe;
              const baseOutput = recipe.outputQuantity;
              const expectedOutput = recipe.isReptile ? baseOutput * crocodileMultiplier : baseOutput;

              const parsed = await this.service.parseData(params);
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
              const expectedCrafts = netOutputPerCycle > 0 ? Math.ceil(craftedPortion.quantity / netOutputPerCycle) : Math.ceil(craftedPortion.quantity / expectedOutput);
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
            }
          }

          // Combine inventory and crafted portions in an array
          replacementNode = [inventoryPart, craftedPortion];
          workingInventory.set(node.shard, 0);

          // For the crafted portion, we need to continue traversing its children
          if (!Array.isArray(craftedPortion) && craftedPortion.method === "recipe") {
            queue.push({
              node: craftedPortion.inputs[0],
              parent: undefined,
            });
            queue.push({
              node: craftedPortion.inputs[1],
              parent: undefined,
            });
          } else if (!Array.isArray(craftedPortion) && craftedPortion.method === "cycle") {
            queue.push({ node: craftedPortion.inputRecipe, parent: undefined });
            craftedPortion.cycleInputs.forEach((cycleInput: InventoryRecipeTree) => {
              queue.push({ node: cycleInput, parent: undefined });
            });
          }
        }

        // Replace in parent or update root
        if (parent) {
          const parentNode = parent.parentNode;
          if (!Array.isArray(parentNode) && parentNode.method === "recipe") {
            parentNode.inputs[parent.inputIndex] = replacementNode;
          }
        } else {
          newRoot = replacementNode;
        }

        // For full replacement, don't traverse children since we're replacing this entire subtree
        if (invQty >= node.quantity) {
          continue;
        }
        // For partial replacement, we already queued the crafted portion's children above
        continue;
      }

      // If this is a recipe node, add children to queue
      if (node.method === "recipe") {
        queue.push({
          node: node.inputs[0],
          parent: { parentNode: node, inputIndex: 0 },
        });
        queue.push({
          node: node.inputs[1],
          parent: { parentNode: node, inputIndex: 1 },
        });
      } else if (node.method === "cycle") {
        // For cycle nodes, process the input recipe and cycle inputs
        queue.push({ node: node.inputRecipe });
        node.cycleInputs.forEach((cycleInput) => {
          queue.push({ node: cycleInput });
        });
      }
    }

    // Update the original inventory map to reflect what was used
    for (const [shard, qty] of workingInventory.entries()) {
      inventory.set(shard, qty);
    }

    return newRoot;
  }

  private calculateInventoryConsumption(
    tree: InventoryRecipeTree,
    consumption: Map<string, number>
  ): void {
    if (Array.isArray(tree)) {
      tree.forEach(subtree => this.calculateInventoryConsumption(subtree, consumption));
      return;
    }

    if (tree.method === "inventory") {
      const current = consumption.get(tree.shard) || 0;
      consumption.set(tree.shard, current + tree.quantity);
    } else if (tree.method === "recipe") {
      this.calculateInventoryConsumption(tree.inputs[0], consumption);
      this.calculateInventoryConsumption(tree.inputs[1], consumption);
    } else if (tree.method === "cycle") {
      this.calculateInventoryConsumption(tree.inputRecipe, consumption);
      tree.cycleInputs.forEach(input => this.calculateInventoryConsumption(input, consumption));
    }
  }

  private refundInventoryFromSubtree(
    tree: InventoryRecipeTree,
    inventory: Map<string, number>
  ): void {
    const consumption = new Map<string, number>();
    this.calculateInventoryConsumption(tree, consumption);

    for (const [shard, qty] of consumption.entries()) {
      const current = inventory.get(shard) || 0;
      inventory.set(shard, current + qty);
    }
  }

  private async evaluateAlternativeRecipes(
    tree: InventoryRecipeTree,
    inventory: Map<string, number>,
    params: CalculationParams,
    parsed: Data
  ): Promise<InventoryRecipeTree> {
    if (Array.isArray(tree)) {
      return tree;
    }

    if (tree.method !== "recipe") {
      return tree;
    }

    // Get all available recipes for this shard
    const availableRecipes = parsed.recipes[tree.shard] || [];
    if (availableRecipes.length <= 1) {
      return tree; // No alternatives to consider
    }

    const { crocodileMultiplier, craftPenalty } = this.service.calculateMultipliers(params);
    const currentRecipe = tree.recipe;

    // Calculate cost of current recipe with current inventory
    const currentCost = this.calculateRecipeCostWithInventory(
      currentRecipe,
      tree.quantity,
      inventory,
      parsed,
      params,
      crocodileMultiplier,
      craftPenalty
    );

    let bestRecipe = currentRecipe;
    let bestCost = currentCost;
    let bestTree: InventoryRecipeTree | null = null;

    // Evaluate all alternative recipes
    for (const altRecipe of availableRecipes) {
      if (this.areRecipesEqual(altRecipe, currentRecipe)) {
        continue;
      }

      const altCost = this.calculateRecipeCostWithInventory(
        altRecipe,
        tree.quantity,
        inventory,
        parsed,
        params,
        crocodileMultiplier,
        craftPenalty
      );

      if (altCost < bestCost) {
        bestCost = altCost;
        bestRecipe = altRecipe;
      }
    }

    // If we found a better recipe, rebuild this subtree with it
    if (!this.areRecipesEqual(bestRecipe, currentRecipe)) {
      // Refund inventory consumed by the old tree
      this.refundInventoryFromSubtree(tree, inventory);

      // Build new tree with the alternative recipe
      bestTree = await this.buildTreeForRecipe(
        tree.shard,
        tree.quantity,
        bestRecipe,
        inventory,
        parsed,
        params
      );

      return bestTree;
    }

    return tree;
  }

  private areRecipesEqual(recipe1: Recipe, recipe2: Recipe): boolean {
    return (
      recipe1.outputQuantity === recipe2.outputQuantity &&
      recipe1.inputs[0] === recipe2.inputs[0] &&
      recipe1.inputs[1] === recipe2.inputs[1]
    );
  }

  private calculateRecipeCostWithInventory(
    recipe: Recipe,
    outputQuantity: number,
    inventory: Map<string, number>,
    parsed: Data,
    params: CalculationParams,
    crocodileMultiplier: number,
    craftPenalty: number
  ): number {
    const effectiveOutput = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
    const craftsNeeded = Math.ceil(outputQuantity / effectiveOutput);

    const [input1Id, input2Id] = recipe.inputs;
    const fuse1 = parsed.shards[input1Id].fuse_amount;
    const fuse2 = parsed.shards[input2Id].fuse_amount;

    const needed1 = craftsNeeded * fuse1;
    const needed2 = craftsNeeded * fuse2;

    const inv1 = inventory.get(input1Id) || 0;
    const inv2 = inventory.get(input2Id) || 0;

    // Calculate how much we'd need to grind
    const toGrind1 = Math.max(0, needed1 - inv1);
    const toGrind2 = Math.max(0, needed2 - inv2);

    const directCost1 = this.service.getDirectCost(parsed.shards[input1Id], params.rateAsCoinValue);
    const directCost2 = this.service.getDirectCost(parsed.shards[input2Id], params.rateAsCoinValue);

    const cost1 = toGrind1 * directCost1;
    const cost2 = toGrind2 * directCost2;

    return (cost1 + cost2 + craftPenalty * craftsNeeded) / outputQuantity;
  }

  private async buildTreeForRecipe(
    shardId: string,
    quantity: number,
    recipe: Recipe,
    inventory: Map<string, number>,
    parsed: Data,
    params: CalculationParams
  ): Promise<InventoryRecipeTree> {
    const { crocodileMultiplier } = this.service.calculateMultipliers(params);
    const effectiveOutput = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
    const craftsNeeded = Math.ceil(quantity / effectiveOutput);

    const [input1Id, input2Id] = recipe.inputs;
    const fuse1 = parsed.shards[input1Id].fuse_amount;
    const fuse2 = parsed.shards[input2Id].fuse_amount;

    const needed1 = craftsNeeded * fuse1;
    const needed2 = craftsNeeded * fuse2;

    // Build input trees based on inventory availability
    const input1Tree = await this.buildInputTree(input1Id, needed1, inventory, parsed, params);
    const input2Tree = await this.buildInputTree(input2Id, needed2, inventory, parsed, params);

    return {
      shard: shardId,
      method: "recipe",
      quantity,
      recipe,
      inputs: [input1Tree, input2Tree],
      craftsNeeded,
    };
  }

  private async buildInputTree(
    shardId: string,
    quantity: number,
    inventory: Map<string, number>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parsed: Data,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: CalculationParams
  ): Promise<InventoryRecipeTree> {
    const inv = inventory.get(shardId) || 0;

    if (inv >= quantity) {
      // Use all from inventory
      inventory.set(shardId, inv - quantity);
      return {
        shard: shardId,
        method: "inventory",
        quantity,
      };
    } else if (inv > 0) {
      // Partial inventory + direct grinding
      const inventoryPart: InventoryRecipeTree = {
        shard: shardId,
        method: "inventory",
        quantity: inv,
      };
      const directPart: InventoryRecipeTree = {
        shard: shardId,
        method: "direct",
        quantity: quantity - inv,
      };
      inventory.set(shardId, 0);
      return [inventoryPart, directPart];
    } else {
      // All from direct grinding
      return {
        shard: shardId,
        method: "direct",
        quantity,
      };
    }
  }

  private async substituteAlternativeRecipesBFS(
    tree: InventoryRecipeTree,
    inventory: Map<string, number>,
    params: CalculationParams,
    parsed: Data
  ): Promise<InventoryRecipeTree> {
    interface QueueItem {
      node: InventoryRecipeTree;
      parent?: {
        parentNode: InventoryRecipeTree;
        inputIndex: 0 | 1;
      };
    }

    const queue: QueueItem[] = [{ node: tree }];
    let newRoot: InventoryRecipeTree = tree;

    while (queue.length > 0) {
      const { node, parent } = queue.shift()!;

      if (Array.isArray(node)) {
        // Process array elements
        for (const element of node) {
          queue.push({ node: element });
        }
        continue;
      }

      // Try to find a better recipe for this node
      if (node.method === "recipe") {
        const evaluatedNode = await this.evaluateAlternativeRecipes(node, inventory, params, parsed);

        // If the recipe changed, update the parent or root
        if (evaluatedNode !== node) {
          if (parent) {
            const parentNode = parent.parentNode;
            if (!Array.isArray(parentNode) && parentNode.method === "recipe") {
              parentNode.inputs[parent.inputIndex] = evaluatedNode;
            }
          } else {
            newRoot = evaluatedNode;
          }

          // Queue the new node's children
          if (!Array.isArray(evaluatedNode) && evaluatedNode.method === "recipe") {
            queue.push({
              node: evaluatedNode.inputs[0],
              parent: { parentNode: evaluatedNode, inputIndex: 0 },
            });
            queue.push({
              node: evaluatedNode.inputs[1],
              parent: { parentNode: evaluatedNode, inputIndex: 1 },
            });
          }
          continue;
        }

        // Queue children
        queue.push({
          node: node.inputs[0],
          parent: { parentNode: node, inputIndex: 0 },
        });
        queue.push({
          node: node.inputs[1],
          parent: { parentNode: node, inputIndex: 1 },
        });
      } else if (node.method === "cycle") {
        queue.push({ node: node.inputRecipe });
        node.cycleInputs.forEach((cycleInput) => {
          queue.push({ node: cycleInput });
        });
      }
    }

    return newRoot;
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

    // Convert to InventoryRecipeTree and substitute with inventory
    let inventoryTree: InventoryRecipeTree = recipeTree;

    // Clone inventory before substitution to avoid mutating the original
    const workingInventory = new Map(inventory);

    // First pass: substitute optimal shards from inventory
    inventoryTree = await this.substituteInventoryBFS(inventoryTree, workingInventory, params);

    // Second pass: check if alternative recipes are better given remaining inventory
    inventoryTree = await this.substituteAlternativeRecipesBFS(inventoryTree, workingInventory, params, parsed);

    // Third pass: substitute inventory again for any new recipes from alternative substitution
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
