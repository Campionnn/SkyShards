import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Layers, Sword, Pickaxe, Fish, Wheat, Trees, Globe, Crosshair, PawPrint, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SkillDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

interface SkillOption {
  value: string;
  label: string;
  color: string;
  icon: LucideIcon;
  description?: string;
}

// `value` matches the shard `type` field exactly.
const SKILL_OPTIONS: SkillOption[] = [
  { value: "all", label: "All Skills", color: "text-violet-400", icon: Layers },
  { value: "Combat", label: "Combat", color: "text-red-400", icon: Sword, description: "Combat-focused attributes" },
  { value: "Mining", label: "Mining", color: "text-sky-400", icon: Pickaxe, description: "Mining speed, powder, etc." },
  { value: "Fishing", label: "Fishing", color: "text-cyan-400", icon: Fish, description: "Sea creature chance, fishing speed" },
  { value: "Farming", label: "Farming", color: "text-yellow-400", icon: Wheat, description: "Garden visitors, farming fortune" },
  { value: "Foraging", label: "Foraging", color: "text-green-400", icon: Trees, description: "Sweep, foraging fortune" },
  { value: "Global", label: "Global", color: "text-slate-200", icon: Globe, description: "Universal stats (health, strength, int)" },
  { value: "Hunting", label: "Hunting", color: "text-orange-400", icon: Crosshair, description: "Hunter fortune, black hole bonuses" },
  { value: "Taming", label: "Taming", color: "text-emerald-400", icon: PawPrint, description: "Pet exp, taming wisdom" },
  { value: "Enchanting", label: "Enchanting", color: "text-fuchsia-400", icon: Sparkles, description: "EXP orbs, superpairs" },
];

export const SkillDropdown: React.FC<SkillDropdownProps> = React.memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const current = useMemo(() => SKILL_OPTIONS.find((s) => s.value === value) || SKILL_OPTIONS[0], [value]);
  const CurrentIcon = current.icon;

  const updatePosition = useCallback(() => {
    if (isOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
  }, [isOpen, buttonRef]);

  useEffect(updatePosition, [updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".skill-dropdown") && !target.closest(".skill-dropdown-portal")) {
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
      <div className="relative skill-dropdown">
        <button
          ref={setButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between space-x-2 px-3 py-2.5 min-w-[150px] bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-400/30 rounded-md hover:bg-indigo-500/20 transition-colors duration-200 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <CurrentIcon className={`w-5 h-5 ${current.color}`} />
            <span className={`font-medium ${current.color}`}>{current.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 ${current.color} transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="skill-dropdown-portal fixed z-[9999] bg-slate-800/95 backdrop-blur-sm border border-indigo-500/20 rounded-md shadow-2xl max-h-[60vh] overflow-y-auto"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left, width: Math.max(dropdownPosition.width, 240) }}
          >
            {SKILL_OPTIONS.map((skill, idx) => {
              const Icon = skill.icon;
              const isActive = value === skill.value;
              return (
                <button
                  key={skill.value}
                  type="button"
                  onClick={() => {
                    onChange(skill.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors duration-200 cursor-pointer ${
                    isActive ? "bg-indigo-500/30" : "hover:bg-indigo-500/10"
                  } ${idx !== SKILL_OPTIONS.length - 1 ? "border-b border-indigo-500/10" : ""} ${idx === 0 ? "rounded-t-md" : ""} ${
                    idx === SKILL_OPTIONS.length - 1 ? "rounded-b-md" : ""
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${skill.color}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${skill.color}`}>{skill.label}</div>
                    {skill.description && <div className="text-xs text-slate-400 truncate">{skill.description}</div>}
                  </div>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
});
