import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Shared shell for everything in components/modals: portal, backdrop, body scroll
 * lock, Escape-to-close and focus handling.
 *
 * `backdropClassName` and `panelClassName` are props because call sites use different
 * backdrop tints and padding scales.
 */

/**
 * Modals stack — Alternatives opens over the calculator, Active Alternatives over
 * that. The scroll lock is reference-counted so closing an inner modal does not unlock
 * the page while an outer one is still open.
 */
let openModals = 0;
let overflowBeforeLock = "";

/** Escape must close only the topmost modal, not every open one. */
const modalStack: object[] = [];

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Classes for the panel itself — size, colours, scroll behaviour. */
  panelClassName?: string;
  /** Backdrop tint and padding. Defaults to the variant most modals use. */
  backdropClassName?: string;
  /** id of the heading that names this dialog, for screen readers. */
  labelledBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  panelClassName = "",
  backdropClassName = "bg-black/50 p-4",
  labelledBy,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Call sites pass inline arrows, so read onClose through a ref rather than
  // resubscribing the key listener on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    if (openModals === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModals++;

    return () => {
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) {
        document.body.style.overflow = overflowBeforeLock;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const entry = {};
    modalStack.push(entry);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (modalStack[modalStack.length - 1] !== entry) return;
      onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = modalStack.indexOf(entry);
      if (index !== -1) modalStack.splice(index, 1);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Two modals autoFocus their search input, and that has already happened by the
    // time this runs — so only pull focus in when nothing inside the panel has it.
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    return () => {
      // A no-op if the trigger unmounted along with the modal.
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  /** Keeps Tab inside the dialog instead of wandering onto the page behind it. */
  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClassName}`} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`focus:outline-none ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
