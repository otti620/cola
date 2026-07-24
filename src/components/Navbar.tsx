import React from "react";
import { LogOut, Wallet, Sparkles, Plus } from "lucide-react";
import { UserProfile } from "../types";
import { INVESTMENT_TIERS } from "../data";

interface NavbarProps {
  user: UserProfile;
  onLogout: () => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToMineView?: (view: "deposit" | "withdraw" | "fund" | "none") => void;
}

export default function Navbar({ user, onLogout, onNavigateToTab, onNavigateToMineView }: NavbarProps) {
  const currentTier = INVESTMENT_TIERS.find((t) => t.id === user.currentTierId);

  const handleDepositClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToMineView) {
      onNavigateToMineView("deposit");
    } else {
      onNavigateToTab("mine");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        
        {/* Coca-Cola Official Brand Logo & Badge */}
        <div 
          onClick={() => onNavigateToTab("home")} 
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          {/* Coca-Cola Iconic Red Crest */}
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#e41e2b] to-[#b8101c] flex items-center justify-center text-white font-black text-2xl italic tracking-tighter shadow-md shadow-red-900/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
              ✓
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-display font-black text-xl tracking-tight text-[#e41e2b] italic group-hover:text-[#c41622] transition-colors">
                Coca-Cola
              </span>
              <span className="bg-[#e41e2b] text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase shadow-xs">
                Inc.
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Real Magic Investments</p>
          </div>
        </div>

        {/* Global User Balance & Action Bar */}
        <div className="flex items-center space-x-2.5">
          
          {/* Wallet Balance Pill */}
          <div 
            onClick={() => onNavigateToTab("mine")}
            className="flex items-center space-x-2 bg-slate-50 hover:bg-[#fff0f1] border border-slate-200/80 hover:border-[#ffccd0] rounded-2xl px-3 py-1.5 cursor-pointer transition-all shadow-xs group"
          >
            <div className="w-7 h-7 rounded-xl bg-[#e41e2b] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Wallet className="w-3.5 h-3.5" />
            </div>

            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {user.fullName ? user.fullName.split(" ")[0] : "Balance"}
              </p>
              <p className="text-xs font-black text-slate-900 group-hover:text-[#e41e2b] font-mono">
                ₦{(user.balance || 0).toLocaleString()}
              </p>
            </div>

            {/* Quick Deposit Plus Icon */}
            <button
              onClick={handleDepositClick}
              className="bg-[#e41e2b] hover:bg-[#c41622] text-white p-1 rounded-lg ml-1 shadow-xs transition"
              title="Deposit Funds"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current product level tag */}
          {currentTier ? (
            <div 
              onClick={() => onNavigateToTab("vip")}
              className="hidden md:flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-1.5 rounded-2xl cursor-pointer hover:bg-amber-100 transition-all font-bold shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate max-w-[100px]">{currentTier.name.split(" - ")[0]}</span>
            </div>
          ) : (
            <button
              onClick={() => onNavigateToTab("vip")}
              className="hidden md:flex items-center space-x-1 bg-[#e41e2b]/10 text-[#e41e2b] border border-[#e41e2b]/20 text-xs px-3 py-1.5 rounded-2xl font-bold hover:bg-[#e41e2b] hover:text-white transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sponsor Product</span>
            </button>
          )}

          {/* Exit / Sign Out Button */}
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs px-3 py-2 rounded-2xl transition-all cursor-pointer font-bold border border-slate-200/60"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Exit</span>
          </button>
        </div>

      </div>
    </header>
  );
}
