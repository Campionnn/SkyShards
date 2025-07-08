import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, Settings, Shuffle } from "lucide-react";

// Custom GitHub icon to avoid deprecation warnings
const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Calculator", icon: Calculator, color: "purple" },
    { path: "/recipes", label: "Recipes", icon: Shuffle, color: "green" },
    { path: "/settings", label: "Shards", icon: Settings, color: "blue" },
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
    green: {
      bg: "bg-green-500/20",
      hoverBg: "hover:bg-green-500/30",
      text: "text-green-300",
      border: "border border-green-500/20",
      hoverBorder: "hover:border-green-500/30",
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
              const ringClass = isActive
                ? color === "blue"
                  ? "ring-1 ring-offset-0 ring-blue-300"
                  : color === "green"
                  ? "ring-1 ring-offset-0 ring-green-300"
                  : "ring-1 ring-offset-0 ring-purple-300"
                : "";
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
            <a
              href="https://github.com/Campionnn/SkyShards"
              target="_blank"
              className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/20 hover:border-gray-500/30"
            >
              <GitHubIcon className="w-3 h-3" />
              <span>Github</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
