import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, Settings } from "lucide-react";

export const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Calculator", icon: Calculator },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

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
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path}>
                  <div className={`px-3 py-2 rounded-md transition-colors cursor-pointer ${isActive ? "bg-purple-600 text-white" : "text-slate-300 bg-slate-800 hover:bg-slate-700"}`}>
                    <div className="flex items-center space-x-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
