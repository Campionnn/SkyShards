import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Layers, ChevronDown } from "lucide-react";

interface TypeDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export const TypeDropdown: React.FC<TypeDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const types = useMemo(
    () => [
      { value: "all", label: "All Types", color: "text-emerald-400" },
      { value: "direct", label: "Direct", color: "text-green-400" },
      { value: "fuse", label: "Fuse", color: "text-fuchsia-400" },
    ],
    []
  );

  const currentType = useMemo(() => types.find((t) => t.value === value) || types[0], [types, value]);

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
      if (!target.closest(".type-dropdown") && !target.closest(".type-dropdown-portal")) {
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
      <div className="relative type-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[140px]
            bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/30
            rounded-md text-white hover:bg-emerald-500/20
            transition-colors duration-200 cursor-pointer
          "
        >
          <div className="flex items-center space-x-2">
            <Layers className={`w-5 h-5 ${currentType.color}`} />
            <span className={`font-medium ${currentType.color}`}>{currentType.label}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 ${currentType.color} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="type-dropdown-portal fixed z-[9999] backdrop-blur-sm bg-slate-800/95 border border-emerald-500/20 rounded-md shadow-2xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 140),
            }}
          >
            {types.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  onChange(type.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-sm text-left font-medium
                  transition-colors duration-200
                  ${value === type.value ? "bg-emerald-500/30 " + type.color : type.color + " hover:bg-emerald-500/10 hover:brightness-125"}
                  ${type !== types[types.length - 1] ? "border-b border-emerald-500/10" : ""}
                  ${type === types[0] ? "rounded-t-md" : ""}
                  ${type === types[types.length - 1] ? "rounded-b-md" : ""}
                cursor-pointer`}
              >
                {type.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
});
