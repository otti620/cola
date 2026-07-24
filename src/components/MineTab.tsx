import React, { useState, useEffect } from "react";
import { 
  User, ShieldCheck, Wallet, ArrowDownCircle, ArrowUpCircle, 
  Clock, Landmark, History, CreditCard, ChevronRight, PhoneCall, HelpCircle, Upload, Check, CheckCircle,
  Globe2, FileText, Headphones, BarChart3, ClipboardList, Activity, Mail, Languages, LogOut, Grid,
  Send, AlertTriangle, ChevronLeft, Bell, KeyRound, Download, Cpu, Sparkles, MessageCircle, FileSpreadsheet, FileCheck, FileMinus,
  Box, Package, Receipt, CalendarCheck, Calendar, BadgeDollarSign, Coins, DollarSign, Gift, Lock, Pencil, Edit3, Sliders, Info, Eye, EyeOff, Plus, ArrowUp, X
} from "lucide-react";
import RechargeView from "./RechargeView";
import WithdrawView from "./WithdrawView";
import { UserProfile, TransactionRecord } from "../types";
import { INVESTMENT_TIERS } from "../data";
import { db, auth } from "../lib/firebase";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDoc,
  where,
  serverTimestamp 
} from "firebase/firestore";

interface MineTabProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => Promise<void> | void;
  activeView?: any;
  setActiveView?: (view: any) => void;
}

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  time: string;
}

export default function MineTab({ user, onUpdateUser, activeView: propActiveView, setActiveView: propSetActiveView }: MineTabProps) {
  const currentTier = INVESTMENT_TIERS.find((t) => t.id === user.currentTierId) || INVESTMENT_TIERS[0];
  
  // Balance visibility toggle
  const [showBalance, setShowBalance] = useState<boolean>(true);

  // Modals for Activities
  const [showSalaryModal, setShowSalaryModal] = useState<boolean>(false);
  const [showGiftModal, setShowGiftModal] = useState<boolean>(false);
  const [giftCode, setGiftCode] = useState<string>("");
  const [giftCodeError, setGiftCodeError] = useState<string>("");
  const [giftCodeSuccess, setGiftCodeSuccess] = useState<string>("");
  const [giftProcessing, setGiftProcessing] = useState<boolean>(false);
  const [checkinProcessing, setCheckinProcessing] = useState<boolean>(false);

  const isNewUserFromToday = () => {
    if (!user.joinedDate) return false;
    try {
      const date = new Date(user.joinedDate);
      if (!isNaN(date.getTime())) {
        const cutOff = new Date("2026-07-13T00:00:00");
        return date.getTime() >= cutOff.getTime();
      }
    } catch (e) {
      console.error("Error parsing joined date", e);
    }
    
    const lower = user.joinedDate.toLowerCase();
    if (lower.includes("13 jul") && lower.includes("2026")) return true;
    if (lower.includes("jul 13") && lower.includes("2026")) return true;
    if (lower.includes("2026") && (
      lower.includes("aug") || 
      lower.includes("sep") || 
      lower.includes("oct") || 
      lower.includes("nov") || 
      lower.includes("dec")
    )) return true;
    if (lower.includes("2027") || lower.includes("2028") || lower.includes("2029")) return true;
    
    return false;
  };

  // Master state for active interactive subview
  const [localActiveView, setLocalActiveView] = useState<any>("none");
  const activeView = propActiveView !== undefined ? propActiveView : localActiveView;
  const setActiveView = propSetActiveView !== undefined ? propSetActiveView : setLocalActiveView;

  // Dynamic system configuration rules state
  const [rules, setRules] = useState({
    minDeposit: 2000,
    minWithdrawal: 1500,
    withdrawalFeePercent: 10,
    bankName: "Guaranty Trust Bank (GTBank)",
    bankAccount: "0552391032",
    bankHolder: "Coca-Cola Bottling Co. Nig",
    usdtAddress: "TYg9f3XN28vEw28vEws828Nsb292jBwUbs8"
  });

  useEffect(() => {
    const configRef = doc(db, "system", "rules");
    const unsubRules = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setRules(prev => ({ ...prev, ...snap.data() }));
      }
    });
    return () => unsubRules();
  }, []);

  // Firestore transaction logs state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const transRef = collection(db, "users", auth.currentUser.uid, "transactions");
    const q = query(transRef, orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as TransactionRecord[];
      setTransactions(txs);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // REFERRAL REQUIREMENT TO UNLOCK WITHDRAWALS
  const [referredActiveCount, setReferredActiveCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user.referralCode) return;
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referredBy", "==", user.referralCode));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeCount = 0;
      snapshot.docs.forEach((doc) => {
        const uData = doc.data();
        const isActiveVip = uData.currentTierId && uData.currentTierId !== "none" && uData.currentTierId !== "temps" && uData.currentTierId !== "";
        if (isActiveVip) {
          activeCount++;
        }
      });
      setReferredActiveCount(activeCount);
    });
    return () => unsubscribe();
  }, [user.referralCode]);

  // Deposit/Withdrawal State
  const [depAmount, setDepAmount] = useState<string>("");
  const [depMethod, setDepMethod] = useState<"gtbank" | "usdt">("gtbank");
  const [screenshotUploaded, setScreenshotUploaded] = useState<boolean>(false);
  const [depProcessing, setDepProcessing] = useState<boolean>(false);

  const [witAmount, setWitAmount] = useState<string>("");
  const [witProcessing, setWitProcessing] = useState<boolean>(false);
  const [showWithdrawSuccessBanner, setShowWithdrawSuccessBanner] = useState<boolean>(false);
  const [lastWithdrawalAmount, setLastWithdrawalAmount] = useState<number>(0);

  // Edit forms state
  const [bankName, setBankName] = useState<string>(user.bankName || "Guaranty Trust Bank (GTBank)");
  const [bankAccount, setBankAccount] = useState<string>(user.bankAccount || "");
  const [holderName, setHolderName] = useState<string>(user.accountHolder || "");
  const [bankSaved, setBankSaved] = useState<boolean>(false);

  const [editableEmail, setEditableEmail] = useState<string>(user.email || "");
  const [emailSaved, setEmailSaved] = useState<boolean>(false);

  const [currentPin, setCurrentPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [pinSaved, setPinSaved] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>("");

  const [currentLanguage, setCurrentLanguage] = useState<"en" | "yo" | "ha" | "ig" | "ar">("en");
  const [languageAlert, setLanguageAlert] = useState<string>("");

  // CS Chat State
  const [csMessages, setCsMessages] = useState<ChatMessage[]>([
    { sender: "bot", text: "Hello! Welcome to Careem Official Customer Support. How can we assist you today?", time: "Just now" }
  ]);
  const [typedMessage, setTypedMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // App Download Simulator State
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadComplete, setDownloadComplete] = useState<boolean>(false);

  const handleConfirmLogOut = () => {
    auth.signOut().then(() => {
      window.location.reload();
    });
  };

  const reloadTransactions = async () => {
    if (!auth.currentUser) return;
    try {
      const transRef = collection(db, "users", auth.currentUser.uid, "transactions");
      const q = query(transRef, orderBy("timestamp", "desc"));
      const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
    } catch (e) {
      console.error("Error refreshing", e);
    }
  };

  const detectSuspiciousActivity = async (actionType: "deposit" | "withdraw"): Promise<boolean> => {
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;
    
    try {
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) return false;
      
      const userData = userSnap.data();
      if (userData.isBlocked) {
        alert("SECURITY ALERT: Your account is restricted due to flag checks. Please contact support.");
        return true;
      }
    } catch (e) {
      console.error("Suspicious detection error:", e);
    }
    return false;
  };

  // Daily check-in handler
  const handleDailyCheckin = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const todayStr = new Date().toLocaleDateString("en-NG");
    
    const alreadyCheckedIn = transactions.some(t => 
      t.details?.includes("Daily check-in") && t.timestamp?.includes(todayStr)
    );

    if (alreadyCheckedIn) {
      alert("You have already checked in today! Please return tomorrow for your next reward.");
      return;
    }

    setCheckinProcessing(true);
    try {
      const reward = 100;
      const userRef = doc(db, "users", uid);
      const transRef = collection(db, "users", uid, "transactions");

      await updateDoc(userRef, {
        balance: user.balance + reward,
        totalProfit: user.totalProfit + reward
      });

      await addDoc(transRef, {
        type: "deposit",
        amount: reward,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Daily check-in bonus reward (+₦${reward})`,
        createdAt: serverTimestamp()
      });

      alert(`🎉 Daily Check-in Successful!\n\n₦${reward} bonus has been added to your balance.`);
    } catch (e) {
      console.error("Check-in error:", e);
      alert("Check-in error. Please try again.");
    } finally {
      setCheckinProcessing(false);
    }
  };

  // Redeem Gift Code
  const handleRedeemGiftCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCode.trim()) return;
    if (!auth.currentUser) return;

    const code = giftCode.trim().toUpperCase();
    const validCodes: Record<string, number> = {
      "CAREEM2026": 500,
      "WELCOME100": 100,
      "BONUS1000": 1000,
      "VIP2026": 2000
    };

    if (!validCodes[code]) {
      setGiftCodeError("Invalid or expired gift code. Please check and try again.");
      return;
    }

    setGiftProcessing(true);
    setGiftCodeError("");
    try {
      const amount = validCodes[code];
      const uid = auth.currentUser.uid;
      const userRef = doc(db, "users", uid);
      const transRef = collection(db, "users", uid, "transactions");

      await updateDoc(userRef, {
        balance: user.balance + amount,
        totalProfit: user.totalProfit + amount
      });

      await addDoc(transRef, {
        type: "deposit",
        amount,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Gift Code Bonus (${code})`,
        createdAt: serverTimestamp()
      });

      setGiftCodeSuccess(`🎉 Success! ₦${amount.toLocaleString()} added to your wallet balance.`);
      setGiftCode("");
      setTimeout(() => {
        setGiftCodeSuccess("");
        setShowGiftModal(false);
      }, 2500);
    } catch (e) {
      console.error("Gift code error:", e);
      setGiftCodeError("Failed to redeem gift code. Please try again.");
    } finally {
      setGiftProcessing(false);
    }
  };

  // Save bank details
  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccount || !holderName) {
      alert("Please fill out all bank fields.");
      return;
    }

    const updatedUser: UserProfile = {
      ...user,
      bankName,
      bankAccount,
      accountHolder: holderName
    };
    onUpdateUser(updatedUser);
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 2000);
  };

  // Save personal email info
  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: UserProfile = {
      ...user,
      email: editableEmail
    };
    onUpdateUser(updatedUser);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  };

  // Change Security PIN Code
  const handleSaveSecurityPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinError("New security PIN must be exactly 6 numerical digits.");
      return;
    }
    setPinError("");
    setPinSaved(true);
    setCurrentPin("");
    setNewPin("");
    setTimeout(() => setPinSaved(false), 3000);
  };

  // Switch Language Simulator
  const handleSelectLanguage = (lang: "en" | "yo" | "ha" | "ig" | "ar") => {
    setCurrentLanguage(lang);
    let msg = "";
    if (lang === "en") msg = "Language switched to English!";
    if (lang === "yo") msg = "Káàbọ̀! Èdè Yorùbá ti di fífidí mú. (Yoruba Set)";
    if (lang === "ha") msg = "Barka da zuwa! An saita harshen Hausa yanzu. (Hausa Set)";
    if (lang === "ig") msg = "Nnọọ! Edobere asụsụ Igbo ugbu a. (Igbo Set)";
    if (lang === "ar") msg = "أهلاً بك! تم ضبط اللغة العربية بنجاح. (Arabic Set)";
    setLanguageAlert(msg);
    setTimeout(() => setLanguageAlert(""), 3000);
  };

  // Simulated CS Chat Answers
  const sendChatMessage = (messageText: string) => {
    if (!messageText.trim()) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCsMessages((prev) => [...prev, userMsg]);
    setTypedMessage("");
    setIsTyping(true);

    setTimeout(() => {
      const lower = messageText.toLowerCase();
      let replyText = "Thank you for reaching out to Careem Nigeria Support. Your message has been received! Support ticket ID: #CR-" + Math.floor(1000 + Math.random() * 9000);

      if (lower.includes("deposit") || lower.includes("recharge") || lower.includes("pay") || lower.includes("transfer")) {
        replyText = "Deposits are processed automatically! Transfer to our GTBank Account (0552391032) and upload the receipt screenshot in the Recharge menu.";
      } else if (lower.includes("withdraw") || lower.includes("cash") || lower.includes("bank") || lower.includes("naira")) {
        replyText = "To withdraw, ensure you have correctly filled out your bank details under 'Bank card'. Minimum withdrawal is ₦1,000, paid instantly!";
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        replyText = "Hello partner! 🇳🇬 We are here to assist you with deposits, profits, or cashouts.";
      }

      const botMsg: ChatMessage = {
        sender: "bot",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setCsMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1000);
  };

  // APP download simulator
  const startAppDownload = () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadComplete(false);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          setDownloadComplete(true);
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };

  if (activeView === "deposit") {
    return (
      <RechargeView 
        user={user} 
        onBack={() => setActiveView("none")} 
        onSuccess={() => setActiveView("topup_records")} 
      />
    );
  }

  if (activeView === "withdraw") {
    return (
      <WithdrawView
        user={user}
        onBack={() => setActiveView("none")}
        onUpdateUser={onUpdateUser}
        onSuccess={() => setActiveView("withdraw_records")}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#F8F8F8] relative font-sans animate-fade-in text-gray-900">
      
      {/* Withdraw success modal */}
      {showWithdrawSuccessBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 max-w-md w-full text-center space-y-5 relative overflow-hidden">
            <div className="w-16 h-16 mx-auto bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Withdrawal Processed</h3>
              <p className="text-xs text-emerald-600 font-medium">Direct Bank Settlement Initiated</p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200/60 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-gray-900">₦{lastWithdrawalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                <span className="text-gray-500">Method:</span>
                <span className="font-bold text-gray-800">{user.bankName || "Linked Bank Card"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Processing
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWithdrawSuccessBanner(false)}
              className="w-full bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              OK, Got it
            </button>
          </div>
        </div>
      )}

      {/* Monthly Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 max-w-md w-full space-y-5 relative">
            <button 
              onClick={() => setShowSalaryModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Monthly Salary Scheme</h3>
                <p className="text-xs text-gray-500">Earn steady monthly stipends by inviting active partners</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 block">Tier 1 Salary</span>
                  <span className="text-[10px] text-gray-500">5 Active VIP Referrals</span>
                </div>
                <span className="font-extrabold text-emerald-600">₦15,000/mo</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 block">Tier 2 Salary</span>
                  <span className="text-[10px] text-gray-500">15 Active VIP Referrals</span>
                </div>
                <span className="font-extrabold text-emerald-600">₦50,000/mo</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 block">Tier 3 Salary</span>
                  <span className="text-[10px] text-gray-500">30 Active VIP Referrals</span>
                </div>
                <span className="font-extrabold text-emerald-600">₦120,000/mo</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-sans">
              Your active referrals count: <strong className="font-mono text-sm">{referredActiveCount || 0}</strong>. Salaries disburse automatically on the 1st of every month!
            </div>

            <button
              onClick={() => setShowSalaryModal(false)}
              className="w-full bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Gift Code Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 max-w-md w-full space-y-5 relative">
            <button 
              onClick={() => { setShowGiftModal(false); setGiftCodeError(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Redeem Gift Code</h3>
                <p className="text-xs text-gray-500">Enter promo code from Telegram or Support</p>
              </div>
            </div>

            {giftCodeSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl text-center">
                {giftCodeSuccess}
              </div>
            )}

            {giftCodeError && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl text-center">
                {giftCodeError}
              </div>
            )}

            <form onSubmit={handleRedeemGiftCode} className="space-y-3">
              <input
                type="text"
                placeholder="Enter Gift Code (e.g. CAREEM2026)"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-mono text-gray-900 outline-none uppercase placeholder:normal-case focus:border-[#D9381E]"
                required
              />

              <button
                type="submit"
                disabled={giftProcessing}
                className="w-full bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all disabled:bg-gray-300"
              >
                {giftProcessing ? "Redeeming..." : "Redeem Gift Code"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile Header Bar */}
      <div className="w-full bg-white px-4 py-4 border-b border-gray-200/80 sticky top-0 z-20 flex justify-between items-center shadow-2xs">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Profile</h1>
      </div>

      {activeView === "none" ? (
        <div className="w-full max-w-xl mx-auto space-y-4">
          
          {/* User Profile Header Card */}
          <div className="px-4 pt-4 pb-1 flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-full bg-[#FCEAE6] text-[#D9381E] flex items-center justify-center text-xl font-bold font-mono shrink-0 shadow-2xs border border-[#F8D2C8]">
              {(user.fullName || user.phone || "U").charAt(0).toUpperCase()}
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {user.fullName || "User"}
              </h2>
              <p className="text-xs text-gray-500 font-mono font-medium">
                {user.phone ? (user.phone.startsWith("+") ? user.phone : `+234 ${user.phone}`) : "+234 7077599057"}
              </p>
            </div>
          </div>

          {/* Balance Card - Rebuilt exactly as in Image 1 */}
          <div className="mx-4 bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Total balance</span>
              <button 
                onClick={() => setShowBalance(!showBalance)}
                className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1"
                title="Toggle balance visibility"
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-3xl font-extrabold text-gray-900 font-mono tracking-tight">
              {showBalance ? `₦${user.balance.toLocaleString()}` : "••••••••"}
            </div>

            <div className="border-t border-gray-100" />

            <div className="grid grid-cols-3 text-left py-0.5 gap-2">
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">Today</span>
                <span className="text-sm font-bold text-emerald-600 font-mono block mt-0.5">+₦0</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">Available</span>
                <span className="text-sm font-extrabold text-gray-900 font-mono block mt-0.5">
                  {showBalance ? `₦${user.balance.toLocaleString()}` : "••••"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">In review</span>
                <span className="text-sm font-extrabold text-gray-900 font-mono block mt-0.5">₦0</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setActiveView("deposit")}
                className="bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Recharge</span>
              </button>
              <button
                onClick={() => setActiveView("withdraw")}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-98"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                <span>Withdraw</span>
              </button>
            </div>

            <div className="border-t border-gray-100" />

            <button
              onClick={() => setActiveView("detailed_bill")}
              className="w-full text-center text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 cursor-pointer py-0.5"
            >
              <span>Fund flow</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Section 1: ASSETS */}
          <div className="px-4 space-y-1.5 pt-1">
            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">ASSETS</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
              <button
                onClick={() => setActiveView("my_funds")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Box className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">My products</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveView("bank_info")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Bank card</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Section 2: HISTORY */}
          <div className="px-4 space-y-1.5 pt-1">
            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">HISTORY</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
              <button
                onClick={() => setActiveView("topup_records")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Receipt className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Recharge history</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveView("withdraw_records")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Withdrawal history</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Section 3: ACTIVITIES */}
          <div className="px-4 space-y-1.5 pt-1">
            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">ACTIVITIES</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
              <button
                onClick={handleDailyCheckin}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <CalendarCheck className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Daily check-in</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setShowSalaryModal(true)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Coins className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Monthly Salary</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setShowGiftModal(true)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Gift className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Gift code</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Section 4: SETTINGS */}
          <div className="px-4 space-y-1.5 pt-1">
            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">SETTINGS</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
              <button
                onClick={() => setActiveView("security")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Lock className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Change password</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveView("personal_info")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Pencil className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Edit profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveView("site_message")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Sliders className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Section 5: SERVICES */}
          <div className="px-4 space-y-1.5 pt-1 pb-16">
            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">SERVICES</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-2xs overflow-hidden">
              <button
                onClick={() => setActiveView("site_message")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Messages</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveView("cs")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Headphones className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">Contact support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setActiveView("company_profile")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Info className="w-5 h-5 text-gray-700 stroke-[1.8]" />
                  <span className="text-sm font-semibold text-gray-900">About us</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Logout link */}
            <div className="pt-4 pb-8 text-center">
              <button
                onClick={() => setActiveView("sign_out")}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center justify-center space-x-1.5 mx-auto py-2 px-4 rounded-xl hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Interactive Subview Details Area with Back Button */
        <div className="w-full max-w-xl mx-auto px-4 mt-4 animate-fade-in space-y-4">
          
          <button
            onClick={() => setActiveView("none")}
            className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-gray-900 cursor-pointer bg-white border border-gray-200 py-2 px-3.5 rounded-xl shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>

          <div className="bg-white border border-gray-200/80 rounded-3xl p-5 md:p-6 shadow-xs min-h-[420px]">
            
            {/* COMPANY PROFILE VIEW */}
            {activeView === "company_profile" && (
              <div className="space-y-5">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <Globe2 className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">About Coca-Cola Inc.</h2>
                </div>
                
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                  <p>
                    <strong>Coca-Cola Inc. Investment Portal</strong> is the official bottling and distribution dividend platform powered by Coca-Cola Hellenic & Bottling Partners.
                  </p>
                  <p>
                    By establishing high-efficiency beverage distribution hubs across Lagos, Abuja, and Port Harcourt, we match strategic investor capital with daily distribution fleet expansion. Sponsoring bottling packages yields daily automated dividends.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Founded Year:</span>
                    <span className="text-gray-800 font-bold">1892</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">African Hubs:</span>
                    <span className="text-gray-800 font-bold">Lagos, Abuja, PH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-emerald-600 font-bold">LICENSED BOTTLER</span>
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOMER SERVICE CHAT VIEW */}
            {activeView === "cs" && (
              <div className="space-y-4 flex flex-col h-[460px] justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <Headphones className="w-5 h-5 text-[#D9381E]" />
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Coca-Cola Customer Support</h2>
                        <span className="text-[10px] text-emerald-500 font-bold font-mono block">● Representative Online</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 max-h-[280px]">
                  {csMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === "user" 
                          ? "bg-[#D9381E] text-white rounded-br-none" 
                          : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200/50"
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] font-mono text-gray-400 mt-1">{msg.time}</span>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200/50 p-2.5 rounded-xl max-w-[120px]">
                      <Cpu className="w-3.5 h-3.5 text-[#D9381E] animate-spin" />
                      <span className="text-[10px] font-mono text-gray-400 animate-pulse">Typing...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 border-t border-gray-100 pt-3">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { sendChatMessage(typedMessage); } }}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs text-gray-800 outline-none focus:border-[#D9381E]"
                  />
                  <button
                    onClick={() => sendChatMessage(typedMessage)}
                    className="bg-[#D9381E] hover:bg-[#c42f17] text-white p-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TOP UP RECORDS VIEW */}
            {activeView === "topup_records" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <Receipt className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Recharge History</h2>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
                  {transactions.filter(t => t.type === "deposit" && !t.details?.includes("Check")).map((t) => (
                    <div key={t.id} className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex justify-between items-center text-xs font-mono">
                      <div>
                        <div className="font-bold text-gray-800">Deposit ID: {t.id.slice(0, 8)}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{t.timestamp}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-bold block">₦{t.amount.toLocaleString()}</span>
                        <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 uppercase">
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {transactions.filter(t => t.type === "deposit" && !t.details?.includes("Check")).length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs font-mono">No recharge records found.</div>
                  )}
                </div>
              </div>
            )}

            {/* WITHDRAW RECORDS VIEW */}
            {activeView === "withdraw_records" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <FileText className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Withdrawal History</h2>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto">
                  {transactions.filter(t => t.type === "withdraw").map((t) => {
                    const amount = t.amount || 0;
                    const fee = t.fee !== undefined ? t.fee : amount * 0.18;
                    const payoutAmount = t.payoutAmount !== undefined ? t.payoutAmount : amount - fee;

                    return (
                      <div key={t.id} className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-gray-800">Payout ID: {t.id.slice(0, 8)}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{t.timestamp}</div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold rounded uppercase border ${
                              t.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : t.status === "declined"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {t.status || "pending"}
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-200/50 pt-2 grid grid-cols-3 gap-2 text-[10px] text-center">
                          <div>
                            <span className="block text-gray-400 font-bold">Amount</span>
                            <span className="text-gray-800 font-bold">₦{amount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 font-bold">Fee</span>
                            <span className="text-rose-600 font-bold">-₦{fee.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 font-bold">Payout</span>
                            <span className="text-emerald-600 font-black">₦{payoutAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {transactions.filter(t => t.type === "withdraw").length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs font-mono">No withdrawal records found.</div>
                  )}
                </div>
              </div>
            )}

            {/* DETAILED BILL VIEW */}
            {activeView === "detailed_bill" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <ClipboardList className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Fund Flow / Ledger</h2>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
                  {transactions.map((t) => {
                    return (
                      <div key={t.id} className="bg-gray-50 border border-gray-100 p-3 rounded-xl space-y-1 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">{t.type.toUpperCase()}</span>
                          <span className={`font-black ${t.type === "deposit" ? "text-emerald-600" : "text-rose-600"}`}>
                            {t.type === "deposit" ? "+" : "-"} ₦{t.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 leading-relaxed truncate">{t.details || "Transaction entry"}</div>
                        <div className="text-[9px] text-gray-400 pt-1 flex justify-between">
                          <span>{t.timestamp}</span>
                          <span className="uppercase text-emerald-600 font-bold">{t.status}</span>
                        </div>
                      </div>
                    );
                  })}
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs font-mono">Your transaction ledger is empty.</div>
                  )}
                </div>
              </div>
            )}

            {/* MY PRODUCTS / MY FUNDS VIEW */}
            {activeView === "my_funds" && (
              <div className="space-y-5">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <Box className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">My Products & Assets</h2>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">{currentTier.name}</span>
                    <span className="text-xs font-extrabold text-emerald-600 font-mono">ACTIVE</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    Investment Value: <strong className="text-gray-900">₦{currentTier.price.toLocaleString()}</strong>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    Daily Earnings: <strong className="text-emerald-600">₦{currentTier.dailyReward.toLocaleString()}</strong>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    Investment Cycle: <strong className="text-gray-900">100 Days</strong>
                  </div>
                </div>
              </div>
            )}

            {/* PERSONAL INFORMATION VIEW */}
            {activeView === "personal_info" && (
              <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <Pencil className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Edit Profile</h2>
                </div>

                {emailSaved && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl text-center">
                    Profile email details saved!
                  </div>
                )}

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-400">Phone Number:</span>
                    <span className="text-gray-800 font-bold">{user.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-400">Referral Code:</span>
                    <span className="text-gray-800 font-bold">{user.referralCode}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-gray-600">Email Address</label>
                  <input
                    type="email"
                    value={editableEmail}
                    onChange={(e) => setEditableEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-800 outline-none focus:border-[#D9381E]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs mt-2 cursor-pointer"
                >
                  Save Profile
                </button>
              </form>
            )}

            {/* BANK INFORMATION VIEW */}
            {activeView === "bank_info" && (
              <form onSubmit={handleSaveBank} className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <CreditCard className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Bank Card / Account</h2>
                </div>

                {bankSaved && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl text-center">
                    Bank card details linked successfully!
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">Select Bank</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-800 outline-none font-medium"
                    >
                      <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                      <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                      <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
                      <option value="Opay">Opay (Digital Wallet)</option>
                      <option value="PalmPay">PalmPay (Digital Wallet)</option>
                      <option value="Moniepoint Microfinance Bank">Moniepoint Microfinance Bank</option>
                      <option value="Wema Bank">Wema Bank / ALAT</option>
                      <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Obi"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-800 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">10-Digit Account Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 0552391032"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-800 font-mono outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs mt-2 cursor-pointer"
                >
                  Save Bank Card
                </button>
              </form>
            )}

            {/* SECURITY / CHANGE PASSWORD VIEW */}
            {activeView === "security" && (
              <form onSubmit={handleSaveSecurityPin} className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <Lock className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Change Password / PIN</h2>
                </div>

                {pinSaved && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl text-center">
                    Security PIN updated successfully!
                  </div>
                )}

                {pinError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl text-center">
                    {pinError}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">Current Security PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-800 font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600">New 6-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="e.g. 000000"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-800 font-mono outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D9381E] hover:bg-[#c42f17] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs mt-2 cursor-pointer"
                >
                  Update Password / PIN
                </button>
              </form>
            )}

            {/* SITE MESSAGES / NOTIFICATIONS VIEW */}
            {activeView === "site_message" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <Bell className="w-6 h-6 text-[#D9381E]" />
                  <h2 className="text-base font-bold text-gray-900 font-display">Notifications & Messages</h2>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto">
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-xs">🚀 Automated Payout Speedup!</span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">NEW</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Withdrawals requested are now settled automatically under 3 minutes across all Nigerian banks.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-xs">⚡ 100-Day Investment Cycles</span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">ACTIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      All products have been updated to full 100-day high-yield dividend cycles.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SIGN OUT VIEW */}
            {activeView === "sign_out" && (
              <div className="space-y-5 text-center py-6">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">Sign Out</h3>
                  <p className="text-xs text-gray-500">Are you sure you want to sign out of your account?</p>
                </div>

                <div className="flex gap-3 pt-2 max-w-xs mx-auto">
                  <button
                    onClick={() => setActiveView("none")}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmLogOut}
                    className="flex-1 bg-[#D9381E] hover:bg-[#c42f17] text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating Orange Customer Support Button */}
      <button
        onClick={() => setActiveView("cs")}
        className="fixed right-4 bottom-20 z-40 w-12 h-12 rounded-full bg-[#D9381E] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        title="Contact Support"
      >
        <Headphones className="w-6 h-6" />
      </button>

    </div>
  );
}
