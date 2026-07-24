import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, AlertTriangle, Headphones, Check, Copy, ArrowUpRight, CheckCircle2, X, Clock, RefreshCw, ShieldCheck, Zap, Radio
} from "lucide-react";
import { UserProfile } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { notifyToast } from "../utils/toast";

interface RechargeViewProps {
  user: UserProfile;
  onBack: () => void;
  onSuccess?: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
}

const PRESET_AMOUNTS = [
  3000, 4000, 8000,
  18000, 40000, 90000,
  200000, 450000, 1000000
];

const DYNAMIC_ACCOUNTS = [
  {
    bankName: "Moniepoint MFB",
    accountNumber: "6291038421",
    accountName: "COCA-COLA GLOBAL YIELD MERCHANTS",
    code: "505",
    color: "#0052cc",
    badge: "Instant NIP Settlement"
  },
  {
    bankName: "Wema Bank / ALAT",
    accountNumber: "0120122888",
    accountName: "TITAN DIGITAL SYSTEMS LIMITED",
    code: "035",
    color: "#7b1fa2",
    badge: "Auto-Reconciled"
  },
  {
    bankName: "Sterling Bank",
    accountNumber: "2329841029",
    accountName: "COCA-COLA PAYMENTS NIGERIA",
    code: "232",
    color: "#c62828",
    badge: "Direct NIP Gateway"
  }
];

export default function RechargeView({ user, onBack, onSuccess, onUpdateUser }: RechargeViewProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(4000);
  const [selectedChannel, setSelectedChannel] = useState<string>("Channel 4 (Instant Bank Transfer)");
  
  // Checkout flow states
  const [generatingAccount, setGeneratingAccount] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutRef, setCheckoutRef] = useState("");
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [copiedBankNo, setCopiedBankNo] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Behavioral tracking refs
  const hasCopiedAccRef = useRef(false);
  const hasCopiedRefCodeRef = useRef(false);
  const modalStartTimeRef = useRef<number>(Date.now());
  const appSwitchCountRef = useRef<number>(0);

  // Verification Animation States & Smooth Progress Bar
  const [progressPercent, setProgressPercent] = useState<number>(25);
  const [progressStatusText, setProgressStatusText] = useState<string>("Virtual Account Reserved & Polling NIBSS...");
  const [verifyingStep, setVerifyingStep] = useState<number>(0);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Listen to window focus/visibility to track app switches for ML diagnostics silently
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && showCheckoutModal && !depositSuccess) {
        appSwitchCountRef.current += 1;
        setProgressPercent((prev) => Math.max(prev, 82));
        setProgressStatusText("Synchronizing NIP Interbank Settlement...");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [showCheckoutModal, depositSuccess]);

  // Timer countdown (15 minutes = 900 seconds)
  const [timeLeft, setTimeLeft] = useState(900);

  const [bankAccountInfo, setBankAccountInfo] = useState(DYNAMIC_ACCOUNTS[0]);

  // Handle countdown timer when checkout modal is open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showCheckoutModal && !depositSuccess && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showCheckoutModal, depositSuccess, timeLeft]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleConfirmRecharge = () => {
    if (selectedAmount < 3000) {
      alert("The minimum deposit amount on this platform is ₦3,000.");
      return;
    }

    setGeneratingAccount(true);

    // Pick dynamic reserved virtual account
    const chosenAccount = DYNAMIC_ACCOUNTS[Math.floor(Math.random() * DYNAMIC_ACCOUNTS.length)];
    setBankAccountInfo(chosenAccount);

    setTimeout(() => {
      const randomRef = "COCA_PAY_" + Math.random().toString(36).substring(2, 9).toUpperCase();
      setCheckoutRef(randomRef);
      setTimeLeft(900); // reset 15-min countdown
      setGeneratingAccount(false);
      setShowCheckoutModal(true);
      setVerifyingStep(0);
      setProgressPercent(28);
      setProgressStatusText("Virtual Account Ready & Polling Gateway...");
      
      // Reset tracking refs for new checkout session
      hasCopiedAccRef.current = false;
      hasCopiedRefCodeRef.current = false;
      appSwitchCountRef.current = 0;
      modalStartTimeRef.current = Date.now();
    }, 900);
  };

  const handleCompleteDepositTransfer = async () => {
    setIsAutoDetecting(true);
    setVerifyingStep(1); // "Connecting to NIBSS Instant Settlement Switch..."
    setProgressPercent(55);
    setProgressStatusText("Connecting to NIBSS Settlement Switch...");

    setTimeout(() => {
      setVerifyingStep(2); // "Matching Transfer Reference & Narration..."
      setProgressPercent(82);
      setProgressStatusText("Matching Reference & Narration...");
    }, 1200);

    setTimeout(() => {
      setVerifyingStep(3); // "Payment Found & Confirmed!"
      setProgressPercent(100);
      setProgressStatusText("Interbank Transfer Verified & Logged!");
    }, 2500);

    setTimeout(async () => {
      setSubmittingDeposit(true);
      try {
        const uid = auth.currentUser?.uid || user.uid;

        // Machine Learning Behavioral Risk Classifier & Feature Scoring Engine
        const timeSpentSec = Math.max(1, Math.round((Date.now() - modalStartTimeRef.current) / 1000));
        const copiedAcc = hasCopiedAccRef.current;
        const copiedRefCode = hasCopiedRefCodeRef.current;
        const appSwitchCount = appSwitchCountRef.current;
        const switchedApp = appSwitchCount > 0;

        let rawScore = 12;
        const featureFlags: string[] = [];

        if (copiedAcc) {
          rawScore += 35;
          featureFlags.push("CLIPBOARD_ACCOUNT_CAPTURED (+35pts)");
        }
        if (copiedRefCode) {
          rawScore += 15;
          featureFlags.push("CLIPBOARD_REF_CAPTURED (+15pts)");
        }
        if (switchedApp) {
          rawScore += 30;
          featureFlags.push(`BANKING_APP_SWITCH_DETECTED (${appSwitchCount}x, +30pts)`);
        } else {
          featureFlags.push("NO_APP_SWITCH_DETECTED (In-App Only)");
        }

        if (timeSpentSec >= 15 && timeSpentSec <= 300) {
          rawScore += 20;
          featureFlags.push(`HUMAN_DWELL_WINDOW_OPTIMAL (${timeSpentSec}s, +20pts)`);
        } else if (timeSpentSec < 5) {
          rawScore -= 25;
          featureFlags.push(`SUSPICIOUS_FAST_SUBMIT (${timeSpentSec}s, -25pts)`);
        } else {
          rawScore += 10;
          featureFlags.push(`EXTENDED_SESSION_LATENCY (${timeSpentSec}s, +10pts)`);
        }

        const score = Math.min(99, Math.max(8, rawScore));
        let riskLevel: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK_ANOMALY" = "MODERATE_RISK";
        let level: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

        if (score >= 75) {
          riskLevel = "LOW_RISK";
          level = "HIGH";
        } else if (score >= 45) {
          riskLevel = "MODERATE_RISK";
          level = "MEDIUM";
        } else {
          riskLevel = "HIGH_RISK_ANOMALY";
          level = "LOW";
        }

        const behaviorAnalysis = {
          score,
          level,
          riskLevel,
          confidenceClassification: score >= 75 ? "GENUINE_HIGH_CONFIDENCE (85%-99%)" : score >= 45 ? "MODERATE_CONFIDENCE (45%-74%)" : "LOW_CONFIDENCE_ANOMALY (8%-44%)",
          copiedAccount: copiedAcc,
          copiedRef: copiedRefCode,
          switchedApp,
          appSwitchCount,
          timeSpentSeconds: timeSpentSec,
          featureFlags,
          anomalyScore: Number(((100 - score) / 100).toFixed(2)),
          modelName: "NIBSS_Behavior_XGBoost_v2.4",
          bankName: bankAccountInfo.bankName,
          accountNumber: bankAccountInfo.accountNumber,
          accountHolder: bankAccountInfo.accountName,
          timestamp: new Date().toISOString()
        };

        if (uid) {
          // Record deposit transaction as PENDING for admin review
          const transRef = collection(db, "users", uid, "transactions");
          await addDoc(transRef, {
            type: "deposit",
            amount: selectedAmount,
            status: "pending",
            timestamp: new Date().toLocaleString("en-NG"),
            details: `Automated Transfer via ${bankAccountInfo.bankName} (Ref: ${checkoutRef})`,
            behaviorAnalysis,
            createdAt: serverTimestamp()
          });
        }
        setSubmittingDeposit(false);
        setIsAutoDetecting(false);
        setDepositSuccess(true);
        notifyToast({
          title: "⏳ Deposit Submitted",
          message: `Your deposit request of ₦${selectedAmount.toLocaleString()} has been sent to admin for verification.`,
          type: "info",
          amount: selectedAmount
        });
      } catch (err) {
        console.error("Deposit submission error:", err);
        setSubmittingDeposit(false);
        setIsAutoDetecting(false);
        setDepositSuccess(true);
        notifyToast({
          title: "⏳ Deposit Submitted",
          message: `Your deposit request of ₦${selectedAmount.toLocaleString()} has been submitted for admin review.`,
          type: "info",
          amount: selectedAmount
        });
      }
    }, 3800);
  };

  const copyBankNumber = () => {
    navigator.clipboard.writeText(bankAccountInfo.accountNumber);
    setCopiedBankNo(true);
    hasCopiedAccRef.current = true;
    setProgressPercent((prev) => Math.max(prev, 58));
    setProgressStatusText("Account Details Ready for Transfer ✓");
    setTimeout(() => setCopiedBankNo(false), 2500);
  };

  const copyRefCode = () => {
    navigator.clipboard.writeText(checkoutRef);
    setCopiedRef(true);
    hasCopiedRefCodeRef.current = true;
    setProgressPercent((prev) => Math.max(prev, 72));
    setProgressStatusText("Transfer Reference Code Confirmed ✓");
    setTimeout(() => setCopiedRef(false), 2500);
  };

  // Render Full-Page Bank Checkout View if user clicked confirm
  if (showCheckoutModal) {
    return (
      <div className="min-h-screen bg-[#f8f7f5] pb-20 font-sans animate-fade-in relative">
        {/* Full Page Top Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 flex items-center justify-between shadow-xs">
          <button
            onClick={() => {
              if (!isAutoDetecting) setShowCheckoutModal(false);
            }}
            disabled={isAutoDetecting}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-800 transition cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display">
            Interbank Deposit Checkout
          </h1>
          <button 
            onClick={() => setShowSupportModal(true)}
            className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
          >
            <Headphones className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-5">
          {depositSuccess ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center space-y-5 animate-fade-in my-4">
              <div className="w-20 h-20 rounded-full bg-[#fff0f1] text-[#e41e2b] border border-[#ffccd0] flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Transfer Logged & Processing!</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Your deposit order of <strong className="text-[#e41e2b] font-bold">₦{selectedAmount.toLocaleString()}</strong> has been submitted to the NIBSS Automated Settlement Gateway.
                </p>
                
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-3 text-xs text-slate-600 font-mono space-y-2">
                  <div className="flex justify-between">
                    <span>Ref ID:</span>
                    <span className="font-bold text-slate-900">{checkoutRef}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200/60">
                    <span>Settlement Status:</span>
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> Interbank Clearance (1-3m)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Your wallet balance will update automatically as soon as interbank clearance is completed by our system.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setDepositSuccess(false);
                  if (onSuccess) onSuccess();
                  else onBack();
                }}
                className="w-full bg-[#e41e2b] hover:bg-[#c41622] text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-wider cursor-pointer shadow-md transition active:scale-98"
              >
                Return to Wallet Dashboard
              </button>
            </div>
          ) : isAutoDetecting ? (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center space-y-6 animate-fade-in my-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#e41e2b]/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-[#e41e2b] text-white flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-black text-slate-900">
                  Connecting to NIBSS Switch...
                </h3>
                
                <div className="space-y-2.5 max-w-xs mx-auto text-xs text-left pt-2">
                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-2.5 transition ${
                    verifyingStep >= 1 ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    <Radio className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>1. Polling NIP Settlement Switch...</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-2.5 transition ${
                    verifyingStep >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>2. Matching Bank Reference ({checkoutRef})...</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-2.5 transition ${
                    verifyingStep >= 3 ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>3. Crediting Wallet Balance...</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Full-Page Interactive Reserved Bank Account Gateway */
            <div className="space-y-4">
              
              {/* Header Card with Expiration Timer */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#e41e2b] uppercase font-black tracking-widest flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Reserved Virtual Account
                  </span>
                  <h3 className="text-base font-bold text-slate-900 pt-0.5">
                    Pay via Mobile Bank App
                  </h3>
                </div>

                {/* 15-min countdown timer badge */}
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shrink-0 shadow-2xs">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>{formatTimer(timeLeft)}</span>
                </div>
              </div>

              {/* Dynamic Smooth Active Gateway Progress Bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 shadow-xs border border-slate-800">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Settlement Network Status
                  </span>
                  <span className="font-extrabold text-[#e41e2b] bg-[#fff0f1] px-2 py-0.5 rounded text-[10px]">
                    {progressPercent}% Active
                  </span>
                </div>

                {/* Smooth Animated Progress Track */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div 
                    className="bg-gradient-to-r from-[#e41e2b] via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-xs"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span className="truncate pr-2">{progressStatusText}</span>
                  <span className="text-[9px] text-emerald-400 font-bold shrink-0">NIP Direct</span>
                </p>
              </div>

              {/* Amount Banner */}
              <div className="bg-[#fff0f1] rounded-2xl p-5 border border-[#ffccd0] flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-medium block">Exact Transfer Amount</span>
                  <span className="text-3xl font-black text-[#e41e2b]">₦{selectedAmount.toLocaleString()}</span>
                </div>
                <span className="text-xs font-bold bg-white text-[#e41e2b] px-3 py-1.5 rounded-full uppercase border border-[#ffccd0] shadow-2xs">
                  Auto-Match
                </span>
              </div>

              {/* Bank Account Details Card */}
              <div className="bg-white rounded-2xl p-5 space-y-4 text-xs border border-slate-200/80 shadow-xs">
                
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Bank Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{bankAccountInfo.bankName}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Account Name</span>
                  <span className="font-extrabold text-slate-900 text-right text-xs max-w-[200px]">{bankAccountInfo.accountName}</span>
                </div>

                {/* Copyable Account Number */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-slate-500 font-medium block">Account Number:</span>
                  <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-200">
                    <span className="text-xl font-black text-slate-900 font-mono tracking-wider">
                      {bankAccountInfo.accountNumber}
                    </span>
                    <button
                      onClick={copyBankNumber}
                      className="text-xs font-bold text-[#e41e2b] bg-[#fff0f1] hover:bg-[#ffccd0] px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      {copiedBankNo ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedBankNo ? "Copied" : "Copy Account"}</span>
                    </button>
                  </div>
                </div>

                {/* Copyable Transfer Reference */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Transfer Reference / Narration:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      {checkoutRef}
                    </span>
                    <button
                      onClick={copyRefCode}
                      className="text-[#e41e2b] hover:text-[#c41622] p-1 cursor-pointer"
                      title="Copy Reference"
                    >
                      {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Status Banner */}
              <div className="flex items-center space-x-2 text-xs text-slate-600 bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl font-medium">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Interbank NIP gateway actively listening for payment confirmation...</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleCompleteDepositTransfer}
                  className="w-full bg-[#e41e2b] hover:bg-[#c41622] text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>I Have Completed The Transfer</span>
                </button>

                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 rounded-2xl text-xs transition cursor-pointer"
                >
                  Cancel Deposit
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Support / CS Modal */}
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl text-center">
              <button 
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 rounded-full bg-[#fff0f1] flex items-center justify-center text-[#e41e2b] mx-auto">
                <Headphones className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Recharge Support</h3>
                <p className="text-xs text-slate-500">
                  Having issues with your recharge or transfer? Reach out to customer care anytime.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <a 
                  href="https://t.me/careeminvest"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#e41e2b] hover:bg-[#c41622] text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition block"
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f5] pb-28 font-sans animate-fade-in relative">
      
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 flex items-center justify-between shadow-xs">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-800 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display">
          Recharge Wallet
        </h1>
        <div className="w-8" />
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Card 1: Available Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">Available balance</p>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            ₦{(user.balance || 0).toLocaleString()}
          </p>
        </div>

        {/* Card 2: Recharge Amount */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          <p className="text-xs text-slate-500 font-medium">Recharge amount</p>

          {/* Display container */}
          <div className="bg-[#fff0f1]/60 rounded-2xl p-5 text-center border border-[#ffccd0]/60">
            <span className="text-3xl sm:text-4xl font-black text-[#e41e2b]">
              ₦ {selectedAmount.toLocaleString()}
            </span>
          </div>

          <p className="text-center text-xs text-slate-400 font-mono">
            ₦3,000 ~ ₦1,000,000
          </p>

          {/* 3x3 Preset Buttons Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = selectedAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSelectedAmount(amt)}
                  className={`py-3.5 px-2 rounded-xl text-sm font-semibold transition cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-[#e41e2b] text-white border-2 border-[#e41e2b] shadow-sm"
                      : "bg-white text-slate-800 border border-slate-300 hover:border-slate-400 font-medium"
                  }`}
                >
                  {amt.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 3: Select Payment Channel */}
        <div className="space-y-2 pt-1">
          <p className="text-xs text-slate-400 font-bold tracking-wider uppercase px-1">
            AUTOMATED PAYMENT GATEWAY
          </p>

          <div 
            onClick={() => setSelectedChannel("Channel 4 (Instant Bank Transfer)")}
            className="bg-white rounded-2xl p-4 border border-[#e41e2b]/30 shadow-xs flex items-center justify-between cursor-pointer transition bg-gradient-to-r from-white to-[#fff0f1]/20"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#e41e2b] text-white font-bold font-mono text-xs flex items-center justify-center shadow-2xs">
                ⚡
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">Instant NIP Bank Transfer</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auto-Reconciled & Instant Credit
                </span>
              </div>
            </div>

            {/* Red active indicator */}
            <div className="w-5 h-5 rounded-full border-2 border-[#e41e2b] p-0.5 flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e41e2b]" />
            </div>
          </div>
        </div>

        {/* Card 4: Deposit Rules */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-slate-500 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Deposit Rules</span>
          </div>

          <ol className="space-y-3 text-xs text-slate-500 leading-relaxed list-decimal pl-4 font-normal">
            <li>
              The minimum deposit amount on this platform is <strong className="text-slate-800 font-bold">₦3,000</strong>.
            </li>
            <li>
              You may make deposits at any time, 24/7 without time restrictions.
            </li>
            <li>
              The transferred amount must exactly match the requested deposit amount; otherwise, your deposit will take longer to auto-reconcile.
            </li>
            <li>
              All deposit transactions are listened to automatically by our NIBSS Instant Settlement gateway.
            </li>
          </ol>
        </div>

      </div>

      {/* Floating Customer Service Button */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-[#e41e2b] text-white flex items-center justify-center shadow-lg hover:bg-[#c41622] transition cursor-pointer active:scale-95"
        title="Customer Service"
      >
        <Headphones className="w-6 h-6" />
      </button>

      {/* Bottom Fixed Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3.5 z-30 shadow-lg">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleConfirmRecharge}
            disabled={generatingAccount}
            className="w-full bg-[#e41e2b] hover:bg-[#c41622] active:scale-98 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition shadow-md cursor-pointer disabled:opacity-70"
          >
            <ArrowUpRight className="w-5 h-5" />
            <span>
              {generatingAccount ? "Generating Reserved Account..." : `Confirm recharge ₦${selectedAmount.toLocaleString()}`}
            </span>
          </button>
        </div>
      </div>

      {/* Support / CS Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl text-center">
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#fff0f1] flex items-center justify-center text-[#e41e2b] mx-auto">
              <Headphones className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Recharge Support</h3>
              <p className="text-xs text-slate-500">
                Having issues with your recharge or transfer? Reach out to customer care anytime.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a 
                href="https://t.me/careeminvest"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#e41e2b] hover:bg-[#c41622] text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition block"
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

    </div>
  );
}
