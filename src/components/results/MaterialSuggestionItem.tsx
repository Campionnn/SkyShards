import React, { useCallback } from "react";
import { formatTime, getRarityColor, shardIconUrl } from "../../utilities";
import type { Shard } from "../../types/types";

interface MaterialSuggestionItemProps {
  shard: Shard;
  index: number;
  focusedIndex: number;
  time: number;
  onSelect: (shard: Shard) => void;
  isSelecting: boolean;
  setFocusedIndex: (index: number) => void;
}

export const MaterialSuggestionItem: React.FC<MaterialSuggestionItemProps> = React.memo(({ shard, index, focusedIndex, time, onSelect, isSelecting, setFocusedIndex }) => {
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
      className={`px-3 py-2.5 cursor-pointer border-b border-slate-700 last:border-b-0 min-w-0 ${index === focusedIndex ? "bg-purple-600 text-white" : "text-slate-200 hover:bg-slate-700"}`}
      onMouseDown={handleMouseDown}
      onClick={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center min-w-0 flex-1 gap-2">
          <img src={shardIconUrl(shard.id)} alt={shard.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
          <div className="min-w-0 flex-1">
            <div className={`font-medium truncate ${getRarityColor(shard.rarity)}`}>{shard.name}</div>
            <div className="text-xs opacity-75 truncate">
              {shard.family} • {shard.type}
            </div>
          </div>
        </div>
        {time > 0 && (
          <div className="text-xs font-mono bg-slate-900/50 px-2 py-1 rounded-md ml-2 flex-shrink-0">
            {formatTime(time)}
          </div>
        )}
      </div>
    </li>
  );
});
