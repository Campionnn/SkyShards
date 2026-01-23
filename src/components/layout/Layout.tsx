import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";
import { PnPageAutoScale } from "../PnPageAutoScale";

export const Layout: React.FC = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main className="px-1 sm:px-2 lg:px-4 py-3">
        <div className="w-full">
          <div className="pn-page">
            <div className="pn-left" aria-hidden />
            <div className="pn-content">
              <PnPageAutoScale>
                <div className="max-w-screen-2xl mx-auto w-full">
                  <div className="pn-leaderboard" />

                  <ErrorBoundary>
                    <Outlet key={location.pathname} />
                  </ErrorBoundary>
                </div>
              </PnPageAutoScale>
            </div>
            <aside className="pn-sidebar" aria-label="Advertisement" />
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-sm border-t border-slate-800/50">
        <div className="max-w-screen-2xl mx-auto">
          <p className="font-medium">Made by Campion and xKapy</p>
          <p className="mt-1 text-slate-500">Thanks to HsFearless, MaxLunar, and WhatYouThing for the data</p>
          <div className="h-px w-1/2 bg-slate-800/50 mx-auto my-3"></div>
          <div className="flex justify-center items-center space-x-4">
            <a
              href="https://github.com/Campionnn/SkyShards"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium"
            >
              GitHub
            </a>
            <span className="text-slate-600">•</span>
            <a href="/about" className="text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium">
              About
            </a>
            <span className="text-slate-600">•</span>
            <a href="/contact" className="text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium">
              Contact
            </a>
            <span className="text-slate-600">•</span>
            <a href="https://skyshards.com/privacy-policy" className="text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium">
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