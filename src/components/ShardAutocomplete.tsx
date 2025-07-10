import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { DataService } from "../services/dataService";
import { debounce } from "../utils";
import type { ShardWithKey, ShardAutocompleteProps } from "../types";
import { SuggestionItem } from "./search/SuggestionItem";

export const ShardAutocomplete: React.FC<ShardAutocompleteProps> = ({ value, onChange, onSelect, onFocus, placeholder = "Search for a shard...", className = "", searchMode = "enhanced" }) => {
  const [suggestions, setSuggestions] = useState<ShardWithKey[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);
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
          const results = searchMode === "name-only" ? await dataService.searchShardsByNameOnly(query) : await dataService.searchShards(query);

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
    [isSelecting, searchMode]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setIsSelecting(false);
      onChange(newValue);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      debouncedSearch(newValue);
    },
    [onChange, debouncedSearch]
  );

  const handleSelect = useCallback(
    (shard: ShardWithKey) => {
      setIsSelecting(true);
      setIsOpen(false);
      setSuggestions([]);
      setFocusedIndex(-1);

      onChange(shard.name);
      onSelect(shard);

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

    // Capture the input width when focused
    if (inputRef.current) {
      setDropdownWidth(inputRef.current.offsetWidth);
    }

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
          {isSearching ? <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Search className="h-4 w-4 text-slate-400" />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (onFocus) onFocus();
            handleInputFocus();
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-slate-700/70 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button onClick={handleClear} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && !isSelecting && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-xl max-h-60 overflow-y-auto"
          style={{ width: dropdownWidth ? `${dropdownWidth}px` : "100%" }}
        >
          {suggestions.map((shard, index) => (
            <SuggestionItem key={shard.key} shard={shard} index={index} focusedIndex={focusedIndex} onSelect={handleSelect} isSelecting={isSelecting} setFocusedIndex={setFocusedIndex} />
          ))}
        </ul>
      )}
    </div>
  );
};
