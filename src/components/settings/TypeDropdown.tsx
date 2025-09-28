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
      { value: "all", label: "All Types" },
      { value: "direct", label: "Direct" },
      { value: "fuse", label: "Fuse" },
    ],
    []
  );

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

  const currentType = useMemo(() => types.find((t) => t.value === value), [types, value]);

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
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">{currentType?.label || "All Types"}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-emerald-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                  hover:bg-emerald-500/20 transition-colors duration-200
                  ${value === type.value ? "bg-emerald-500/30 text-emerald-200" : "text-white hover:text-emerald-200"}
                  ${type !== types[types.length - 1] ? "border-b border-emerald-500/10" : ""}
                  ${type === types[0] ? "rounded-t-md" : ""}
                  ${type === types[types.length - 1] ? "rounded-b-md" : ""}
                `}
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
