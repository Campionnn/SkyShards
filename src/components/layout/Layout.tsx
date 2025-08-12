import React from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";

export const Layout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main className="px-1 sm:px-2 lg:px-4 py-3">
        <div className="max-w-screen-2xl mx-auto w-full">
          <ErrorBoundary>
            <Outlet key={location.pathname} />
          </ErrorBoundary>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-sm border-t border-slate-800 mt-8">
        <div className="max-w-screen-2xl mx-auto px-1 sm:px-2 lg:px-4">
          <p className="font-medium">Made by Campion and xKapy</p>
          <p className="mt-1 text-slate-500">Thanks to HsFearless, MaxLunar, and WhatYouThing for the data</p>
          
          <div className="flex justify-center items-center space-x-4 mt-3 pt-3 border-t border-slate-800/50">
            <Link 
              to="/privacy" 
              className="text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-600">•</span>
            <a 
              href="https://github.com/Campionnn/SkyShards" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium"
            >
              GitHub
            </a>
            <span className="text-slate-600">•</span>
            <span className="text-slate-600 text-xs">
              © {new Date().getFullYear()} SkyShards
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
