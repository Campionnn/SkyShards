import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { X } from "lucide-react";
import { ToastContext, type ToastContextValue, type ToastOptions, type ToastVariant } from "./toastContext";

type Toast = Required<ToastOptions>;

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

const MAX_TOASTS = 5;

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const ToastProvider = ({ children }: PropsWithChildren) => {
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

  const dismiss = useCallback<ToastContextValue["dismiss"]>(
    (id) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  // Don't let pending auto-dismiss timers fire after the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const dismissAll = useCallback<ToastContextValue["dismissAll"]>(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (opts) => {
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
        const arr = [...prev.filter((t) => t.id !== id), entry];
        return arr.length > MAX_TOASTS ? arr.slice(-MAX_TOASTS) : arr;
      });

      clearTimer(id);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      );

      return id;
    },
    [clearTimer, dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 z-[60] flex flex-col gap-2 w-[min(92vw,380px)]">
        {toasts.map((t) => {
          const s = variantStyles[t.variant];
          return (
            <div key={t.id} className={`relative overflow-hidden rounded-md border px-3 py-2 ${s.container}`} role="status" aria-live="polite">
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
                style={{ animation: `toast-progress ${t.duration}ms linear forwards` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
