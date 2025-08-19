import React, { useCallback, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { ToastContext, type ToastContextValue } from "./toastContext";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
};

export type Toast = Required<Omit<ToastOptions, "id">> & { id: string };

const variantStyles: Record<ToastVariant, { container: string; badge: string }> = {
  success: {
    container: "bg-emerald-900 border border-emerald-700 text-emerald-100 shadow-lg",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  error: {
    container: "bg-rose-900 border border-rose-700 text-rose-100 shadow-lg",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
  info: {
    container: "bg-slate-800 border border-slate-600 text-slate-100 shadow-lg",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  warning: {
    container: "bg-amber-900 border border-amber-700 text-amber-100 shadow-lg",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const m = timers.current;
    const t = m.get(id);
    if (t) {
      window.clearTimeout(t);
      m.delete(id);
    }
  }, []);

  const dismiss = useCallback<ToastContextValue["dismiss"]>((id) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimer]);

  const dismissAll = useCallback<ToastContextValue["dismissAll"]>(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>((opts) => {
    const id = opts.id ?? genId();
    const variant: ToastVariant = opts.variant ?? "info";
    const duration = Math.max(800, opts.duration ?? 2500);
    const entry: Toast = {
      id,
      title: opts.title,
      description: opts.description ?? "",
      variant,
      duration,
    };

    setToasts((prev) => {
      const arr = [...prev, entry];
      if (arr.length > 5) arr.shift();
      return arr;
    });

    const timeout = window.setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timeout);

    return id;
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{`
        @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>
      <div className="fixed top-3 right-3 z-[60] flex flex-col gap-2 w-[min(92vw,380px)]">
        {toasts.map((t) => {
          const s = variantStyles[t.variant];
          return (
            <div
              key={t.id}
              className={`relative overflow-hidden rounded-md border px-3 py-2 ${s.container}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-xs border rounded-md flex-shrink-0 self-center ${s.badge}`}>{t.variant.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  {t.description && <div className="text-xs text-slate-300/90 mt-0.5 break-words whitespace-pre-wrap">{t.description}</div>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Close"
                  className="p-1 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                className="absolute left-0 bottom-0 h-0.5 w-full bg-white origin-left"
                style={{
                  animationName: "toastProgress",
                  animationDuration: `${t.duration}ms`,
                  animationTimingFunction: "linear",
                  animationFillMode: "forwards",
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
