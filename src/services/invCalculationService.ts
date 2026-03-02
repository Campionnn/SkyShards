import { CalculationService } from "../services";
import type {
  CalculationParams,
  Data,
  InventoryCalculationResult,
  InventoryRecipeTree,
  Recipe,
  RecipeChoice,
  RecipeOverride,
} from "../types/types";

type InventoryRecipeNode = Extract<
  InventoryRecipeTree,
  { method: "recipe" }
>;

export class InvCalculationService {
  private static instance: InvCalculationService;
  private service = new CalculationService();

  public static getInstance(): InvCalculationService {
    if (!InvCalculationService.instance) {
      InvCalculationService.instance = new InvCalculationService();
    }
    return InvCalculationService.instance;
  }

  // Updates quantity and derived fields for a tree node.
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
      const {crocodileMultiplier} = this.service.calculateMultipliers(params);
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

      const {crocodileMultiplier} = this.service.calculateMultipliers(params);
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

  private isRecipeTreeNode(node: InventoryRecipeTree): node is InventoryRecipeNode {
    return !Array.isArray(node) && node.method === "recipe";
  }

  // Sums up total quantity demanded per shard across the tree.
  // Used to reserve inventory for nodes that need it, preventing alternatives
  // from stealing shards required elsewhere.
  private collectTreeDemand(tree: InventoryRecipeTree): Map<string, number> {
    const demand = new Map<string, number>();

    const walk = (node: InventoryRecipeTree) => {
      if (Array.isArray(node)) {
        for (const element of node) {
          walk(element);
        }
        return;
      }

      const current = demand.get(node.shard) || 0;
      demand.set(node.shard, current + node.quantity);

      if (node.method === "recipe") {
        walk(node.inputs[0]);
        walk(node.inputs[1]);
      } else if (node.method === "cycle") {
        walk(node.inputRecipe);
        for (const cycleInput of node.cycleInputs) {
          walk(cycleInput);
        }
      }
    };

    walk(tree);
    return demand;
  }

  // Calculates effective cost per output unit of a recipe. Applies inventory
  // discounts based on surplus vs demand. Uses exclusivityScores to penalize
  // consuming exclusive shards.
  private calculateEffectiveCost(
    recipe: Recipe,
    inventory: Map<string, number>,
    parsed: Data,
    minCosts: Map<string, number>,
    crocodileMultiplier: number,
    craftPenalty: number,
    surplusDiscounts?: Map<string, number>,
    exclusivityScores?: Map<string, number>
  ): number {
    const [input1Id, input2Id] = recipe.inputs;
    const fuse1 = parsed.shards[input1Id].fuse_amount;
    const fuse2 = parsed.shards[input2Id].fuse_amount;

    const inv1 = inventory.get(input1Id) || 0;
    const inv2 = inventory.get(input2Id) || 0;

    // When inventory covers at least one fuse, apply the discount.
    // discount=1 → fully free (default when no surplusDiscounts).
    // discount<1 → partial opportunity cost retained.
    const baseCost1 = (minCosts.get(input1Id) || Infinity) * fuse1;
    const baseCost2 = (minCosts.get(input2Id) || Infinity) * fuse2;

    const cost1 = inv1 >= fuse1
      ? (1 - (surplusDiscounts?.get(input1Id) ?? 1)) * baseCost1
      : baseCost1;
    const cost2 = inv2 >= fuse2
      ? (1 - (surplusDiscounts?.get(input2Id) ?? 1)) * baseCost2
      : baseCost2;

    // Additive opportunity cost for exclusive shards.
    let opportunityCost = 0;
    if (exclusivityScores) {
      if (inv1 >= fuse1) {
        const excl1 = exclusivityScores.get(input1Id) || 0;
        if (excl1 > 0) opportunityCost += baseCost1 * excl1;
      }
      if (inv2 >= fuse2) {
        const excl2 = exclusivityScores.get(input2Id) || 0;
        if (excl2 > 0) opportunityCost += baseCost2 * excl2;
      }
    }

    const effectiveOutput = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
    return (cost1 + cost2 + opportunityCost + craftPenalty) / effectiveOutput;
  }

  private async buildInputTree(
    shardId: string,
    quantity: number,
    parsed: Data,
    params: CalculationParams,
    choices: Map<string, RecipeChoice>,
    cycleNodes: string[][],
    recipeOverrides: RecipeOverride[]
  ): Promise<InventoryRecipeTree> {
    const tree = this.service.buildRecipeTree(parsed, shardId, choices, cycleNodes, params, recipeOverrides);
    const craftCounter = {total: 0};
    const {crocodileMultiplier} = this.service.calculateMultipliers(params);
    this.service.assignQuantities(
      tree,
      quantity,
      parsed,
      craftCounter,
      choices,
      crocodileMultiplier,
      params,
      recipeOverrides
    );
    return tree as InventoryRecipeTree;
  }

  private async buildCustomRecipeNode(
    shardId: string,
    recipe: Recipe,
    craftsNeeded: number,
    quantity: number,
    parsed: Data,
    params: CalculationParams,
    choices: Map<string, RecipeChoice>,
    cycleNodes: string[][],
    recipeOverrides: RecipeOverride[]
  ): Promise<InventoryRecipeTree> {
    const [input1, input2] = recipe.inputs;
    const fuse1 = parsed.shards[input1].fuse_amount;
    const fuse2 = parsed.shards[input2].fuse_amount;
    const inputQuantity1 = craftsNeeded * fuse1;
    const inputQuantity2 = craftsNeeded * fuse2;

    const inputTree1 = await this.buildInputTree(
      input1,
      inputQuantity1,
      parsed,
      params,
      choices,
      cycleNodes,
      recipeOverrides
    );
    const inputTree2 = await this.buildInputTree(
      input2,
      inputQuantity2,
      parsed,
      params,
      choices,
      cycleNodes,
      recipeOverrides
    );

    return {
      shard: shardId,
      method: "recipe",
      recipe,
      quantity,
      craftsNeeded,
      inputs: [inputTree1, inputTree2],
    };
  }

  private async tryApplyInventoryAlternatives(
    node: InventoryRecipeNode,
    workingInventory: Map<string, number>,
    params: CalculationParams,
    parsed: Data,
    choices: Map<string, RecipeChoice>,
    cycleNodes: string[][],
    recipeOverrides: RecipeOverride[],
    minCosts: Map<string, number>,
    processNode: (node: InventoryRecipeTree, allowAlternatives?: boolean) => Promise<InventoryRecipeTree>,
    treeDemand: Map<string, number>,
    exclusivityScores: Map<string, number>
  ): Promise<InventoryRecipeTree | null> {
    if (node.method !== "recipe" || !node.recipe) {
      return null;
    }

    const availableRecipes = parsed.recipes[node.shard] || [];
    if (availableRecipes.length <= 1) {
      return null;
    }

    const hasOverride = recipeOverrides.some((override) => override.shardId === node.shard);
    if (hasOverride) {
      return null;
    }

    const alternatives = availableRecipes.filter(
      (recipe) => !this.service.areRecipesEqual(recipe, node.recipe)
    );
    if (alternatives.length === 0) {
      return null;
    }

    const {crocodileMultiplier, craftPenalty} = this.service.calculateMultipliers(params);
    let remainingQuantity = node.quantity;
    const segments: InventoryRecipeTree[] = [];

    // Shared inputs are consumed equally by current and alternative recipes,
    // so they shouldn't be penalized or limited for alternatives.
    const currentInputSet = new Set(node.recipe.inputs);

    while (remainingQuantity > 0) {
      // Build surplus inventory map: only inventory exceeding total tree demand
      // is available for alternative recipe swaps.
      const surplusInventory = new Map<string, number>();
      for (const [shardId, qty] of workingInventory) {
        const totalDemand = treeDemand.get(shardId) || 0;
        const exclusivity = exclusivityScores.get(shardId) || 0;
        // Exclusive shards with no tree demand can't be used by alternatives.
        if (exclusivity > 0 && totalDemand === 0) {
          surplusInventory.set(shardId, 0);
        } else {
          surplusInventory.set(shardId, Math.max(0, qty - totalDemand));
        }
      }

      // Current recipe cost with full inventory discount (no exclusivity penalty).
      const currentEffectiveCost = this.calculateEffectiveCost(
        node.recipe,
        workingInventory,
        parsed,
        minCosts,
        crocodileMultiplier,
        craftPenalty
      );

      let bestCandidate:
        | {recipe: Recipe; outputQuantity: number; craftsSupported: number; effectiveCost: number}
        | null = null;

      for (const recipe of alternatives) {
        // Build a "fair inventory" for this alternative:
        // - Shared inputs (also in current recipe): use workingInventory,
        //   since they'd be consumed equally by either recipe choice
        // - Unique inputs (only in alternative): use surplusInventory,
        //   to prevent stealing shards needed by other parts of the tree
        const fairInventory = new Map<string, number>();
        for (const inputId of recipe.inputs) {
          if (currentInputSet.has(inputId)) {
            fairInventory.set(inputId, workingInventory.get(inputId) || 0);
          } else {
            fairInventory.set(inputId, surplusInventory.get(inputId) || 0);
          }
        }

        // At least one input must benefit from inventory
        const hasInventoryInput = recipe.inputs.some((inputId) => {
          const available = fairInventory.get(inputId) || 0;
          const fuseAmount = parsed.shards[inputId].fuse_amount;
          return available >= fuseAmount;
        });
        if (!hasInventoryInput) {
          continue;
        }

        // Compute surplus-based discount factors for the alternative's inputs.
        // Shared inputs get full discount (1.0) — consumed equally by either
        // recipe, so they cancel out in the comparison.
        // Unique inputs get a discount proportional to how much surplus exists
        // relative to tree demand: discount = surplus / (surplus + demand).
        // Exclusivity is handled separately via additive opportunity cost in
        // calculateEffectiveCost, not via multiplicative discount reduction.
        const surplusDiscounts = new Map<string, number>();
        for (const inputId of recipe.inputs) {
          if (currentInputSet.has(inputId)) {
            surplusDiscounts.set(inputId, 1); // shared → fully free
          } else {
            const surplus = surplusInventory.get(inputId) || 0;
            const demand = treeDemand.get(inputId) || 0;
            surplusDiscounts.set(inputId, surplus + demand > 0 ? surplus / (surplus + demand) : 0);
          }
        }

        // Calculate effective cost with fair inventory and surplus discounts
        // Pass exclusivityScores so additive opportunity cost penalizes
        // consuming exclusive shards for recipes where alternatives exist
        const effectiveCost = this.calculateEffectiveCost(
          recipe,
          fairInventory,
          parsed,
          minCosts,
          crocodileMultiplier,
          craftPenalty,
          surplusDiscounts,
          exclusivityScores
        );

        // Only consider if genuinely cheaper than the current recipe
        if (effectiveCost >= currentEffectiveCost) {
          continue;
        }

        // Calculate how many crafts are supported by inventory.
        // Shared inputs: don't limit (consumed by current recipe too, handled by processNode)
        // Unique inputs in surplus: limit based on surplus availability
        const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
        const inventoryCraftLimits: number[] = [];
        for (const inputId of recipe.inputs) {
          if (currentInputSet.has(inputId)) {
            // Shared input — consumed by current recipe too, doesn't limit alternative
            continue;
          }
          const available = surplusInventory.get(inputId) || 0;
          const fuseAmount = parsed.shards[inputId].fuse_amount;
          if (available >= fuseAmount) {
            inventoryCraftLimits.push(Math.floor(available / fuseAmount));
          }
        }
        const craftsSupported = inventoryCraftLimits.length > 0
          ? Math.min(...inventoryCraftLimits)
          : 0;

        if (craftsSupported <= 0) {
          continue;
        }

        // Pick the alternative with the lowest effective cost
        if (!bestCandidate || effectiveCost < bestCandidate.effectiveCost) {
          bestCandidate = {recipe, outputQuantity, craftsSupported, effectiveCost};
        }
      }

      if (!bestCandidate) {
        break;
      }

      const craftsForRemaining = Math.ceil(remainingQuantity / bestCandidate.outputQuantity);
      const craftsToUse = Math.min(bestCandidate.craftsSupported, craftsForRemaining);

      if (craftsToUse <= 0) {
        break;
      }

      const quantityProduced = Math.min(
        remainingQuantity,
        craftsToUse * bestCandidate.outputQuantity
      );

      if (quantityProduced <= 0) {
        break;
      }

      const customNode = await this.buildCustomRecipeNode(
        node.shard,
        bestCandidate.recipe,
        craftsToUse,
        quantityProduced,
        parsed,
        params,
        choices,
        cycleNodes,
        recipeOverrides
      );
      // processNode recurses into sub-trees, consuming inventory naturally
      const processedSegment = await processNode(customNode, false);
      segments.push(processedSegment);
      remainingQuantity -= quantityProduced;
    }

    if (segments.length === 0) {
      return null;
    }

    if (remainingQuantity > 0) {
      this.recalculateTreeQuantities(node, remainingQuantity, parsed, params);
      const leftover = await processNode(node, false);
      segments.push(leftover);
    }

    return segments.length === 1 ? segments[0] : (segments as InventoryRecipeTree);
  }

  private async substituteInventoryBFS(
    tree: InventoryRecipeTree,
    inventory: Map<string, number>,
    params: CalculationParams,
    parsed: Data,
    choices: Map<string, RecipeChoice>,
    cycleNodes: string[][],
    recipeOverrides: RecipeOverride[],
    minCosts: Map<string, number>,
    exclusivityScores: Map<string, number>
  ): Promise<InventoryRecipeTree> {
    const workingInventory = new Map(inventory);
    const processedNodes = new WeakMap<object, InventoryRecipeTree>();

    // Pre-scan the tree to compute total demand per shard.
    // This prevents alternatives from greedily consuming inventory shards
    // that are needed by nodes deeper in the tree.
    const treeDemand = this.collectTreeDemand(tree);

    const processNode = async (
      node: InventoryRecipeTree,
      allowAlternatives = true
    ): Promise<InventoryRecipeTree> => {
      // Handle array nodes by processing each element
      if (Array.isArray(node)) {
        const processedArray: InventoryRecipeTree[] = [];
        for (const element of node) {
          processedArray.push(await processNode(element, allowAlternatives));
        }
        return processedArray as InventoryRecipeTree;
      }

      // Attempt to split recipe nodes into inventory-aware segments before deeper processing
      if (allowAlternatives && this.isRecipeTreeNode(node)) {
        const alternative = await this.tryApplyInventoryAlternatives(
          node,
          workingInventory,
          params,
          parsed,
          choices,
          cycleNodes,
          recipeOverrides,
          minCosts,
          processNode,
          treeDemand,
          exclusivityScores
        );
        if (alternative) {
          processedNodes.set(node, alternative);
          return alternative;
        }
      }

      // Skip inventory nodes
      if (node.method === "inventory") {
        return node;
      }

      // Handle direct nodes - try to substitute with inventory
      if (node.method === "direct") {
        const invQty = workingInventory.get(node.shard) || 0;

        if (invQty >= node.quantity) {
          workingInventory.set(node.shard, invQty - node.quantity);
          const result = {
            shard: node.shard,
            method: "inventory",
            quantity: node.quantity,
          } as InventoryRecipeTree;
          processedNodes.set(node, result);
          return result;
        } else if (invQty > 0) {
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
        }

        processedNodes.set(node, node);
        return node;
      }


      // Check if we've already processed this exact node object
      if (processedNodes.has(node)) {
        return processedNodes.get(node)!;
      }

      const invQty = workingInventory.get(node.shard) || 0;

      // Full replacement with inventory
      if (invQty >= node.quantity) {
        workingInventory.set(node.shard, invQty - node.quantity);
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
        const inventoryPart: InventoryRecipeTree = {
          shard: node.shard,
          method: "inventory",
          quantity: invQty,
        };

        const craftedPortion = JSON.parse(JSON.stringify(node));
        const remainingQuantity = node.quantity - invQty;
        craftedPortion.quantity = remainingQuantity;
        workingInventory.set(node.shard, 0);

        // Recalculate quantities for crafted portion
        if (craftedPortion.method === "recipe") {
          const recipe = craftedPortion.recipe;
          const {crocodileMultiplier} = this.service.calculateMultipliers(params);
          const outputQuantity = this.service.getEffectiveOutputQuantity(recipe, crocodileMultiplier);
          const newCraftsNeeded = Math.ceil(remainingQuantity / outputQuantity);
          craftedPortion.craftsNeeded = newCraftsNeeded;

          const [input1Id, input2Id] = recipe.inputs;
          const fuse1 = parsed.shards[input1Id].fuse_amount;
          const fuse2 = parsed.shards[input2Id].fuse_amount;

          this.recalculateTreeQuantities(craftedPortion.inputs[0], newCraftsNeeded * fuse1, parsed, params);
          this.recalculateTreeQuantities(craftedPortion.inputs[1], newCraftsNeeded * fuse2, parsed, params);

          craftedPortion.inputs[0] = await processNode(craftedPortion.inputs[0], allowAlternatives);
          craftedPortion.inputs[1] = await processNode(craftedPortion.inputs[1], allowAlternatives);
        } else if (craftedPortion.method === "cycle") {
          const outputStep = craftedPortion.steps.find((step: {
            outputShard: string
          }) => step.outputShard === craftedPortion.shard);
          if (outputStep) {
            const {crocodileMultiplier} = this.service.calculateMultipliers(params);
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

            craftedPortion.inputRecipe = await processNode(craftedPortion.inputRecipe, allowAlternatives);
            for (let i = 0; i < craftedPortion.cycleInputs.length; i++) {
              craftedPortion.cycleInputs[i] = await processNode(craftedPortion.cycleInputs[i], allowAlternatives);
            }
          }
        }

        const result = [inventoryPart, craftedPortion] as InventoryRecipeTree;
        processedNodes.set(node, result);
        return result;
      }

      // No inventory - process children normally
      if (node.method === "recipe") {
        node.inputs[0] = await processNode(node.inputs[0], allowAlternatives);
        node.inputs[1] = await processNode(node.inputs[1], allowAlternatives);
      } else if (node.method === "cycle") {
        node.inputRecipe = await processNode(node.inputRecipe, allowAlternatives);
        for (let i = 0; i < node.cycleInputs.length; i++) {
          node.cycleInputs[i] = await processNode(node.cycleInputs[i], allowAlternatives);
        }
      }

      processedNodes.set(node, node);
      return node;
    };

    const result = await processNode(tree);

    // Update the original inventory map to reflect what was used
    for (const [shard, qty] of workingInventory.entries()) {
      inventory.set(shard, qty);
    }

    return this.mergeTreeSegments(result);
  }

  // Post processing pass to merge nodes
  private mergeTreeSegments(tree: InventoryRecipeTree): InventoryRecipeTree {
    // Recursively process children first (bottom-up)
    if (Array.isArray(tree)) {
      // Flatten and recursively merge each element
      const flat: InventoryRecipeTree[] = [];
      for (const el of tree) {
        const merged = this.mergeTreeSegments(el);
        // Flatten nested arrays
        if (Array.isArray(merged)) {
          flat.push(...merged);
        } else {
          flat.push(merged);
        }
      }

      // Merge adjacent nodes with the same shard + method
      const result: InventoryRecipeTree[] = [];
      for (const node of flat) {
        if (Array.isArray(node)) {
          // Shouldn't happen after flattening, but be safe
          result.push(node);
          continue;
        }
        const prev = result.length > 0 ? result[result.length - 1] : null;
        if (prev && !Array.isArray(prev) && this.canMergeNodes(prev, node)) {
          result[result.length - 1] = this.mergeNodes(prev, node);
        } else {
          result.push(node);
        }
      }

      return result.length === 1 ? result[0] : result;
    }

    // For non-array nodes, recurse into recipe/cycle inputs
    if (tree.method === "recipe" && tree.inputs) {
      return {
        ...tree,
        inputs: [
          this.mergeTreeSegments(tree.inputs[0]),
          this.mergeTreeSegments(tree.inputs[1]),
        ],
      };
    }
    if (tree.method === "cycle") {
      return {
        ...tree,
        inputRecipe: this.mergeTreeSegments(tree.inputRecipe),
        cycleInputs: tree.cycleInputs.map((ci) => this.mergeTreeSegments(ci)),
      };
    }

    // Direct/inventory leaves
    return tree;
  }

  // Checks if two nodes can be merged (same shard, same method, same recipe).
  private canMergeNodes(
    a: Exclude<InventoryRecipeTree, InventoryRecipeTree[]>,
    b: Exclude<InventoryRecipeTree, InventoryRecipeTree[]>
  ): boolean {
    if (a.shard !== b.shard || a.method !== b.method) return false;

    if (a.method === "direct" || a.method === "inventory") return true;

    if (a.method === "recipe" && b.method === "recipe") {
      return this.service.areRecipesEqual(a.recipe, b.recipe);
    }

    // Cycle nodes too complex
    return false;
  }

  // Merges two compatible nodes. Precondition: canMergeNodes(a, b) === true.
  private mergeNodes(
    a: Exclude<InventoryRecipeTree, InventoryRecipeTree[]>,
    b: Exclude<InventoryRecipeTree, InventoryRecipeTree[]>
  ): Exclude<InventoryRecipeTree, InventoryRecipeTree[]> {
    if (a.method === "direct" && b.method === "direct") {
      return { shard: a.shard, method: "direct", quantity: a.quantity + b.quantity };
    }

    if (a.method === "inventory" && b.method === "inventory") {
      return { shard: a.shard, method: "inventory", quantity: a.quantity + b.quantity };
    }

    if (a.method === "recipe" && b.method === "recipe") {
      // Merge recipe nodes: combine quantities and craftsNeeded,
      // then merge sub-trees by concatenating inputs into arrays
      // and recursively merging them
      const mergedInput0 = this.mergeTreeSegments(
        [a.inputs[0], b.inputs[0]] as InventoryRecipeTree
      );
      const mergedInput1 = this.mergeTreeSegments(
        [a.inputs[1], b.inputs[1]] as InventoryRecipeTree
      );

      return {
        shard: a.shard,
        method: "recipe",
        quantity: a.quantity + b.quantity,
        recipe: a.recipe,
        inputs: [mergedInput0, mergedInput1],
        craftsNeeded: a.craftsNeeded + b.craftsNeeded,
      };
    }

    // Fallback (shouldn't reach here if canMergeNodes is correct)
    return a;
  }

  async calculateOptimalPath(
    targetShard: string,
    requiredQuantity: number,
    params: CalculationParams,
    inventory: Map<string, number>,
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
        tree: {shard: targetShard, method: "direct", quantity: 0},
      }
    }

    const {minCosts, choices} = this.service.computeMinCosts(parsed, params, recipeOverrides);

    // Compute exclusivity scores: measures how irreplaceable each shard is
    // in the recipe graph, weighted by the value of outputs it uniquely enables.
    const exclusivityScores = this.service.computeExclusivityScores(parsed, minCosts);

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
    const craftCounter = {total: 0};
    const {crocodileMultiplier} = this.service.calculateMultipliers(params);
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

    inventoryTree = await this.substituteInventoryBFS(
      inventoryTree,
      workingInventory,
      params,
      parsed,
      choices,
      cycleNodes,
      recipeOverrides,
      minCosts,
      exclusivityScores
    );

    // Collect stats from the tree with inventory substitutions
    const {craftsNeeded, craftTime, totalQuantities} = this.service.collectTreeStats(
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
      remainingInventory: workingInventory,
    };
  }
}
