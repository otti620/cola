import React from "react";
import { X, Send, Sparkles, TrendingUp, ShieldCheck, Gift, Zap, Users, ArrowRight } from "lucide-react";
import { COCA_COLA_BRAND_ASSETS } from "../data/brandImages";

interface TelegramFlyerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramFlyerModal({ isOpen, onClose }: TelegramFlyerModalProps) {
  if (!isOpen) return null;

  const TELEGRAM_LINK = "https://t.me/+rCmqVoNN7SgwMzY8";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[370px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden text-white my-auto flex flex-col max-h-[85vh]">
        
        {/* Top Header Glow Bar */}
        <div className="bg-gradient-to-r from-[#0088cc] via-emerald-500 to-[#e41e2b] h-1 w-full shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-600/50 cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-3.5 sm:p-4 space-y-3 font-sans text-slate-100">

          {/* Telegram Badge & Title */}
          <div className="text-center space-y-1 pt-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0088cc]/20 border border-[#0088cc]/50 text-[#38bdf8] text-[10px] font-black tracking-wide uppercase">
              <Send className="w-3 h-3 fill-current" />
              <span>Official Telegram Community</span>
            </div>

            <h2 className="text-lg font-black font-display text-white tracking-tight leading-tight">
              Join Our Investor Channel
            </h2>

            <p className="text-[11px] text-slate-300 leading-snug font-normal max-w-[280px] mx-auto">
              Get daily promo codes, instant withdrawal updates & 24/7 support!
            </p>
          </div>

          {/* Investment Flyer Graphic Card */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700/80 shadow-md bg-slate-800/90 group">
            {/* Background image overlay */}
            <img 
              src={COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.url}
              alt="Coca-Cola Yield Flyer"
              className="w-full h-24 object-cover object-center opacity-30 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent p-2.5 flex flex-col justify-between">
              
              <div className="flex items-center justify-between">
                <span className="bg-[#e41e2b] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" /> High Yield Plans
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-400" /> Daily Auto-Payouts
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-amber-300">30% – 45%</span>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Daily Yield Cycles</span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium leading-tight">
                  Sponsorship packages backed by physical inventory & instant transfers.
                </p>
              </div>

            </div>
          </div>

          {/* Benefits Grid / Features */}
          <div className="grid grid-cols-1 gap-2 pt-0.5">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <Gift className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-white">Daily Exclusive Promo Codes</h4>
                <p className="text-[10px] text-slate-300 leading-none mt-0.5">Claim free daily cash rewards & bonus codes.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="w-7 h-7 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-white">Instant NIBSS Settlement Logs</h4>
                <p className="text-[10px] text-slate-300 leading-none mt-0.5">Live interbank payment proofs & clearance logs.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="w-7 h-7 rounded-md bg-[#0088cc]/20 border border-[#0088cc]/40 flex items-center justify-center shrink-0 text-[#38bdf8]">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-white">24/7 Official Support Desk</h4>
                <p className="text-[10px] text-slate-300 leading-none mt-0.5">Direct assistance for account verification & rewards.</p>
              </div>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="pt-1 space-y-1 text-center">
            <a
              href={TELEGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-[#0088cc] via-[#0099e6] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#0088cc]/25 transition transform active:scale-98 cursor-pointer border border-[#38bdf8]/30 uppercase tracking-wider"
              onClick={onClose}
            >
              <Send className="w-3.5 h-3.5 fill-current animate-bounce" />
              <span>JOIN TELEGRAM GROUP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200 py-0.5 transition cursor-pointer"
            >
              Maybe Later
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
