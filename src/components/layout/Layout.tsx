import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";

export const Layout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main className="px-2 sm:px-4 lg:px-6 py-4">
        <div className="max-w-screen-xl mx-auto w-full">
          <ErrorBoundary>
            <Outlet key={location.pathname} />
          </ErrorBoundary>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-sm border-t border-slate-800/50">
        <div className="max-w-screen-xl mx-auto">
          <p className="font-medium">Made by Campion</p>
          <p className="mt-1 text-slate-500">A SkyShards Project. Big thanks you MegaMew14 for the help!</p>
          <div className="h-px w-1/2 bg-slate-800/50 mx-auto my-3"></div>
          <div className="flex justify-center items-center space-x-4">
            <a
              href="https://skyshards.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-xs font-medium"
            >
              SkyShards
            </a>
            <span className="text-slate-600">•</span>
            <a href="/about" className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-xs font-medium">
              About
            </a>
            <span className="text-slate-600">•</span>
            <a href="/contact" className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-xs font-medium">
              Contact
            </a>
            <span className="text-slate-600">•</span>
            <a href="/privacy-policy" className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-xs font-medium">
              Privacy Policy
            </a>
            <span className="text-slate-600">•</span>
            <span className="text-slate-600 text-xs">© {new Date().getFullYear()} SkyShards</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
