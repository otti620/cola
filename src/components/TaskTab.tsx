import React, { useState } from "react";
import { Award, TrendingUp, DollarSign } from "lucide-react";
import { UserProfile } from "../types";
import { INVESTMENT_TIERS } from "../data";
import { db, auth } from "../lib/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { notifyToast } from "../utils/toast";

interface TaskTabProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function TaskTab({ user, onUpdateUser, onNavigateToTab }: TaskTabProps) {
  const [loading, setLoading] = useState(false);

  const hasActivePlan = user.currentTierId && INVESTMENT_TIERS.some((t) => t.id === user.currentTierId);

  const todayStr = new Date().toISOString().split("T")[0];
  const alreadyClaimed = user.lastTaskDate === todayStr;
  
  const currentTier = INVESTMENT_TIERS.find((t) => t.id === user.currentTierId) || INVESTMENT_TIERS[0];
  const dailyProfit = currentTier?.dailyReward || 0;

  const handleGetProfit = async () => {
    if (!hasActivePlan) {
      alert("You need an active Product package to claim profit.");
      return;
    }
    if (alreadyClaimed) {
      alert("You have already claimed your daily profit today.");
      return;
    }
    
    setLoading(true);
    
    const updatedUser: UserProfile = {
      ...user,
      balance: (user.balance || 0) + dailyProfit,
      totalProfit: (user.totalProfit || 0) + dailyProfit,
      lastTaskDate: todayStr
    };

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        balance: updatedUser.balance,
        totalProfit: updatedUser.totalProfit,
        lastTaskDate: updatedUser.lastTaskDate
      });

      const transRef = collection(db, "users", uid, "transactions");
      await addDoc(transRef, {
        type: "deposit",
        amount: dailyProfit,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Daily Profit Claimed: ${currentTier?.name}`,
        createdAt: serverTimestamp()
      });

      onUpdateUser(updatedUser);
      notifyToast({
        title: "🎉 Daily Profit Claimed!",
        message: `Earned ₦${dailyProfit.toLocaleString()} from ${currentTier?.name || "Product Package"}.`,
        type: "profit",
        amount: dailyProfit
      });
    } catch (error) {
      console.error(error);
      alert("Error claiming profit.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasActivePlan) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
          <Award className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-black text-slate-900">No Active Product Package</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          To start earning daily profit, please visit the Products tab and unlock one of our partnership packages.
        </p>
        <button
          onClick={() => onNavigateToTab && onNavigateToTab("vip")}
          className="bg-[#e41e2b] hover:bg-[#c41622] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
        >
          View Product Packages
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 pb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e41e2b] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e41e2b]">
              Coca-Cola Yield Portal
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 font-display">Daily Bottling Profit</h2>
          <p className="text-xs text-slate-500">Claim your yield for today.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[#e41e2b] font-mono">₦{dailyProfit.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Daily Dividend Rate</p>
        </div>
      </div>

      {/* Action Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-[#e41e2b]/10 rounded-2xl text-[#e41e2b]">
                <TrendingUp className="w-8 h-8" />
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-900">Ready to Claim</h3>
                <p className="text-sm text-slate-500">Your profit for {currentTier.name} is calculated and ready.</p>
            </div>
        </div>
        
        <button
          onClick={handleGetProfit}
          disabled={loading || alreadyClaimed}
          className={`w-full py-4 rounded-2xl text-base font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
            loading || alreadyClaimed
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-[#e41e2b] hover:bg-[#c41622] text-white shadow-lg shadow-red-900/20"
          }`}
        >
          {loading ? (
            "Processing..."
          ) : alreadyClaimed ? (
            "Claimed for Today"
          ) : (
            <><DollarSign className="w-5 h-5" /> Get Daily Profit</>
          )}
        </button>
      </div>
    </div>
  );
}
