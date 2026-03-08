import React, { useMemo } from "react";
import { Package, Eye, EyeOff } from "lucide-react";
import { getRarityColor } from "../../utilities";
import type { Data } from "../../types/types";

interface ShardsUsedProps {
  inventory: Map<string, number>;
  remainingInventory: Map<string, number>;
  data: Data;
  disabledShards: Set<string>;
  onDisabledShardsChange: (disabled: Set<string>) => void;
}

export const ShardsUsed: React.FC<ShardsUsedProps> = ({
  inventory,
  remainingInventory,
  data,
  disabledShards,
  onDisabledShardsChange,
}) => {
  // Compute shards used: inventory amount minus remaining
  const shardsUsed = useMemo(() => {
    const used: { shardId: string; amountUsed: number; remaining: number; total: number }[] = [];

    for (const [shardId, totalQty] of inventory) {
      if (disabledShards.has(shardId)) continue;
      const remaining = remainingInventory.get(shardId) ?? 0;
      const amountUsed = totalQty - remaining;
      if (amountUsed > 0) {
        used.push({ shardId, amountUsed, remaining, total: totalQty });
      }
    }

    // Sort by amount used descending
    used.sort((a, b) => b.amountUsed - a.amountUsed);
    return used;
  }, [inventory, remainingInventory, disabledShards]);

  if (shardsUsed.length === 0) return null;

  const handleToggleDisabled = (shardId: string) => {
    const next = new Set(disabledShards);
    if (next.has(shardId)) {
      next.delete(shardId);
    } else {
      next.add(shardId);
    }
    onDisabledShardsChange(next);
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-md p-3">
      <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap items-start sm:items-center sm:justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="p-1 bg-slate-700 rounded-md">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          Inventory Shards Used
        </h3>
        <span className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-md">
          {shardsUsed.length} shard{shardsUsed.length !== 1 ? "s" : ""} consumed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {shardsUsed.map(({ shardId, amountUsed, total }) => {
          const shard = data.shards[shardId];
          if (!shard) return null;
          const disabled = disabledShards.has(shardId);

          return (
            <div
              key={shardId}
              className={`bg-slate-700/50 border border-slate-600/60 rounded-md px-3 pt-1 pb-2 flex flex-row items-center justify-between ${disabled ? "opacity-50" : ""}`}
            >
              <div className="flex flex-col items-start min-w-0 justify-center h-full">
                <span className="text-slate-300 font-medium text-base flex-shrink-0">{amountUsed}x</span>
                <span className={`mt-0 font-medium text-sm ${getRarityColor(shard.rarity)} flex items-center min-w-0`}>
                  <img
                    src={`${import.meta.env.BASE_URL}shardIcons/${shardId}.png`}
                    alt={shard.name}
                    className="w-5 h-5 object-contain flex-shrink-0 inline-block align-middle mr-2"
                    loading="lazy"
                  />
                  <span className="truncate">{shard.name}</span>
                </span>
              </div>
              <div className="flex flex-col items-end justify-center h-full ml-2">
                <div className="flex items-center gap-1.5">
                  <div className="text-sm text-slate-400 whitespace-nowrap">
                    {total - amountUsed} <span className="text-slate-500">left</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleDisabled(shardId)}
                    title={disabled ? "Enable shard" : "Disable shard"}
                    className="flex-shrink-0 transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {disabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap mt-1">
                  {amountUsed} <span className="text-slate-500">of</span> {total}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
