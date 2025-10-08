import React, { useState, useRef, useEffect } from "react";
import { getRarityColor } from "../../utilities";
import { MoveRight } from "lucide-react";

interface TooltipProps {
  content: string;
  title?: string;
  shardName?: string;
  className?: string;
  shardIcon?: string;
  rarity?: string;
  warning?: string;
  family?: string;
  type?: string;
  children?: React.ReactNode;
  shardId?: string; // Add shardId prop
  showRomanNumerals?: boolean; // Add prop to control Roman numeral display
  visible?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, title, shardName, className = "", shardIcon, rarity, warning, family, type, children, shardId, showRomanNumerals = true, visible }) => {
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

    // Calculate position above trigger by default
    let top = triggerRect.top - tooltipRect.height - viewportPadding;
    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

    // Adjust if tooltip would go off screen
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

    // Use requestAnimationFrame to ensure DOM is ready for measuring
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

  const metaInfo = [shardId, family, type].filter(Boolean).join(" • ");

  return (
    <>
      <div ref={triggerRef} onClick={toggleTooltip} className={`cursor-pointer ${className}`} aria-label="Show description">
        {children || (
          <button
            type="button"
            className="inline-flex border mb-[7px] border-slate-400/20 cursor-pointer items-center justify-center w-4 h-4 rounded-full bg-slate-600/50 hover:bg-slate-500/50 text-slate-400 hover:text-slate-300 transition-colors duration-200"
            aria-label="Show description"
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
        {(title || shardName) && (
          <div className="flex items-center gap-2 mb-2 text-left">
            {shardIcon && <img src={`${import.meta.env.BASE_URL}shardIcons/${shardIcon}.png`} alt={title || shardName} className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" />}
            <div className="flex flex-col">
              {shardName && <div className={`font-medium text-sm ${rarity ? getRarityColor(rarity) : "text-white"}`}>{shardName}</div>}
              {title && (
                <div className="text-yellow-500 text-xs flex gap-1 items-center">
                  {title}
                  {showRomanNumerals && (
                    <span className="flex items-center">
                      I<MoveRight className="w-3" />X
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="text-slate-300 text-xs flex flex-col gap-1 text-left">
          {metaInfo && <div className="text-slate-400 text-xs">{metaInfo}</div>}
          <div dangerouslySetInnerHTML={{ __html: content }} />
          {warning && <div className="text-red-400">{warning}</div>}
        </div>
      </div>
    </>
  );
};
