import React from "react";
import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  additionalValue?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, iconColor, label, value, additionalValue }) => (
  <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white font-medium text-sm">
          {value}
          {additionalValue && (
            <>
              <span className="text-slate-400 mx-1">•</span>
              <span className="text-slate-400">{additionalValue}</span>
            </>
          )}
        </p>
      </div>
    </div>
  </div>
);
