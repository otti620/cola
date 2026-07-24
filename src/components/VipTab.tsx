import React, { useState } from "react";
import { 
  SlidersHorizontal, ArrowUpDown, Headphones, Calculator, X, CheckCircle2, Sparkles, Building2, MapPin 
} from "lucide-react";
import { UserProfile, InvestmentTier } from "../types";
import { INVESTMENT_TIERS } from "../data";
import { COCA_COLA_BRAND_ASSETS } from "../data/brandImages";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import InvestorPitchDeckModal from "./InvestorPitchDeckModal";

interface VipTabProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToMineView?: (view: "deposit" | "withdraw" | "fund" | "none") => void;
}

export default function VipTab({ user, onUpdateUser, onNavigateToTab, onNavigateToMineView }: VipTabProps) {
  const [filterPriceRange, setFilterPriceRange] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("default");
  const [selectedPlan, setSelectedPlan] = useState<InvestmentTier | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showPitchDeckModal, setShowPitchDeckModal] = useState(false);
  const [calcPlan, setCalcPlan] = useState<InvestmentTier>(INVESTMENT_TIERS[0]);
  const [calcQuantity, setCalcQuantity] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter logic
  let filteredPlans = [...INVESTMENT_TIERS];
  if (filterPriceRange === "low") {
    filteredPlans = filteredPlans.filter((p) => p.price <= 20000);
  } else if (filterPriceRange === "mid") {
    filteredPlans = filteredPlans.filter((p) => p.price > 20000 && p.price <= 100000);
  } else if (filterPriceRange === "high") {
    filteredPlans = filteredPlans.filter((p) => p.price > 100000);
  }

  // Sort logic
  if (sortOrder === "asc") {
    filteredPlans.sort((a, b) => a.price - b.price);
  } else if (sortOrder === "desc") {
    filteredPlans.sort((a, b) => b.price - a.price);
  }

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
      totalProfit: (user.totalProfit || 0) + plan.dailyReward
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
      console.error("Error saving transaction:", e);
    }

    setSelectedPlan(null);
    setToastMessage(`🎉 Investment successful! You purchased ${plan.name}. Daily profit drops automatically every 24 hours.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in pb-20 pt-2 px-1 relative">

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-bounce max-w-xs text-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Subtitle Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e41e2b] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e41e2b]">
              Coca-Cola Bottling Products
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 font-display">Beverage Packages & Yield Plans</h1>
          <p className="text-xs text-slate-500 font-medium">8 Verified Investment Tiers · 100-day cycles · Daily auto-credits</p>
        </div>

        <button
          onClick={() => setShowPitchDeckModal(true)}
          className="bg-[#e41e2b] hover:bg-[#c41622] text-white font-black text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Prospectus</span>
        </button>
      </div>

      {/* Strategic Investor Prospectus Quick Banner */}
      <div 
        onClick={() => setShowPitchDeckModal(true)}
        className="relative rounded-2xl overflow-hidden bg-slate-900 text-white p-4 border border-slate-800 shadow-md cursor-pointer group"
      >
        <img 
          src={COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.url}
          alt="Brand Assets Matrix"
          className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold bg-[#e41e2b] text-white px-2 py-0.5 rounded uppercase tracking-wider">
              Investor Proof
            </span>
            <h3 className="text-sm font-black text-white font-display">
              View Verified Bottling & Logistics Assets
            </h3>
            <p className="text-[11px] text-slate-300">
              100-day dividend cycles backed by physical inventory.
            </p>
          </div>
          <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-[#e41e2b] transition">
            <Building2 className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Filter and Sort Pills */}
      <div className="space-y-2 pt-1">
        {/* Row 1: Price filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-500 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <button
            onClick={() => setFilterPriceRange("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              filterPriceRange === "all"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterPriceRange("low")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              filterPriceRange === "low"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ≤ ₦20,000
          </button>
          <button
            onClick={() => setFilterPriceRange("mid")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              filterPriceRange === "mid"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ₦20,000 - ₦100,000
          </button>
          <button
            onClick={() => setFilterPriceRange("high")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              filterPriceRange === "high"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ₦100,000+
          </button>
        </div>

        {/* Row 2: Sort order */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-500 shrink-0">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <button
            onClick={() => setSortOrder("default")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              sortOrder === "default"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Default
          </button>
          <button
            onClick={() => setSortOrder("asc")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              sortOrder === "asc"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Price: low to high
          </button>
          <button
            onClick={() => setSortOrder("desc")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              sortOrder === "desc"
                ? "bg-[#c83a00] text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Price: high to low
          </button>
        </div>
      </div>

      {/* Product Cards List */}
      <div className="space-y-4 pt-2">
        {filteredPlans.map((plan) => (
          <div 
            key={plan.id}
            className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4"
          >
            {/* Header with image */}
            <div className="flex items-center space-x-3.5">
              <img 
                src={plan.imageUrl} 
                alt={plan.name}
                referrerPolicy="no-referrer"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-xs"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#e41e2b] bg-[#fff0f1] px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-[#ffdce0]">
                  <MapPin className="w-3 h-3" /> {plan.region}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{plan.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{plan.description}</p>
              </div>
            </div>

            {/* Spec breakdown table */}
            <div className="space-y-2 text-sm pt-1">
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Price</span>
                <span className="font-extrabold text-slate-900">₦{plan.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Daily income</span>
                <span className="font-extrabold text-[#059669]">+₦{plan.dailyReward.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Cycle</span>
                <span className="font-bold text-slate-900">60 days</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Total income</span>
                <span className="font-extrabold text-slate-900">₦{(plan.dailyReward * 60).toLocaleString()}</span>
              </div>
            </div>

            {/* Invest Button */}
            <button
              onClick={() => setSelectedPlan(plan)}
              className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3.5 rounded-2xl text-base shadow-xs transition duration-150 cursor-pointer active:scale-98"
            >
              Invest
            </button>
          </div>
        ))}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col space-y-2.5">
        <button
          onClick={() => setShowSupportModal(true)}
          className="w-12 h-12 rounded-full bg-[#c83a00] hover:bg-[#a32e00] text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95"
          title="Customer Service"
        >
          <Headphones className="w-6 h-6" />
        </button>

        <button
          onClick={() => setShowCalculatorModal(true)}
          className="w-12 h-12 rounded-full bg-[#c83a00] hover:bg-[#a32e00] text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95"
          title="Yield Calculator"
        >
          <Calculator className="w-6 h-6" />
        </button>
      </div>

      {/* Investment Confirmation Modal */}
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
                Confirm your investment to start receiving daily yield drops automatically every 24 hours.
              </p>
            </div>

            <div className="bg-[#f8f7f5] rounded-2xl p-4 space-y-2.5 border border-slate-200 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Price:</span>
                <span className="text-slate-900 font-bold">₦{selectedPlan.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Daily income:</span>
                <span className="text-[#059669] font-bold">+₦{selectedPlan.dailyReward.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cycle:</span>
                <span className="text-slate-900 font-bold">60 days</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Total income:</span>
                <span className="text-[#c83a00] font-bold">₦{(selectedPlan.dailyReward * 60).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Your Wallet Balance:</span>
                <span className="text-slate-900 font-bold">₦{(user.balance || 0).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => handleInvest(selectedPlan)}
              className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3.5 rounded-2xl text-sm shadow-xs transition"
            >
              Confirm Investment
            </button>
          </div>
        </div>
      )}

      {/* Yield Calculator Modal */}
      {showCalculatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setShowCalculatorModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#fff2ed] flex items-center justify-center text-[#c83a00] mb-2">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Yield Calculator</h3>
              <p className="text-xs text-slate-500">
                Calculate expected returns for any investment plan.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Plan:</label>
                <select
                  value={calcPlan.id}
                  onChange={(e) => {
                    const found = INVESTMENT_TIERS.find((p) => p.id === e.target.value);
                    if (found) setCalcPlan(found);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                >
                  {INVESTMENT_TIERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ₦{p.price.toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Units / Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="bg-[#f8f7f5] rounded-2xl p-3.5 space-y-2 border border-slate-200 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Investment:</span>
                  <span className="text-slate-900 font-bold">₦{(calcPlan.price * calcQuantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily Income:</span>
                  <span className="text-[#059669] font-bold">+₦{(calcPlan.dailyReward * calcQuantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">60-Day Total Return:</span>
                  <span className="text-[#c83a00] font-bold">₦{(calcPlan.dailyReward * 60 * calcQuantity).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowCalculatorModal(false);
                setSelectedPlan(calcPlan);
              }}
              className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3.5 rounded-2xl text-xs shadow-xs transition"
            >
              Invest in {calcPlan.name} Now
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
              <h3 className="text-xl font-extrabold text-slate-900">IITA Customer Care</h3>
              <p className="text-xs text-slate-500">
                Our support team is available 24/7 to assist with deposits, withdrawals, and account inquiries.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a 
                href="https://t.me/careeminvest"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition block"
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

      {/* Investor Pitch Deck & Prospectus Modal */}
      <InvestorPitchDeckModal 
        isOpen={showPitchDeckModal}
        onClose={() => setShowPitchDeckModal(false)}
        onNavigateToProducts={() => {
          setShowPitchDeckModal(false);
        }}
      />

    </div>
  );
}
