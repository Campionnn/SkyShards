import { type ReactNode } from "react";
import { Package } from "lucide-react";
import type { AlternativeSelectionContext, Data, InventoryRecipeTree, Shard } from "../../types/types";
import { CycleNode, DirectShardNode, RecipeNode, ShardInfo, SubRecipeRow } from "./shared";
import { getCrocodileProcs, useExpansionState } from "./treeHelpers";

interface InventoryRecipeTreeNodeProps {
  tree: InventoryRecipeTree;
  data: Data;
  isTopLevel?: boolean;
  totalShardsProduced?: number;
  nodeId: string;
  expandedStates: Map<string, boolean>;
  onToggle: (nodeId: string) => void;
  onShowAlternatives?: (shardId: string, context: AlternativeSelectionContext) => void;
  ironManView: boolean;
  isInCycle?: boolean;
  remainingInventory?: Map<string, number>;
}

// A split node (an array) stands for one shard whose quantity is spread across branches.
const getShardId = (tree: InventoryRecipeTree): string => (Array.isArray(tree) ? (tree[0] ? getShardId(tree[0]) : "") : tree.shard);
const getQuantity = (tree: InventoryRecipeTree): number => (Array.isArray(tree) ? tree.reduce((sum, subtree) => sum + getQuantity(subtree), 0) : tree.quantity);

interface InventoryShardNodeProps {
  quantity: number;
  shard: Shard;
  remaining: number;
  ironManView: boolean;
  inCycle: boolean;
}

/** A leaf covered by shards the player already owns. */
const InventoryShardNode = ({ quantity, shard, remaining, ironManView, inCycle }: InventoryShardNodeProps) => (
  <div
    className={`flex items-center justify-between pl-3.5 pr-1 py-1 ${inCycle ? "bg-purple-900/40" : "bg-purple-900/30"} rounded-md border border-purple-500/50`}
  >
    <div className="flex items-center space-x-2 p-0.5 text-sm">
      <Package className="w-3.5 h-3.5 text-purple-400 mr-1" />
      <ShardInfo quantity={quantity} shard={shard} ironManView={ironManView} showRate={false} />
      <span className="px-1 py-0.4 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md flex-shrink-0">Inventory</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="text-right">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">remaining</span>
          <span className="text-slate-300 text-xs font-medium">{remaining}</span>
        </div>
      </div>
    </div>
  </div>
);

export const InventoryRecipeTreeNode = ({
  tree,
  data,
  isTopLevel = false,
  totalShardsProduced,
  nodeId,
  expandedStates,
  onToggle,
  onShowAlternatives,
  ironManView,
  isInCycle = false,
  remainingInventory,
}: InventoryRecipeTreeNodeProps) => {
  // Must run before any early return so hook order is stable across renders —
  // `tree` flips between array and single node as the inventory substitution changes.
  const getExpansionState = useExpansionState(expandedStates);

  const childProps = { data, expandedStates, onToggle, onShowAlternatives, ironManView, remainingInventory };

  if (Array.isArray(tree)) {
    return (
      <>
        {tree.map((subtree, index) => (
          <InventoryRecipeTreeNode key={`${nodeId}-${index}`} tree={subtree} nodeId={`${nodeId}-${index}`} isInCycle={isInCycle} {...childProps} />
        ))}
      </>
    );
  }

  const shard = data.shards[tree.shard];

  const renderInventoryShard = (quantity: number, inventoryShard: Shard, inCycle: boolean) => (
    <InventoryShardNode
      quantity={quantity}
      shard={inventoryShard}
      remaining={remainingInventory?.get(inventoryShard.id) ?? 0}
      ironManView={ironManView}
      inCycle={inCycle}
    />
  );

  // Rows inside a cycle, so everything here sits on the cycle's background.
  const renderSubRecipe = (subTree: InventoryRecipeTree, nodePrefix: string): ReactNode => {
    if (Array.isArray(subTree)) {
      return subTree.map((branch, index) => <div key={`${nodePrefix}-${index}`}>{renderSubRecipe(branch, `${nodePrefix}-${index}`)}</div>);
    }

    const inputShard = data.shards[subTree.shard];
    if (subTree.method === "inventory") return renderInventoryShard(subTree.quantity, inputShard, true);
    if (subTree.method === "direct") return <DirectShardNode quantity={subTree.quantity} shard={inputShard} ironManView={ironManView} inCycle />;
    if (subTree.method !== "recipe") return null;

    const subNodeId = `${nodePrefix}-${inputShard.id}`;
    return (
      <SubRecipeRow
        quantity={subTree.quantity}
        craftsNeeded={subTree.craftsNeeded}
        recipe={subTree.recipe}
        outputShard={inputShard}
        shards={data.shards}
        isExpanded={getExpansionState(subNodeId, true)}
        onToggle={() => onToggle(subNodeId)}
      >
        <InventoryRecipeTreeNode tree={subTree.inputs[0]} nodeId={`${subNodeId}-0`} isInCycle {...childProps} />
        <InventoryRecipeTreeNode tree={subTree.inputs[1]} nodeId={`${subNodeId}-1`} isInCycle {...childProps} />
      </SubRecipeRow>
    );
  };

  switch (tree.method) {
    case "inventory":
      return renderInventoryShard(tree.quantity, shard, isInCycle);

    case "direct":
      return (
        <DirectShardNode
          quantity={tree.quantity}
          shard={shard}
          ironManView={ironManView}
          inCycle={isInCycle}
          onShowAlternatives={onShowAlternatives && (() => onShowAlternatives(tree.shard, { currentRecipe: null, requiredQuantity: tree.quantity }))}
        />
      );

    case "recipe": {
      const [input1, input2] = tree.inputs;
      return (
        <RecipeNode
          outputQuantity={isTopLevel && totalShardsProduced ? Math.floor(totalShardsProduced) : tree.quantity}
          outputShard={shard}
          input1Quantity={getQuantity(input1)}
          input1Shard={data.shards[getShardId(input1)]}
          input2Quantity={getQuantity(input2)}
          input2Shard={data.shards[getShardId(input2)]}
          crafts={tree.craftsNeeded ?? 1}
          crocProcs={getCrocodileProcs(tree, data)}
          isExpanded={getExpansionState(nodeId, true)}
          inCycle={isInCycle}
          onToggle={() => onToggle(nodeId)}
          onShowAlternatives={onShowAlternatives && (() => onShowAlternatives(tree.shard, { currentRecipe: tree.recipe, requiredQuantity: tree.quantity }))}
        >
          <InventoryRecipeTreeNode tree={input1} nodeId={`${nodeId}-0`} isInCycle={isInCycle} {...childProps} />
          <InventoryRecipeTreeNode tree={input2} nodeId={`${nodeId}-1`} isInCycle={isInCycle} {...childProps} />
        </RecipeNode>
      );
    }

    case "cycle": {
      const firstStepId = `${nodeId}-step-1`;
      return (
        <CycleNode
          tree={tree}
          shards={data.shards}
          crocProcs={getCrocodileProcs(tree, data)}
          isExpanded={getExpansionState(nodeId, true)}
          ironManView={ironManView}
          onToggle={() => onToggle(nodeId)}
          onShowAlternatives={onShowAlternatives}
          firstStepExpanded={getExpansionState(firstStepId, true)}
          onToggleFirstStep={() => onToggle(firstStepId)}
          firstStepInput={renderSubRecipe(tree.inputRecipe, firstStepId)}
          fodder={tree.cycleInputs.map((cycleTree, index) => {
            const subNodeId = `${nodeId}-cycle-input-${index}`;
            return <div key={subNodeId}>{renderSubRecipe(cycleTree, subNodeId)}</div>;
          })}
        />
      );
    }
  }
};
