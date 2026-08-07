import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import type { CalculationResult, Shard } from "../../types/types";
import { getRarityColor, isFocusRestoredByWindow, shardIconUrl } from "../../utilities";
import { MaterialSuggestionItem } from "./MaterialSuggestionItem";

interface MaterialTreeSelectorProps {
  shards: Shard[];
  shardCalculationData: Map<string, CalculationResult> | undefined;
  value: string;
  onChange: (key: string) => void;
}

export const MaterialTreeSelector: React.FC<MaterialTreeSelectorProps> = ({ shards, shardCalculationData, value, onChange}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedShard = useMemo(() => shards.find((s) => s.id === value), [shards, value]);

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const list = trimmed
      ? shards.filter((s) => s.name.toLowerCase().includes(trimmed) || s.family.toLowerCase().includes(trimmed) || s.type.toLowerCase().includes(trimmed))
      : shards;
    //return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [shards, query]);

  const handleSelect = useCallback(
    (shard: Shard) => {
      onChange(shard.id);
      setQuery("");
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
            handleSelect(suggestions[focusedIndex]);
          } else if (suggestions.length > 0) {
            handleSelect(suggestions[0]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, focusedIndex, handleSelect]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setQuery("");
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inputRef.current && !inputRef.current.contains(target) && listRef.current && !listRef.current.contains(target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative flex-1`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {selectedShard && !isOpen ? (
            <img src={shardIconUrl(selectedShard.id)} alt={selectedShard.name} className="w-4 h-4 object-contain" loading="lazy" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : selectedShard?.name ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setFocusedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            // Keep the in-progress query when the browser hands focus back after an alt-tab;
            // only a deliberate focus starts a fresh search.
            if (!isFocusRestoredByWindow(e.target)) setQuery("");
            setIsOpen(true);
          }}
          placeholder="Select a shard to view its fusion tree..."
          className={`w-full pl-10 pr-20 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-md placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:bg-slate-700/70 transition-colors ${
            selectedShard && !isOpen ? getRarityColor(selectedShard.rarity) : "text-white"
          }`}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && (
            <button onClick={handleClear} className="px-2 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="px-3 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle list"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul ref={listRef} className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-md shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((shard, index) => (
            <MaterialSuggestionItem key={shard.id} shard={shard} index={index} focusedIndex={focusedIndex} time={shardCalculationData?.get(shard.id)?.totalTime ?? Number.POSITIVE_INFINITY} onSelect={handleSelect} isSelecting={false} setFocusedIndex={setFocusedIndex} />
          ))}
        </ul>
      )}
    </div>
  );
};
