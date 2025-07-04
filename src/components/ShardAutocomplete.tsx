import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { DataService } from "../services/dataService";
import { getRarityColor } from "../utils";
import type { ShardWithKey } from "../types";

interface ShardAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (shard: ShardWithKey) => void;
  placeholder?: string;
  className?: string;
}

export const ShardAutocomplete: React.FC<ShardAutocompleteProps> = ({ value, onChange, onSelect, placeholder = "Search for a shard...", className = "" }) => {
  const [suggestions, setSuggestions] = useState<ShardWithKey[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchShards = async (query: string) => {
    if (query.length === 0 || isSelecting) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

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
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsSelecting(false);
    onChange(newValue);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchShards(newValue);
    }, 200);
  };

  const handleSelect = (shard: ShardWithKey) => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
  };

  const handleClear = () => {
    setIsSelecting(false);
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (isSelecting) return;

    // Only show suggestions if we have text and it's not an exact match
    if (value && suggestions.length > 0) {
      const exactMatch = suggestions.some((s) => s.name.toLowerCase() === value.toLowerCase());
      if (!exactMatch) {
        setIsOpen(true);
      }
    }
  };

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
          <Search className="h-5 w-5 text-slate-400" />
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
            bg-white/5 backdrop-blur-xl 
            border border-white/10 
            rounded-xl text-white placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
            transition-all duration-200
          "
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button onClick={handleClear} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isOpen && suggestions.length > 0 && !isSelecting && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="
              absolute z-50 w-full mt-2 
              bg-slate-800/90 backdrop-blur-xl 
              border border-white/10 
              rounded-xl shadow-2xl
              max-h-64 overflow-y-auto
            "
          >
            {suggestions.map((shard, index) => (
              <motion.li
                key={shard.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  px-4 py-3 cursor-pointer transition-colors
                  ${index === focusedIndex ? "bg-purple-500/20 border-l-2 border-purple-500" : "hover:bg-white/5"}
                  ${index !== suggestions.length - 1 ? "border-b border-white/5" : ""}
                `}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(shard);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(shard);
                }}
                onMouseEnter={() => !isSelecting && setFocusedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${getRarityColor(shard.rarity)}`}>{shard.name}</div>
                    <div className="text-sm text-slate-400">
                      {shard.family} • {shard.type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{shard.id}</div>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
