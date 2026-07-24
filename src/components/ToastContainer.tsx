import React, { useEffect } from "react";
import { CheckCircle2, XCircle, Sparkles, Bell, X, TrendingUp } from "lucide-react";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "profit";
  amount?: number;
  timestamp?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex flex-col gap-3 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  key?: string;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const duration = toast.duration || 6000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const getStyleAndIcon = () => {
    switch (toast.type) {
      case "profit":
        return {
          bgColor: "bg-amber-950/90 border-amber-500/40 text-amber-100",
          accentColor: "bg-gradient-to-r from-amber-500 to-yellow-400",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          icon: <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />,
          titleColor: "text-amber-200"
        };
      case "success":
        return {
          bgColor: "bg-emerald-950/90 border-emerald-500/40 text-emerald-100",
          accentColor: "bg-gradient-to-r from-emerald-500 to-teal-400",
          badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          titleColor: "text-emerald-200"
        };
      case "error":
        return {
          bgColor: "bg-rose-950/90 border-rose-500/40 text-rose-100",
          accentColor: "bg-gradient-to-r from-rose-500 to-red-400",
          badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          titleColor: "text-rose-200"
        };
      case "info":
      default:
        return {
          bgColor: "bg-slate-900/95 border-red-500/40 text-slate-100",
          accentColor: "bg-gradient-to-r from-[#e41e2b] to-red-500",
          badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
          icon: <Bell className="w-5 h-5 text-red-400 shrink-0" />,
          titleColor: "text-white"
        };
    }
  };

  const style = getStyleAndIcon();

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-md shadow-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 ${style.bgColor}`}
      role="alert"
    >
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${style.accentColor}`} />

      <div className="flex items-start space-x-3">
        {/* Icon Container */}
        <div className="p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center space-x-2">
            <h4 className={`text-sm font-bold tracking-tight ${style.titleColor}`}>
              {toast.title}
            </h4>
            {toast.amount !== undefined && (
              <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-full border ${style.badgeBg}`}>
                +₦{toast.amount.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
            {toast.message}
          </p>
          {toast.timestamp && (
            <p className="text-[10px] text-slate-400 font-mono mt-1.5">
              {toast.timestamp}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors hover:bg-white/10 shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
        <div
          className={`h-full ${style.accentColor}`}
          style={{
            animation: `toastCountdown ${duration}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes toastCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
