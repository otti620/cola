import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ArrowRightCircle, ShieldCheck, Landmark, PiggyBank, 
  HelpCircle, Sparkles, CheckCircle2, Clock, Coins 
} from "lucide-react";
import { UserProfile } from "../types";
import { db, auth } from "../lib/firebase";
import CongratulationsModal, { InvestmentUpgradeSuccessDetails } from "./CongratulationsModal";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDoc,
  serverTimestamp,
  writeBatch 
} from "firebase/firestore";

interface FundTabProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
}

interface FundPlan {
  id: string;
  name: string;
  durationDays: number;
  dailyInterestRate: number; // e.g. 0.015 for 1.5% daily
  minimumInvestment: number;
  description: string;
  category: string;
}

interface UserFundInvestment {
  id: string;
  planId: string;
  planName: string;
  amountInvested: number;
  dailyInterestRate: number;
  durationDays: number;
  daysRemaining: number;
  accumulatedProfit: number;
  startDate: string;
  endDate: string;
  status: "active" | "completed";
}

export default function FundTab({ user, onUpdateUser }: FundTabProps) {
  const [fundPlans, setFundPlans] = useState<FundPlan[]>([]);
  const [investments, setInvestments] = useState<UserFundInvestment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FundPlan | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [congratsDetails, setCongratsDetails] = useState<InvestmentUpgradeSuccessDetails | null>(null);

  // Load fund plans and user's active fund investments
  useEffect(() => {
    // Optional: Fetch plans from a "system" collection
    const configFundsRef = doc(db, "system", "funds");
    const unsubPlans = onSnapshot(configFundsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.plans) setFundPlans(data.plans);
      } else {
        // Fallback defaults if not set in DB
        const defaults: FundPlan[] = [
          {
            id: "fund_30d",
            name: "Coca-Cola 30-Day Liquid Dividend Mutual",
            durationDays: 30,
            dailyInterestRate: 0.012,
            minimumInvestment: 10000,
            category: "Treasury Mutual",
            description: "Sponsor regional bottling inventory & multi-pack distribution for 30 days. Earns a stable 1.2% compound interest credited daily."
          },
          {
            id: "fund_60d",
            name: "Coca-Cola 60-Day Bottling Plant Bond",
            durationDays: 60,
            dailyInterestRate: 0.016,
            minimumInvestment: 50000,
            category: "Corporate Debt Bond",
            description: "Sponsor high-speed canning and automated syrup processing facilities. High daily yields of 1.6% paid daily with a 60-day cycle."
          },
          {
            id: "fund_90d",
            name: "Coca-Cola 90-Day Mega Logistics Venture",
            durationDays: 90,
            dailyInterestRate: 0.022,
            minimumInvestment: 150000,
            category: "Venture Equity",
            description: "Direct equity in continental transport, distribution hubs, and automated retail supply. Premium 2.2% daily returns with 90 days maturity."
          }
        ];
        setFundPlans(defaults);
      }
    }, (err) => {
      console.warn("Funds config snapshot notice (using local defaults):", err?.message || err);
    });

    if (auth.currentUser) {
      const investRef = collection(db, "users", auth.currentUser.uid, "investments");
      const unsubInvests = onSnapshot(query(investRef, orderBy("startDate", "desc")), (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as UserFundInvestment[];
        setInvestments(data);
      }, (err) => {
        console.warn("User investments snapshot notice:", err?.message || err);
      });
      return () => {
        unsubPlans();
        unsubInvests();
      };
    }

    return () => unsubPlans();
  }, [user.uid]);

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !auth.currentUser) return;

    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid investment amount.");
      return;
    }

    if (amount < selectedPlan.minimumInvestment) {
      alert(`The minimum investment for this fund is ₦${selectedPlan.minimumInvestment.toLocaleString()}.`);
      return;
    }

    if (user.balance < amount) {
      alert(`Insufficient balance. You have ₦${user.balance.toLocaleString()} in your wallet but require ₦${amount.toLocaleString()} to invest.`);
      return;
    }

    try {
      const uid = auth.currentUser.uid;
      const userRef = doc(db, "users", uid);
      const investRef = collection(db, "users", uid, "investments");
      const transRef = collection(db, "users", uid, "transactions");

      // Update user document
      await updateDoc(userRef, {
        balance: user.balance - amount
      });

      onUpdateUser({
        ...user,
        balance: user.balance - amount
      });

      // Add investment record
      await addDoc(investRef, {
        id: "inv_" + Math.random().toString(36).substr(2, 6), // Add an explicit ID field just in case
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amountInvested: amount,
        dailyInterestRate: selectedPlan.dailyInterestRate,
        durationDays: selectedPlan.durationDays,
        daysRemaining: selectedPlan.durationDays,
        accumulatedProfit: 0,
        startDate: new Date().toLocaleDateString("en-NG"),
        endDate: new Date(Date.now() + 86400000 * selectedPlan.durationDays).toLocaleDateString("en-NG"),
        status: "active",
        createdAt: serverTimestamp()
      });

      // Log transaction
      await addDoc(transRef, {
        type: "withdraw",
        amount,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Locked Investment: ${selectedPlan.name}`,
        createdAt: serverTimestamp()
      });

      setSuccessMsg(`Sponsorship Investment of ₦${amount.toLocaleString()} placed successfully in the ${selectedPlan.name}!`);
      setCongratsDetails({
        planName: selectedPlan.name,
        amountInvested: amount,
        dailyReward: amount * selectedPlan.dailyInterestRate,
        durationDays: selectedPlan.durationDays,
        tierId: selectedPlan.id
      });
      setSelectedPlan(null);
      setInvestAmount("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (error) {
      console.error("Investment error:", error);
      alert("Failed to process investment. Please try again.");
    }
  };

  // Demo Tool to simulate daily profit growth & time passage (+1 Day)
  const handleSimulateDay = async () => {
    if (!auth.currentUser || investments.length === 0) return;

    try {
      const batch = writeBatch(db);
      investments.forEach((inv) => {
        if (inv.status === "completed" || inv.daysRemaining <= 0) return;

        const dailyAccrual = inv.amountInvested * inv.dailyInterestRate;
        const newDaysRemaining = inv.daysRemaining - 1;
        const newProfit = inv.accumulatedProfit + dailyAccrual;
        const newStatus = newDaysRemaining === 0 ? "completed" : "active";

        const invRef = doc(db, "users", auth.currentUser!.uid, "investments", inv.id);
        batch.update(invRef, {
          daysRemaining: newDaysRemaining,
          accumulatedProfit: newProfit,
          status: newStatus
        });
      });

      await batch.commit();
      alert("Simulated passage of +1 Day! Daily interest has accrued successfully on all locked fund assets.");
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Failed to simulate day passage.");
    }
  };

  // Claim earnings from a completed investment
  const handleClaim = async (inv: UserFundInvestment) => {
    if (!auth.currentUser) return;

    const totalClaimable = inv.amountInvested + inv.accumulatedProfit;
    
    try {
      const uid = auth.currentUser.uid;
      const userRef = doc(db, "users", uid);
      const invRef = doc(db, "users", uid, "investments", inv.id);
      const transRef = collection(db, "users", uid, "transactions");

      // Update user balance
      await updateDoc(userRef, {
        balance: user.balance + totalClaimable,
        totalProfit: user.totalProfit + inv.accumulatedProfit
      });

      // Delete or update investment to claimed status
      // For this app, let's just delete to keep list clean or mark as claimed
      await updateDoc(invRef, {
        status: "completed",
        daysRemaining: 0
      });

      // Log transaction
      await addDoc(transRef, {
        type: "deposit",
        amount: totalClaimable,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Withdrew matured investment & profit from ${inv.planName}`,
        createdAt: serverTimestamp()
      });

      alert(`Successfully redeemed matured capital + interest! ₦${totalClaimable.toLocaleString()} has been credited to your active wallet balance!`);
    } catch (error) {
      console.error("Claim error:", error);
      alert("Failed to claim matured investment.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      
      {/* Title block */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e41e2b] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e41e2b]">
              Coca-Cola Capital Management
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight font-display">Locked Treasury & Mutual Funds</h1>
          <p className="text-xs text-slate-500 font-medium">
            Lock idle capital in verified Coca-Cola bottling logistics accounts with daily compounded dividend yields.
          </p>
        </div>
        <div className="bg-[#fff0f1] border border-[#ffccd0] rounded-2xl px-4 py-2 font-mono text-xs flex items-center space-x-2 shrink-0">
          <span className="text-slate-500 uppercase font-bold text-[9px]">Wallet Balance:</span>
          <span className="text-[#e41e2b] font-black text-base">₦{user.balance.toLocaleString()}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-careem-green rounded-xl text-center text-sm font-bold shadow-xs animate-pulse">
          {successMsg}
        </div>
      )}

      {/* Spacious Full-Width Fund Products List */}
      <div className="space-y-6">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Available Premium Locked Funds</h2>
        
        {fundPlans.map((plan) => {
          const estimatedTotalProfit = plan.minimumInvestment * plan.dailyInterestRate * plan.durationDays;
          return (
            <div 
              key={plan.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-stretch gap-6 shadow-xs hover:border-careem-green/35 transition-all"
            >
              {/* Left detail column */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center space-x-1.5 bg-careem-green/10 text-careem-green text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                    <PiggyBank className="w-3.5 h-3.5" />
                    <span>{plan.category}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {plan.durationDays} Days Locked Term
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 font-mono text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400 uppercase font-bold text-[9px]">Daily Yield Rate</span>
                    <span className="text-careem-green font-black text-sm">{(plan.dailyInterestRate * 100).toFixed(1)}% Daily</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 uppercase font-bold text-[9px]">Minimum Allowed</span>
                    <span className="text-slate-900 font-bold text-sm">₦{plan.minimumInvestment.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 uppercase font-bold text-[9px]">Maturity Term</span>
                    <span className="text-slate-900 font-bold text-sm">{plan.durationDays} Days Lockup</span>
                  </div>
                </div>
              </div>

              {/* Right investment card */}
              <div className="w-full md:w-64 bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col justify-between items-stretch text-center shrink-0">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Estimated Yield (30 Days+)</span>
                  <span className="text-2xl font-black text-slate-900 block font-mono">
                    +{(plan.dailyInterestRate * plan.durationDays * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Profit on ₦{plan.minimumInvestment.toLocaleString()} = <strong>₦{estimatedTotalProfit.toLocaleString()}</strong>
                  </span>
                </div>

                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full mt-4 bg-careem-green hover:bg-careem-green/90 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-xs transition-all active:scale-95"
                >
                  Invest Capital Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* User's Active Investments Section */}
      <div className="space-y-6 pt-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Your Active High-Income Portfolios</h2>
          
          <button
            onClick={handleSimulateDay}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 shadow-sm"
            title="Fast forward 1 day of time to see interest accumulate"
          >
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Simulate +1 Day</span>
          </button>
        </div>

        {investments.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-mono">
            No active locked investments found in your account portfolio. Sponsor a mutual treasury fund above to start!
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map((inv) => {
              const isMatured = inv.daysRemaining <= 0;
              const totalReturn = inv.amountInvested + inv.accumulatedProfit;
              
              return (
                <div 
                  key={inv.id}
                  className={`bg-white border rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 ${
                    isMatured ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/5" : "border-slate-200"
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        ID: {inv.id.toUpperCase()}
                      </span>
                      {isMatured ? (
                        <span className="text-[9px] font-bold font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Matured & Completed</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold font-mono uppercase bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                          {inv.daysRemaining} Days Left
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{inv.planName}</h4>
                    
                    {/* Compact layout of stats */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-slate-500">
                      <span>Invested: <strong className="text-slate-800">₦{inv.amountInvested.toLocaleString()}</strong></span>
                      <span>Interest: <strong className="text-careem-green font-bold">+₦{inv.accumulatedProfit.toLocaleString()}</strong></span>
                      <span>Daily: <strong className="text-slate-700">{(inv.dailyInterestRate * 100).toFixed(1)}%</strong></span>
                      <span>Maturity Date: <strong className="text-slate-800">{inv.endDate}</strong></span>
                    </div>
                  </div>

                  {/* Actions for active/mature */}
                  <div className="shrink-0 flex items-center justify-end">
                    {isMatured ? (
                      <button
                        onClick={() => handleClaim(inv)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl tracking-wider transition-all shadow-md cursor-pointer animate-bounce"
                      >
                        Claim ₦{totalReturn.toLocaleString()} Cash
                      </button>
                    ) : (
                      <div className="text-right font-mono text-xs">
                        <span className="block text-slate-400 font-bold text-[9px] uppercase">Est. Redeemable</span>
                        <strong className="text-slate-900 text-sm">₦{totalReturn.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invest Modal Dialog */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <form 
            onSubmit={handleInvest}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 relative shadow-xl animate-fade-in"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold font-mono bg-careem-green/10 text-careem-green px-2.5 py-0.5 rounded uppercase">
                {selectedPlan.category}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedPlan.name}</h3>
              <p className="text-xs text-slate-500">
                Minimum entry: ₦{selectedPlan.minimumInvestment.toLocaleString()}. Capital will be locked for {selectedPlan.durationDays} days at {(selectedPlan.dailyInterestRate * 100).toFixed(1)}% interest daily.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-400 font-bold">Investment Capital (₦)</label>
              <input 
                type="number" 
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder={`Minimum ₦${selectedPlan.minimumInvestment}`}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-careem-green focus:outline-none text-sm font-mono"
                required
              />
            </div>

            {/* Simulated Return Table */}
            {investAmount && !isNaN(parseFloat(investAmount)) && parseFloat(investAmount) >= selectedPlan.minimumInvestment && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Capital:</span>
                  <span className="text-slate-900 font-bold">₦{parseFloat(investAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily Profit:</span>
                  <span className="text-careem-green font-bold">+₦{(parseFloat(investAmount) * selectedPlan.dailyInterestRate).toLocaleString()} / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Term Return:</span>
                  <span className="text-careem-green font-bold">+₦{(parseFloat(investAmount) * selectedPlan.dailyInterestRate * selectedPlan.durationDays).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Total Return at Maturity:</span>
                  <span className="text-slate-950 font-black text-sm">₦{(parseFloat(investAmount) + (parseFloat(investAmount) * selectedPlan.dailyInterestRate * selectedPlan.durationDays)).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="w-1/2 bg-careem-green hover:bg-careem-green/90 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-sm transition-all"
              >
                Confirm Investment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Congratulations Investment Upgrade Modal */}
      <CongratulationsModal
        isOpen={!!congratsDetails}
        onClose={() => setCongratsDetails(null)}
        details={congratsDetails}
      />

    </div>
  );
}
