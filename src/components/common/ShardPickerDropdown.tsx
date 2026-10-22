import { useEffect, useRef, useState } from "react";
import { DropdownButton } from "./DropdownButton";
import { ShardDisplay } from "../ui/ShardDisplay";
import type { FusionJson } from "../../types/types";

interface ShardPickerDropdownProps {
  shardIds: string[];
  selectedId: string;
  onSelect: (shardId: string) => void;
  fusionData: FusionJson;
}

/** Searchable dropdown for picking one shard out of a recipe group's variants. */
export const ShardPickerDropdown = ({ shardIds, selectedId, onSelect, fusionData }: ShardPickerDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const term = search.toLowerCase();
  const visibleIds = term ? shardIds.filter((id) => fusionData.shards[id]?.name.toLowerCase().includes(term)) : shardIds;

  return (
    <div className="relative" ref={containerRef}>
      <DropdownButton isOpen={isOpen} onClick={() => setIsOpen((open) => !open)} className="min-w-[120px] bg-slate-600 border-slate-500 text-white">
        <ShardDisplay shardId={selectedId} fusionData={fusionData} tooltipVisible={false} />
      </DropdownButton>
      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-slate-900 border border-slate-600 rounded shadow-xl max-h-64 min-w-max flex flex-col">
          <input
            type="text"
            className="bg-slate-800 text-white px-3 py-2 text-sm border-b border-slate-700 outline-none"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="overflow-auto max-h-48">
            {visibleIds.map((shardId) => (
              <button
                key={shardId}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-600 text-sm"
                onClick={() => {
                  onSelect(shardId);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <ShardDisplay shardId={shardId} fusionData={fusionData} tooltipVisible={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
