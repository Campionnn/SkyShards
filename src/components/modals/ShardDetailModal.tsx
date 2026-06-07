import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Hammer, Coins, Layers, Copy, Check } from "lucide-react";
import { CalculationService } from "../../services";
import { RecipeTreeNode } from "../tree";
import { getRarityColor, formatShardDescription, formatLargeNumber, copyToClipboard } from "../../utilities";
import { SHARD_DESCRIPTIONS, ATTRIBUTE_TIER_TO_SHARD_COUNT, fusedCountToTierLevel } from "../../constants";
import type { CalculationParams, Data, RecipeChoice, RecipeTree, ShardWithKey } from "../../types/types";

// Provided only when the cheapest method for this shard is fusion — drives the "How to Craft" tree.
export interface FusionContext {
  data: Data;
  choices: Map<string, RecipeChoice>;
  cycleNodes: string[][];
  params: CalculationParams;
}

interface ShardDetailModalProps {
  open: boolean;
  onClose: () => void;
  shard: ShardWithKey;
  unitCost: number;
  level: number;
  ownedLoose: number;
  remaining: number;
  targetTier: number;
  bazaarLabel: string;
  bazaarUnitCost?: number;
  fusion?: FusionContext | null;
}

const initExpanded = (tree: RecipeTree): Map<string, boolean> => {
  const states = new Map<string, boolean>();
  const traverse = (node: RecipeTree, id: string) => {
    if (node.method === "recipe" && node.inputs) {
      states.set(id, true);
      node.inputs.forEach((input, index) => traverse(input, `${id}-${index}`));
    } else if (node.method === "cycle") {
      states.set(id, true);
    }
  };
  traverse(tree, "root");
  return states;
};

export const ShardDetailModal: React.FC<ShardDetailModalProps> = ({ open, onClose, shard, unitCost, level, ownedLoose, remaining, targetTier, bazaarLabel, bazaarUnitCost, fusion }) => {
  const [expandedStates, setExpandedStates] = useState<Map<string, boolean>>(new Map());
  const [copied, setCopied] = useState(false);

  const desc = SHARD_DESCRIPTIONS[shard.key as keyof typeof SHARD_DESCRIPTIONS] as { title: string; description?: string } | undefined;
  const goalLabel = targetTier === 10 ? "max" : `T${targetTier}`;

  const copyBazaarCommand = async () => {
    if (await copyToClipboard(`/bz ${shard.name}`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Build the fusion tree (only when fusion is the cheapest method) for the remaining-to-max quantity
  const tree = useMemo(() => {
    if (!open || !fusion) return null;
    const service = CalculationService.getInstance();
    const qty = Math.max(1, remaining);
    try {
      const built = service.buildRecipeTree(fusion.data, shard.key, fusion.choices, fusion.cycleNodes, fusion.params, []);
      const craftCounter = { total: 0 };
      const { crocodileMultiplier } = service.calculateMultipliers(fusion.params);
      service.assignQuantities(built, qty, fusion.data, craftCounter, fusion.choices, crocodileMultiplier, fusion.params, []);
      return built;
    } catch {
      return null;
    }
  }, [open, shard.key, remaining, fusion]);

  useEffect(() => {
    if (tree) setExpandedStates(initExpanded(tree));
  }, [tree]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Per-tier cost table based on current progress
  const tierRows = useMemo(() => {
    const tierMap = ATTRIBUTE_TIER_TO_SHARD_COUNT[shard.rarity?.toLowerCase() ?? ""] ?? {};
    const currentTier = fusedCountToTierLevel(level, shard.rarity ?? "");
    let cumulative = 0;
    const rows: { tier: number; cumulative: number; stillNeeded: number; cost: number; isCurrent: boolean }[] = [];
    for (let tier = 1; tier <= 10; tier++) {
      cumulative += tierMap[tier] ?? 0;
      const stillNeeded = Math.max(0, cumulative - level - ownedLoose);
      rows.push({ tier, cumulative, stillNeeded, cost: isFinite(unitCost) ? stillNeeded * unitCost : Infinity, isCurrent: tier === currentTier });
    }
    return rows;
  }, [shard.rarity, level, ownedLoose, unitCost]);

  const handleToggle = (nodeId: string) => {
    setExpandedStates((prev) => {
      const next = new Map(prev);
      next.set(nodeId, !next.get(nodeId));
      return next;
    });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.key}.png`} alt={shard.name} className="w-9 h-9 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-lg font-semibold ${getRarityColor(shard.rarity)} truncate`}>{shard.name}</h2>
                {fusion ? (
                  <span className="px-1.5 py-0.5 text-xs bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-md flex-shrink-0">Fusion</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-md flex-shrink-0">{bazaarLabel}</span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {shard.key} • {shard.family} • {shard.type}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={copyBazaarCommand}
              title={`Copy "/bz ${shard.name}"`}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Use / perk */}
          {desc && (
            <div className="bg-white/5 border border-white/10 rounded-md p-3">
              <div className="text-sm font-medium text-yellow-500 mb-1">{desc.title}</div>
              <p className="text-sm text-slate-300 break-words" dangerouslySetInnerHTML={{ __html: formatShardDescription(desc.description || "No description.") }} />
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-md p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Per shard</div>
              <div className="flex items-center justify-center gap-1 text-amber-300 font-semibold text-sm mt-0.5">
                <Coins className="w-3.5 h-3.5" />
                {isFinite(unitCost) ? formatLargeNumber(unitCost) : "—"}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-md p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Shards to {goalLabel}</div>
              <div className="text-white font-semibold text-sm mt-0.5">{formatLargeNumber(remaining)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-md p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Price to {goalLabel}</div>
              <div className="flex items-center justify-center gap-1 text-amber-300 font-semibold text-sm mt-0.5">
                <Coins className="w-3.5 h-3.5" />
                {isFinite(unitCost) ? formatLargeNumber(remaining * unitCost) : "—"}
              </div>
            </div>
          </div>

          {/* Fusion vs Bazaar comparison (fusion is cheapest, but show the direct-buy price too) */}
          {fusion && bazaarUnitCost !== undefined && isFinite(bazaarUnitCost) && (
            <div className="bg-white/5 border border-white/10 rounded-md p-3">
              <div className="text-xs font-semibold text-white mb-2">Fusion vs Bazaar</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 p-2">
                  <div className="text-[10px] text-fuchsia-300 uppercase tracking-wide">Fusion</div>
                  <div className="text-fuchsia-200 font-semibold">{formatLargeNumber(unitCost)}<span className="text-[10px] text-slate-400 font-normal"> / shard</span></div>
                  <div className="text-[11px] text-slate-400">{isFinite(unitCost) ? formatLargeNumber(remaining * unitCost) : "—"} to {goalLabel}</div>
                </div>
                <div className="rounded-md border border-green-500/25 bg-green-500/10 p-2">
                  <div className="text-[10px] text-green-300 uppercase tracking-wide">{bazaarLabel}</div>
                  <div className="text-green-200 font-semibold">{formatLargeNumber(bazaarUnitCost)}<span className="text-[10px] text-slate-400 font-normal"> / shard</span></div>
                  <div className="text-[11px] text-slate-400">{formatLargeNumber(remaining * bazaarUnitCost)} to {goalLabel}</div>
                </div>
              </div>
              {bazaarUnitCost > unitCost && (
                <div className="mt-2 text-xs text-green-400">
                  Fusing saves {formatLargeNumber((bazaarUnitCost - unitCost) * remaining)} ({Math.round(((bazaarUnitCost - unitCost) / bazaarUnitCost) * 100)}%) vs buying directly.
                </div>
              )}
            </div>
          )}

          {/* Per-tier cost table */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Cost per Tier</h3>
              <span className="text-xs text-slate-500">from your current progress</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-white/10">
                    <th className="text-left font-medium px-3 py-2">Tier</th>
                    <th className="text-right font-medium px-3 py-2">Total shards</th>
                    <th className="text-right font-medium px-3 py-2">Still needed</th>
                    <th className="text-right font-medium px-3 py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {tierRows.map((row) => (
                    <tr key={row.tier} className={`border-b border-white/5 last:border-0 ${row.isCurrent ? "bg-purple-500/10" : ""}`}>
                      <td className="px-3 py-1.5 text-slate-200">
                        Tier {row.tier}
                        {row.isCurrent && <span className="ml-2 text-[10px] text-purple-300">current</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-400">{row.cumulative}</td>
                      <td className="px-3 py-1.5 text-right text-slate-300">{row.stillNeeded === 0 ? <span className="text-green-400">done</span> : row.stillNeeded}</td>
                      <td className="px-3 py-1.5 text-right text-amber-300 font-medium">{isFinite(row.cost) ? formatLargeNumber(row.cost) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fusion recipe tree — only when fusion is the cheapest method */}
          {fusion && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">How to Craft</h3>
                <span className="text-xs text-slate-500">for {formatLargeNumber(Math.max(1, remaining))} shard{Math.max(1, remaining) !== 1 ? "s" : ""}</span>
              </div>
              {tree ? (
                <RecipeTreeNode tree={tree} data={fusion.data} nodeId="root" isTopLevel expandedStates={expandedStates} onToggle={handleToggle} ironManView={false} />
              ) : (
                <div className="text-sm text-slate-400 bg-white/5 border border-white/10 rounded-md p-3">Unable to build a fusion recipe for this shard.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShardDetailModal;
