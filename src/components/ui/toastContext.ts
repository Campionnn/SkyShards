import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  /** Reusing an id replaces that toast instead of stacking a second one. */
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms (minimum 800, default 2500). */
  duration?: number;
}

export interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
