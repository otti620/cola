import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert, Timer, Sparkles, CheckCircle } from "lucide-react";

export function getWATTimeDetails() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  const watHour = (utcHours + 1) % 24; // WAT is UTC+1
  const currentTotalSec = watHour * 3600 + utcMinutes * 60 + utcSeconds;

  const windowStartSec = 9 * 3600; // 09:00 AM
  const windowEndSec = 16 * 3600;   // 04:00 PM
  const totalWindowSec = windowEndSec - windowStartSec; // 7 hours (25200 sec)

  const isOpen = watHour >= 9 && watHour < 16;

  let windowProgress = 0;
  let countdownText = "";
  let statusText = "";

  if (isOpen) {
    const elapsedSec = currentTotalSec - windowStartSec;
    windowProgress = Math.min(100, Math.max(0, Math.round((elapsedSec / totalWindowSec) * 100)));
    
    const secRemaining = windowEndSec - currentTotalSec;
    const h = Math.floor(secRemaining / 3600);
    const m = Math.floor((secRemaining % 3600) / 60);
    const s = secRemaining % 60;
    countdownText = `${h}h ${m}m ${s}s remaining`;
    statusText = "Withdrawal Window OPEN";
  } else if (watHour < 9) {
    windowProgress = 0;
    const secRemaining = windowStartSec - currentTotalSec;
    const h = Math.floor(secRemaining / 3600);
    const m = Math.floor((secRemaining % 3600) / 60);
    const s = secRemaining % 60;
    countdownText = `Opens in ${h}h ${m}m ${s}s`;
    statusText = "Window CLOSED (Opens at 09:00 AM)";
  } else {
    windowProgress = 100;
    const secRemaining = (24 * 3600 - currentTotalSec) + windowStartSec;
    const h = Math.floor(secRemaining / 3600);
    const m = Math.floor((secRemaining % 3600) / 60);
    const s = secRemaining % 60;
    countdownText = `Opens tomorrow in ${h}h ${m}m ${s}s`;
    statusText = "Window CLOSED for Today";
  }

  const ampmHour = watHour % 12 === 0 ? 12 : watHour % 12;
  const ampm = watHour >= 12 ? "PM" : "AM";
  const formattedTime = `${String(ampmHour).padStart(2, "0")}:${String(utcMinutes).padStart(2, "0")}:${String(utcSeconds).padStart(2, "0")} ${ampm} WAT`;

  return { isOpen, windowProgress, countdownText, statusText, formattedTime };
}

interface OperationalRulesBannerProps {
  showRulesList?: boolean;
  minWithdrawal?: number;
  feePercent?: number;
  className?: string;
}

export default function OperationalRulesBanner({
  showRulesList = false,
  minWithdrawal = 1500,
  feePercent = 18,
  className = ""
}: OperationalRulesBannerProps) {
  const [watInfo, setWatInfo] = useState(getWATTimeDetails());

  useEffect(() => {
    const timer = setInterval(() => {
      setWatInfo(getWATTimeDetails());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Status Card */}
      <div className={`rounded-2xl p-3.5 border flex items-center justify-between shadow-xs transition-colors ${
        watInfo.isOpen 
          ? "bg-emerald-50 border-emerald-200/90 text-emerald-950" 
          : "bg-rose-50 border-rose-200/90 text-rose-950"
      }`}>
        <div className="flex items-center space-x-2.5">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            watInfo.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`} />
          <div>
            <p className="text-xs font-black tracking-tight flex items-center gap-1.5">
              <span>{watInfo.statusText}</span>
            </p>
            <p className="text-[11px] opacity-80 font-medium">
              Daily Hours: 09:00 AM – 04:00 PM (WAT)
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white/80 border border-slate-200/60 shadow-2xs block">
            {watInfo.countdownText}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
            {watInfo.formattedTime}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-3 border border-slate-800 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>09:00 AM WAT</span>
          <span className="text-amber-300 font-bold">{watInfo.windowProgress}% Window Elapsed</span>
          <span>04:00 PM WAT</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              watInfo.isOpen 
                ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-[#e41e2b]" 
                : "bg-slate-700"
            }`}
            style={{ width: `${watInfo.windowProgress}%` }}
          />
        </div>
      </div>

      {/* Detailed Rules List */}
      {showRulesList && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-2.5 text-xs text-slate-600">
          <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <ShieldAlert className="w-3.5 h-3.5 text-[#e41e2b]" />
            Official Withdrawal Rules
          </h4>
          <ul className="space-y-1.5 leading-relaxed text-[11px]">
            <li className="flex items-start gap-2">
              <span className="text-[#e41e2b] font-bold">•</span>
              <span>Minimum withdrawal threshold is <strong className="text-slate-900 font-bold">₦{minWithdrawal.toLocaleString()}</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e41e2b] font-bold">•</span>
              <span>Standard processing fee is <strong className="text-slate-900 font-bold">{feePercent}%</strong> per request.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e41e2b] font-bold">•</span>
              <span>Withdrawals are strictly processed daily between <strong className="text-slate-900 font-bold">9:00 AM and 4:00 PM (WAT)</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e41e2b] font-bold">•</span>
              <span>Requests made outside processing hours are automatically queued for execution when the window reopens.</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
