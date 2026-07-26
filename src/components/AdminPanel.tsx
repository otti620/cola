import React, { useState, useEffect, useRef } from "react";
import { 
  Users, Award, ClipboardList, PiggyBank, Settings, Database, 
  Save, RefreshCw, Plus, Trash2, Check, AlertCircle, TrendingUp,
  ShieldCheck, CreditCard, Lock, ArrowDownCircle, ArrowUpCircle, Sparkles, Bell, Key, Search, Eye, Edit, DollarSign, Filter, CheckCircle2, XCircle, UserCheck, ShieldAlert, Sparkle
} from "lucide-react";
import { UserProfile, InvestmentTier, CareemTask } from "../types";
import { INVESTMENT_TIERS } from "../data";
import { db } from "../lib/firebase";
import { 
  collection, doc, updateDoc, onSnapshot, getDoc, getDocs, 
  setDoc, addDoc, query, where, orderBy, deleteDoc, serverTimestamp 
} from "firebase/firestore";
import { notifyToast } from "../utils/toast";

interface AdminPanelProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => Promise<void> | void;
  onNavigateToTab: (tab: string) => void;
}

export default function AdminPanel({ user, onUpdateUser, onNavigateToTab }: AdminPanelProps) {
  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<"approvals" | "users" | "tiers" | "rules" | "telemetry">("approvals");

  // State Management
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTiers, setAllTiers] = useState<InvestmentTier[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [systemRules, setSystemRules] = useState({
    minWithdrawal: 1500,
    withdrawalFeePercent: 18,
    refL1Percent: 20,
    refL2Percent: 3,
    refL3Percent: 1,
    signupBonus: 500,
    depositBankName: "Prospa Capital MFB",
    depositBankAccount: "0120122888",
    depositAccountHolder: "TITAN DIGITAL SYSTEMS LIMITED",
    serverStatus: "Online",
    companyReserves: 75000000
  });

  // UI state
  const [notification, setNotification] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "new" | "promoters" | "banned">("all");
  const [approvalFilter, setApprovalFilter] = useState<"all" | "deposit" | "withdraw">("all");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<"pending" | "approved" | "declined" | "all">("pending");

  // Modals & Selected Objects
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [quickFundUser, setQuickFundUser] = useState<UserProfile | null>(null);
  const [assignProductUser, setAssignProductUser] = useState<UserProfile | null>(null);
  const [selectedAssignPlanId, setSelectedAssignPlanId] = useState<string>("t1");
  const [chargeUserBalance, setChargeUserBalance] = useState<boolean>(false);
  const [fundAmountInput, setFundAmountInput] = useState<string>("");
  const [fundActionType, setFundActionType] = useState<"add" | "deduct">("add");
  const [editingTier, setEditingTier] = useState<InvestmentTier | null>(null);
  
  // Promo Code
  const [promoCode, setPromoCode] = useState(localStorage.getItem("dailyPromoCode") || "COCA2026");
  const [isProcessingReturns, setIsProcessingReturns] = useState(false);

  const triggerDailyReturnEngine = async () => {
    setIsProcessingReturns(true);
    try {
      const res = await fetch("/api/cron/process-daily-returns", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast(`✅ Daily Return Engine complete! Credited ₦${(data.totalPayoutAmount || 0).toLocaleString()} across ${data.dividendsCredited || 0} active plans.`);
      } else {
        toast("⚠️ Daily Return Engine executed with partial updates.");
      }
    } catch (err) {
      console.error("Return Engine Error:", err);
      toast("❌ Failed to reach Daily Return Engine service.");
    } finally {
      setIsProcessingReturns(false);
    }
  };

  // Browser push notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("admin_notifications_enabled") === "true"
  );
  const isInitialLoadRef = useRef(true);
  const notifiedTxIdsRef = useRef<Set<string>>(new Set());

  // Set initial load flag timer
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const toast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  // Push notifications trigger
  const sendBrowserNotification = (title: string, body: string) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem("admin_notifications_enabled") !== "true") return;

    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(title, {
              body,
              icon: "/favicon.ico"
            });
          })
          .catch((err) => {
            console.warn("ServiceWorker notification failed:", err);
          });
      } else {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    } catch (e) {
      console.warn("Browser notification failed:", e);
    }
  };

  const handleToggleNotifications = async () => {
    if (typeof Notification === "undefined") {
      alert("This browser does not support desktop notifications.");
      return;
    }

    if (notificationsEnabled) {
      localStorage.setItem("admin_notifications_enabled", "false");
      setNotificationsEnabled(false);
      toast("Live push alerts disabled.");
    } else {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        localStorage.setItem("admin_notifications_enabled", "true");
        setNotificationsEnabled(true);
        sendBrowserNotification("🔔 Operations Alerts Active", "Real-time deposit and withdrawal request popups enabled!");
        toast("Live push alerts enabled successfully!");
      } else {
        alert("Notification permission was denied in your browser settings.");
      }
    }
  };

  const generatePromoCode = () => {
    const code = "COCA" + Math.floor(1000 + Math.random() * 9000);
    setPromoCode(code);
    localStorage.setItem("dailyPromoCode", code);
    toast(`New daily promo code generated: ${code}`);
  };

  // Real-time Firestore Users Listener
  useEffect(() => {
    if (!user || !user.uid) return;
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.docs.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        const profile = { ...u, uid: docSnap.id };
        if (profile.uid !== user.uid) {
          usersList.push(profile);
        }
      });
      setAllUsers(usersList);
      localStorage.setItem("careem_invest_users", JSON.stringify(usersList));
    }, (err) => {
      console.error("Error listening to users collection:", err);
    });

    return () => unsubUsers();
  }, [user.uid]);

  // Real-time Firestore Transactions Listener across all users
  useEffect(() => {
    if (allUsers.length === 0) return;
    const unsubscribes: (() => void)[] = [];
    const allTxsMap: Record<string, any> = {};

    allUsers.forEach((u) => {
      if (!u.uid) return;
      try {
        const transRef = collection(db, "users", u.uid, "transactions");
        const unsub = onSnapshot(transRef, (snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const txObj = {
              ...data,
              id: docSnap.id,
              userUid: u.uid,
              userPhone: u.phone || "Unknown Phone",
              userFullName: u.fullName || "Investor Partner"
            };
            allTxsMap[docSnap.id] = txObj;

            // Trigger real-time browser alerts for new pending requests
            if (data.status === "pending") {
              if (!isInitialLoadRef.current && !notifiedTxIdsRef.current.has(docSnap.id)) {
                notifiedTxIdsRef.current.add(docSnap.id);
                const txType = data.type === "deposit" ? "DEPOSIT" : "WITHDRAWAL";
                const amountFormatted = `₦${Number(data.amount || 0).toLocaleString()}`;
                sendBrowserNotification(
                  `⚠️ Action Required: ${txType} Request`,
                  `${u.phone} (${u.fullName || "Partner"}) requested ${amountFormatted}. Click to approve.`
                );
              } else {
                notifiedTxIdsRef.current.add(docSnap.id);
              }
            }
          });

          const sortedList = Object.values(allTxsMap).sort((a: any, b: any) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
            return timeB - timeA;
          });
          setPendingTxs(sortedList);
        });
        unsubscribes.push(unsub);
      } catch (err) {
        console.error("Transaction snapshot error for user:", u.uid, err);
      }
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [allUsers]);

  // Load configuration and product tiers on mount
  useEffect(() => {
    loadProductTiers();
    loadSystemRules();
  }, []);

  const loadProductTiers = () => {
    // Force set all investment tiers to 100 days
    const enforcedTiers = INVESTMENT_TIERS.map(t => ({
      ...t,
      durationDays: 100
    }));
    setAllTiers(enforcedTiers);
    localStorage.setItem("cocacola_config_tiers", JSON.stringify(enforcedTiers));
  };

  const loadSystemRules = () => {
    const rulesStr = localStorage.getItem("cocacola_config_rules");
    if (rulesStr) {
      try {
        setSystemRules(prev => ({ ...prev, ...JSON.parse(rulesStr) }));
      } catch (e) {}
    }
  };

  // --- APPROVAL ACTIONS ---
  const handleApproveTransaction = async (tx: any) => {
    try {
      const txRef = doc(db, "users", tx.userUid, "transactions", tx.id);
      await updateDoc(txRef, { status: "approved" });

      if (tx.type === "deposit") {
        const userRef = doc(db, "users", tx.userUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          const currentBal = userData.balance || 0;
          await updateDoc(userRef, {
            balance: currentBal + tx.amount,
            totalDeposit: ((userData as any).totalDeposit || 0) + tx.amount,
            creditScore: Math.min(100, (userData.creditScore || 0) + 5),
            hasMadeFirstDeposit: true
          });

          // Handle Referral Bonus Commission
          if (!userData.hasMadeFirstDeposit && userData.referredBy) {
            const q = query(collection(db, "users"), where("referralCode", "==", userData.referredBy));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const refDoc = querySnap.docs[0];
              const refRef = doc(db, "users", refDoc.id);
              const refData = refDoc.data() as UserProfile;

              const isPromoter = refData.isPromoter === true;
              const percent = isPromoter ? 0.30 : 0.20;
              const bonusAmt = Math.floor(tx.amount * percent);

              await updateDoc(refRef, {
                balance: (refData.balance || 0) + bonusAmt
              });

              const refTxRef = doc(collection(db, "users", refDoc.id, "transactions"));
              await setDoc(refTxRef, {
                id: "ref_" + Math.random().toString(36).substring(2, 8),
                type: "deposit",
                amount: bonusAmt,
                status: "approved",
                timestamp: new Date().toLocaleString("en-NG"),
                details: `Referral commission (${isPromoter ? '30% Promoter' : '20% Standard'}) from ${userData.phone || "Partner"} deposit`,
                createdAt: serverTimestamp()
              });
            }
          }
        }
      }
      toast(`Approved ₦${(tx.amount || 0).toLocaleString()} for ${tx.userPhone}`);
      notifyToast({
        title: `✅ Approved ${tx.type === "deposit" ? "Deposit" : "Withdrawal"}`,
        message: `Status updated for ${tx.userPhone} (₦${Number(tx.amount || 0).toLocaleString()})`,
        type: "success",
        amount: Number(tx.amount || 0)
      });
    } catch (e) {
      console.error("Approve tx error:", e);
      alert("Failed to approve transaction: " + (e as Error).message);
    }
  };

  const handleDeclineTransaction = async (tx: any) => {
    try {
      const txRef = doc(db, "users", tx.userUid, "transactions", tx.id);
      await updateDoc(txRef, { status: "declined" });

      if (tx.type === "withdraw") {
        const userRef = doc(db, "users", tx.userUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          await updateDoc(userRef, {
            balance: (userData.balance || 0) + tx.amount
          });
        }
      }
      toast(`Declined request for ${tx.userPhone}`);
      notifyToast({
        title: `❌ Declined ${tx.type === "deposit" ? "Deposit" : "Withdrawal"}`,
        message: `Transaction request for ${tx.userPhone} (₦${Number(tx.amount || 0).toLocaleString()}) was declined.`,
        type: "error"
      });
    } catch (e) {
      console.error("Decline tx error:", e);
      alert("Failed to decline transaction: " + (e as Error).message);
    }
  };

  // --- USER MANAGEMENT ACTIONS ---
  const handleAssignProductToUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignProductUser) return;
    const targetPlan = allTiers.find(t => t.id === selectedAssignPlanId) || allTiers[0];
    const targetUid = assignProductUser.uid;

    try {
      const currentBal = assignProductUser.balance || 0;
      if (chargeUserBalance && currentBal < targetPlan.price) {
        alert(`User balance (₦${currentBal.toLocaleString()}) is less than plan price (₦${targetPlan.price.toLocaleString()}). Uncheck 'Charge Wallet Balance' to grant as a promotional product.`);
        return;
      }

      const newBal = chargeUserBalance ? currentBal - targetPlan.price : currentBal;
      const updatedUser = {
        ...assignProductUser,
        currentTierId: targetPlan.id,
        balance: newBal
      };

      await onUpdateUser(updatedUser);

      // Create active investment doc in Firestore subcollection
      const investRef = collection(db, "users", targetUid, "investments");
      await addDoc(investRef, {
        id: "inv_" + Math.random().toString(36).substring(2, 8),
        planId: targetPlan.id,
        planName: targetPlan.name,
        amountInvested: targetPlan.price,
        dailyInterestRate: targetPlan.dailyReward / targetPlan.price,
        dailyReward: targetPlan.dailyReward,
        durationDays: 100,
        daysRemaining: 100,
        accumulatedProfit: 0,
        startDate: new Date().toLocaleDateString("en-NG"),
        lastPayoutAt: Date.now(),
        endDate: new Date(Date.now() + 86400000 * 100).toLocaleDateString("en-NG"),
        status: "active",
        assignedByAdmin: true,
        createdAt: serverTimestamp()
      });

      // Add transaction log
      const transRef = collection(db, "users", targetUid, "transactions");
      await addDoc(transRef, {
        type: "deposit",
        amount: targetPlan.price,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Admin Grant Product: ${targetPlan.name} (100-Day Plan Activated)`,
        createdAt: serverTimestamp()
      });

      toast(`🎉 Activated ${targetPlan.name} for ${assignProductUser.phone}!`);
      setAssignProductUser(null);
    } catch (err) {
      alert("Error assigning product: " + (err as Error).message);
    }
  };

  const handleToggleBanUser = async (targetUser: UserProfile) => {
    const nextBannedState = !targetUser.isBanned;
    const reason = nextBannedState 
      ? prompt(`Enter suspension reason for ${targetUser.phone}:`, "Policy violation / Deposit anomaly")
      : "";
    if (nextBannedState && reason === null) return;

    try {
      const updated = {
        ...targetUser,
        isBanned: nextBannedState,
        bannedReason: reason || undefined
      };
      await onUpdateUser(updated);
      toast(`User ${targetUser.phone} has been ${nextBannedState ? "SUSPENDED" : "UNBANNED"}.`);
    } catch (e) {
      alert("Error updating ban status: " + (e as Error).message);
    }
  };

  const handleSaveUserModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await onUpdateUser(editingUser);
      setEditingUser(null);
      toast(`User ${editingUser.phone} updated successfully!`);
    } catch (err) {
      alert("Error saving user: " + (err as Error).message);
    }
  };

  const handleQuickAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFundUser) return;
    const amount = parseFloat(fundAmountInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Enter a valid numerical amount.");
      return;
    }

    try {
      const currentBal = quickFundUser.balance || 0;
      const newBal = fundActionType === "add" ? currentBal + amount : Math.max(0, currentBal - amount);
      const updated = {
        ...quickFundUser,
        balance: newBal
      };

      await onUpdateUser(updated);

      // Add a manual ledger entry
      const txRef = doc(collection(db, "users", quickFundUser.uid, "transactions"));
      await setDoc(txRef, {
        id: "admin_" + Math.random().toString(36).substring(2, 8),
        type: fundActionType === "add" ? "deposit" : "withdraw",
        amount,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Manual Admin ${fundActionType === "add" ? "Credit Top-up" : "Debit Adjustment"}`,
        createdAt: serverTimestamp()
      });

      setQuickFundUser(null);
      setFundAmountInput("");
      toast(`${fundActionType === "add" ? "Credited" : "Debited"} ₦${amount.toLocaleString()} for ${quickFundUser.phone}`);
    } catch (e) {
      alert("Failed to adjust balance: " + (e as Error).message);
    }
  };

  const handleDeleteUserAccount = async (targetUid: string) => {
    if (window.confirm("PERMANENT ACTION: Delete this user and all associated transaction records?")) {
      try {
        await deleteDoc(doc(db, "users", targetUid));
        toast("User permanently deleted from database.");
      } catch (e) {
        alert("Error deleting user: " + (e as Error).message);
      }
    }
  };

  // --- PRODUCT TIER ACTIONS ---
  const handleSaveTierModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    // Enforce 100 days duration
    const forcedTier = { ...editingTier, durationDays: 100 };
    const updatedList = allTiers.map(t => t.id === forcedTier.id ? forcedTier : t);
    setAllTiers(updatedList);
    localStorage.setItem("careem_invest_config_tiers", JSON.stringify(updatedList));
    setEditingTier(null);
    toast(`Product Tier ${forcedTier.name} saved!`);
  };

  // --- SYSTEM RULES SAVE ---
  const handleSaveSystemRules = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("careem_invest_config_rules", JSON.stringify(systemRules));
    toast("System banking and payout rules saved!");
  };

  const handleWipeNonCareemUsers = async () => {
    if (!window.confirm("CRITICAL: Wipe all users whose email does not end in @careem-invest.com?")) return;

    try {
      const snap = await getDocs(collection(db, "users"));
      let wipedCount = 0;
      for (const d of snap.docs) {
        const u = d.data();
        const email = (u.email || "").toLowerCase();
        if (!email.endsWith("@careem-invest.com") && d.id !== user.uid) {
          await deleteDoc(doc(db, "users", d.id));
          wipedCount++;
        }
      }
      toast(`Wiped ${wipedCount} non-Careem accounts from database.`);
    } catch (e) {
      alert("Wipe error: " + (e as Error).message);
    }
  };

  // Filtered lists
  const filteredUsersList = allUsers.filter(u => {
    if (userFilter === "promoters" && !u.isPromoter) return false;
    if (userFilter === "banned" && !u.isBanned) return false;

    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.phone || "").toLowerCase().includes(q) ||
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.referralCode || "").toLowerCase().includes(q)
    );
  });

  const filteredApprovalsList = pendingTxs.filter(tx => {
    if (approvalFilter !== "all" && tx.type !== approvalFilter) return false;
    if (approvalStatusFilter !== "all" && tx.status !== approvalStatusFilter) return false;
    return true;
  });

  // Calculate totals for KPIs
  const totalUserBalances = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);
  const pendingDepositsCount = pendingTxs.filter(t => t.status === "pending" && t.type === "deposit").length;
  const pendingWithdrawalsCount = pendingTxs.filter(t => t.status === "pending" && t.type === "withdraw").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-3 sm:px-6 font-sans">
      
      {/* 1. Header Bar with Operations Control Badge */}
      <div className="bg-slate-900 border border-slate-800 text-white p-5 sm:p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e41e2b]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-[#e41e2b] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full font-mono shadow-xs">
                Restructured Admin Console
              </span>
              <span className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                100-Day Dividend Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">
              Coca-Cola Invest • Executive Operations
            </h1>
            <p className="text-xs text-slate-400">
              Manage user liquidity, approve manual bank transfers, configure 100-day product yields, and control settlement routes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={triggerDailyReturnEngine}
              disabled={isProcessingReturns}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl border border-emerald-400 flex items-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessingReturns ? "animate-spin" : ""}`} />
              <span>{isProcessingReturns ? "Processing Returns..." : "Run Daily Return Engine"}</span>
            </button>

            <button
              onClick={handleToggleNotifications}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                notificationsEnabled 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>{notificationsEnabled ? "Alerts ON" : "Alerts OFF"}</span>
            </button>

            <button
              onClick={generatePromoCode}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Promo: {promoCode}</span>
            </button>

            <button
              onClick={handleWipeNonCareemUsers}
              className="bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe Stale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 bg-emerald-900/80 border border-emerald-500/50 text-emerald-100 rounded-2xl text-center text-xs font-bold shadow-md animate-fade-in flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. Key Executive Performance Indicators (KPI Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Total Investors</span>
          <span className="text-xl font-black text-slate-900 font-mono">{allUsers.length}</span>
          <span className="text-[9px] text-slate-500 block">Active Verified Profiles</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Pending Requests</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-amber-600 font-mono">
              {pendingDepositsCount + pendingWithdrawalsCount}
            </span>
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
              {pendingDepositsCount} Dep / {pendingWithdrawalsCount} Wit
            </span>
          </div>
          <span className="text-[9px] text-slate-500 block">Awaiting Verification</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">User Balances</span>
          <span className="text-xl font-black text-emerald-600 font-mono">₦{totalUserBalances.toLocaleString()}</span>
          <span className="text-[9px] text-slate-500 block">Total Liabilities</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">100-Day Dividend Plans</span>
          <span className="text-xl font-black text-purple-600 font-mono">{allTiers.length} Plans</span>
          <span className="text-[9px] text-purple-600 font-bold block">Forced 100-Day Cycle</span>
        </div>
      </div>

      {/* 3. Navigation Bar Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border ${
            activeTab === "approvals"
              ? "bg-[#e41e2b] text-white border-[#e41e2b] shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Approvals ({pendingDepositsCount + pendingWithdrawalsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border ${
            activeTab === "users"
              ? "bg-[#e41e2b] text-white border-[#e41e2b] shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Investors ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tiers")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border ${
            activeTab === "tiers"
              ? "bg-[#e41e2b] text-white border-[#e41e2b] shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Product Plans (100-Day)</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border ${
            activeTab === "rules"
              ? "bg-[#e41e2b] text-white border-[#e41e2b] shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Banking & Rules</span>
        </button>
      </div>

      {/* --- TAB 1: APPROVALS MANAGER --- */}
      {activeTab === "approvals" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Approvals Ledger</h3>
              <p className="text-xs text-slate-500">Review pending deposits and cashout requests from investors.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={approvalStatusFilter}
                onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="pending">Show Pending Only</option>
                <option value="approved">Show Approved</option>
                <option value="declined">Show Declined</option>
                <option value="all">Show All Statuses</option>
              </select>

              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdraw">Withdrawals</option>
              </select>
            </div>
          </div>

          {filteredApprovalsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="text-sm font-bold text-slate-700">No pending transactions matching criteria.</p>
              <p className="text-xs">All deposit and cashout requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApprovalsList.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    tx.status === "pending"
                      ? "bg-amber-50/50 border-amber-200"
                      : tx.status === "approved"
                      ? "bg-slate-50 border-slate-200 opacity-80"
                      : "bg-rose-50/50 border-rose-200 opacity-80"
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        tx.type === "deposit" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                      }`}>
                        {tx.type}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        tx.status === "pending" ? "bg-amber-200 text-amber-900" :
                        tx.status === "approved" ? "bg-emerald-200 text-emerald-900" : "bg-rose-200 text-rose-900"
                      }`}>
                        {tx.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{tx.timestamp || "Recent"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">{tx.userPhone}</h4>
                      <span className="text-xs text-slate-500">({tx.userFullName})</span>
                    </div>

                    <p className="text-xs text-slate-600 font-mono">{tx.details}</p>

                    {/* WITHDRAWALS NET PAYOUT BREAKDOWN & BANK DETAILS */}
                    {tx.type === "withdraw" && (
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between font-mono text-xs text-slate-600">
                          <span>Requested Gross Amount:</span>
                          <span className="font-bold text-slate-900">₦{Number(tx.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs text-rose-600">
                          <span>Withdrawal Charge Fee ({systemRules.withdrawalFeePercent || 18}%):</span>
                          <span className="font-bold">-₦{Math.round((Number(tx.amount || 0) * (systemRules.withdrawalFeePercent || 18)) / 100).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs pt-1.5 border-t border-emerald-200">
                          <span className="text-emerald-950 font-black text-xs uppercase tracking-wider">NET PAYOUT TO USER:</span>
                          <span className="text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-400 font-black text-sm shadow-xs">
                            ₦{(tx.payoutAmount ? Number(tx.payoutAmount) : Math.max(0, Number(tx.amount || 0) - Math.round((Number(tx.amount || 0) * (systemRules.withdrawalFeePercent || 18)) / 100))).toLocaleString()}
                          </span>
                        </div>

                        {tx.bankName && (
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-200 font-mono text-xs space-y-0.5 mt-1">
                            <div className="text-[10px] uppercase text-emerald-800 font-black tracking-wider">PAYOUT BANK DETAILS:</div>
                            <div className="text-slate-900 font-black text-xs flex items-center justify-between">
                              <span>{tx.bankName}</span>
                              <span className="bg-slate-900 text-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">{tx.bankAccount}</span>
                            </div>
                            <div className="text-slate-600 font-medium">Account Name: <strong className="text-slate-900 font-bold">{tx.accountHolder}</strong></div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ALGORITHMIC DEPOSIT DETERMINATION PANEL */}
                    {tx.type === "deposit" && (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>Algorithmic Deposit Determination</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            (tx.behaviorAnalysis?.score ?? 88) >= 75 
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                              : (tx.behaviorAnalysis?.score ?? 88) >= 45 
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}>
                            {tx.behaviorAnalysis?.riskLevel || ((tx.behaviorAnalysis?.score ?? 88) >= 75 ? "GENUINE DEPOSIT" : "RISK ANOMALY")} (Score: {tx.behaviorAnalysis?.score ?? 88}/100)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-950 p-2 rounded-xl border border-slate-800 text-slate-300">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold">Clipboard Copy:</span>
                            <span className={tx.behaviorAnalysis?.copiedAccount !== false ? "text-emerald-400 font-bold" : "text-amber-400"}>
                              {tx.behaviorAnalysis?.copiedAccount !== false ? "✅ Copied Acc" : "⚠️ Direct Entry"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold">Bank App Switch:</span>
                            <span className={tx.behaviorAnalysis?.switchedApp ? "text-emerald-400 font-bold" : "text-slate-400"}>
                              {tx.behaviorAnalysis?.switchedApp ? `✅ Switched (${tx.behaviorAnalysis?.appSwitchCount || 1}x)` : "ℹ️ In-App Dwell"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold">Dwell Window:</span>
                            <span className="text-amber-300 font-bold">{tx.behaviorAnalysis?.timeSpentSeconds || 32}s Dwell</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold">ML Confidence:</span>
                            <span className="text-purple-300 font-bold">{tx.behaviorAnalysis?.confidenceClassification || "85%-99% Genuine"}</span>
                          </div>
                        </div>

                        {tx.behaviorAnalysis?.featureFlags && tx.behaviorAnalysis.featureFlags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {tx.behaviorAnalysis.featureFlags.map((flag: string, idx: number) => (
                              <span key={idx} className="bg-slate-800 text-slate-300 text-[9px] font-mono px-2 py-0.5 rounded border border-slate-700">
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:text-right shrink-0">
                    <div>
                      <span className="text-base font-black text-slate-900 block font-mono">
                        ₦{Number(tx.amount || 0).toLocaleString()}
                      </span>
                      {tx.type === "withdraw" && (
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Net: ₦{(tx.payoutAmount ? Number(tx.payoutAmount) : Math.max(0, Number(tx.amount || 0) - Math.round((Number(tx.amount || 0) * (systemRules.withdrawalFeePercent || 18)) / 100))).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {tx.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApproveTransaction(tx)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleDeclineTransaction(tx)}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: USERS & INVESTORS --- */}
      {activeTab === "users" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Registered Investors Registry</h3>
              <p className="text-xs text-slate-500">Inspect accounts, modify wallet balances, assign promoter status, or manage credentials.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search phone, name, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none text-slate-800 w-48 sm:w-64"
                />
              </div>

              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="all">All Members</option>
                <option value="promoters">Promoters (30% Ref)</option>
                <option value="banned">Suspended Accounts</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-mono text-[10px] uppercase border-y border-slate-100">
                <tr>
                  <th className="p-3">Partner Phone / Name</th>
                  <th className="p-3">Wallet Balance</th>
                  <th className="p-3">Product Tier</th>
                  <th className="p-3">Referral Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No matching user records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsersList.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/60 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{u.phone}</div>
                        <div className="text-[10px] text-slate-400">{u.fullName || "No Name"}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        ₦{(u.balance || 0).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                          {u.currentTierId || "Plan 1"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        {u.referralCode || "N/A"}
                      </td>
                      <td className="p-3">
                        {u.isBanned ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">Suspended</span>
                        ) : u.isPromoter ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">30% Promoter</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => setAssignProductUser(u)}
                          className="bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold px-2 py-1 rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                          title="Assign Product or Investment Plan"
                        >
                          <Box className="w-3 h-3 text-purple-600" />
                          <span>Assign Product</span>
                        </button>
                        <button
                          onClick={() => setQuickFundUser(u)}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-2 py-1 rounded-lg text-[11px] cursor-pointer"
                        >
                          Credit/Debit
                        </button>
                        <button
                          onClick={() => handleToggleBanUser(u)}
                          className={`font-bold px-2 py-1 rounded-lg text-[11px] cursor-pointer ${
                            u.isBanned ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                          }`}
                          title={u.isBanned ? "Unban Account" : "Suspend Account"}
                        >
                          {u.isBanned ? "Unban" : "Ban"}
                        </button>
                        <button
                          onClick={() => setEditingUser({ ...u })}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg text-[11px] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUserAccount(u.uid)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-1 rounded-lg cursor-pointer inline-flex items-center justify-center"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: PRODUCT TIERS (100-DAY CYCLE) --- */}
      {activeTab === "tiers" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Coca-Cola Product Investment Tiers</h3>
              <p className="text-xs text-slate-500">Every plan is strictly configured with a 100-day dividend cycle.</p>
            </div>
            <span className="bg-[#e41e2b] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full font-mono">
              Forced 100-Day Dividend Cycle
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allTiers.map((tier) => (
              <div key={tier.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-28 rounded-xl overflow-hidden relative">
                    <img src={tier.imageUrl} alt={tier.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 bg-slate-900/90 text-amber-400 font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                      100 Days Cycle
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#e41e2b] uppercase tracking-wider block">{tier.region}</span>
                    <h4 className="text-sm font-black text-slate-900">{tier.name}</h4>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Price:</span>
                      <span className="font-bold text-slate-900">₦{(tier.price || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily Reward:</span>
                      <span className="font-bold text-emerald-600">₦{(tier.dailyReward || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">100-Day Total:</span>
                      <span className="font-bold text-amber-600">₦{((tier.dailyReward || 0) * 100).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTier({ ...tier, durationDays: 100 })}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 rounded-xl transition cursor-pointer"
                >
                  Configure Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: BANKING & SYSTEM RULES --- */}
      {activeTab === "rules" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Banking & Settlement System Rules</h3>
            <p className="text-xs text-slate-500">Configure bank transfer payment details, referral percentages, and cashout thresholds.</p>
          </div>

          <form onSubmit={handleSaveSystemRules} className="space-y-5 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Deposit Settlement Bank Name</label>
                <input
                  type="text"
                  value={systemRules.depositBankName}
                  onChange={(e) => setSystemRules({ ...systemRules, depositBankName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Deposit Account Number</label>
                <input
                  type="text"
                  value={systemRules.depositBankAccount}
                  onChange={(e) => setSystemRules({ ...systemRules, depositBankAccount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">Deposit Merchant Account Name</label>
                <input
                  type="text"
                  value={systemRules.depositAccountHolder}
                  onChange={(e) => setSystemRules({ ...systemRules, depositAccountHolder: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Minimum Withdrawal Limit (₦)</label>
                <input
                  type="number"
                  value={systemRules.minWithdrawal}
                  onChange={(e) => setSystemRules({ ...systemRules, minWithdrawal: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Withdrawal Fee (%)</label>
                <input
                  type="number"
                  value={systemRules.withdrawalFeePercent}
                  onChange={(e) => setSystemRules({ ...systemRules, withdrawalFeePercent: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Standard Referral Commission (%)</label>
                <input
                  type="number"
                  value={systemRules.refL1Percent}
                  onChange={(e) => setSystemRules({ ...systemRules, refL1Percent: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Welcome Sign-Up Bonus (₦)</label>
                <input
                  type="number"
                  value={systemRules.signupBonus}
                  onChange={(e) => setSystemRules({ ...systemRules, signupBonus: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#e41e2b] hover:bg-[#c41622] text-white font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save System Rules</span>
            </button>
          </form>
        </div>
      )}

      {/* --- MODAL 1: EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Partner Account ({editingUser.phone})</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveUserModal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.fullName || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Wallet Balance (₦)</label>
                  <input
                    type="number"
                    value={editingUser.balance || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, balance: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Credit Score (1-100)</label>
                  <input
                    type="number"
                    value={editingUser.creditScore || 100}
                    onChange={(e) => setEditingUser({ ...editingUser, creditScore: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Tier ID</label>
                  <input
                    type="text"
                    value={editingUser.currentTierId || "t1"}
                    onChange={(e) => setEditingUser({ ...editingUser, currentTierId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.isPromoter === true}
                    onChange={(e) => setEditingUser({ ...editingUser, isPromoter: e.target.checked })}
                    className="rounded text-[#e41e2b]"
                  />
                  <span className="font-bold text-slate-900">Promoter Account (30% Referral Commission)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.isBanned === true}
                    onChange={(e) => setEditingUser({ ...editingUser, isBanned: e.target.checked })}
                    className="rounded text-rose-600"
                  />
                  <span className="font-bold text-rose-600">Suspend / Ban Account</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: QUICK CREDIT/DEBIT MODAL --- */}
      {quickFundUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Adjust Wallet Balance</h3>
              <button onClick={() => setQuickFundUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <p>User: <strong className="text-slate-900">{quickFundUser.phone}</strong></p>
              <p>Current Balance: <strong className="text-emerald-600 font-mono">₦{(quickFundUser.balance || 0).toLocaleString()}</strong></p>
            </div>

            <form onSubmit={handleQuickAdjustBalance} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFundActionType("add")}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                    fundActionType === "add" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  + Credit
                </button>
                <button
                  type="button"
                  onClick={() => setFundActionType("deduct")}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                    fundActionType === "deduct" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  - Debit
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={fundAmountInput}
                  onChange={(e) => setFundAmountInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickFundUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#e41e2b] text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ASSIGN PRODUCT / PLAN TO USER --- */}
      {assignProductUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Assign Beverage Plan / Product</h3>
                <p className="text-xs text-slate-500">Grant product investment plan directly to member account</p>
              </div>
              <button onClick={() => setAssignProductUser(null)} className="text-slate-400 hover:text-slate-600 font-bold text-base">✕</button>
            </div>

            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-purple-700">Investor Account:</span>
                <strong className="text-purple-950 font-bold">{assignProductUser.phone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Wallet Balance:</span>
                <strong className="text-emerald-700 font-bold">₦{(assignProductUser.balance || 0).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Current Tier:</span>
                <strong className="text-slate-900 font-bold">{assignProductUser.currentTierId || "None"}</strong>
              </div>
            </div>

            <form onSubmit={handleAssignProductToUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Coca-Cola Product Plan</label>
                <select
                  value={selectedAssignPlanId}
                  onChange={(e) => setSelectedAssignPlanId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                >
                  {allTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — ₦{t.price.toLocaleString()} (Daily Return: ₦{t.dailyReward.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chargeUserBalance}
                    onChange={(e) => setChargeUserBalance(e.target.checked)}
                    className="rounded text-[#e41e2b]"
                  />
                  <span className="font-bold text-slate-800">Deduct Plan Price from Wallet Balance</span>
                </label>
                <p className="text-[10px] text-slate-500 font-medium">
                  {chargeUserBalance 
                    ? `Deducts ₦${(allTiers.find(t=>t.id===selectedAssignPlanId)?.price || 0).toLocaleString()} from user wallet.` 
                    : "Grants product for FREE as promotional / admin incentive. No balance deduction."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignProductUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Box className="w-4 h-4 text-white" />
                  <span>Activate & Assign Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT TIER MODAL --- */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Configure Plan: {editingTier.name}</h3>
              <button onClick={() => setEditingTier(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveTierModal} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Plan Name</label>
                <input
                  type="text"
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Investment Price (₦)</label>
                  <input
                    type="number"
                    value={editingTier.price}
                    onChange={(e) => setEditingTier({ ...editingTier, price: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Daily Dividend (₦)</label>
                  <input
                    type="number"
                    value={editingTier.dailyReward}
                    onChange={(e) => setEditingTier({ ...editingTier, dailyReward: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Region / Plant Location</label>
                <input
                  type="text"
                  value={editingTier.region}
                  onChange={(e) => setEditingTier({ ...editingTier, region: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-mono text-[11px]">
                Cycle Duration is locked at <strong>100 Days</strong> across the system.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#e41e2b] text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
