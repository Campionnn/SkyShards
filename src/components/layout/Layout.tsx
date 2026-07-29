import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { ErrorBoundary } from "./ErrorBoundary";
import { PnPageAutoScale } from "../PnPageAutoScale";
import { GreenhouseModal } from "../modals";

const GREENHOUSE_MODAL_SEEN_KEY = "greenhouse_modal_seen";

const useAdBlockDetected = (): boolean => {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    let active = true;
    let score = 0;
    const signal = () => {
      if (!active) return;
      score += 1;
      if (score >= 2) setDetected(true);
    };

    const rampTimer = setTimeout(() => {
      // `ramp` is injected by the PubNation ad script; we only presence-check it.
      if (typeof (window as { ramp?: unknown }).ramp === "undefined") {
        signal();
      }
    }, 4000);

    fetch("https://scripts.pubnation.com/ads.js", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
    }).catch(signal);

    const el = document.createElement("div");
    el.className = "adsbox";
    el.style.cssText = "height:1px;width:1px;position:absolute;top:-9999px;left:-9999px;";
    document.body.appendChild(el);

    const baitTimer = setTimeout(() => {
      if (!document.body.contains(el) || el.offsetHeight === 0) signal();
      el.parentNode?.removeChild(el);
    }, 200);

    return () => {
      active = false;
      clearTimeout(rampTimer);
      clearTimeout(baitTimer);
      el.parentNode?.removeChild(el);
    };
  }, []);

  return detected;
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const [showGreenhouseModal, setShowGreenhouseModal] = useState(false);
  const adBlockDetected = useAdBlockDetected();

  const cleanPath = location.pathname.replace(/\/+$/, "");
  // The fusion graph hosts a React Flow canvas, which breaks under an ancestor CSS
  // scale — render it without PnPageAutoScale's transform.
  const disablePageScale = cleanPath.endsWith("/fusion-lines");
  // Pages that need full-width layout should opt out of the reserved ad columns.
  // Also disable ad spaces when an ad blocker is detected to prevent layout gaps.
  const disableAds = cleanPath.endsWith("/fusion-lines") || adBlockDetected;

  useEffect(() => {
    // Check if user has seen the modal before
    const hasSeenModal = localStorage.getItem(GREENHOUSE_MODAL_SEEN_KEY);
    if (!hasSeenModal) {
      setShowGreenhouseModal(true);
    }
  }, []);

  const handleCloseGreenhouseModal = () => {
    // Mark modal as seen in localStorage
    localStorage.setItem(GREENHOUSE_MODAL_SEEN_KEY, "true");
    setShowGreenhouseModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      <main className="px-1 sm:px-2 lg:px-4 py-3">
        <div className="w-full">
          <div className={disableAds ? undefined : "pn-page"}>
            {!disableAds && <div className="pn-left" aria-hidden />}
            <div className={disableAds ? undefined : "pn-content"}>
              <PnPageAutoScale disabled={disablePageScale}>
                <div className="max-w-screen-2xl mx-auto w-full">
                  {!disableAds && <div className="pn-leaderboard" />}

                  <ErrorBoundary>
                    <Outlet key={location.pathname} />
                  </ErrorBoundary>
                </div>
              </PnPageAutoScale>
            </div>
            {!disableAds && <aside className="pn-sidebar" aria-label="Advertisement" />}
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