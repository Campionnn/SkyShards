import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Fusing Calculator</span>
            </motion.div>
          </Link>

          <div className="flex items-center space-x-1 gap-2">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative px-4 py-2 rounded-lg transition-colors duration-200
                      ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white hover:bg-white/5"}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
