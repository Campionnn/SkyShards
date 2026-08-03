import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Filter, ChevronDown } from "lucide-react";

interface FusionTreeViewSortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export const FusionTreeSortDropown: React.FC<FusionTreeViewSortDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const sortTypes = useMemo(
    () => [
        { value: "default", label: "Sort", color: "text-white"},
        { value: "shortest", label: "Shortest Time", color:"text-white"},
        {value: "alphabetically", label: "Alphabetically", color:"text-white"},
      { value: "rarity", label: "Rarity", color: "text-white" },
    ],
    []
  );

  const currentSortType = useMemo(() => sortTypes.find((r) => r.value === value) || sortTypes[0], [sortTypes, value]);

  const updatePosition = useCallback(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, buttonRef]);

  useEffect(updatePosition, [updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".fusion-tree-sort-dropdown") && !target.closest(".dropdown-portal")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);


  return (
    <>
      <div className="relative fusion-tree-sort-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[50px]
            bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30
            rounded-md hover:bg-purple-500/20 
            transition-colors duration-200 cursor-pointer
          "
        >
          <div className="flex items-center space-x-2">
            <Filter className={`w-5 h-5 ${currentSortType.color}`} />
            <span className={`font-medium ${currentSortType.color}`}>{currentSortType.label}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 ${currentSortType.color} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="dropdown-portal absolute z-[9999] bg-slate-800/95 backdrop-blur-sm border border-purple-500/20 rounded-md shadow-2xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 140),
            }}
          >
            {sortTypes.map((sortType) => (
              !(sortType.value == "default") && <button
                key={sortType.value}
                type="button"
                onClick={() => {
                  onChange(sortType.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-sm text-left font-medium
                  transition-colors duration-200
                  ${value === sortType.value ? "bg-purple-500/30 " + sortType.color : sortType.color + " hover:bg-purple-500/10 hover:brightness-125"}
                  ${sortType !== sortTypes[sortTypes.length - 1] ? "border-b border-purple-500/10" : ""}
                  ${sortType === sortTypes[0] ? "rounded-t-md" : ""}
                  ${sortType === sortTypes[sortTypes.length - 1] ? "rounded-b-md" : ""}
                cursor-pointer`}
              >
                {sortType.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});
