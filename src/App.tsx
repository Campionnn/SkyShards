import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components/Layout";
import { PerformanceProvider } from "./contexts/PerformanceContext";
import { useFrameRateMonitor } from "./hooks/useFrameRateMonitor";

// Lazy load pages for better code splitting
const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

// Loading component with ultra performance support
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>
);

// App content with frame rate monitoring
const AppContent = () => {
  useFrameRateMonitor();

  return (
    <Router basename="/SkyShards">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <CalculatorPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <SettingsPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
};

// Force cache bust - July 4, 2025
const App = () => {
  return (
    <PerformanceProvider>
      <AppContent />
    </PerformanceProvider>
  );
};

export default App;
