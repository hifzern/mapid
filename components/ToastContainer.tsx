"use client";

import { X } from "lucide-react";
import { useStore } from "@/lib/workspace-store";

export default function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Tutup">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
