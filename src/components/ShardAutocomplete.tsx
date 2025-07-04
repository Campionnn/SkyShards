import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { DataService } from "../services/dataService";
import { getRarityColor } from "../utils";
import { debounce } from "../utils";
import type { ShardWithKey } from "../types";

interface ShardAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (shard: ShardWithKey) => void;
  placeholder?: string;
  className?: string;
}

const SuggestionItem: React.FC<{
  shard: ShardWithKey;
  index: number;
  focusedIndex: number;
  onSelect: (shard: ShardWithKey) => void;
  isSelecting: boolean;
  setFocusedIndex: (index: number) => void;
}> = React.memo(({ shard, index, focusedIndex, onSelect, isSelecting, setFocusedIndex }) => {
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
      className={`
        px-4 py-3 cursor-pointer transition-all duration-200 ease-in-out
        ${index === focusedIndex ? "bg-purple-500/20 border-l-4 border-purple-500 shadow-lg" : "hover:bg-slate-700/50"}
        ${index !== focusedIndex ? "border-b border-slate-600/30" : ""}
        first:rounded-t-xl last:rounded-b-xl last:border-b-0
        group
      `}
      onMouseDown={handleMouseDown}
      onClick={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className={`font-semibold ${getRarityColor(shard.rarity)} group-hover:text-white transition-colors duration-200`}>
            {shard.name}
          </div>
          <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-200">
            {shard.family} • {shard.type}
          </div>
        </div>
        {shard.rate > 0 && (
          <div className="text-xs text-slate-500 group-hover:text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md font-mono transition-colors duration-200">
            {shard.rate}/hr
          </div>
        )}
      </div>
    </li>
  );
});

export const ShardAutocomplete: React.FC<ShardAutocompleteProps> = ({ value, onChange, onSelect, placeholder = "Search for a shard...", className = "" }) => {
  const [suggestions, setSuggestions] = useState<ShardWithKey[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length === 0 || isSelecting) {
          setSuggestions([]);
          setIsOpen(false);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        try {
          const dataService = DataService.getInstance();
          const results = await dataService.searchShards(query);
          setSuggestions(results.slice(0, 10));
          setIsOpen(results.length > 0);
          setFocusedIndex(-1);
        } catch (error) {
          console.error("Search failed:", error);
          setSuggestions([]);
          setIsOpen(false);
        } finally {
          setIsSearching(false);
        }
      }, 100),
    [isSelecting]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setIsSelecting(false);
      onChange(newValue);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Use debounced search
      debouncedSearch(newValue);
    },
    [onChange, debouncedSearch]
  );

  const handleSelect = useCallback(
    (shard: ShardWithKey) => {
      // Prevent any further interaction
      setIsSelecting(true);

      // Immediately close everything
      setIsOpen(false);
      setSuggestions([]);
      setFocusedIndex(-1);

      // Update value and notify parent
      onChange(shard.name);
      onSelect(shard);

      // Clear timeout and reset after a brief delay
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      setTimeout(() => {
        setIsSelecting(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }, 50);
    },
    [onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0 || isSelecting) return;

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
          } else if (suggestions.length === 1) {
            handleSelect(suggestions[0]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, isSelecting, focusedIndex, handleSelect]
  );

  const handleClear = useCallback(() => {
    setIsSelecting(false);
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    inputRef.current?.focus();
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    if (isSelecting) return;

    // Trigger search immediately if we have text
    if (value.trim()) {
      debouncedSearch(value);
    }
  }, [isSelecting, value, debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inputRef.current && !inputRef.current.contains(target) && listRef.current && !listRef.current.contains(target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /> : <Search className="h-5 w-5 text-slate-400" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="
            w-full pl-10 pr-10 py-3 
            bg-slate-800/50 border-2 border-slate-600/50 
            rounded-xl text-white placeholder-slate-400
            focus:outline-none focus:border-purple-500/70 focus:bg-slate-800/70
            hover:border-slate-500/70 hover:bg-slate-800/60
            transition-all duration-200 ease-in-out
            backdrop-blur-sm
          "
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            onClick={handleClear}
            className="
              absolute inset-y-0 right-0 pr-3 flex items-center 
              text-slate-400 hover:text-white 
              transition-colors duration-200 ease-in-out
              hover:scale-110
            "
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && !isSelecting && (
        <ul
          ref={listRef}
          className="
            absolute z-50 w-full mt-2 
            bg-slate-800/95 backdrop-blur-md
            border-2 border-slate-600/50 
            rounded-xl shadow-2xl
            max-h-64 overflow-y-auto
            contain-paint
            animate-fadeInUp
          "
        >
          {suggestions.map((shard, index) => (
            <SuggestionItem key={shard.key} shard={shard} index={index} focusedIndex={focusedIndex} onSelect={handleSelect} isSelecting={isSelecting} setFocusedIndex={setFocusedIndex} />
          ))}
        </ul>
      )}
    </div>
  );
};
