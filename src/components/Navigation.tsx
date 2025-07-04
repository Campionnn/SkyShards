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
    <nav className="relative z-20 border-b-2 border-slate-700/50 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Fusing Calculator</span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path}>
                  <div
                    className={`
                      relative px-6 py-3 rounded-xl transition-all duration-200 ease-in-out
                      ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg ring-2 ring-purple-500/30"
                          : "text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-105"
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{label}</span>
                    </div>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl blur-sm -z-10"></div>}
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
