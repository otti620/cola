import React, { useState, useEffect, useRef } from "react";
import { 
  Users, Award, ClipboardList, PiggyBank, Settings, Database, 
  Save, RefreshCw, Plus, Trash2, Check, AlertCircle, TrendingUp,
  ShieldCheck, CreditCard, Lock, ArrowDownCircle, ArrowUpCircle, Sparkles, Bell, Key, Search, Eye, Edit, DollarSign, Filter, CheckCircle2, XCircle, UserCheck, ShieldAlert, Sparkle, Box, Package, Zap, Copy
} from "lucide-react";
import { UserProfile, InvestmentTier, CareemTask } from "../types";
import { INVESTMENT_TIERS } from "../data";
import { db } from "../lib/firebase";
import { 
  collection, collectionGroup, limit, doc, updateDoc, onSnapshot, getDoc, getDocs, 
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
  const [activeTab, setActiveTab] = useState<"approvals" | "users" | "products" | "tiers" | "rules" | "telemetry">("approvals");

  // State Management
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTiers, setAllTiers] = useState<InvestmentTier[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);

  // Product Management tab state
  const [pmTargetUserUid, setPmTargetUserUid] = useState<string>("");
  const [pmSelectedPlanId, setPmSelectedPlanId] = useState<string>("t1");
  const [pmIsCustomProduct, setPmIsCustomProduct] = useState<boolean>(false);
  const [pmCustomProductId, setPmCustomProductId] = useState<string>("");
  const [pmCustomProductName, setPmCustomProductName] = useState<string>("");
  const [pmCustomPrice, setPmCustomPrice] = useState<number>(10000);
  const [pmCustomDailyReward, setPmCustomDailyReward] = useState<number>(3500);
  const [pmCustomCycleDays, setPmCustomCycleDays] = useState<number>(100);
  const [pmChargeBalance, setPmChargeBalance] = useState<boolean>(false);
  const [pmSearchQuery, setPmSearchQuery] = useState<string>("");
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
    companyReserves: 75000000,
    signupsEnabled: true,
    loginsEnabled: true,
    withdrawalsEnabled: true,
    depositsEnabled: true
  });

  // UI state
  const [notification, setNotification] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "new" | "promoters" | "banned">("all");
  const [approvalFilter, setApprovalFilter] = useState<"all" | "deposit" | "withdraw">("all");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<"pending" | "approved" | "declined" | "all">("pending");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(`${label}-${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
    notifyToast({
      title: "📋 Copied to Clipboard",
      message: `${label}: ${text}`,
      type: "success"
    });
  };

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

  // On mount, load initial users & txs from localStorage for instant offline/cached display
  useEffect(() => {
    const cachedUsers = localStorage.getItem("careem_invest_users");
    if (cachedUsers) {
      try {
        setAllUsers(JSON.parse(cachedUsers));
      } catch (e) {}
    }
    const cachedTxs = localStorage.getItem("careem_invest_all_txs");
    if (cachedTxs) {
      try {
        setPendingTxs(JSON.parse(cachedTxs));
      } catch (e) {}
    }
  }, []);

  // Real-time Firestore Users Listener
  useEffect(() => {
    if (!user || !user.uid) return;
    let unsubUsers: (() => void) | null = null;
    try {
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
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
        console.warn("Firestore users listener notice (using cached users):", err?.message || err);
      });
    } catch (e) {
      console.warn("Error setting up users listener:", e);
    }

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, [user.uid]);

  // Real-time Firestore Transactions Listener using collectionGroup with user subcollection fallback sync
  useEffect(() => {
    if (!user || !user.uid) return;

    let unsubTxs: (() => void) | null = null;
    let isCancelled = false;

    const processSnapshotDocs = (docs: any[]) => {
      const txList: any[] = [];
      const seenIds = new Set<string>();

      docs.forEach((docSnap) => {
        const data = docSnap.data ? docSnap.data() : docSnap;
        const docId = docSnap.id || data.id;
        if (!docId || seenIds.has(docId)) return;
        seenIds.add(docId);

        const parentUid = docSnap.ref?.parent?.parent?.id || data.userUid || data.userId;
        const matchingUser = (allUsers || []).find(u => u && (u.uid === parentUid || u.phone === data.userPhone || u.uid === data.userUid));

        const txObj = {
          ...data,
          id: docId,
          userUid: parentUid || data.userUid || matchingUser?.uid || "",
          userPhone: data.userPhone || matchingUser?.phone || "Unknown Phone",
          userFullName: data.userFullName || matchingUser?.fullName || "Investor Partner"
        };
        txList.push(txObj);

        if (data.status === "pending") {
          if (!isInitialLoadRef.current && !notifiedTxIdsRef.current.has(docId)) {
            notifiedTxIdsRef.current.add(docId);
            const txType = (data.type === "deposit") ? "DEPOSIT" : "WITHDRAWAL";
            const amountFormatted = `₦${Number(data.amount || 0).toLocaleString()}`;
            sendBrowserNotification(
              `⚠️ Action Required: ${txType} Request`,
              `${txObj.userPhone} (${txObj.userFullName}) requested ${amountFormatted}. Click to approve.`
            );
          } else {
            notifiedTxIdsRef.current.add(docId);
          }
        }
      });

      // Client-side sort by newest
      const sorted = txList.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      if (!isCancelled) {
        setPendingTxs(sorted);
        localStorage.setItem("careem_invest_all_txs", JSON.stringify(sorted));
      }
    };

    try {
      const q = query(collectionGroup(db, "transactions"), limit(250));
      unsubTxs = onSnapshot(q, (snap) => {
        processSnapshotDocs(snap.docs);
      }, async (err) => {
        console.warn("Transactions collectionGroup snapshot notice, scanning user subcollections...", err?.message || err);
        // Fallback: Scan allUsers subcollections directly for pending transactions
        if (allUsers && allUsers.length > 0) {
          try {
            const fallbackTxs: any[] = [];
            for (const u of allUsers) {
              if (!u.uid) continue;
              const userTxCol = collection(db, "users", u.uid, "transactions");
              const uSnap = await getDocs(userTxCol);
              uSnap.docs.forEach(d => fallbackTxs.push(d));
            }
            processSnapshotDocs(fallbackTxs);
          } catch (e) {
            console.warn("Fallback tx scan error:", e);
          }
        }
      });
    } catch (err) {
      console.warn("Transactions query subscription error:", err);
    }

    return () => {
      isCancelled = true;
      if (unsubTxs) unsubTxs();
    };
  }, [user.uid, allUsers.length]);

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
    const rulesStr = localStorage.getItem("careem_invest_config_rules") || localStorage.getItem("cocacola_config_rules");
    if (rulesStr) {
      try {
        setSystemRules(prev => ({ ...prev, ...JSON.parse(rulesStr) }));
      } catch (e) {}
    }
    try {
      onSnapshot(doc(db, "system", "rules"), (snap) => {
        if (snap.exists()) {
          setSystemRules(prev => ({ ...prev, ...snap.data() }));
        }
      }, (err) => {
        console.warn("System rules snapshot notice:", err?.message || err);
      });
    } catch (e) {
      console.warn("Error setting up system rules listener:", e);
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

      if (tx.type === "withdraw" || tx.type === "withdrawal") {
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

  const handlePmAssignProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmTargetUserUid) {
      alert("Please select a target investor user first.");
      return;
    }

    const targetUser = allUsers.find(u => u.uid === pmTargetUserUid);
    if (!targetUser) {
      alert("Selected user profile not found.");
      return;
    }

    let planId = pmSelectedPlanId;
    let planName = "";
    let planPrice = 0;
    let planDailyReward = 0;
    let cycleDays = pmCustomCycleDays || 100;

    if (pmIsCustomProduct) {
      if (!pmCustomProductId || !pmCustomProductName) {
        alert("Please specify custom Product ID and Product Name.");
        return;
      }
      planId = pmCustomProductId.trim();
      planName = pmCustomProductName.trim();
      planPrice = Number(pmCustomPrice) || 0;
      planDailyReward = Number(pmCustomDailyReward) || 0;
    } else {
      const matched = allTiers.find(t => t.id === pmSelectedPlanId) || allTiers[0];
      planId = matched.id;
      planName = matched.name;
      planPrice = matched.price;
      planDailyReward = matched.dailyReward;
    }

    const currentBal = targetUser.balance || 0;
    if (pmChargeBalance && currentBal < planPrice) {
      alert(`User balance (₦${currentBal.toLocaleString()}) is less than plan price (₦${planPrice.toLocaleString()}). Uncheck 'Charge Investor Balance' to assign as a promotional product.`);
      return;
    }

    try {
      const newBal = pmChargeBalance ? currentBal - planPrice : currentBal;
      const updatedUser = {
        ...targetUser,
        currentTierId: planId,
        balance: newBal
      };

      await onUpdateUser(updatedUser);

      // Create active investment doc in Firestore subcollection
      const investRef = collection(db, "users", targetUser.uid, "investments");
      await addDoc(investRef, {
        id: "inv_" + Math.random().toString(36).substring(2, 8),
        planId: planId,
        planName: planName,
        amountInvested: planPrice,
        dailyInterestRate: planPrice > 0 ? planDailyReward / planPrice : 0.35,
        dailyReward: planDailyReward,
        durationDays: cycleDays,
        daysRemaining: cycleDays,
        accumulatedProfit: 0,
        startDate: new Date().toLocaleDateString("en-NG"),
        lastPayoutAt: Date.now(),
        endDate: new Date(Date.now() + 86400000 * cycleDays).toLocaleDateString("en-NG"),
        status: "active",
        assignedByAdmin: true,
        createdAt: serverTimestamp()
      });

      // Add transaction log
      const transRef = collection(db, "users", targetUser.uid, "transactions");
      await addDoc(transRef, {
        type: "deposit",
        amount: planPrice,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Admin Assigned Product: ${planName} (${cycleDays}-Day Plan Activated)`,
        createdAt: serverTimestamp()
      });

      toast(`🎉 Assigned ${planName} to ${targetUser.phone} with immediate effect!`);
      setAllUsers(prev => prev.map(u => u.uid === targetUser.uid ? updatedUser : u));
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
  const handleSaveSystemRules = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("careem_invest_config_rules", JSON.stringify(systemRules));
    localStorage.setItem("cocacola_config_rules", JSON.stringify(systemRules));
    try {
      await setDoc(doc(db, "system", "rules"), systemRules, { merge: true });
    } catch (e) {
      console.warn("Firestore sync system rules notice:", e);
    }
    toast("System operational rules and access toggles saved & broadcasted!");
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
  const filteredUsersList = (allUsers || []).filter(u => {
    if (!u) return false;
    if (userFilter === "promoters" && !u.isPromoter) return false;
    if (userFilter === "banned" && !u.isBanned) return false;

    const q = (userSearch || "").toLowerCase().trim();
    if (!q) return true;
    return (
      String(u.phone || "").toLowerCase().includes(q) ||
      String(u.fullName || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q) ||
      String(u.referralCode || "").toLowerCase().includes(q)
    );
  });

  const filteredApprovalsList = (pendingTxs || []).filter(tx => {
    if (!tx) return false;
    const txTypeNormalized = (tx.type === "withdrawal") ? "withdraw" : tx.type;
    if (approvalFilter !== "all" && txTypeNormalized !== approvalFilter) return false;
    if (approvalStatusFilter !== "all" && tx.status !== approvalStatusFilter) return false;
    return true;
  });

  // Calculate totals for KPIs
  const totalUserBalances = (allUsers || []).reduce((acc, u) => acc + (u?.balance || 0), 0);
  const pendingDepositsCount = (pendingTxs || []).filter(t => t && t.status === "pending" && t.type === "deposit").length;
  const pendingWithdrawalsCount = (pendingTxs || []).filter(t => t && t.status === "pending" && (t.type === "withdraw" || t.type === "withdrawal")).length;

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
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border ${
            activeTab === "products"
              ? "bg-[#e41e2b] text-white border-[#e41e2b] shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Product Management</span>
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
              {filteredApprovalsList.map((tx) => {
                const isWithdrawal = tx.type === "withdraw" || tx.type === "withdrawal";
                const userDoc = (allUsers || []).find(u => u && (u.uid === tx.userId || u.phone === tx.userPhone));
                const bName = tx.bankName || userDoc?.bankName || (tx.details?.match(/to ([^(]+)/)?.[1]?.trim()) || "Bank Account";
                const bAcc = tx.bankAccount || userDoc?.bankAccount || (tx.details?.match(/\((\d+)\)/)?.[1]) || "";
                const bHolder = tx.accountHolder || userDoc?.fullName || tx.userFullName || "Account Holder";

                const grossAmt = Number(tx.amount || 0);
                const feePct = systemRules.withdrawalFeePercent || 18;
                const feeVal = tx.fee ? Number(tx.fee) : Math.round((grossAmt * feePct) / 100);
                const netPayoutVal = tx.payoutAmount ? Number(tx.payoutAmount) : (tx.netPayout ? Number(tx.netPayout) : Math.max(0, grossAmt - feeVal));

                return (
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

                      {/* WITHDRAWALS NET PAYOUT BREAKDOWN & BANK DETAILS WITH COPY BUTTONS */}
                      {isWithdrawal && (
                        <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-3.5 space-y-2 mt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-emerald-200">
                            <div>
                              <span className="text-[10px] uppercase font-black text-emerald-900 tracking-wider block">EXACT NET PAYOUT TO TRANSFER:</span>
                              <span className="text-xl font-black text-emerald-800 font-mono">
                                ₦{netPayoutVal.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono block">
                                (Gross Requested: ₦{grossAmt.toLocaleString()} — 18% Fee Charged: -₦{feeVal.toLocaleString()})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(String(netPayoutVal), "Net Payout Amount")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedKey === `Net Payout Amount-${netPayoutVal}` ? "Copied Net!" : "Copy Net Amount"}</span>
                            </button>
                          </div>

                          {/* Bank Account Details Card with Copy Buttons */}
                          <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-800 tracking-wider">
                              <span>Payout Destination Bank:</span>
                              <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">{bName}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Number:</span>
                                <span className="text-base font-black font-mono text-slate-900">{bAcc || "Not Specified"}</span>
                              </div>
                              {bAcc ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(bAcc, "Account Number")}
                                  className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{copiedKey === `Account Number-${bAcc}` ? "Copied Acc!" : "Copy Account Number"}</span>
                                </button>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Holder Name:</span>
                                <span className="text-xs font-bold text-slate-900">{bHolder}</span>
                              </div>
                              {bHolder ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(bHolder, "Account Holder Name")}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0"
                                >
                                  <Copy className="w-3 h-3 text-slate-600" />
                                  <span>{copiedKey === `Account Holder Name-${bHolder}` ? "Copied Name!" : "Copy Name"}</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
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
                        {isWithdrawal ? (
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-600 block uppercase tracking-wider">NET PAYOUT ONLY</span>
                            <span className="text-base font-black text-emerald-800 block font-mono bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                              ₦{netPayoutVal.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Gross: ₦{grossAmt.toLocaleString()} (-18%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-black text-slate-900 block font-mono">
                            ₦{grossAmt.toLocaleString()}
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
                );
              })}
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
            {/* --- SYSTEM OPERATIONAL TOGGLES (Emergency / Maintenance Controls) --- */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>System Operational & Gateway Access Controls</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Toggle signups, logins, withdrawals, or deposits system-wide with instant effect.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Signups Toggle */}
                <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
                  systemRules.signupsEnabled !== false ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                }`}>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">User Signups</span>
                    <span className="text-[10px] text-slate-500 block">
                      {systemRules.signupsEnabled !== false ? "Registration open" : "Signups blocked"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemRules(prev => ({ ...prev, signupsEnabled: prev.signupsEnabled === false ? true : false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      systemRules.signupsEnabled !== false 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                        : "bg-rose-600 text-white hover:bg-rose-700"
                    }`}
                  >
                    {systemRules.signupsEnabled !== false ? "ENABLED" : "OFF / DISABLED"}
                  </button>
                </div>

                {/* 2. Logins Toggle */}
                <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
                  systemRules.loginsEnabled !== false ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                }`}>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">User Logins</span>
                    <span className="text-[10px] text-slate-500 block">
                      {systemRules.loginsEnabled !== false ? "Logins active" : "Logins paused (Admin exempt)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemRules(prev => ({ ...prev, loginsEnabled: prev.loginsEnabled === false ? true : false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      systemRules.loginsEnabled !== false 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                        : "bg-rose-600 text-white hover:bg-rose-700"
                    }`}
                  >
                    {systemRules.loginsEnabled !== false ? "ENABLED" : "OFF / DISABLED"}
                  </button>
                </div>

                {/* 3. Withdrawals Toggle */}
                <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
                  systemRules.withdrawalsEnabled !== false ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                }`}>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Cash Withdrawals</span>
                    <span className="text-[10px] text-slate-500 block">
                      {systemRules.withdrawalsEnabled !== false ? "Cashouts open" : "Withdrawals paused"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemRules(prev => ({ ...prev, withdrawalsEnabled: prev.withdrawalsEnabled === false ? true : false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      systemRules.withdrawalsEnabled !== false 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                        : "bg-rose-600 text-white hover:bg-rose-700"
                    }`}
                  >
                    {systemRules.withdrawalsEnabled !== false ? "ENABLED" : "OFF / DISABLED"}
                  </button>
                </div>

                {/* 4. Deposits Toggle */}
                <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
                  systemRules.depositsEnabled !== false ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                }`}>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Account Deposits</span>
                    <span className="text-[10px] text-slate-500 block">
                      {systemRules.depositsEnabled !== false ? "Deposits open" : "Deposits paused"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemRules(prev => ({ ...prev, depositsEnabled: prev.depositsEnabled === false ? true : false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      systemRules.depositsEnabled !== false 
                        ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                        : "bg-rose-600 text-white hover:bg-rose-700"
                    }`}
                  >
                    {systemRules.depositsEnabled !== false ? "ENABLED" : "OFF / DISABLED"}
                  </button>
                </div>
              </div>
            </div>

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

      {/* --- TAB: PRODUCT MANAGEMENT --- */}
      {activeTab === "products" && (
        <div className="space-y-6 animate-fade-in">
          {/* Card 1: Product & Investment Plan Assignment Console */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono">
                    Executive Control
                  </span>
                  <span className="text-emerald-600 text-xs font-mono font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Immediate Account Effect
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 font-display mt-1">Product Management & Manual Plan Assignment</h3>
                <p className="text-xs text-slate-500">
                  Manually assign any Coca-Cola investment tier or custom product ID to any registered user with immediate effect on their account.
                </p>
              </div>
            </div>

            <form onSubmit={handlePmAssignProduct} className="space-y-5">
              {/* Step 1: Select Target User */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>1. Select Investor Account</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {allUsers.length} Registered Investors
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Search User (Phone / Name / Ref Code)</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search investor..."
                        value={pmSearchQuery}
                        onChange={(e) => setPmSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Choose Target Investor</label>
                    <select
                      value={pmTargetUserUid}
                      onChange={(e) => setPmTargetUserUid(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select Investor --</option>
                      {(allUsers || [])
                        .filter(u => {
                          if (!u) return false;
                          if (!pmSearchQuery.trim()) return true;
                          const q = pmSearchQuery.toLowerCase();
                          return (
                            String(u.phone || "").toLowerCase().includes(q) ||
                            String(u.fullName || "").toLowerCase().includes(q) ||
                            String(u.referralCode || "").toLowerCase().includes(q)
                          );
                        })
                        .map(u => (
                          <option key={u.uid} value={u.uid}>
                            {u.phone} ({u.fullName || "No Name"}) — Tier: {u.currentTierId || "None"} | Bal: ₦{(u.balance || 0).toLocaleString()}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {pmTargetUserUid && (() => {
                  const targetUser = allUsers.find(u => u.uid === pmTargetUserUid);
                  if (!targetUser) return null;
                  return (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 text-purple-950 mt-2">
                      <div><span className="text-purple-600 text-[10px] block font-bold">Investor Phone:</span> <strong>{targetUser.phone}</strong></div>
                      <div><span className="text-purple-600 text-[10px] block font-bold">Full Name:</span> <strong>{targetUser.fullName || "N/A"}</strong></div>
                      <div><span className="text-purple-600 text-[10px] block font-bold">Current Tier ID:</span> <strong className="text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">{targetUser.currentTierId || "t1"}</strong></div>
                      <div><span className="text-purple-600 text-[10px] block font-bold">Wallet Balance:</span> <strong className="text-emerald-700">₦{(targetUser.balance || 0).toLocaleString()}</strong></div>
                    </div>
                  );
                })()}
              </div>

              {/* Step 2: Choose Product Plan or Custom Product ID */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-purple-600" />
                    <span>2. Select Investment Tier / Product ID</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={pmIsCustomProduct}
                        onChange={(e) => setPmIsCustomProduct(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Specify Custom Product ID</span>
                    </label>
                  </div>
                </div>

                {!pmIsCustomProduct ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allTiers.map((tier) => {
                      const isSelected = pmSelectedPlanId === tier.id;
                      return (
                        <div
                          key={tier.id}
                          onClick={() => setPmSelectedPlanId(tier.id)}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer relative ${
                            isSelected 
                              ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-400 shadow-xs" 
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-2.5 right-2.5 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              Selected
                            </span>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                {tier.id}
                              </span>
                              <h4 className="text-xs font-black text-slate-900">{tier.name}</h4>
                            </div>
                            <div className="text-xs font-mono font-bold text-slate-900 pt-1">
                              Price: ₦{tier.price.toLocaleString()}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-600">
                              Daily Return: ₦{tier.dailyReward.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              100-Day Yield: ₦{(tier.dailyReward * 100).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-2xl border border-purple-200 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Custom Product ID (e.g. t8, custom_vip_1)</label>
                        <input
                          type="text"
                          placeholder="e.g. t8, custom_vip, fund_3"
                          value={pmCustomProductId}
                          onChange={(e) => setPmCustomProductId(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Custom Product Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Coca-Cola Executive Bottling Reserve"
                          value={pmCustomProductName}
                          onChange={(e) => setPmCustomProductName(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Product Price (₦)</label>
                        <input
                          type="number"
                          value={pmCustomPrice}
                          onChange={(e) => setPmCustomPrice(Number(e.target.value))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Daily Return Amount (₦)</label>
                        <input
                          type="number"
                          value={pmCustomDailyReward}
                          onChange={(e) => setPmCustomDailyReward(Number(e.target.value))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Assignment Settings */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span>3. Assignment & Financial Terms</span>
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pmChargeBalance}
                        onChange={(e) => setPmChargeBalance(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs font-extrabold text-slate-900">Charge Investor Wallet Balance</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      {pmChargeBalance 
                        ? "Deducts the product price from the investor's wallet balance." 
                        : "Grants product for FREE as promotional / admin privilege without balance deduction."}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Cycle Duration (Days)</label>
                    <input
                      type="number"
                      value={pmCustomCycleDays}
                      onChange={(e) => setPmCustomCycleDays(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition cursor-pointer border border-purple-400/30"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-current" />
                <span>ASSIGN PRODUCT TO USER WITH IMMEDIATE EFFECT</span>
              </button>
            </form>
          </div>

          {/* Card 2: Investor Product Assignments Roster */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Investor Active Products & Tiers Roster</h3>
                <p className="text-xs text-slate-500">Overview of active products assigned to investors</p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter roster by phone or tier..."
                  value={pmSearchQuery}
                  onChange={(e) => setPmSearchQuery(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500 uppercase">
                    <th className="p-3">Investor</th>
                    <th className="p-3">Assigned Tier ID</th>
                    <th className="p-3">Matched Plan Name</th>
                    <th className="p-3">Wallet Balance</th>
                    <th className="p-3">Total Deposit Vol</th>
                    <th className="p-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(allUsers || [])
                    .filter(u => {
                      if (!u) return false;
                      if (!pmSearchQuery.trim()) return true;
                      const q = pmSearchQuery.toLowerCase();
                      return (
                        String(u.phone || "").toLowerCase().includes(q) ||
                        String(u.fullName || "").toLowerCase().includes(q) ||
                        String(u.currentTierId || "").toLowerCase().includes(q)
                      );
                    })
                    .map(u => {
                      const matchedPlan = (allTiers || []).find(t => t && t.id === u.currentTierId);
                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/80">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 font-mono">{u.phone}</div>
                            <div className="text-[10px] text-slate-400">{u.fullName || "Investor Profile"}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-purple-100 text-purple-800 text-xs font-mono font-bold px-2 py-0.5 rounded">
                              {u.currentTierId || "t1"}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {matchedPlan ? matchedPlan.name : `Product (${u.currentTierId || "t1"})`}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600">
                            ₦{(u.balance || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            ₦{(u.totalDeposit || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setPmTargetUserUid(u.uid);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer border border-purple-200 inline-flex items-center gap-1"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>Reassign Product</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
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
