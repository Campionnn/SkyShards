import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";

export const Layout: React.FC = () => {
  const location = useLocation();
  React.useEffect(() => {
    // Debug: log when Layout mounts/unmounts and on route change
    console.log("[Layout] Rendered. Current path:", location.pathname);
    return () => {
      console.log("[Layout] Unmounted.");
    };
  }, [location.pathname]);
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

      <footer className="text-center py-4 text-slate-400 text-sm border-t border-slate-800 mt-8">
        <div className="max-w-screen-2xl mx-auto px-1 sm:px-2 lg:px-4">
          <p className="font-medium">Made by Campion and xKapy</p>
          <p className="mt-1 text-slate-500">Thanks to HsFearless, MaxLunar and WhatYouThing for the data</p>
        </div>
      </footer>
    </div>
  );
};
