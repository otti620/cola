import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Sparkles, Trophy, CheckCircle2, TrendingUp, ArrowRight, X, ShieldCheck, Zap } from "lucide-react";

export interface InvestmentUpgradeSuccessDetails {
  planName: string;
  amountInvested: number;
  dailyReward: number;
  durationDays?: number;
  tierId?: string;
}

interface CongratulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: InvestmentUpgradeSuccessDetails | null;
  onViewPortfolio?: () => void;
}

export const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
  isOpen,
  onClose,
  details,
  onViewPortfolio
}) => {
  useEffect(() => {
    if (isOpen) {
      // Fire subtle & elegant multi-stage celebratory confetti
      const count = 200;
      const defaults = {
        origin: { y: 0.6 },
        zIndex: 99999,
        colors: ["#e41e2b", "#eab308", "#10b981", "#3b82f6", "#f59e0b", "#ffffff"]
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });

      // Side burst secondary trigger
      const timer = setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          zIndex: 99999,
          colors: ["#e41e2b", "#eab308", "#10b981"]
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          zIndex: 99999,
          colors: ["#e41e2b", "#eab308", "#10b981"]
        });
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !details) return null;

  const totalCycleReturn = details.dailyReward * (details.durationDays || 60);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
        {/* Subtle Backdrop Click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10"
        >
          {/* Header Decorative Background Banner */}
          <div className="bg-gradient-to-br from-[#e41e2b] via-[#b31420] to-slate-900 pt-8 pb-10 px-6 text-center relative overflow-hidden">
            {/* Background Glow Ring */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-red-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Animated Trophy / Sparkle Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 mx-auto mb-3.5 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center"
            >
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-amber-400">
                <Trophy className="w-8 h-8 animate-pulse" />
              </div>
            </motion.div>

            {/* Sub-badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-300/30 rounded-full text-amber-300 text-[11px] font-bold tracking-wide uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Investment Tier Unlocked</span>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
              Congratulations!
            </h3>
            <p className="text-xs text-white/80 font-medium mt-1 max-w-[240px] mx-auto">
              Your capital is active and earning daily automated dividends.
            </p>
          </div>

          {/* Main Details Body */}
          <div className="p-6 space-y-4">
            {/* Tier Name Badge Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Activated Product Tier
                </span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {details.planName}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Capital Deployed</span>
                </div>
                <p className="text-base font-black text-slate-900">
                  ₦{details.amountInvested.toLocaleString()}
                </p>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100/60 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daily Returns</span>
                </div>
                <p className="text-base font-black text-emerald-700">
                  +₦{details.dailyReward.toLocaleString()}
                  <span className="text-[10px] font-bold text-emerald-600 block font-normal">/ 24 hours</span>
                </p>
              </div>
            </div>

            {/* Total Return Cycle Notice */}
            <div className="bg-amber-50/70 rounded-2xl p-3 border border-amber-200/60 flex items-start gap-2 text-amber-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">
                  {details.durationDays || 60}-Day Yield Guarantee
                </span>
                <span className="text-amber-800 text-[11px] font-medium leading-relaxed block">
                  Estimated total cycle earnings: <strong className="font-extrabold text-amber-950">₦{totalCycleReturn.toLocaleString()}</strong>. Daily profits drop automatically into your available balance.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  onClose();
                  if (onViewPortfolio) onViewPortfolio();
                }}
                className="w-full bg-[#e41e2b] hover:bg-[#c41622] active:scale-98 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20 cursor-pointer"
              >
                <span>View Active Portfolio</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold py-2.5 rounded-2xl text-xs transition cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CongratulationsModal;
