import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Package } from "lucide-react";
import { formatNumber, getRarityColor } from "../../utilities";
import type { Shard } from "../../types/types";

interface MaterialBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialShard: Shard;
  breakdown: Map<string, number>;
  allShards: { [shardId: string]: Shard };
  ironManView: boolean;
}

export const MaterialBreakdownModal: React.FC<MaterialBreakdownModalProps> = ({ isOpen, onClose, materialShard, breakdown, allShards, ironManView }) => {
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalQuantity = Array.from(breakdown.values()).reduce((sum, qty) => sum + qty, 0);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-6xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Material Usage Breakdown</h2>
              <span className="flex items-center gap-1 text-slate-400 text-sm">
                <span>for</span>
                <img src={`${import.meta.env.BASE_URL}shardIcons/${materialShard.id}.png`} alt={materialShard.name} className="w-5 h-5 object-contain" loading="lazy" />
                <span className={getRarityColor(materialShard.rarity)}>{materialShard.name}</span>
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Summary Info */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 rounded-md p-2 self-start">
              <span className="text-md text-amber-300">Total Needed:</span>
              <span className="text-md font-bold text-amber-300">{formatNumber(totalQuantity)}x</span>
              {!ironManView && <span className="text-sm text-slate-400">({formatNumber(totalQuantity * materialShard.rate)} coins)</span>}
            </div>
            <div className="text-xs text-slate-400">
              Used for {breakdown.size} target shard{breakdown.size !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Content - List of target shards */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {Array.from(breakdown.entries())
              .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
              .map(([targetShardId, qty]) => {
                const targetShard = allShards[targetShardId];
                if (!targetShard) return null;

                const percentage = ((qty / totalQuantity) * 100).toFixed(1);

                return (
                  <div key={targetShardId} className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 hover:bg-slate-700/50 hover:border-slate-500 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img src={`${import.meta.env.BASE_URL}shardIcons/${targetShard.id}.png`} alt={targetShard.name} className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${getRarityColor(targetShard.rarity)}`}>{targetShard.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{percentage}% of total usage</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-slate-300">{formatNumber(qty)}x</div>
                        {!ironManView && <div className="text-xs text-slate-400 mt-0.5">{formatNumber(qty * materialShard.rate)} coins</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
