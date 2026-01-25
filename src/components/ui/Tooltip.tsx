import React, { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  visible?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  className = "",
  children,
  visible,
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = visible === false ? false : internalVisible;
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportPadding = 8;

    let top = triggerRect.top - tooltipRect.height - viewportPadding;
    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    if (top < viewportPadding) {
      top = triggerRect.bottom + viewportPadding;
    }

    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));

    setPosition({ top, left });
  };

  const toggleTooltip = (e: React.MouseEvent) => {
    if (visible === false) return;
    e.preventDefault();
    e.stopPropagation();
    setInternalVisible(!internalVisible);
  };

  useEffect(() => {
    if (!isVisible) return;

    const raf = requestAnimationFrame(() => {
      updatePosition();
    });

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !tooltipRef.current?.contains(target)) {
        setInternalVisible(false);
      }
    };

    const handlePositionUpdate = () => {
      requestAnimationFrame(() => {
        updatePosition();
      });
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handlePositionUpdate);
    window.addEventListener("scroll", handlePositionUpdate);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handlePositionUpdate);
      window.removeEventListener("scroll", handlePositionUpdate);
    };
  }, [isVisible]);

  return (
    <>
      <div ref={triggerRef} onClick={toggleTooltip} className={`cursor-pointer ${className}`} aria-label="Show tooltip">
        {children || (
          <button
            type="button"
            className="inline-flex border border-slate-400/20 cursor-pointer items-center justify-center w-4 h-4 rounded-full bg-slate-600/50 hover:bg-slate-500/50 text-slate-400 hover:text-slate-300 transition-colors duration-200"
            aria-label="Show tooltip"
          >
            <span className="text-[10px]">?</span>
          </button>
        )}
      </div>

      <div
        ref={tooltipRef}
        className={`fixed z-[9999] max-w-xs bg-slate-800 border border-slate-600 rounded-md shadow-xl p-3 transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none select-none"
        }`}
        style={{
          top: position.top,
          left: position.left,
          userSelect: isVisible ? "text" : "none",
          WebkitUserSelect: isVisible ? "text" : "none",
          MozUserSelect: isVisible ? "text" : "none",
          msUserSelect: isVisible ? "text" : "none",
        }}
      >
        {title && (
          <div className="font-medium text-sm text-white mb-2">{title}</div>
        )}
        <div className="text-slate-300 text-xs text-left">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    </>
  );
};
