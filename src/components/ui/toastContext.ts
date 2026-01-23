import { createContext, useContext } from "react";

export type ToastContextValue = {
  toast: (opts: { id?: string; title: string; description?: string; variant?: "success" | "error" | "info" | "warning"; duration?: number }) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

