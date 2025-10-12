import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Filter, ChevronDown } from "lucide-react";

interface RarityDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export const RarityDropdown: React.FC<RarityDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const rarities = useMemo(
    () => [
      { value: "all", label: "All Rarities", color: "text-violet-400" },
      { value: "common", label: "Common", color: "text-white" },
      { value: "uncommon", label: "Uncommon", color: "text-green-400" },
      { value: "rare", label: "Rare", color: "text-blue-400" },
      { value: "epic", label: "Epic", color: "text-purple-400" },
      { value: "legendary", label: "Legendary", color: "text-orange-400" },
    ],
    []
  );

  const currentRarity = useMemo(() => rarities.find((r) => r.value === value) || rarities[0], [rarities, value]);

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
      if (!target.closest(".rarity-dropdown") && !target.closest(".dropdown-portal")) {
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
      <div className="relative rarity-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px]
            bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30
            rounded-md hover:bg-purple-500/20 
            transition-colors duration-200 cursor-pointer
          "
        >
          <div className="flex items-center space-x-2">
            <Filter className={`w-5 h-5 ${currentRarity.color}`} />
            <span className={`font-medium ${currentRarity.color}`}>{currentRarity.label}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 ${currentRarity.color} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="dropdown-portal fixed z-[9999] bg-slate-800/95 backdrop-blur-sm border border-purple-500/20 rounded-md shadow-2xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 140),
            }}
          >
            {rarities.map((rarity) => (
              <button
                key={rarity.value}
                type="button"
                onClick={() => {
                  onChange(rarity.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-sm text-left font-medium
                  transition-colors duration-200
                  ${value === rarity.value ? "bg-purple-500/30 " + rarity.color : rarity.color + " hover:bg-purple-500/10 hover:brightness-125"}
                  ${rarity !== rarities[rarities.length - 1] ? "border-b border-purple-500/10" : ""}
                  ${rarity === rarities[0] ? "rounded-t-md" : ""}
                  ${rarity === rarities[rarities.length - 1] ? "rounded-b-md" : ""}
                cursor-pointer`}
              >
                {rarity.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});
