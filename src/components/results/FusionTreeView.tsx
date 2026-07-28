import React, { useState } from "react";
import { BarChart3 } from "lucide-react";
import type { CalculationResult, CalculationParams, Data, RecipeTree, RecipeOverride } from "../../types/types";
import { RecipeTreeNode } from "../tree";
import { RecipeOverrideManager } from "../forms";
import { gzipBase64 } from "../../utilities";
import { useCopyToClipboard } from "../../hooks";
import { CopyTreeModal } from "../modals";

// Manage expanded/collapsed state for a recipe tree
const useTreeExpansion = (tree: RecipeTree | null) => {
  const [expandedStates, setExpandedStates] = useState<Map<string, boolean>>(new Map());
  const [lastTreeHash, setLastTreeHash] = useState<string>("");

  const initializeExpandedStates = (tree: RecipeTree, nodeId: string = "root"): Map<string, boolean> => {
    const states = new Map<string, boolean>();
    const traverse = (node: RecipeTree, id: string) => {
      if (node.method === "recipe" && node.inputs) {
        states.set(id, true);
        node.inputs.forEach((input, index) => {
          traverse(input, `${id}-${index}`);
        });
      }
    };
    traverse(tree, nodeId);
    return states;
  };

  React.useEffect(() => {
    if (tree) {
      const treeHash = JSON.stringify(tree);
      if (treeHash !== lastTreeHash) {
        const initialStates = initializeExpandedStates(tree);
        setExpandedStates(initialStates);
        setLastTreeHash(treeHash);
      }
    }
  }, [tree, lastTreeHash]);

  const handleExpandAll = () => {
    const newStates = new Map(expandedStates);
    for (const key of newStates.keys()) {
      newStates.set(key, true);
    }
    setExpandedStates(newStates);
  };

  const handleCollapseAll = () => {
    const newStates = new Map(expandedStates);
    for (const key of newStates.keys()) {
      newStates.set(key, false);
    }
    setExpandedStates(newStates);
  };

  const handleNodeToggle = (nodeId: string) => {
    const newStates = new Map(expandedStates);
    newStates.set(nodeId, !newStates.get(nodeId));
    setExpandedStates(newStates);
  };

  return { expandedStates, handleExpandAll, handleCollapseAll, handleNodeToggle };
};

interface FusionTreeViewProps {
  result: CalculationResult;
  data: Data;
  params: CalculationParams;
  recipeOverrides: RecipeOverride[];
  onRecipeOverridesUpdate: (overrides: RecipeOverride[]) => void;
  onResetRecipeOverrides: () => void;
  onShowActiveAlternatives: () => void;
  ironManView: boolean;
}

export const FusionTreeView: React.FC<FusionTreeViewProps> = ({
  result,
  data,
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onResetRecipeOverrides,
  onShowActiveAlternatives,
  ironManView,
}) => {
  const { expandedStates, handleExpandAll, handleCollapseAll, handleNodeToggle } = useTreeExpansion(result.tree);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const copyToClipboard = useCopyToClipboard();


  type SkyOceanDirect = { shard: string; method: "direct"; quantity: number };
  type SkyOceanCycleStep = { shard: string; inputs: [string, string] };
  type SkyOceanCycle = {
    shard: string;
    method: "cycle";
    quantity: number;
    craftsExpected: number;
    outputQuantity: number;
    pureReptile: number;
    steps: SkyOceanCycleStep[];
    inputRecipe?: SkyOceanTree;
    cycleInputs: SkyOceanTree[];
  };
  type SkyOceanRecipe = {
    shard: string;
    method: "recipe";
    quantity: number;
    craftsExpected: number;
    outputQuantity: number;
    pureReptile: number;
    inputs: SkyOceanTree[];
  };
  type SkyOceanTree = SkyOceanDirect | SkyOceanCycle | SkyOceanRecipe;

  const convertTreeToSkyOcean = (tree: RecipeTree): SkyOceanTree => {
    if (tree.method === "direct") {
      return {
        shard: tree.shard,
        method: "direct",
        quantity: tree.quantity,
      };
    }

    if (tree.method === "cycle") {
      const pureReptile = tree.quantity / tree.steps[0].recipe.outputQuantity;

      return {
        shard: tree.shard,
        method: "cycle",
        quantity: tree.quantity,
        craftsExpected: tree.craftsNeeded,
        outputQuantity: tree.steps[0].recipe.outputQuantity,
        pureReptile: pureReptile,
        steps: tree.steps.map((step) => ({
          shard: step.outputShard,
          inputs: step.recipe.inputs,
        })),
        inputRecipe: tree.inputRecipe ? convertTreeToSkyOcean(tree.inputRecipe) : undefined,
        cycleInputs: tree.cycleInputs ? tree.cycleInputs.map((input) => convertTreeToSkyOcean(input)) : [],
      };
    }

    // recipe
    const pureReptile = (tree.quantity - tree.craftsNeeded * tree.recipe.outputQuantity) / tree.recipe.outputQuantity;

    return {
      shard: tree.shard,
      method: "recipe",
      quantity: tree.quantity,
      craftsExpected: tree.craftsNeeded,
      outputQuantity: tree.recipe.outputQuantity,
      pureReptile: pureReptile,
      inputs: tree.inputs ? tree.inputs.map((input) => convertTreeToSkyOcean(input)) : [],
    };
  };

  type NoFrillsItem = { name: string; needed: number; source: "Direct" | "Fuse" | "Cycle" };

  const convertTreeToNoFrills = (tree: RecipeTree): NoFrillsItem[] => {
    const shardQuantities: Map<string, number> = new Map();
    const traverse = (node: RecipeTree | undefined) => {
      if (!node) return;
      if (node.method === "direct") {
        const key = `${node.shard}|Direct`;
        const currentQuantity = shardQuantities.get(key) || 0;
        shardQuantities.set(key, currentQuantity + node.quantity);
      } else if (node.method === "recipe") {
        const key = `${node.shard}|Fuse`;
        const currentQuantity = shardQuantities.get(key) || 0;
        shardQuantities.set(key, currentQuantity + node.quantity);
        if (node.inputs) {
          node.inputs.forEach((input) => traverse(input));
        }
      } else if (node.method === "cycle") {
        const key = `${node.shard}|Cycle`;
        shardQuantities.set(key, (shardQuantities.get(key) || 0) + node.quantity);
        if (node.inputRecipe) traverse(node.inputRecipe);
        node.cycleInputs.forEach((cycleInput) => traverse(cycleInput));
      }
    };
    traverse(tree);

    const list: NoFrillsItem[] = [];
    shardQuantities.forEach((quantity, key) => {
      const [shardId, method] = key.split("|");
      list.push({
        name: data.shards[shardId].name,
        needed: quantity,
        source: method as NoFrillsItem["source"],
      });
    });
    return list;
  };

  type SkyHanniItem = { name: string; needed: number };

  const convertTreeToSkyHanni = (tree: RecipeTree): SkyHanniItem[] => {
    const shardQuantities: Map<string, number> = new Map();
    const traverse = (node: RecipeTree | undefined) => {
      if (!node) return;
      if (node.method === "direct") {
        const key = node.shard;
        const currentQuantity = shardQuantities.get(key) || 0;
        shardQuantities.set(key, currentQuantity + node.quantity);
      } else if (node.method === "recipe") {
        if (node.inputs) {
          node.inputs.forEach((input) => traverse(input));
        }
      } else if (node.method === "cycle") {
        if (node.inputRecipe) traverse(node.inputRecipe);
        node.cycleInputs.forEach((cycleInput) => traverse(cycleInput));
      }
    };
    traverse(tree);

    const list: SkyHanniItem[] = [];
    shardQuantities.forEach((quantity, shardId) => {
      list.push({
        name: data.shards[shardId].name,
        needed: quantity,
      });
    });
    return list;
  };

  const buildSkyOceanString = () => {
    if (!result.tree) return "";
    const convertedTree = convertTreeToSkyOcean(result.tree);
    const treeString = JSON.stringify(convertedTree);
    const base64Tree = gzipBase64(treeString);
    return "<SkyOceanRecipe>(V2):" + base64Tree;
  };

  const buildNoFrillsString = () => {
    if (!result.tree) return "";
    const list = convertTreeToNoFrills(result.tree);
    const listString = JSON.stringify(list);
    const base64List = gzipBase64(listString);
    return "<NoFrillsRecipe>(V1):" + base64List;
  };

  const buildSkyHanniString = () => {
    if (!result.tree) return "";
    const list = convertTreeToSkyHanni(result.tree);
    const listString = JSON.stringify(list);
    const base64List = gzipBase64(listString);
    return "<SkyHanniRecipe>(V1):" + base64List;
  };

  const handleCopySkyOcean = () => void copyToClipboard(buildSkyOceanString(), "SkyOcean");
  const handleCopyNoFrills = () => void copyToClipboard(buildNoFrillsString(), "NoFrills");
  const handleCopySkyHanni = () => void copyToClipboard(buildSkyHanniString(), "SkyHanni");

  if (!result.tree) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="min-w-[810px]">
          <RecipeOverrideManager
            params={params}
            recipeOverrides={recipeOverrides}
            onRecipeOverridesUpdate={onRecipeOverridesUpdate}
            onResetRecipeOverrides={onResetRecipeOverrides}
          >
            {({ showAlternatives }) => (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-1 bg-slate-700 rounded-md">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    Fusion Tree
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setCopyModalOpen(true)}
                      className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/20 hover:border-blue-500/30 order-4 sm:order-1"
                    >
                      <span>Copy Tree</span>
                    </button>
                    <button
                      onClick={onShowActiveAlternatives}
                      className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 hover:border-purple-500/30 order-3 sm:order-2"
                    >
                      <span>Alternatives{recipeOverrides.length > 0 ? ` (${recipeOverrides.length})` : ""}</span>
                    </button>
                    <button
                      onClick={handleExpandAll}
                      className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 hover:border-green-500/30 order-2 sm:order-3"
                    >
                      <span>Expand All</span>
                    </button>
                    <button
                      onClick={handleCollapseAll}
                      className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/20 hover:border-orange-500/30 order-1 sm:order-4"
                    >
                      <span>Collapse All</span>
                    </button>
                  </div>
                </div>
                <RecipeTreeNode
                  tree={result.tree!}
                  data={data}
                  isTopLevel={true}
                  totalShardsProduced={result.totalShardsProduced}
                  nodeId="root"
                  expandedStates={expandedStates}
                  onToggle={handleNodeToggle}
                  onShowAlternatives={showAlternatives}
                  ironManView={ironManView}
                />
              </>
            )}
          </RecipeOverrideManager>
        </div>
      </div>
      <CopyTreeModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onCopySkyOcean={handleCopySkyOcean}
        onCopyNoFrills={handleCopyNoFrills}
        onCopySkyHanni={handleCopySkyHanni}
        materialsOnly={false}
      />
    </div>
  );
};
