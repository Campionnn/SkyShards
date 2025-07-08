import React, { useState, useRef, useEffect } from "react";
import { getRarityColor } from "../utils";
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
}

export const Tooltip: React.FC<TooltipProps> = ({ content, title, shardName, className = "", shardIcon, rarity, warning, family, type, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Position above the trigger by default
      let top = triggerRect.top - tooltipRect.height - 8;
      let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

      // Adjust if tooltip would go off screen
      if (top < 8) {
        // Position below if no room above
        top = triggerRect.bottom + 8;
      }

      if (left < 8) {
        left = 8;
      } else if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }

      setPosition({ top, left });
      setIsPositioned(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isVisible) {
      setIsPositioned(false);
    }
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);

      // Close tooltip when clicking outside
      const handleClickOutside = (event: MouseEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node) && tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
          setIsVisible(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isVisible]);

  return (
    <>
      <div ref={triggerRef} onClick={handleClick} className={`cursor-pointer ${className}`} aria-label="Show description">
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

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[9999] max-w-xs bg-slate-800 border border-slate-600 rounded-md shadow-xl p-3 ${!isPositioned ? "opacity-0" : "opacity-100"} transition-opacity duration-100`}
          style={{ top: position.top, left: position.left }}
        >
          {(title || shardName) && (
            <div className="flex items-center gap-2 mb-2">
              {shardIcon && <img src={`${import.meta.env.BASE_URL}shardIcons/${shardIcon}.png`} alt={title || shardName} className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" />}
              <div className="flex flex-col">
                {shardName && <div className={`font-medium text-sm ${rarity ? getRarityColor(rarity) : "text-white"}`}>{shardName}</div>}
                {title && <div className="text-yellow-500 text-xs">{title} I→X</div>}
              </div>
            </div>
          )}
          <div className="text-slate-300 text-xs flex flex-col gap-1">
            {(family || type) && <div className="text-slate-400 text-xs">{family && type ? `${family} • ${type}` : family || type}</div>}
            <div dangerouslySetInnerHTML={{ __html: content }} />
            {warning && <div className="text-red-400">{warning}</div>}
          </div>
        </div>
      )}
    </>
  );
};
