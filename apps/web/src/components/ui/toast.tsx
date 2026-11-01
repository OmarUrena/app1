"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from ".";

const ToastContext = createContext<((message: string) => void) | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const notify = useCallback((value: string) => {
    clearTimeout(timeout.current);
    setMessage(value);
    timeout.current = setTimeout(() => setMessage(""), 8000);
  }, []);
  return <ToastContext.Provider value={notify}>{children}<div className="toast-region" role="status" aria-live="polite" aria-atomic="true">{message && <div className="toast"><span>{message}</span><Button className="button-small button-secondary" onClick={() => setMessage("")} aria-label="Cerrar notificación">Cerrar</Button></div>}</div></ToastContext.Provider>;
}
export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requiere ToastProvider.");
  return notify;
}
