import React from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownButtonProps {
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({ children, isOpen, onClick, className = "" }) => (
  <button
    type="button"
    className={`flex items-center gap-1 lg:gap-2 px-1 lg:px-2 py-1 lg:py-2 text-slate-200 rounded shadow-sm border cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 ${className}`}
    onClick={onClick}
    tabIndex={0}
  >
    {children}
    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
  </button>
);
