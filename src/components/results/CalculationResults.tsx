import React, { useMemo, useState } from "react";
import { BarChart3, Hammer } from "lucide-react";
import { formatLargeNumber } from "../../utilities";
import type { CalculationResultsProps, ShardWithKey } from "../../types/types";
import { MaterialItem, useToast } from "../ui";
import pako from "pako";
import { CopyTreeModal } from "../modals";
import { ResultSummaryCards } from "./ResultSummaryCards";
import { FusionTreeView } from "./FusionTreeView";
import { MaterialTreeSelector } from "./MaterialTreeSelector";

export const CalculationResults: React.FC<CalculationResultsProps> = ({
  result,
  data,
  targetShardName,
  targetShard,
  params,
  recipeOverrides,
  onRecipeOverridesUpdate,
  onResetRecipeOverrides,
  ironManView,
  materialsOnly = false,
  materialShardResults,
  materialTreeShardKey = "",
  onMaterialTreeShardChange,
}) => {
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const { toast } = useToast();

  const gzipBase64 = (text: string) => {
    const gzipped = pako.gzip(text);
    const binary = String.fromCharCode(...gzipped);
    return btoa(binary);
  };

  // Materials-only copy (no tree): flatten the combined totals
  const buildNoFrillsString = () => {
    const list = Array.from(result.totalQuantities).map(([shardId, quantity]) => ({
      name: data.shards[shardId].name,
      needed: quantity,
      source: "Direct" as const,
    }));
    return "<NoFrillsRecipe>(V1):" + gzipBase64(JSON.stringify(list));
  };

  const buildSkyHanniString = () => {
    const list = Array.from(result.totalQuantities).map(([shardId, quantity]) => ({
      name: data.shards[shardId].name,
      needed: quantity,
    }));
    return "<SkyHanniRecipe>(V1):" + gzipBase64(JSON.stringify(list));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Copied", description: `${label} list copied to clipboard.`, variant: "success" }))
      .catch((err) => {
        console.error(`Failed to copy ${label} list:`, err);
        toast({ title: "Copy failed", description: "Failed to copy to clipboard.", variant: "error" });
      });
  };

  // Shards available to view individually (the selected target shards)
  const selectableShards = useMemo<ShardWithKey[]>(() => {
    if (!materialShardResults) return [];
    return Array.from(materialShardResults.keys())
      .filter((key) => data.shards[key])
      .map((key) => ({ ...data.shards[key], key }));
  }, [materialShardResults, data]);

  const selectedTreeResult = materialTreeShardKey ? materialShardResults?.get(materialTreeShardKey) : undefined;

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <ResultSummaryCards result={result} data={data} targetShard={targetShard} ironManView={ironManView} materialsOnly={materialsOnly} />
      {/* Materials Needed */}
      <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap items-start sm:items-center sm:justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-1 bg-slate-700 rounded-md">
              <Hammer className="w-5 h-5 text-blue-400" />
            </div>
            Materials Needed
          </h3>
          <div className="flex gap-2 flex-wrap">
            {materialsOnly && (
              <button
                onClick={() => setCopyModalOpen(true)}
                className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 hover:border-purple-500/30"
              >
                <span>Copy Materials</span>
              </button>
            )}
            {(() => {
              // Don't show Forest Essence if wooden bait is excluded
              if (params.noWoodenBait) return null;

              const forestEssenceShards = Array.from(result.totalQuantities).filter(([shardId]) =>
                ["shinyfish", "inferno koi", "abyssal lanternfish", "silentdepth"].includes(data.shards[shardId]?.name?.toLowerCase())
              );

              if (forestEssenceShards.length === 0) return null;

              const rarityBonuses = {
                common: 2 * params.newtLevel,
                uncommon: 2 * params.salamanderLevel,
                rare: params.lizardKingLevel,
                epic: params.leviathanLevel,
                legendary: 0,
              };

              const totalForestEssence = forestEssenceShards.reduce((total, [shardId, quantity]) => {
                const shardName = data.shards[shardId]?.name?.toLowerCase();
                const effectiveFortune = 1 + (params.hunterFortune + rarityBonuses[data.shards[shardId]?.rarity]) / 100;
                const essenceNeeded = (quantity * (shardName === "shinyfish" ? 350 : 1024)) / effectiveFortune;
                return total + essenceNeeded;
              }, 0);

              return (
                <div className="flex gap-1 items-center px-3 py-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 text-sm font-medium rounded-md min-w-0">
                  <span className="truncate">About</span>
                  <span className="text-slate-300">{formatLargeNumber(totalForestEssence)}</span>
                  <span className="truncate">Forest Essence</span>
                </div>
              );
            })()}
            <div className="px-3 py-1.5 flex gap-1 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium rounded-md min-w-0">
              <span className="text-slate-300">{Math.floor(result.totalShardsProduced)}x</span>
              <span className="truncate">{targetShardName}</span>
              {result.craftsNeeded > 0 && (
                <span className="text-slate-400 whitespace-nowrap">
                  {Math.floor(result.craftsNeeded)} craft{Math.floor(result.craftsNeeded) > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {Array.from(result.totalQuantities)
            .sort(([, quantityA], [, quantityB]) => quantityB - quantityA)
            .map(([shardId, quantity]) => {
              const shard = data.shards[shardId];
              const breakdown = result.materialBreakdown?.get(shardId);

              if (materialsOnly && breakdown && breakdown.size > 0) {
                return (
                  <MaterialItem
                    key={shardId}
                    shard={shard}
                    quantity={quantity}
                    ironManView={ironManView}
                    breakdown={breakdown}
                    allShards={data.shards}
                  />
                );
              }

              return <MaterialItem key={shardId} shard={shard} quantity={quantity} ironManView={ironManView} />;
            })}
        </div>
      </div>
      {/* Per-shard fusion tree (materials-only mode) */}
      {materialsOnly && selectableShards.length > 0 && (
        <div className="bg-slate-800 border border-slate-600 rounded-md p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-700 rounded-md">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">View Fusion Tree</h3>
          </div>
          <p className="text-sm text-slate-400">Select one of your shards to view its full fusion tree. Alternatives you set here apply to every shard.</p>
          <MaterialTreeSelector shards={selectableShards} value={materialTreeShardKey} onChange={(key) => onMaterialTreeShardChange?.(key)} />
        </div>
      )}
      {materialsOnly && selectedTreeResult && data.shards[materialTreeShardKey] && (
        <>
          <ResultSummaryCards result={selectedTreeResult} data={data} targetShard={materialTreeShardKey} ironManView={ironManView} />
          <FusionTreeView
            result={selectedTreeResult}
            data={data}
            params={params}
            recipeOverrides={recipeOverrides}
            onRecipeOverridesUpdate={onRecipeOverridesUpdate}
            onResetRecipeOverrides={onResetRecipeOverrides}
            ironManView={ironManView}
          />
        </>
      )}
      {/* Fusion Tree (single-shard mode) */}
      {!materialsOnly && result.tree && (
        <FusionTreeView
          result={result}
          data={data}
          params={params}
          recipeOverrides={recipeOverrides}
          onRecipeOverridesUpdate={onRecipeOverridesUpdate}
          onResetRecipeOverrides={onResetRecipeOverrides}
          ironManView={ironManView}
        />
      )}
      <CopyTreeModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        onCopySkyOcean={() => copyToClipboard("", "SkyOcean")}
        onCopyNoFrills={() => copyToClipboard(buildNoFrillsString(), "NoFrills")}
        onCopySkyHanni={() => copyToClipboard(buildSkyHanniString(), "SkyHanni")}
        materialsOnly={true}
      />
    </div>
  );
};
