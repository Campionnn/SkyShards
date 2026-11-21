import { useState } from "react";
import { ChevronDown, ChevronRight, Package, Sparkles } from "lucide-react";

const plural = (count: number, noun: string) => `${noun}${count !== 1 ? "s" : ""}`;

interface InventoryPanelProps {
  inventorySize: number;
  attributeCount: number;
  onManage: () => void;
  /** Opens the inventory optimizer; needs both an inventory and attribute levels. */
  onOptimize: () => void;
}

/** Collapsible sidebar summary of the imported inventory, with the button that opens its modal. */
export const InventoryPanel = ({ inventorySize, attributeCount, onManage, onOptimize }: InventoryPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  // Without attribute levels the optimizer cannot tell what is unfinished or what is surplus.
  const canOptimize = inventorySize > 0 && attributeCount > 0;

  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-white hover:bg-purple-500/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-400" />
          <span className="font-medium">Inventory</span>
          {inventorySize > 0 && (
            <span className="text-xs text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
              {inventorySize} {plural(inventorySize, "shard")}
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="border-t border-purple-500/20 p-3 space-y-3">
          {inventorySize === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No inventory imported.</p>
          ) : (
            <div className="text-sm text-slate-300">
              <span className="text-white font-medium">{inventorySize}</span> {plural(inventorySize, "shard type")} in inventory
              {attributeCount > 0 && (
                <span className="ml-2">
                  • <span className="text-white font-medium">{attributeCount}</span> {plural(attributeCount, "attribute")}
                </span>
              )}
            </div>
          )}
          <button
            onClick={onManage}
            className="w-full px-3 py-2 bg-purple-500/20 border border-purple-500/30 hover:border-purple-400/40 rounded-md text-purple-300 hover:bg-purple-500/30 flex items-center justify-center gap-2 transition-colors duration-200 text-sm font-medium cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Manage Inventory</span>
          </button>
          <button
            onClick={onOptimize}
            disabled={!canOptimize}
            title={
              canOptimize ? "Max as many attributes as your shards allow" : "Import your profile first: the optimizer needs your shards and attribute levels"
            }
            className="w-full px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-400/40 rounded-md text-emerald-300 hover:bg-emerald-500/25 flex items-center justify-center gap-2 transition-colors duration-200 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/15"
          >
            <Sparkles className="w-4 h-4" />
            <span>Optimize Inventory</span>
          </button>
        </div>
      )}
    </div>
  );
};
