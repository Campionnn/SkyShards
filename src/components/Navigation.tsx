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
    <nav className="border-b border-slate-700 bg-slate-900">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Fusing Calculator</span>
          </Link>

          <div className="flex items-center space-x-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path}>
                  <div className={`px-3 py-2 rounded transition-colors ${isActive ? "bg-purple-600 text-white" : "text-slate-300 bg-slate-800 hover:bg-slate-700"}`}>
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
