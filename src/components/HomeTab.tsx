import React, { useState, useEffect } from "react";
import { 
  Calendar, DollarSign, ChevronRight, Headphones, CheckCircle2, AlertCircle, X, Store, Sparkles, Building2 
} from "lucide-react";
import { UserProfile, InvestmentTier } from "../types";
import { INVESTMENT_TIERS } from "../data";
import { COCA_COLA_BRAND_ASSETS } from "../data/brandImages";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import InvestorPitchDeckModal from "./InvestorPitchDeckModal";

interface HomeTabProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToMineView?: (view: "deposit" | "withdraw" | "fund" | "none") => void;
}

const PLAN_IMAGES: Record<string, string> = {
  t1: COCA_COLA_BRAND_ASSETS.consistentBranding.url,
  t2: COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.url,
  t3: COCA_COLA_BRAND_ASSETS.fizzSplashHappiness.url,
  t4: COCA_COLA_BRAND_ASSETS.realMagicCollage.url,
  t5: COCA_COLA_BRAND_ASSETS.architecturalCube.url
};

export default function HomeTab({ user, onUpdateUser, onNavigateToTab, onNavigateToMineView }: HomeTabProps) {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentTier | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInClaimed, setCheckInClaimed] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPitchDeckModal, setShowPitchDeckModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live activity ticker based on real user session
  const liveTickerItems = (user.totalProfit > 0 || user.balance > 0)
    ? [
        `Partner ***${(user.phone || "0000").slice(-4)} active session online`,
        `Wallet balance: ₦${(user.balance || 0).toLocaleString()}`,
        `Total returns earned: ₦${(user.totalProfit || 0).toLocaleString()}`
      ]
    : [
        "System online - Ready for deposit and product package selection"
      ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % liveTickerItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const plan1 = INVESTMENT_TIERS.find((t) => t.id === "t1") || INVESTMENT_TIERS[0];
  const plan2 = INVESTMENT_TIERS.find((t) => t.id === "t2") || INVESTMENT_TIERS[1];
  const plan3 = INVESTMENT_TIERS.find((t) => t.id === "t3") || INVESTMENT_TIERS[2];

  const handleDailyCheckIn = () => {
    const today = new Date().toDateString();
    const lastCheckIn = localStorage.getItem(`checkin_${user.uid}`);

    if (lastCheckIn === today) {
      setToastMessage("You have already checked in today! Come back tomorrow.");
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const checkInReward = 100; // ₦100 NGN daily reward
    const updatedUser: UserProfile = {
      ...user,
      balance: (user.balance || 0) + checkInReward,
      totalProfit: (user.totalProfit || 0) + checkInReward
    };

    localStorage.setItem(`checkin_${user.uid}`, today);
    setCheckInClaimed(true);
    onUpdateUser(updatedUser);

    try {
      const transRef = collection(db, "users", user.uid, "transactions");
      addDoc(transRef, {
        type: "deposit",
        amount: checkInReward,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: "Daily Check-in Bonus",
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error saving check-in transaction:", e);
    }

    setToastMessage("🎉 Daily Check-in Successful! ₦100 credited to your wallet.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInvest = async (plan: InvestmentTier) => {
    if (user.balance < plan.price) {
      setToastMessage(`Insufficient balance. Plan requires ₦${plan.price.toLocaleString()}. Please deposit funds first.`);
      setTimeout(() => setToastMessage(null), 3500);
      if (onNavigateToMineView) {
        onNavigateToMineView("deposit");
      } else {
        onNavigateToTab("mine");
      }
      return;
    }

    const updatedUser: UserProfile = {
      ...user,
      balance: user.balance - plan.price,
      currentTierId: plan.id,
      totalProfit: user.totalProfit + plan.dailyReward
    };

    onUpdateUser(updatedUser);

    try {
      const transRef = collection(db, "users", user.uid, "transactions");
      await addDoc(transRef, {
        type: "withdraw",
        amount: plan.price,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Investment Purchase: ${plan.name}`,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error saving investment transaction:", e);
    }

    setSelectedPlan(null);
    setToastMessage(`Success! You have invested in ${plan.name}. Daily returns credited!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in pb-10">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* COCA-COLA INC. TOP HEADER HERO BANNER */}
      <div className="bg-gradient-to-br from-[#e41e2b] via-[#c41622] to-[#990c16] rounded-3xl p-5 text-white shadow-xl shadow-red-950/20 relative overflow-hidden space-y-4">
        {/* Background decorative Coca-Cola watermark */}
        <div className="absolute -right-8 -bottom-10 text-white/10 text-9xl font-black italic select-none pointer-events-none font-display">
          C
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="bg-white/20 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/20">
                Official Bottling Portal
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight font-display italic pt-1">
              Coca-Cola Inc.
            </h2>
            <p className="text-xs text-red-100 font-medium">
              Welcome back, <strong className="text-white font-bold">{user.fullName || "Partner"}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-red-200 font-bold uppercase tracking-wider block">Wallet Balance</span>
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              ₦{(user.balance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-3 gap-2 pt-1 relative z-10">
          <button
            onClick={() => onNavigateToMineView ? onNavigateToMineView("deposit") : onNavigateToTab("mine")}
            className="bg-white hover:bg-red-50 text-[#e41e2b] font-black text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-98"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Deposit</span>
          </button>

          <button
            onClick={() => onNavigateToMineView ? onNavigateToMineView("withdraw") : onNavigateToTab("mine")}
            className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 backdrop-blur-md border border-white/20 transition cursor-pointer active:scale-98"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Withdraw</span>
          </button>

          <button
            onClick={handleDailyCheckIn}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-98"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Check-in</span>
          </button>
        </div>
      </div>

      {/* 1. LIVE ACTIVITY TICKER */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
          LIVE ACTIVITY
        </h3>
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center space-x-2.5 text-xs font-semibold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate">{liveTickerItems[tickerIndex]}</span>
        </div>
      </div>

      {/* 2. ACTIVITIES SECTION */}
      <div className="space-y-2.5">
        <h2 className="text-base font-bold text-slate-800 px-1">
          Activities
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Daily check-in card */}
          <div 
            onClick={handleDailyCheckIn}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-[#c83a00]/30 transition cursor-pointer flex flex-col justify-between h-32 active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#fff2ed] flex items-center justify-center text-[#c83a00]">
                <Calendar className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Daily check-in</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Check in and earn rewards</p>
            </div>
          </div>

          {/* Monthly Salary card */}
          <div 
            onClick={() => setShowSalaryModal(true)}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-[#c83a00]/30 transition cursor-pointer flex flex-col justify-between h-32 active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#fff2ed] flex items-center justify-center text-[#c83a00]">
                <DollarSign className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Monthly Salary</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Claim your team salary</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRODUCTS SECTION */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900">Products</h2>
          <button 
            onClick={() => onNavigateToTab("vip")}
            className="text-xs font-bold text-slate-600 hover:text-[#c83a00] flex items-center gap-0.5"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Featured Card (Plan 1) */}
        <div 
          className="rounded-3xl overflow-hidden relative shadow-md bg-slate-900 aspect-[16/9] group cursor-pointer"
          onClick={() => setSelectedPlan(plan1)}
        >
          <img 
            src={PLAN_IMAGES.t1} 
            alt="Plan 1"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 flex flex-col justify-end text-white">
            <h3 className="text-lg font-bold drop-shadow-sm">Plan 1</h3>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-2xl font-black text-white">+₦1,000</span>
              <span className="text-xs font-medium text-slate-200">/per day</span>
            </div>
            <p className="text-xs text-slate-200 mt-1">
              60 days · Total return ₦60,000
            </p>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlan(plan1);
              }}
              className="absolute bottom-4 right-4 bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1 shadow-md transition cursor-pointer"
            >
              <span>Invest</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grid Row (Plan 2 & Plan 3) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Plan 2 */}
          <div 
            onClick={() => setSelectedPlan(plan2)}
            className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-[#c83a00]/30 transition group"
          >
            <div className="h-28 w-full overflow-hidden bg-slate-100 relative">
              <img 
                src={PLAN_IMAGES.t2} 
                alt="Plan 2"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Plan 2</h4>
                <p className="text-base font-extrabold text-[#059669] mt-0.5">+₦2,060</p>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-400 font-medium">60 days</span>
                <span className="font-bold text-slate-700">₦123,600</span>
              </div>
            </div>
          </div>

          {/* Plan 3 */}
          <div 
            onClick={() => setSelectedPlan(plan3)}
            className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:border-[#c83a00]/30 transition group"
          >
            <div className="h-28 w-full overflow-hidden bg-slate-100 relative">
              <img 
                src={PLAN_IMAGES.t3} 
                alt="Plan 3"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Plan 3</h4>
                <p className="text-base font-extrabold text-[#059669] mt-0.5">+₦4,700</p>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-400 font-medium">60 days</span>
                <span className="font-bold text-slate-700">₦282,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Customer Service Button */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-[#c83a00] hover:bg-[#a32e00] text-white flex items-center justify-center shadow-lg hover:scale-105 transition cursor-pointer active:scale-95"
        title="Customer Service"
      >
        <Headphones className="w-6 h-6" />
      </button>

      {/* Investment Plan Purchase Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">{selectedPlan.name}</h3>
              <p className="text-xs text-slate-500">
                Confirm your investment to start receiving daily agricultural yield returns.
              </p>
            </div>

            <div className="bg-[#f8f7f5] rounded-2xl p-4 space-y-2.5 border border-slate-200 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Required Capital:</span>
                <span className="text-slate-900 font-bold">₦{selectedPlan.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Daily Return:</span>
                <span className="text-[#059669] font-bold">+₦{selectedPlan.dailyReward.toLocaleString()} / day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Investment Cycle:</span>
                <span className="text-slate-900 font-bold">60 Days</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Total Return:</span>
                <span className="text-[#c83a00] font-bold">₦{(selectedPlan.dailyReward * 60).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Your Wallet Balance:</span>
                <span className="text-slate-900 font-bold">₦{(user.balance || 0).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => handleInvest(selectedPlan)}
              className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition"
            >
              Confirm Investment
            </button>
          </div>
        </div>
      )}

      {/* Monthly Salary Info Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setShowSalaryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#fff2ed] flex items-center justify-center text-[#c83a00] mb-2">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Monthly Team Salary</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Build an active team of agricultural sponsors to qualify for fixed monthly salary packages directly credited to your wallet.
              </p>
            </div>

            <div className="bg-[#f8f7f5] rounded-2xl p-4 space-y-2 border border-slate-200 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-600">10 Active Referrals:</span>
                <span className="text-[#059669] font-bold">₦25,000 / mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">30 Active Referrals:</span>
                <span className="text-[#059669] font-bold">₦80,000 / mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">100 Active Referrals:</span>
                <span className="text-[#059669] font-bold">₦300,000 / mo</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSalaryModal(false);
                onNavigateToTab("team");
              }}
              className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3.5 rounded-2xl text-sm shadow-sm transition"
            >
              View Team & Invite
            </button>
          </div>
        </div>
      )}

      {/* Support / Customer Service Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl text-center">
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#fff2ed] flex items-center justify-center text-[#c83a00] mx-auto">
              <Headphones className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Coca-Cola Invest Customer Care</h3>
              <p className="text-xs text-slate-500">
                Our support team is available 24/7 to assist with deposits, withdrawals, and account inquiries.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a 
                href="https://t.me/careeminvest"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition block"
              >
                <span>Chat with Telegram Support</span>
              </a>
              <button
                onClick={() => setShowSupportModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investor Pitch Deck & Brand Asset Modal */}
      <InvestorPitchDeckModal 
        isOpen={showPitchDeckModal}
        onClose={() => setShowPitchDeckModal(false)}
        onNavigateToProducts={() => onNavigateToTab("vip")}
      />

    </div>
  );
}
