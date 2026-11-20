import { useEffect, useRef } from "react";

/**
 * Calls `onOutside` on any document mousedown whose target lies outside `ref.current`.
 * The listener is attached only while `enabled`. `onOutside` is read through a ref, so
 * callers may pass an inline lambda without re-subscribing every render.
 */
export const useClickOutside = (ref: React.RefObject<HTMLElement | null>, onOutside: () => void, enabled = true): void => {
  const callbackRef = useRef(onOutside);
  useEffect(() => {
    callbackRef.current = onOutside;
  }, [onOutside]);

  useEffect(() => {
    if (!enabled) return;
    const handleMouseDown = (event: MouseEvent) => {
      const element = ref.current;
      if (element && !element.contains(event.target as Node)) callbackRef.current();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, enabled]);
};
