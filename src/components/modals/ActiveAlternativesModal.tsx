import React, { useMemo } from "react";
import { Modal } from "../ui";
import { X, Star, Trash2 } from "lucide-react";
import { getRarityColor, shardIconUrl } from "../../utilities";
import { useShards } from "../../hooks";
import type { RecipeOverride, Shard } from "../../types/types";

interface ActiveAlternativesModalProps {
  open: boolean;
  onClose: () => void;
  recipeOverrides: RecipeOverride[];
  rateAsCoinValue: boolean;
  onRemove: (shardId: string) => void;
  onRemoveAll: () => void;
}

export const ActiveAlternativesModal: React.FC<ActiveAlternativesModalProps> = ({ open, onClose, recipeOverrides, rateAsCoinValue, onRemove, onRemoveAll }) => {
  const { shards } = useShards();

  const shardsById = useMemo(() => {
    const map: Record<string, Shard> = {};
    for (const shard of shards) {
      map[shard.id] = shard;
    }
    return map;
  }, [shards]);

  if (!open) return null;

  const handleRemoveAll = () => {
    onRemoveAll();
    onClose();
  };

  const renderShard = (shardId: string, quantity: number) => {
    const shard = shardsById[shardId];
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-slate-300 text-xs">{quantity}x</span>
        <img src={shardIconUrl(shardId)} alt={shard?.name || shardId} className="w-4 h-4 object-contain" loading="lazy" />
        <span className={shard ? getRarityColor(shard.rarity) : "text-slate-300"}>{shard?.name || shardId}</span>
      </span>
    );
  };

  const renderOverride = (override: RecipeOverride) => {
    const outputShard = shardsById[override.shardId];

    return (
      <div key={override.shardId} className="p-3 rounded-lg border bg-slate-800/50 border-slate-600/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <img
                src={shardIconUrl(override.shardId)}
                alt={outputShard?.name || override.shardId}
                className="w-5 h-5 object-contain"
                loading="lazy"
              />
              <span className={(outputShard ? getRarityColor(outputShard.rarity) : "text-slate-300") + " font-semibold"}>{outputShard?.name || override.shardId}</span>
              {override.recipe ? (
                <span className="px-1 py-0.4 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md flex-shrink-0">Fusion</span>
              ) : (
                <span className="px-1 py-0.4 text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded-md flex-shrink-0">{rateAsCoinValue ? "Bazaar" : "Direct"}</span>
              )}
            </div>

            <div className="mt-2 text-sm overflow-x-auto text-nowrap">
              {override.recipe ? (
                <div className="flex items-center gap-1.5">
                  {renderShard(override.recipe.inputs[0], shardsById[override.recipe.inputs[0]]?.fuse_amount ?? 1)}
                  <span className="text-slate-400 mx-0.5">+</span>
                  {renderShard(override.recipe.inputs[1], shardsById[override.recipe.inputs[1]]?.fuse_amount ?? 1)}
                  <span className="text-slate-400 mx-0.5">=</span>
                  {renderShard(override.shardId, override.recipe.outputQuantity)}
                </div>
              ) : (
                <span className="text-slate-400">{rateAsCoinValue ? "Bought from the Bazaar instead of fused" : "Collected directly instead of fused"}</span>
              )}
            </div>
          </div>

          <button
            onClick={() => onRemove(override.shardId)}
            className="p-2 rounded-md text-red-300 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/30 transition-colors cursor-pointer flex-shrink-0"
            aria-label={`Remove alternative for ${outputShard?.name || override.shardId}`}
            title="Remove this alternative"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="active-alternatives-title" panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-400" />
            <h2 id="active-alternatives-title" className="text-lg font-semibold text-white">Active Alternatives</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 min-h-0">
        {recipeOverrides.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div>No alternatives set.</div>
            <div className="text-sm mt-1">Click a shard in the fusion tree to pick a different recipe for it.</div>
          </div>
        ) : (
          <div className="space-y-3">{recipeOverrides.map(renderOverride)}</div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
          <span>
            {recipeOverrides.length} alternative{recipeOverrides.length !== 1 ? "s" : ""} set
          </span>
          <div className="flex items-center gap-3">
            {recipeOverrides.length > 0 && (
              <button
                onClick={handleRemoveAll}
                className="px-3 py-2 font-medium rounded-md transition-colors duration-200 cursor-pointer bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 hover:border-red-500/30"
              >
                Remove All
              </button>
            )}
            <button onClick={onClose} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
