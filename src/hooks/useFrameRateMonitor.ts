import { useEffect, useRef } from "react";
import { usePerformance } from "../contexts/PerformanceContext";

export const useFrameRateMonitor = () => {
  const { isUltraPerformanceMode, setUltraPerformanceMode } = usePerformance();
  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const monitoringRef = useRef<boolean>(false);

  useEffect(() => {
    if (isUltraPerformanceMode || monitoringRef.current) return;

    monitoringRef.current = true;
    let frameCount = 0;
    let animationFrameId: number;

    const measureFrameRate = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimeRef.current.push(deltaTime);
      frameCount++;

      // Sample frame rate every 60 frames (roughly 1 second at 60fps)
      if (frameCount >= 60) {
        const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
        const fps = 1000 / avgFrameTime;

        // If FPS drops below 20, automatically enable ultra performance mode
        if (fps < 20) {
          console.log(`Low FPS detected: ${fps.toFixed(1)}fps - Enabling Ultra Performance Mode`);
          setUltraPerformanceMode(true);
          monitoringRef.current = false;
          return;
        }

        // Reset sampling
        frameTimeRef.current = [];
        frameCount = 0;
      }

      // Continue monitoring for another 5 seconds, then stop
      if (performance.now() - lastFrameTimeRef.current < 5000) {
        animationFrameId = requestAnimationFrame(measureFrameRate);
      } else {
        monitoringRef.current = false;
      }
    };

    // Start monitoring after a 1-second delay to let the app settle
    const timeoutId = setTimeout(() => {
      if (!isUltraPerformanceMode) {
        animationFrameId = requestAnimationFrame(measureFrameRate);
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      monitoringRef.current = false;
    };
  }, [isUltraPerformanceMode, setUltraPerformanceMode]);
};

export default useFrameRateMonitor;
