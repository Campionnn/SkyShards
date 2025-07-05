import React, { useCallback } from "react";
import { getRarityColor } from "../../utils";
import type { SuggestionItemProps } from "../../types";

export const SuggestionItem: React.FC<SuggestionItemProps> = React.memo(({ shard, index, focusedIndex, onSelect, isSelecting, setFocusedIndex }) => {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(shard);
    },
    [onSelect, shard]
  );

  const handleMouseEnter = useCallback(() => {
    if (!isSelecting) setFocusedIndex(index);
  }, [isSelecting, setFocusedIndex, index]);

  return (
    <li
      className={`px-3 py-2.5 cursor-pointer border-b border-slate-700 last:border-b-0 ${index === focusedIndex ? "bg-purple-600 text-white" : "text-slate-200 hover:bg-slate-700"}`}
      onMouseDown={handleMouseDown}
      onClick={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className={`font-medium truncate ${getRarityColor(shard.rarity)}`}>{shard.name}</div>
          <div className="text-xs opacity-75 truncate">
            {shard.family} • {shard.type}
          </div>
        </div>
        {shard.rate > 0 && (
          <div className="text-xs font-mono bg-slate-900/50 px-2 py-1 rounded-md ml-2">
            {shard.rate}
            <span className="text-slate-500 mx-0.5">/</span>
            <span className="text-slate-400">hr</span>
          </div>
        )}
      </div>
    </li>
  );
});
