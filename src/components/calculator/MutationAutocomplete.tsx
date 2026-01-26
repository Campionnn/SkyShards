import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { debounce } from "../../utilities";
import { getCropImagePath } from "../../types/greenhouse";
import { useGreenhouseData } from "../../context";
import type { MutationDefinition } from "../../types/greenhouse";

interface MutationAutocompleteProps {
  mutations: MutationDefinition[];
  excludeIds?: string[];
  onSelect: (mutation: MutationDefinition) => void;
  placeholder?: string;
  className?: string;
}

export const MutationAutocomplete: React.FC<MutationAutocompleteProps> = ({
  mutations,
  excludeIds = [],
  onSelect,
  placeholder = "Search mutations...",
  className = "",
}) => {
  const { getCropDef, getMutationDef } = useGreenhouseData();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MutationDefinition[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Available mutations
  const availableMutations = useMemo(() => {
    return mutations.filter((m) => !excludeIds.includes(m.id));
  }, [mutations, excludeIds]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchQuery: string) => {
        if (searchQuery.length === 0 || isSelecting) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const results = availableMutations.filter((m) =>
          m.name.toLowerCase().includes(lowerQuery)
        );

        setSuggestions(results);
        setIsOpen(results.length > 0);
        setFocusedIndex(-1);
      }, 100),
    [availableMutations, isSelecting]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setIsSelecting(false);
      setQuery(newValue);
      debouncedSearch(newValue);
    },
    [debouncedSearch]
  );

  const handleSelect = useCallback(
    (mutation: MutationDefinition) => {
      setIsSelecting(true);
      setIsOpen(false);
      setSuggestions([]);
      setFocusedIndex(-1);
      setQuery("");

      onSelect(mutation);

      inputRef.current?.blur();

      setTimeout(() => {
        setIsSelecting(false);
      }, 50);
    },
    [onSelect]
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
          setFocusedIndex((prev) =>
            prev <= 0 ? suggestions.length - 1 : prev - 1
          );
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
    [isOpen, suggestions, isSelecting, focusedIndex, handleSelect]
  );

  const handleClear = useCallback(() => {
    setIsSelecting(false);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleInputFocus = useCallback(() => {
    if (isSelecting) return;

    // show all available mutations when empty query
    if (query.trim() === "") {
      setSuggestions(availableMutations);
      setIsOpen(availableMutations.length > 0);
    } else {
      debouncedSearch(query);
    }
  }, [isSelecting, query, availableMutations, debouncedSearch]);

  // click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("li");
      const focusedItem = items[focusedIndex];
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

  // show dropdown after selection if input is still focused and there are available mutations
  useEffect(() => {
    if (!isSelecting && availableMutations.length > 0 && document.activeElement === inputRef.current) {
      setSuggestions(availableMutations);
      setIsOpen(true);
    }
  }, [availableMutations, isSelecting]);

  // format mutation name
  const formatName = (name: string) => name.replace(/_/g, " ");

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-slate-700/50 border border-slate-600/30 rounded-md text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 hover:bg-slate-700/70 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && !isSelecting && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600/50 rounded-md shadow-xl max-h-60 overflow-y-auto"
        >
          {suggestions.map((mutation, index) => (
            <li
              key={mutation.id}
              onClick={() => handleSelect(mutation)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === focusedIndex
                  ? "bg-emerald-600/30 text-slate-100"
                  : "text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <img
                    src={getCropImagePath(mutation.id)}
                    alt={mutation.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const icon = document.createElement("div");
                        icon.className = "text-emerald-400";
                        icon.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium">
                    {mutation.name}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Requires:{" "}
                    {mutation.requirements.map((r, i) => {
                      const reqCropDef = getCropDef(r.crop);
                      const reqMutationDef = getMutationDef(r.crop);
                      const displayName = reqCropDef?.name || reqMutationDef?.name || formatName(r.crop);
                      
                      return (
                        <span key={r.crop}>
                          {i > 0 && ", "}
                          {r.count}x {displayName}
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && suggestions.length === 0 && query.length > 0 && !isSelecting && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600/50 rounded-md shadow-xl p-3 text-sm text-slate-400 text-center">
          No mutations found
        </div>
      )}
    </div>
  );
};
