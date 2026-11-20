import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getRarityColor, shardIconUrl } from "../../utilities";
import { MoveRight } from "lucide-react";

const VIEWPORT_PADDING = 8;

interface TooltipProps {
  content: ReactNode;
  title?: string;
  shardName?: string;
  className?: string;
  iconSize?: string;
  shardIcon?: string;
  rarity?: string;
  warning?: string;
  family?: string;
  type?: string;
  children?: ReactNode;
  shardId?: string;
  /** Show the "I → X" tier range after the title. */
  showRomanNumerals?: boolean;
  /** Pass false to disable the tooltip entirely. */
  visible?: boolean;
}

export const Tooltip = ({
  content,
  title,
  shardName,
  className = "",
  shardIcon,
  iconSize,
  rarity,
  warning,
  family,
  type,
  children,
  shardId,
  showRomanNumerals = true,
  visible,
}: TooltipProps) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = visible === false ? false : internalVisible;
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const toggleTooltip = (e: ReactMouseEvent) => {
    if (visible === false) return;
    e.preventDefault();
    e.stopPropagation();
    setInternalVisible((v) => !v);
  };

  useEffect(() => {
    if (!isVisible) return;

    // Sit above the trigger, flip below if there's no room, and clamp horizontally to the viewport.
    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = triggerRect.top - tooltipRect.height - VIEWPORT_PADDING;
      if (top < VIEWPORT_PADDING) top = triggerRect.bottom + VIEWPORT_PADDING;
      const centredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      const left = Math.max(VIEWPORT_PADDING, Math.min(centredLeft, window.innerWidth - tooltipRect.width - VIEWPORT_PADDING));

      setPosition({ top, left });
    };

    // Measure on the next frame, once the portalled tooltip has rendered.
    let raf = requestAnimationFrame(updatePosition);

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !tooltipRef.current?.contains(target)) {
        setInternalVisible(false);
      }
    };

    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updatePosition);
    };

    const handleScrollClose = () => {
      setInternalVisible(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleResize);
    // Close on any scroll (capture phase catches inner containers too) to avoid lag
    document.addEventListener("scroll", handleScrollClose, { capture: true });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("scroll", handleScrollClose, { capture: true });
    };
  }, [isVisible]);

  const metaInfo = [shardId, family, type].filter(Boolean).join(" • ");

  const tooltipEl = (
    <div
      ref={tooltipRef}
      className={`fixed z-[9999] max-w-xs bg-slate-800 border border-slate-600 rounded-md shadow-xl p-3 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none select-none"
      }`}
      style={{ top: position.top, left: position.left }}
    >
      {(title || shardName) && (
        <div className="flex items-center gap-2 mb-2 text-left">
          {shardIcon && (
            <img src={shardIconUrl(shardIcon)} alt={title || shardName} className={`${iconSize || "w-8 h-8"} object-contain flex-shrink-0`} loading="lazy" />
          )}
          <div className="flex flex-col">
            {shardName && <div className={`font-medium text-sm ${rarity ? getRarityColor(rarity) : "text-white"}`}>{shardName}</div>}
            {title && (
              <div className="text-yellow-500 text-xs flex gap-1 items-center">
                <div>{title}</div>
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
        <div>{content}</div>
        {warning && <div className="text-red-400">{warning}</div>}
      </div>
    </div>
  );

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

      {createPortal(tooltipEl, document.body)}
    </>
  );
};
