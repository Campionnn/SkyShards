import { useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

const plural = (count: number, noun: string) => `${noun}${count !== 1 ? "s" : ""}`;

interface InventoryPanelProps {
  inventorySize: number;
  attributeCount: number;
  onManage: () => void;
}

/** Collapsible sidebar summary of the imported inventory, with the button that opens its modal. */
export const InventoryPanel = ({ inventorySize, attributeCount, onManage }: InventoryPanelProps) => {
  const [expanded, setExpanded] = useState(true);

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
        </div>
      )}
    </div>
  );
};
