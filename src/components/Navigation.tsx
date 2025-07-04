import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, Settings } from "lucide-react";

export const Navigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Calculator", icon: Calculator },
    { path: "/settings", label: "Edit Rates", icon: Settings },
  ];

  return (
    <nav className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 hover:scale-105 active:scale-95 transition-transform duration-200">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Fusing Calculator</span>
            </div>
          </Link>

          <div className="flex items-center space-x-1 gap-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path}>
                  <div
                    className={`
                      relative px-4 py-2 rounded-lg transition-all duration-200
                      hover:scale-105 active:scale-95
                      ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white hover:bg-white/5"}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{label}</span>
                    </div>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30" />}
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
