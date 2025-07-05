import React from "react";
import { Outlet } from "react-router-dom";
import { Navigation } from "./Navigation";

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>

      <footer className="text-center py-4 text-slate-400 text-sm border-t border-slate-800 mt-8">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-medium">Made by Campion and xKapy</p>
          <p className="mt-1 text-slate-500">Thanks to HsFearless, MaxLunar and WhatYouThing for the data</p>
        </div>
      </footer>
    </div>
  );
};
