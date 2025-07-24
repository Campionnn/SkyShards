import HypixelApiService from "./hypixelApiService";
import type {
    CalculationParams,
    CalculationResult,
    Data,
    Recipe,
    RecipeChoice,
    Recipes,
    RecipeTree,
    Shards,
} from "../types/types";

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
            crocodileLevel: params.crocodileLevel,
            seaSerpentLevel: params.seaSerpentLevel,
            tiamatLevel: params.tiamatLevel,
        });
    }

    async parseData(params: CalculationParams): Promise<Data> {
        const cacheKey = this.getCacheKey(params);

        // Check cache first
        if (this.dataCache.has(cacheKey)) {
            return this.dataCache.get(cacheKey)!;
        }

        try {
            const fusionResponse = await fetch(`${import.meta.env.BASE_URL}fusion-data.json`);
            const fusionJson = await fusionResponse.json();

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

            // Fetch live instantBuy prices from Hypixel API
            const shardIds = Object.keys(fusionJson.shards);
            const hypixelApi = HypixelApiService.getInstance();
            const livePrices = await hypixelApi.getShardPrices(shardIds, fusionJson.shards);
            const priceMap = new Map(livePrices.map((p) => [p.shardId, p.instantBuy]));

            const shards: Shards = {};
            for (const shardId in fusionJson.shards) {
                const instantBuy = priceMap.get(shardId);
                shards[shardId] = {
                    ...fusionJson.shards[shardId],
                    id: shardId,
                    rate: instantBuy,
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

    public calculateMultipliers(params: CalculationParams) {
        const tiamatMultiplier = 1 + (5 * params.tiamatLevel) / 100;
        const seaSerpentMultiplier = 1 + ((2 * params.seaSerpentLevel) / 100) * tiamatMultiplier;
        const crocodileMultiplier = 1 + ((2 * params.crocodileLevel) / 100) * seaSerpentMultiplier;
        const craftPenalty = 0.8 / 3600;

        return {
            tiamatMultiplier,
            seaSerpentMultiplier,
            crocodileMultiplier,
            craftPenalty,
        };
    }

    computeMinCosts(
        data: Data,
        crocodileLevel: number,
        seaSerpentLevel: number,
        tiamatLevel: number,
    ): { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> } {
        const minCosts = new Map<string, number>();
        const choices = new Map<string, RecipeChoice>();
        const shards = Object.keys(data.shards);
        const multipliers = this.calculateMultipliers({ crocodileLevel, seaSerpentLevel, tiamatLevel } as CalculationParams);
        const { crocodileMultiplier } = multipliers;

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

        // Initialize with direct costs (use instantBuy instead of rate)
        shards.forEach((shard) => {
            const cost = data.shards[shard].rate ?? Infinity;
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
            const { recipes, effectiveOutputQty, fuseAmounts } = precomputed[outputShard];
            let bestCost = currentCost;
            let bestRecipe: Recipe | null = currentChoice.recipe;

            for (let i = 0; i < recipes.length; i++) {
                const recipe = recipes[i];
                const [fuse1, fuse2] = fuseAmounts[i];
                const [input1, input2] = recipe.inputs;
                const costInput1 = minCosts.get(input1)! * fuse1;
                const costInput2 = minCosts.get(input2)! * fuse2;
                const totalCost = costInput1 + costInput2; // Removed craftPenalty as it's time-based
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
        minCostsCache?: { minCosts: Map<string, number>; choices: Map<string, RecipeChoice> }
    ): RecipeTree {
        if (!minCostsCache) {
            const result = this.computeMinCosts(data, 0, 0, 0);
            minCostsCache = { minCosts: result.minCosts, choices: result.choices };
        }

        if (cycleNodes.flat().includes(shard)) {
            const cycleSteps = this.buildCycle(shard, choices1, cycleNodes);
            const minCosts = minCostsCache.minCosts;
            const choices = minCostsCache.choices;
            const targetShard = cycleNodes.flat().reduce((minShard, shard) => {
                return minCosts.get(shard)! < minCosts.get(minShard)! ? shard : minShard;
            }, cycleNodes.flat()[0]);

            const tree = this.buildRecipeTree(data, targetShard, choices, [], minCostsCache);
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
            const tree1 = this.buildRecipeTree(data, input1, choices1, cycleNodes, minCostsCache);
            const tree2 = this.buildRecipeTree(data, input2, choices1, cycleNodes, minCostsCache);

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
                            const inputTree = this.buildRecipeTree(data, inputId, choices, []);
                            this.assignQuantities(inputTree, totalQuantityNeeded, data, craftCounter, choices, crocodileMultiplier);
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

        const { minCosts, choices } = this.computeMinCosts(data, params.crocodileLevel, params.seaSerpentLevel, params.tiamatLevel);
        const cycleNodes = params.crocodileLevel > 0 ? this.findCycleNodes(choices) : [];
        const tree = this.buildRecipeTree(data, targetShard, choices, cycleNodes);
        const craftCounter = { total: 0 };
        const multipliers = this.calculateMultipliers(params);
        const { crocodileMultiplier } = multipliers;
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

        const costPerShard = minCosts.get(targetShard) ?? 0;
        const totalCost = costPerShard * totalShardsProduced;

        return {
            timePerShard: costPerShard,
            totalTime: totalCost,
            totalShardsProduced,
            craftsNeeded,
            totalQuantities,
            craftTime: 0,
            totalFusions: craftCounter.total,
            tree,
        };
    }
}

// Create and export a default instance
export const bzCalculationService = new CalculationService();
export default bzCalculationService;
