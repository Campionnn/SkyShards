import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface PerformanceContextType {
  isPerformanceMode: boolean;
  isUltraPerformanceMode: boolean;
  hasHardwareAcceleration: boolean;
  setPerformanceMode: (enabled: boolean) => void;
  setUltraPerformanceMode: (enabled: boolean) => void;
  togglePerformanceMode: () => void;
  toggleUltraPerformanceMode: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance must be used within a PerformanceProvider");
  }
  return context;
};

interface PerformanceProviderProps {
  children: ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({ children }) => {
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [isUltraPerformanceMode, setIsUltraPerformanceMode] = useState(false);
  const [hasHardwareAcceleration, setHasHardwareAcceleration] = useState(true);

  useEffect(() => {
    // Check for hardware acceleration support
    const detectHardwareAcceleration = () => {
      // Check for backdrop-filter support
      const supportsBackdropFilter = CSS.supports("backdrop-filter", "blur(1px)");

      // Check for transform3d support (indicates hardware acceleration)
      const supportsTransform3d = CSS.supports("transform", "translate3d(0,0,0)");

      // Check for will-change support
      const supportsWillChange = CSS.supports("will-change", "transform");

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const hasAcceleration = supportsBackdropFilter && supportsTransform3d && supportsWillChange && !prefersReducedMotion;

      setHasHardwareAcceleration(hasAcceleration);

      // Load saved preferences first
      const savedMode = localStorage.getItem("performanceMode");
      const savedUltraMode = localStorage.getItem("ultraPerformanceMode");

      // Default to ultra performance mode for everyone (better performance by default)
      if (savedMode === null && savedUltraMode === null) {
        setIsUltraPerformanceMode(true);
        setIsPerformanceMode(true);
        localStorage.setItem("ultraPerformanceMode", "true");
        localStorage.setItem("performanceMode", "true");
      } else {
        // Apply saved preferences
        if (savedMode === "true") {
          setIsPerformanceMode(true);
        }
        if (savedUltraMode === "true") {
          setIsUltraPerformanceMode(true);
        }
      }
    };

    detectHardwareAcceleration();
  }, []);

  useEffect(() => {
    // Apply CSS classes based on performance modes
    const htmlElement = document.documentElement;

    // Remove all performance classes first
    htmlElement.classList.remove("performance-mode", "ultra-performance-mode", "supports-backdrop-filter");

    if (isUltraPerformanceMode) {
      htmlElement.classList.add("ultra-performance-mode");
    } else if (isPerformanceMode) {
      htmlElement.classList.add("performance-mode");
    }

    // Add hardware acceleration detection class
    if (hasHardwareAcceleration) {
      htmlElement.classList.add("supports-backdrop-filter");
    }
  }, [isPerformanceMode, isUltraPerformanceMode, hasHardwareAcceleration]);

  const setPerformanceMode = (enabled: boolean) => {
    setIsPerformanceMode(enabled);
    localStorage.setItem("performanceMode", enabled.toString());

    // If enabling performance mode, disable ultra mode
    if (enabled && isUltraPerformanceMode) {
      setIsUltraPerformanceMode(false);
      localStorage.setItem("ultraPerformanceMode", "false");
    }
  };

  const setUltraPerformanceMode = (enabled: boolean) => {
    setIsUltraPerformanceMode(enabled);
    localStorage.setItem("ultraPerformanceMode", enabled.toString());

    // If enabling ultra mode, also enable regular performance mode
    if (enabled) {
      setIsPerformanceMode(true);
      localStorage.setItem("performanceMode", "true");
    }
  };

  const togglePerformanceMode = () => {
    if (isUltraPerformanceMode) {
      // If in ultra mode, go to normal mode
      setIsUltraPerformanceMode(false);
      setIsPerformanceMode(false);
    } else if (isPerformanceMode) {
      // If in performance mode, go to ultra mode
      setIsUltraPerformanceMode(true);
    } else {
      // If in normal mode, go to performance mode
      setIsPerformanceMode(true);
    }
  };

  const toggleUltraPerformanceMode = () => {
    setUltraPerformanceMode(!isUltraPerformanceMode);
  };

  const value: PerformanceContextType = {
    isPerformanceMode,
    isUltraPerformanceMode,
    hasHardwareAcceleration,
    setPerformanceMode,
    setUltraPerformanceMode,
    togglePerformanceMode,
    toggleUltraPerformanceMode,
  };

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
};
