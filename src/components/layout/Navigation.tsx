import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, Settings } from "lucide-react";

export const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Calculator", icon: Calculator, color: "purple" },
    { path: "/settings", label: "Settings", icon: Settings, color: "blue" },
  ];

  // Color classes for each nav item
  const colorClasses: Record<string, { bg: string; hoverBg: string; text: string; border: string; hoverBorder: string }> = {
    purple: {
      bg: "bg-purple-500/20",
      hoverBg: "hover:bg-purple-500/30",
      text: "text-purple-300",
      border: "border border-purple-500/20",
      hoverBorder: "hover:border-purple-500/30",
    },
    blue: {
      bg: "bg-blue-500/20",
      hoverBg: "hover:bg-blue-500/30",
      text: "text-blue-300",
      border: "border border-blue-500/20",
      hoverBorder: "hover:border-blue-500/30",
    },
  };

  return (
    <nav className="border-b border-slate-700 bg-slate-900">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center group">
            <div
              className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent tracking-wide group-hover:from-blue-300 group-hover:via-purple-300 group-hover:to-emerald-300 transition-all duration-300 drop-shadow-sm"
              style={{ fontFamily: "Orbitron, monospace" }}
            >
              Sky Shards
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            {navItems.map(({ path, label, icon: Icon, color }) => {
              const isActive = location.pathname === path;
              const colorClass = colorClasses[color];
              // Set outline color based on nav item color
              const ringClass = isActive ? (color === "blue" ? "ring-1 ring-offset-0 ring-blue-300" : "ring-1 ring-offset-0 ring-purple-300") : "";
              return (
                <Link
                  key={path}
                  to={path}
                  className={`px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer ${colorClass.bg} ${colorClass.hoverBg} ${colorClass.text} ${colorClass.border} ${colorClass.hoverBorder} ${ringClass}`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
