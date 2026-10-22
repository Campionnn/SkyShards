import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";
import { PnPageAutoScale } from "../PnPageAutoScale";
import { GreenhouseModal } from "../modals";
import { hasSeenGreenhouseModal, markGreenhouseModalSeen } from "../../utilities";

const FOOTER_LINK = "text-slate-500 hover:text-purple-400 transition-colors duration-200 text-xs font-medium";

const FooterSeparator = () => <span className="text-slate-600">•</span>;

export const Layout = () => {
  const location = useLocation();
  const [showGreenhouseModal, setShowGreenhouseModal] = useState(() => !hasSeenGreenhouseModal());

  // The fusion graph hosts a React Flow canvas, which breaks under an ancestor CSS scale, and
  // needs the full width — so it skips both PnPageAutoScale's transform and the ad columns.
  // Ad-blocker users are handled separately: index.html detects the blocker and sets
  // `html.ads-blocked`, and CSS collapses the ad slots (see src/index.css). Keeping that
  // out of React means it applies on first paint without a re-render or layout shift.
  const isFullBleed = location.pathname.replace(/\/+$/, "").endsWith("/fusion-lines");

  const handleCloseGreenhouseModal = () => {
    markGreenhouseModalSeen();
    setShowGreenhouseModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main className="px-1 sm:px-2 lg:px-4 py-3">
        <div className="w-full">
          <div className={isFullBleed ? undefined : "pn-page"}>
            {!isFullBleed && <div className="pn-left" aria-hidden />}
            <div className={isFullBleed ? undefined : "pn-content"}>
              <PnPageAutoScale disabled={isFullBleed}>
                <div className="max-w-screen-2xl mx-auto w-full">
                  {!isFullBleed && <div className="pn-leaderboard" />}

                  <ErrorBoundary>
                    <Outlet key={location.pathname} />
                  </ErrorBoundary>
                </div>
              </PnPageAutoScale>
            </div>
            {!isFullBleed && <aside className="pn-sidebar" aria-label="Advertisement" />}
          </div>
        </div>
      </main>

      <GreenhouseModal open={showGreenhouseModal} onClose={handleCloseGreenhouseModal} />

      <footer className="text-center py-6 text-slate-400 text-sm border-t border-slate-800/50">
        <div className="max-w-screen-2xl mx-auto">
          <p className="font-medium">Made by Campion and xKapy</p>
          <p className="mt-1 text-slate-500">Thanks to MegaMew14, HsFearless, MaxLunar, and WhatYouThing for the data</p>
          <div className="h-px w-1/2 bg-slate-800/50 mx-auto my-3"></div>
          <div className="flex justify-center items-center space-x-4">
            <a href="https://github.com/Campionnn/SkyShards" target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
              GitHub
            </a>
            <FooterSeparator />
            <Link to="/about" className={FOOTER_LINK}>
              About
            </Link>
            <FooterSeparator />
            <Link to="/contact" className={FOOTER_LINK}>
              Contact
            </Link>
            <FooterSeparator />
            <Link to="/privacy-policy" className={FOOTER_LINK}>
              Privacy Policy
            </Link>
            <FooterSeparator />
            <span className="text-slate-600 text-xs">© {new Date().getFullYear()} SkyShards</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
