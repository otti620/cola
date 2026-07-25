import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Home, Store, Users, User, ShieldAlert, ShieldCheck, 
  CreditCard, Lock, HelpCircle, PhoneCall, PiggyBank 
} from "lucide-react";

import { UserProfile } from "./types";
import { INVESTMENT_TIERS } from "./data";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore";

import AuthModal from "./components/AuthModal";
import HomeTab from "./components/HomeTab";
import TaskTab from "./components/TaskTab";
import VipTab from "./components/VipTab";
import FundTab from "./components/FundTab";
import TeamTab from "./components/TeamTab";
import MineTab from "./components/MineTab";
import AdminPanel from "./components/AdminPanel";
import ChatFAB from "./components/ChatFAB";
import AppSkeletonLoader from "./components/AppSkeletonLoader";
import ToastContainer, { ToastItem } from "./components/ToastContainer";
import { notifyToast } from "./utils/toast";

import TelegramFlyerModal from "./components/TelegramFlyerModal";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [showTelegramModal, setShowTelegramModal] = useState<boolean>(true);
  const [mineActiveView, setMineActiveView] = useState<"none" | "deposit" | "withdraw" | "fund">("none");

  // Toast Notification System state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toastData: Omit<ToastItem, "id"> & { id?: string }) => {
    const newToast: ToastItem = {
      id: toastData.id || "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      ...toastData
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 4));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for custom window toast events
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        addToast(detail);
      }
    };
    window.addEventListener("show-toast", handleToastEvent);
    return () => window.removeEventListener("show-toast", handleToastEvent);
  }, [addToast]);

  // Capture referral code from URL if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let ref: string | null = null;
      const params = new URLSearchParams(window.location.search);
      ref = params.get("ref") || params.get("invite") || params.get("code") || params.get("referral");

      if (!ref && window.location.hash) {
        const hashStr = window.location.hash;
        const qIdx = hashStr.indexOf("?");
        if (qIdx !== -1) {
          const hashParams = new URLSearchParams(hashStr.substring(qIdx));
          ref = hashParams.get("ref") || hashParams.get("invite") || hashParams.get("code") || hashParams.get("referral");
        }
      }

      if (!ref) {
        const match = window.location.href.match(/[?&](?:ref|invite|code|referral)=([a-zA-Z0-9_\-]+)/i);
        if (match && match[1]) {
          ref = match[1];
        }
      }

      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        localStorage.setItem("pending_referral_code", cleanRef);
        addToast({
          title: "Referral Link Active",
          message: `Referral code ${cleanRef} captured! Sign up to join your partner's network.`,
          type: "success"
        });
      }
    } catch (e) {
      console.warn("Failed to extract referral parameter from URL:", e);
    }
  }, [addToast]);

  const isUserAdmin = (phone?: string) => {
    if (!phone) return false;
    const normalized = phone.replace(/[\s\-\(\)\+]/g, "");
    return (
      normalized === "07077599057" || 
      normalized === "2347077599057" ||
      normalized === "23407077599057" ||
      normalized === "09168410068" ||
      normalized === "2349168410068" ||
      normalized === "23409168410068"
    );
  };

  // Sync with Firebase Auth and Firestore
  useEffect(() => {
    setLoading(true);
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    
    // Load initial cached user from localStorage for instant display
    const cachedUserRaw = localStorage.getItem("cocacola_invest_user");
    if (cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw);
        setUser(cachedUser);
      } catch (e) {
        console.warn("Cached user parse error:", e);
      }
    }

    try {
      unsubscribeAuth = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const userRef = doc(db, "users", firebaseUser.uid);
              try {
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                  const data = snap.data() as UserProfile;
                  setUser(data);
                  localStorage.setItem("cocacola_invest_user", JSON.stringify(data));
                }
              } catch (e) {
                console.warn("Initial getDoc failed, using local user state:", e);
              } finally {
                setLoading(false);
              }

              unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                  const data = docSnap.data() as UserProfile;
                  setUser(data);
                  localStorage.setItem("cocacola_invest_user", JSON.stringify(data));
                }
                setLoading(false);
              }, (err) => {
                console.warn("Firestore snapshot error:", err);
                setLoading(false);
              });
            } else {
              localStorage.removeItem("cocacola_invest_user");
              sessionStorage.clear();
              setUser(null);
              if (unsubscribeFirestore) unsubscribeFirestore();
              setLoading(false);
            }
          } catch (err) {
            console.warn("Auth state change handler error:", err);
            setLoading(false);
          }
        },
        (authError) => {
          console.warn("Firebase Auth listener notice:", authError);
          localStorage.removeItem("cocacola_invest_user");
          sessionStorage.clear();
          setUser(null);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("Auth listener subscription error:", err);
      setLoading(false);
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Update user profile in Firestore and localStorage
  const handleUpdateUser = async (updatedUser: UserProfile) => {
    // Always update local state & localStorage immediately
    setUser(updatedUser);
    localStorage.setItem("cocacola_invest_user", JSON.stringify(updatedUser));

    try {
      const targetUid = updatedUser.uid || auth.currentUser?.uid;
      if (!targetUid) return;
      const userRef = doc(db, "users", targetUid);
      await setDoc(userRef, updatedUser, { merge: true });
    } catch (error) {
      console.warn("Firestore user profile update notice (saved locally):", error);
    }
  };

  // Automated 24h Daily Profit Drop Effect
  useEffect(() => {
    if (!user || !user.uid || !user.currentTierId) return;

    const todayStr = new Date().toISOString().split("T")[0];
    if (user.lastTaskDate === todayStr) return;

    const matchedTier = INVESTMENT_TIERS.find((t) => t.id === user.currentTierId);
    if (!matchedTier) return;

    const reward = matchedTier.dailyReward;
    const updatedUser: UserProfile = {
      ...user,
      balance: (user.balance || 0) + reward,
      totalProfit: (user.totalProfit || 0) + reward,
      lastTaskDate: todayStr
    };

    handleUpdateUser(updatedUser);

    // Alert user via Toast Notification that profit dropped!
    notifyToast({
      title: "🎉 Daily Profit Dropped!",
      message: `₦${reward.toLocaleString()} has been credited to your balance from ${matchedTier.name}.`,
      type: "profit",
      amount: reward
    });

    try {
      const transRef = collection(db, "users", user.uid, "transactions");
      addDoc(transRef, {
        type: "deposit",
        amount: reward,
        status: "approved",
        timestamp: new Date().toLocaleString("en-NG"),
        details: `Automated Daily Profit Drop: ${matchedTier.name}`,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Auto profit transaction error:", e);
    }
  }, [user?.uid, user?.currentTierId, user?.lastTaskDate]);

  // Real-time listener for transaction status changes (e.g. Admin approvals/declines)
  const prevTxMapRef = useRef<Record<string, string>>({});
  const isFirstTxLoadRef = useRef(true);

  useEffect(() => {
    if (!user || !user.uid) return;

    isFirstTxLoadRef.current = true;
    prevTxMapRef.current = {};

    let unsubTx: (() => void) | null = null;
    try {
      const txCol = collection(db, "users", user.uid, "transactions");
      unsubTx = onSnapshot(txCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const txData = change.doc.data();
          const txId = change.doc.id;
          const currentStatus = txData.status;

          // On initial load, record current status without showing old toasts
          if (isFirstTxLoadRef.current) {
            prevTxMapRef.current[txId] = currentStatus;
            return;
          }

          const prevStatus = prevTxMapRef.current[txId];
          if (prevStatus && prevStatus !== currentStatus) {
            const amountFormatted = Number(txData.amount || 0).toLocaleString();
            const isDeposit = txData.type === "deposit";
            const txTypeName = isDeposit ? "Deposit" : "Withdrawal";

            if (currentStatus === "approved") {
              notifyToast({
                title: `✅ ${txTypeName} Approved by Admin`,
                message: isDeposit
                  ? `Your deposit of ₦${amountFormatted} was approved and credited to your balance!`
                  : `Your withdrawal request of ₦${amountFormatted} was approved and sent to your bank account!`,
                type: "success",
                amount: Number(txData.amount || 0)
              });
            } else if (currentStatus === "declined" || currentStatus === "rejected") {
              notifyToast({
                title: `❌ ${txTypeName} Request Declined`,
                message: `Your ${txTypeName.toLowerCase()} request of ₦${amountFormatted} was declined by system admin.`,
                type: "error"
              });
            }
          }

          prevTxMapRef.current[txId] = currentStatus;
        });

        isFirstTxLoadRef.current = false;
      }, (err) => {
        console.warn("User transactions snapshot notice:", err);
      });
    } catch (err) {
      console.warn("User transactions snapshot error:", err);
    }

    return () => {
      if (unsubTx) unsubTx();
    };
  }, [user?.uid]);

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("cocacola_invest_user");
      sessionStorage.clear();
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      localStorage.removeItem("cocacola_invest_user");
      sessionStorage.clear();
      setUser(null);
      setActiveTab("home");
      setMineActiveView("none");
    }
  };



  if (loading) {
    return <AppSkeletonLoader />;
  }

  // If user is not logged in, show secure onboarding auth modal
  if (!user) {
    return (
      <AuthModal 
        onSuccess={handleLoginSuccess}
        initialUser={null}
      />
    );
  }

  // If user is banned, block app usage and show an immersive Account Suspended view
  if (user.isBanned) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative ambient radial gradients */}
        <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 bg-slate-900 border border-red-500/20 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight uppercase font-display">Account Suspended</h2>
            <div className="h-[2px] w-12 bg-red-500 mx-auto rounded-full" />
            <p className="text-xs text-red-400 font-mono uppercase tracking-widest font-bold">Security Violation Detected</p>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            Your partner registry account <strong className="text-white font-mono">{user.phone}</strong> has been automatically suspended. This is typically caused by multiple suspicious deposit submissions, system exploit attempts, or automated bot activities.
          </p>

          {user.bannedReason && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs font-mono text-slate-400 space-y-1">
              <span className="text-red-400 font-bold uppercase tracking-wider text-[10px]">Suspension Details:</span>
              <p>{user.bannedReason}</p>
            </div>
          )}

          <div className="p-4 bg-red-950/20 border border-red-500/10 rounded-xl text-xs text-slate-400 text-center">
            To appeal this automatic safety suspension, please contact your designated Coca-Cola Invest Operations Account Manager with your registration phone number.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a 
              href="https://t.me/careeminvest"
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition duration-150 text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
            >
              Contact Operations Support
            </a>
            <button 
              onClick={handleLogout}
              className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-700 transition duration-150 text-sm"
            >
              Log Out Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col pb-24 relative overflow-hidden">
      
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-[-250px] right-[-200px] w-[600px] h-[600px] bg-[#e41e2b]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] bg-[#e41e2b]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification System */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto py-2 px-1 sm:px-3 relative z-10 max-w-2xl min-h-[calc(100vh-60px)]">
        
        {activeTab === "home" && (
          <HomeTab 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onNavigateToTab={(tab) => {
              setMineActiveView("none");
              setActiveTab(tab);
            }}
            onNavigateToMineView={(view) => {
              setMineActiveView(view);
              setActiveTab("mine");
            }}
          />
        )}

        {activeTab === "task" && (
          <TaskTab 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onNavigateToTab={(tab) => {
              setMineActiveView("none");
              setActiveTab(tab);
            }}
          />
        )}

        {activeTab === "vip" && (
          <VipTab 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onNavigateToTab={(tab) => {
              setMineActiveView("none");
              setActiveTab(tab);
            }}
            onNavigateToMineView={(view) => {
              setMineActiveView(view);
              setActiveTab("mine");
            }}
          />
        )}

        {activeTab === "fund" && (
          <FundTab 
            user={user} 
            onUpdateUser={handleUpdateUser}
          />
        )}

        {activeTab === "team" && (
          <TeamTab 
            user={user}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {activeTab === "mine" && (
          <MineTab 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            activeView={mineActiveView}
            setActiveView={setMineActiveView}
          />
        )}

        {activeTab === "admin" && isUserAdmin(user.phone) && (
          <AdminPanel 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onNavigateToTab={(tab) => {
            setActiveTab(tab);
          }}
          />
        )}

      </main>

      {/* Bottom Navigation Bar */}
      {mineActiveView === "none" && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-4 shadow-md">
          <div className="max-w-md mx-auto flex items-center justify-around">
            
            <button
              onClick={() => { setMineActiveView("none"); setActiveTab("home"); }}
              className={`flex flex-col items-center space-y-0.5 text-center transition-all ${
                activeTab === "home" ? "text-[#c83a00] font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <Home className="w-6 h-6 shrink-0" />
              <span className="text-xs">Home</span>
            </button>

            <button
              onClick={() => { setMineActiveView("none"); setActiveTab("vip"); }}
              className={`flex flex-col items-center space-y-0.5 text-center transition-all ${
                activeTab === "vip" || activeTab === "task" ? "text-[#c83a00] font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <Store className="w-6 h-6 shrink-0" />
              <span className="text-xs">Products</span>
            </button>

            <button
              onClick={() => { setMineActiveView("none"); setActiveTab("team"); }}
              className={`flex flex-col items-center space-y-0.5 text-center transition-all ${
                activeTab === "team" ? "text-[#c83a00] font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <Users className="w-6 h-6 shrink-0" />
              <span className="text-xs">Team</span>
            </button>

            <button
              onClick={() => { setActiveTab("mine"); }}
              className={`flex flex-col items-center space-y-0.5 text-center transition-all ${
                activeTab === "mine" ? "text-[#c83a00] font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <User className="w-6 h-6 shrink-0" />
              <span className="text-xs">Profile</span>
            </button>

            {isUserAdmin(user.phone) && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex flex-col items-center space-y-0.5 text-center transition-all ${
                  activeTab === "admin" ? "text-[#c83a00] font-bold" : "text-amber-500 hover:text-amber-600 font-medium"
                }`}
              >
                <ShieldCheck className="w-6 h-6 shrink-0" />
                <span className="text-xs">Admin</span>
              </button>
            )}

          </div>
        </nav>
      )}

      <ChatFAB />

      {/* New Flyer Popup for Telegram Community & Plans */}
      <TelegramFlyerModal 
        isOpen={showTelegramModal} 
        onClose={() => setShowTelegramModal(false)} 
      />
    </div>
  );
}
