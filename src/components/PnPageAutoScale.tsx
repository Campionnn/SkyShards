import React, { useEffect, useState, useRef } from "react";

interface PnPageAutoScaleProps {
  children: React.ReactNode;
  minWidth?: number;
  mobileBreakpoint?: number;
}

export const PnPageAutoScale: React.FC<PnPageAutoScaleProps> = ({
  children,
  minWidth = 1920,
  mobileBreakpoint = 1280,
}) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth;

      if (viewportWidth < mobileBreakpoint) {
        setScale(1);
        return;
      }

      const newScale = Math.min(1, viewportWidth / minWidth);
      setScale(Math.max(newScale, 0.5));
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale);
  }, [minWidth, mobileBreakpoint]);

  return (
    <div
      ref={containerRef}
      style={{
        width: scale < 1 ? `${100 / scale}%` : "100%",
        transformOrigin: "top left",
        transform: `scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};
