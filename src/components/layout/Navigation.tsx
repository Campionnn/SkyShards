import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Grid3X3, Calculator, Menu, X, ExternalLink } from "lucide-react";

export const Navigation: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Grid", icon: Grid3X3 },
    { path: "/calculator", label: "Calculator", icon: Calculator },
  ];

  return (
    <nav className="border-b border-slate-700 bg-slate-900">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* logo */}
          <Link to="/" className="flex items-center group">
            <div
              className="text-2xl font-black bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent tracking-wide group-hover:from-emerald-300 group-hover:via-green-300 group-hover:to-teal-300 transition-all duration-300 drop-shadow-sm"
              style={{ fontFamily: "Orbitron, monospace" }}
            >
              Greenhouse
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer
                    ${isActive 
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 ring-1 ring-offset-0 ring-emerald-400" 
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/30"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
            
            <a
              href="https://skyshards.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 hover:border-purple-500/30"
            >
              <span>SkyShards</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 cursor-pointer hover:text-white hover:bg-slate-700 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 pt-3 py-2">
            <div className="flex flex-col space-y-1 gap-1">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2 font-medium rounded-md text-sm transition-colors duration-200 flex items-center space-x-2 cursor-pointer
                      ${isActive 
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 ring-1 ring-offset-0 ring-emerald-400" 
                        : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/30"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}

              <div className="border-t border-slate-600 pt-3 my-1">
                <a
                  href="https://skyshards.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 font-medium rounded-md text-sm transition-colors duration-200 flex items-center space-x-2 cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 hover:border-purple-500/30"
                >
                  <span>SkyShards Calculator</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
