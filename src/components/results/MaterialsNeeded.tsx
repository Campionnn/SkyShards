import type { ReactNode } from "react";
import { Hammer } from "lucide-react";
import { formatLargeNumber } from "../../utilities";
import type { CalculationParams, Data } from "../../types/types";
import { MaterialItem } from "../ui";

/** Shards whose only source is fishing with Forest Essence-crafted bait. */
const FOREST_ESSENCE_SHARDS = ["shinyfish", "inferno koi", "abyssal lanternfish", "silentdepth"];

/** Rough Forest Essence cost of the bait for `totalQuantities`, or null when none is needed. */
const estimateForestEssence = (totalQuantities: Map<string, number>, data: Data, params: CalculationParams): number | null => {
  // Without wooden bait these shards aren't fished at all.
  if (params.noWoodenBait) return null;

  const fished = Array.from(totalQuantities).filter(([shardId]) => FOREST_ESSENCE_SHARDS.includes(data.shards[shardId]?.name?.toLowerCase()));
  if (fished.length === 0) return null;

  const rarityBonuses: Record<string, number> = {
    common: 2 * params.newtLevel,
    uncommon: 2 * params.salamanderLevel,
    rare: params.lizardKingLevel,
    epic: params.leviathanLevel,
    legendary: 0,
  };

  return fished.reduce((total, [shardId, quantity]) => {
    const shard = data.shards[shardId];
    const effectiveFortune = 1 + (params.hunterFortune + rarityBonuses[shard.rarity]) / 100;
    return total + (quantity * (shard.name.toLowerCase() === "shinyfish" ? 350 : 1024)) / effectiveFortune;
  }, 0);
};

interface MaterialsNeededProps {
  totalQuantities: Map<string, number>;
  data: Data;
  params: CalculationParams;
  targetShardName: string;
  totalShardsProduced: number;
  craftsNeeded: number;
  ironManView: boolean;
  /** Per-material source breakdown (multi-shard mode); materials with one open a breakdown modal. */
  materialBreakdown?: Map<string, Map<string, number>>;
  /** Extra buttons shown before the summary badges. */
  actions?: ReactNode;
}

export const MaterialsNeeded = ({
  totalQuantities,
  data,
  params,
  targetShardName,
  totalShardsProduced,
  craftsNeeded,
  ironManView,
  materialBreakdown,
  actions,
}: MaterialsNeededProps) => {
  const forestEssence = estimateForestEssence(totalQuantities, data, params);
  const crafts = Math.floor(craftsNeeded);

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
      <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap items-start sm:items-center sm:justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="p-1 bg-slate-700 rounded-md">
            <Hammer className="w-5 h-5 text-blue-400" />
          </div>
          Materials Needed
        </h3>
        <div className="flex gap-2 flex-wrap">
          {actions}
          {forestEssence !== null && (
            <div className="flex gap-1 items-center px-3 py-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 text-sm font-medium rounded-md min-w-0">
              <span className="truncate">About</span>
              <span className="text-slate-300">{formatLargeNumber(forestEssence)}</span>
              <span className="truncate">Forest Essence</span>
            </div>
          )}
          <div className="px-3 py-1.5 flex gap-1 bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-medium rounded-md min-w-0">
            <span className="text-slate-300">{Math.floor(totalShardsProduced)}x</span>
            <span className="truncate">{targetShardName}</span>
            {craftsNeeded > 0 && (
              <span className="text-slate-400 whitespace-nowrap">
                {crafts} craft{crafts > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {Array.from(totalQuantities)
          .sort(([, quantityA], [, quantityB]) => quantityB - quantityA)
          .map(([shardId, quantity]) => {
            const shard = data.shards[shardId];
            if (!shard) return null;
            const breakdown = materialBreakdown?.get(shardId);
            return breakdown && breakdown.size > 0 ? (
              <MaterialItem key={shardId} shard={shard} quantity={quantity} ironManView={ironManView} breakdown={breakdown} allShards={data.shards} />
            ) : (
              <MaterialItem key={shardId} shard={shard} quantity={quantity} ironManView={ironManView} />
            );
          })}
      </div>
    </div>
  );
};
