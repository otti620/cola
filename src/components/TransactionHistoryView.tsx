import React, { useState, useEffect } from "react";
import { 
  History, ArrowDownCircle, ArrowUpCircle, Filter, 
  CheckCircle, Clock, AlertCircle, ArrowUpRight, ArrowDownLeft, 
  Receipt, FileText, ChevronRight, RefreshCw, Timer, ShieldAlert, Sparkles
} from "lucide-react";
import { TransactionRecord } from "../types";
import OperationalRulesBanner from "./OperationalRulesBanner";

interface TransactionHistoryViewProps {
  transactions: TransactionRecord[];
  initialFilter?: "all" | "deposit" | "withdraw";
  onNavigateToDeposit?: () => void;
  onNavigateToWithdraw?: () => void;
  loading?: boolean;
}

// Helper to calculate West Africa Time (WAT, UTC+1) status & countdowns
function getWATTimeDetails() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  const watHour = (utcHours + 1) % 24;
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
    statusText = "Operational Window Active";
  } else if (watHour < 9) {
    windowProgress = 0;
    const secRemaining = windowStartSec - currentTotalSec;
    const h = Math.floor(secRemaining / 3600);
    const m = Math.floor((secRemaining % 3600) / 60);
    const s = secRemaining % 60;
    countdownText = `Opens in ${h}h ${m}m ${s}s`;
    statusText = "Window Closed (Opens at 09:00 AM)";
  } else {
    windowProgress = 100;
    const secRemaining = (24 * 3600 - currentTotalSec) + windowStartSec;
    const h = Math.floor(secRemaining / 3600);
    const m = Math.floor((secRemaining % 3600) / 60);
    const s = secRemaining % 60;
    countdownText = `Opens tomorrow in ${h}h ${m}m ${s}s`;
    statusText = "Window Closed for Today";
  }

  const ampmHour = watHour % 12 === 0 ? 12 : watHour % 12;
  const ampm = watHour >= 12 ? "PM" : "AM";
  const formattedTime = `${String(ampmHour).padStart(2, "0")}:${String(utcMinutes).padStart(2, "0")}:${String(utcSeconds).padStart(2, "0")} ${ampm} WAT`;

  return { isOpen, windowProgress, countdownText, statusText, formattedTime };
}

export default function TransactionHistoryView({
  transactions,
  initialFilter = "all",
  onNavigateToDeposit,
  onNavigateToWithdraw,
  loading = false
}: TransactionHistoryViewProps) {
  const [filter, setFilter] = useState<"all" | "deposit" | "withdraw">(initialFilter);
  const [watInfo, setWatInfo] = useState(getWATTimeDetails());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setWatInfo(getWATTimeDetails());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    const isW = t.type === "withdraw" || t.type === "withdrawal";
    if (filter === "withdraw") return isW;
    return t.type === filter;
  });

  const totalDeposits = transactions
    .filter((t) => t.type === "deposit" && t.status !== "rejected" && t.status !== "declined")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalWithdrawals = transactions
    .filter((t) => (t.type === "withdraw" || t.type === "withdrawal") && t.status !== "rejected" && t.status !== "declined")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const pendingWithdrawals = transactions.filter(
    (t) => (t.type === "withdraw" || t.type === "withdrawal") && (t.status || "").toLowerCase() === "pending"
  );

  const getStatusBadge = (status: string) => {
    const lower = (status || "pending").toLowerCase();
    if (lower === "approved" || lower === "completed" || lower === "success") {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Approved
        </span>
      );
    }
    if (lower === "rejected" || lower === "declined" || lower === "failed") {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Declined
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
        Processing
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#D9381E]">
            <History className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 font-display">Transaction History</h2>
            <p className="text-[11px] text-gray-500 font-medium">Real-time deposit and withdrawal logs</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 border border-emerald-100 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Total Deposited</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-emerald-800 font-mono">
            ₦{totalDeposits.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            {transactions.filter(t => t.type === "deposit").length} deposit records
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50/80 to-rose-50/20 border border-rose-100 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>Total Withdrawn</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-base font-black text-rose-800 font-mono">
            ₦{totalWithdrawals.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-600 font-medium">
            {transactions.filter(t => t.type === "withdraw" || t.type === "withdrawal").length} withdrawal records
          </div>
        </div>
      </div>

      {/* Shared Operational Window & Rules Banner */}
      <OperationalRulesBanner showRulesList={false} />

      {/* Pending Withdrawal Alert Banner with Countdown Indicator if any pending */}
      {pendingWithdrawals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="text-xs font-extrabold text-amber-900">
                {pendingWithdrawals.length} Pending Withdrawal{pendingWithdrawals.length > 1 ? "s" : ""} in Settlement Queue
              </span>
            </div>
            <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
              {watInfo.isOpen ? "Processing Active" : "Queued for 09:00 AM"}
            </span>
          </div>

          <p className="text-[11px] text-amber-800/90 leading-relaxed font-normal">
            {watInfo.isOpen
              ? "Your withdrawal request is being verified by our NIBSS interbank settlement team. Estimated clearance within the current operational window."
              : `Your withdrawal request is safely queued and will be processed immediately when the settlement window opens at 9:00 AM WAT (${watInfo.countdownText}).`}
          </p>

          {/* Settlement Step Pipeline */}
          <div className="pt-1">
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
              <div className="bg-amber-200/70 text-amber-900 py-1 px-1.5 rounded-lg border border-amber-300/50 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3 text-amber-700" />
                <span>Submitted</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${
                watInfo.isOpen 
                  ? "bg-amber-300/80 border-amber-400 text-amber-950 animate-pulse" 
                  : "bg-amber-100/60 border-amber-200 text-amber-700"
              }`}>
                <Clock className="w-3 h-3" />
                <span>Interbank</span>
              </div>
              <div className="bg-amber-100/40 text-amber-600 py-1 px-1.5 rounded-lg border border-amber-200/40 flex items-center justify-center gap-1">
                <Receipt className="w-3 h-3" />
                <span>Credited</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center bg-gray-100/80 p-1 rounded-xl gap-1 border border-gray-200/60">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            filter === "all"
              ? "bg-white text-gray-900 shadow-2xs"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          All ({transactions.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("deposit")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            filter === "deposit"
              ? "bg-white text-emerald-700 shadow-2xs"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Deposits ({transactions.filter(t => t.type === "deposit").length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("withdraw")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
            filter === "withdraw"
              ? "bg-white text-rose-700 shadow-2xs"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Withdrawals ({transactions.filter(t => t.type === "withdraw" || t.type === "withdrawal").length})
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
        {loading ? (
          <div className="text-center py-10 space-y-2">
            <RefreshCw className="w-6 h-6 text-[#D9381E] animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Loading transactions from Firestore...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => {
            const isDeposit = tx.type === "deposit";
            const amount = tx.amount || 0;

            return (
              <div
                key={tx.id}
                className="bg-white border border-gray-100 hover:border-gray-200 p-3.5 rounded-2xl shadow-2xs space-y-2 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDeposit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      {isDeposit ? (
                        <ArrowDownCircle className="w-5 h-5 stroke-[2]" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 stroke-[2]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{isDeposit ? "Recharge / Deposit" : "Bank Withdrawal"}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Ref: #{tx.id.slice(0, 8)} • {tx.timestamp || "Recent"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-black font-mono block ${
                      isDeposit ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {isDeposit ? "+" : "-"}₦{amount.toLocaleString()}
                    </span>
                    <div className="mt-1">{getStatusBadge(tx.status)}</div>
                  </div>
                </div>

                {/* Additional Details row if present */}
                {tx.details && (
                  <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-600 font-mono leading-relaxed bg-gray-50/60 p-2 rounded-xl">
                    {tx.details}
                  </div>
                )}

                {/* Pending Withdrawal Status Info */}
                {!isDeposit && (tx.status || "").toLowerCase() === "pending" && (
                  <div className="pt-2 border-t border-amber-100/80 bg-amber-50/50 p-2.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                        Settlement Window
                      </span>
                      <span className="font-mono text-amber-800">{watInfo.isOpen ? "Active Processing" : "Queued (09:00 AM)"}</span>
                    </div>
                    <p className="text-[10px] text-amber-700/90 leading-tight">
                      Net Payout: ₦{(tx.netPayout || Math.round(amount * 0.82)).toLocaleString()} (18% fee: ₦{(tx.fee || Math.round(amount * 0.18)).toLocaleString()})
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-3 my-2">
            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center mx-auto shadow-2xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-800">No transactions recorded yet</p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                {filter === "all"
                  ? "Your past deposit and withdrawal logs will appear here once initiated."
                  : filter === "deposit"
                  ? "You have no recorded deposit transactions."
                  : "You have no recorded withdrawal transactions."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {onNavigateToDeposit && (
                <button
                  type="button"
                  onClick={onNavigateToDeposit}
                  className="bg-[#D9381E] hover:bg-[#c42f17] text-white text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer"
                >
                  Deposit Funds
                </button>
              )}
              {onNavigateToWithdraw && (
                <button
                  type="button"
                  onClick={onNavigateToWithdraw}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold py-2 px-3.5 rounded-xl transition cursor-pointer"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
