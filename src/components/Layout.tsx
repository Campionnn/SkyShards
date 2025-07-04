import React from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation } from "./Navigation";

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(120,119,198,0.1),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(139,92,246,0.1),transparent_50%)]" />

      {/* Glass morphism background */}
      <div className="fixed inset-0 backdrop-blur-3xl bg-black/10" />

      <div className="relative z-10">
        <Navigation />
        <main className="w-full px-4 lg:px-6 xl:px-8 py-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Outlet />
          </motion.div>
        </main>

        <footer className="relative z-10 text-center py-6 text-slate-400 text-sm">
          <div className="w-full px-4 lg:px-6 xl:px-8">
            <p>Made by Campion and xKapy</p>
            <p className="mt-1">Thanks to HsFearless, MaxLunar and WhatYouThing for the data</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
