import React, { useState, useEffect } from "react";
import { 
  Copy, Share2, Headphones, CheckCircle2, MessageCircle, Send, Facebook, Twitter, Link2, X,
  RefreshCw, Sparkles, Users, Layers, Network, ChevronDown, ChevronRight, Search, TrendingUp,
  UserCheck, ShieldCheck, Award
} from "lucide-react";
import { UserProfile } from "../types";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { safeCopyToClipboard, isValidAbsoluteUrl } from "../utils/clipboard";

interface TeamTabProps {
  user: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
}

interface TeamMemberNode {
  user: UserProfile;
  level: 1 | 2 | 3;
  directCount: number;
  estimatedRebate: number;
  children: TeamMemberNode[];
}

export default function TeamTab({ user, onUpdateUser }: TeamTabProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Referral code customization state
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  // Tree & Team State
  const [loadingTree, setLoadingTree] = useState(true);
  const [level1Users, setLevel1Users] = useState<UserProfile[]>([]);
  const [level2Users, setLevel2Users] = useState<UserProfile[]>([]);
  const [level3Users, setLevel3Users] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<"all" | "l1" | "l2" | "l3">("all");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const inviteCode = user.referralCode || "9JFXJX";
  
  const getAppOrigin = () => {
    if (typeof window === "undefined") return "";
    const loc = window.location;
    if (loc.origin && loc.origin !== "null" && loc.origin !== "about:blank" && !loc.origin.startsWith("file:")) {
      return loc.origin;
    }
    if (loc.protocol && loc.host && !loc.host.includes("null") && !loc.host.includes("about:")) {
      return `${loc.protocol}//${loc.host}`;
    }
    return loc.href.split("?")[0].split("#")[0].replace(/\/+$/, "");
  };

  const origin = getAppOrigin();
  const inviteLink = `${origin}/?ref=${inviteCode}`;

  const copyToClipboard = async (text: string, label: string) => {
    await safeCopyToClipboard(text);
    setToastMessage(`Copied ${label} to clipboard!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    const validShareUrl = inviteLink;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Coca-Cola Real Magic Investment Portal",
          text: `Join Coca-Cola Real Magic Investment! Use my referral code ${inviteCode} to earn high daily returns on sponsorship plans:`,
          url: validShareUrl,
        });
      } catch (err) {
        console.log("Share dismissed or failed:", err);
      }
    } else {
      await copyToClipboard(validShareUrl, "Invitation Link");
    }
  };

  // Generate random referral code
  const handleGenerateRandomCode = () => {
    const prefixes = ["CAREEM", "PARTNER", "INVEST", "PRO", "VIP"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setCustomCodeInput(`${prefix}_${randomNum}`);
    setGeneratorError(null);
  };

  // Save customized / newly generated referral code
  const handleSaveReferralCode = async () => {
    const formattedCode = customCodeInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    if (!formattedCode || formattedCode.length < 4) {
      setGeneratorError("Code must be at least 4 characters long (letters, numbers, underscores).");
      return;
    }

    if (formattedCode === user.referralCode) {
      setShowCodeGenerator(false);
      return;
    }

    setIsGenerating(true);
    setGeneratorError(null);

    try {
      // Check if code is already taken in Firestore
      const codeQuery = query(collection(db, "users"), where("referralCode", "==", formattedCode));
      const codeSnap = await getDocs(codeQuery);
      
      if (!codeSnap.empty) {
        setGeneratorError("This referral code is already taken by another partner. Please try another one.");
        setIsGenerating(false);
        return;
      }

      // Update in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { referralCode: formattedCode });

      // Update state & parent
      const updatedUser: UserProfile = { ...user, referralCode: formattedCode };
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setToastMessage(`Referral Code updated to ${formattedCode}!`);
      setTimeout(() => setToastMessage(null), 3000);
      setShowCodeGenerator(false);
      setCustomCodeInput("");

      // Refresh team tree with new code
      fetchTeamTree(formattedCode);
    } catch (err: any) {
      console.error("Error updating referral code:", err);
      setGeneratorError("Failed to update referral code. Please check your internet connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch 3-Level Team Tree from Firestore
  const fetchTeamTree = async (currentCode: string) => {
    setLoadingTree(true);
    try {
      // 1. Fetch Level 1 (Direct Referrals where referredBy == currentCode)
      const l1Query = query(collection(db, "users"), where("referredBy", "==", currentCode));
      const l1Snap = await getDocs(l1Query);
      const l1List: UserProfile[] = [];
      l1Snap.forEach(doc => l1List.push(doc.data() as UserProfile));
      setLevel1Users(l1List);

      // Auto expand root and Level 1 nodes
      const initialExpanded: Record<string, boolean> = { root: true };
      l1List.forEach(u => { initialExpanded[u.uid] = true; });

      // 2. Fetch Level 2 (Referred by any Level 1 user)
      const l2List: UserProfile[] = [];
      const l1Codes = l1List.map(u => u.referralCode).filter(Boolean);

      if (l1Codes.length > 0) {
        // Chunk query if l1Codes length > 10 (Firestore in limit)
        for (let i = 0; i < l1Codes.length; i += 10) {
          const chunk = l1Codes.slice(i, i + 10);
          const l2Query = query(collection(db, "users"), where("referredBy", "in", chunk));
          const l2Snap = await getDocs(l2Query);
          l2Snap.forEach(doc => l2List.push(doc.data() as UserProfile));
        }
      }
      setLevel2Users(l2List);

      // 3. Fetch Level 3 (Referred by any Level 2 user)
      const l3List: UserProfile[] = [];
      const l2Codes = l2List.map(u => u.referralCode).filter(Boolean);

      if (l2Codes.length > 0) {
        for (let i = 0; i < l2Codes.length; i += 10) {
          const chunk = l2Codes.slice(i, i + 10);
          const l3Query = query(collection(db, "users"), where("referredBy", "in", chunk));
          const l3Snap = await getDocs(l3Query);
          l3Snap.forEach(doc => l3List.push(doc.data() as UserProfile));
        }
      }
      setLevel3Users(l3List);

      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error("Error fetching team tree:", err);
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchTeamTree(inviteCode);
  }, [inviteCode]);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Helper to get member deposit volume
  const getMemberDeposit = (member: UserProfile) => {
    return member.totalDeposit || 0;
  };

  // Calculate rebate commissions based on team member deposits
  // L1 = 23%, L2 = 3%, L3 = 1%
  const calculateUserRebate = (member: UserProfile, level: 1 | 2 | 3) => {
    const depositVol = getMemberDeposit(member);
    const rate = level === 1 ? 0.23 : level === 2 ? 0.03 : 0.01;
    return Math.round(depositVol * rate);
  };

  const totalL1Deposits = level1Users.reduce((sum, u) => sum + getMemberDeposit(u), 0);
  const totalL2Deposits = level2Users.reduce((sum, u) => sum + getMemberDeposit(u), 0);
  const totalL3Deposits = level3Users.reduce((sum, u) => sum + getMemberDeposit(u), 0);
  const grandTotalTeamDeposits = totalL1Deposits + totalL2Deposits + totalL3Deposits;

  const totalL1Rebate = level1Users.reduce((sum, u) => sum + calculateUserRebate(u, 1), 0);
  const totalL2Rebate = level2Users.reduce((sum, u) => sum + calculateUserRebate(u, 2), 0);
  const totalL3Rebate = level3Users.reduce((sum, u) => sum + calculateUserRebate(u, 3), 0);
  const grandTotalRebate = totalL1Rebate + totalL2Rebate + totalL3Rebate;
  const totalTeamMembers = level1Users.length + level2Users.length + level3Users.length;

  // Filter members by search query
  const matchesSearch = (u: UserProfile) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (u.phone || "").toLowerCase().includes(q) || 
           (u.fullName || "").toLowerCase().includes(q) || 
           (u.referralCode || "").toLowerCase().includes(q);
  };

  const filteredL1 = level1Users.filter(matchesSearch);
  const filteredL2 = level2Users.filter(matchesSearch);
  const filteredL3 = level3Users.filter(matchesSearch);

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in pb-24 pt-2 px-1 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
              Partner Referral Network
            </span>
          </div>
          <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200">
            3-Tier Commission
          </span>
        </div>
        <h1 className="text-xl font-black text-slate-900 font-display">Team Network & Rebates</h1>
        <p className="text-xs text-slate-500 font-medium">Build your downline network and earn up to 27% multi-tier team bonuses.</p>
      </div>

      {/* CARD 1: REFERRAL CODE & LINK WITH GENERATOR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Your Invite Code</span>
          <button
            onClick={() => {
              setShowCodeGenerator(!showCodeGenerator);
              setCustomCodeInput(inviteCode);
              setGeneratorError(null);
            }}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{showCodeGenerator ? "Cancel" : "Generate / Customize Code"}</span>
          </button>
        </div>

        {/* CODE DISPLAY ROW */}
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-200">
          <div>
            <span className="text-2xl font-black text-slate-900 tracking-wider font-mono block">
              {inviteCode}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Unique Partner Referral ID</span>
          </div>
          <button
            onClick={() => copyToClipboard(inviteCode, "Invite Code")}
            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-500 transition cursor-pointer active:scale-95 shadow-xs"
            title="Copy Invite Code"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* CUSTOM CODE GENERATOR MODAL/EXPANDABLE PANEL */}
        {showCodeGenerator && (
          <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Network className="w-4 h-4 text-emerald-600" />
                <span>Customize Referral Code</span>
              </h3>
              <button
                onClick={handleGenerateRandomCode}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Random Code</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                value={customCodeInput}
                onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. VIP_INVESTOR_99"
                maxLength={20}
                className="w-full bg-white text-slate-900 font-mono font-bold text-sm px-3.5 py-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
              <p className="text-[10px] text-slate-500">
                Letters, numbers and underscores allowed. Must be unique across the platform.
              </p>
            </div>

            {generatorError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {generatorError}
              </p>
            )}

            <button
              onClick={handleSaveReferralCode}
              disabled={isGenerating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isGenerating ? "Updating Code..." : "Save & Activate Code"}</span>
            </button>
          </div>
        )}

        {/* INVITATION LINK INPUT */}
        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-600 font-mono truncate flex-1 pl-1">
            {inviteLink}
          </span>
          <button
            onClick={() => copyToClipboard(inviteLink, "Invitation Link")}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
          >
            Copy Link
          </button>
        </div>

        {/* SHARE ACTION */}
        <button
          onClick={handleShare}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Invitation Link</span>
        </button>
      </div>

      {/* CARD 2: TEAM METRICS & REBATE OVERVIEW */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-xs space-y-1 text-center">
          <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Total Team</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-display">
            {totalTeamMembers}
          </div>
          <p className="text-[9px] text-slate-400">Members</p>
        </div>

        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-xs space-y-1 text-center">
          <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-medium">
            <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Team Deposits</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-display truncate">
            ₦{grandTotalTeamDeposits.toLocaleString()}
          </div>
          <p className="text-[9px] text-slate-400">Realtime Deposits</p>
        </div>

        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-xs space-y-1 text-center">
          <div className="flex items-center justify-center space-x-1 text-slate-500 text-[11px] font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Commissions</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 font-display truncate">
            ₦{grandTotalRebate.toLocaleString()}
          </div>
          <p className="text-[9px] text-slate-400">Total Earned</p>
        </div>
      </div>

      {/* REBATE TIER LEVEL BREAKDOWN CARDS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
          <span>Commission Tier Rates</span>
          <span className="text-xs font-bold text-slate-500 lowercase">3-level system</span>
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-100 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Level 1</span>
            <span className="text-lg font-black text-emerald-900 block">23%</span>
            <span className="text-[10px] text-emerald-700 font-semibold block">{level1Users.length} Users</span>
          </div>

          <div className="bg-sky-50/80 rounded-2xl p-3 border border-sky-100 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-sky-700 block">Level 2</span>
            <span className="text-lg font-black text-sky-900 block">3%</span>
            <span className="text-[10px] text-sky-700 font-semibold block">{level2Users.length} Users</span>
          </div>

          <div className="bg-amber-50/80 rounded-2xl p-3 border border-amber-100 text-center space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Level 3</span>
            <span className="text-lg font-black text-amber-900 block">1%</span>
            <span className="text-[10px] text-amber-700 font-semibold block">{level3Users.length} Users</span>
          </div>
        </div>
      </div>

      {/* CARD 3: VISUAL TREE STRUCTURE OF REFERRED USERS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900 font-display">Referral Visual Tree</h2>
          </div>
          <button
            onClick={() => fetchTeamTree(inviteCode)}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-600 transition"
            title="Refresh Tree"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTree ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>

        {/* SEARCH & LEVEL FILTER CONTROLS */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team by phone or code..."
              className="w-full bg-slate-50 text-slate-900 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedLevelFilter("all")}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                selectedLevelFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Network ({totalTeamMembers})
            </button>
            <button
              onClick={() => setSelectedLevelFilter("l1")}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                selectedLevelFilter === "l1"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Level 1 ({level1Users.length})
            </button>
            <button
              onClick={() => setSelectedLevelFilter("l2")}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                selectedLevelFilter === "l2"
                  ? "bg-sky-600 text-white"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              Level 2 ({level2Users.length})
            </button>
            <button
              onClick={() => setSelectedLevelFilter("l3")}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                selectedLevelFilter === "l3"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Level 3 ({level3Users.length})
            </button>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loadingTree ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Building referral hierarchy map...</p>
          </div>
        ) : totalTeamMembers === 0 ? (
          /* EMPTY STATE */
          <div className="bg-slate-50 rounded-2xl p-6 text-center space-y-3 border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">No Downline Partners Yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Share your referral code <span className="font-mono font-extrabold text-slate-800">{inviteCode}</span> to start building your 3-level team network!
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(inviteLink, "Invitation Link")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Invitation Link</span>
            </button>
          </div>
        ) : (
          /* VISUAL HIERARCHICAL TREE LAYOUT */
          <div className="space-y-4 pt-1">
            
            {/* ROOT NODE (Current Investor) */}
            {(selectedLevelFilter === "all" || selectedLevelFilter === "l1") && (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-3.5 shadow-md border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-inner">
                      YOU
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white font-mono">
                          {user.phone ? `${user.phone.slice(0, 7)}***` : "080***"}
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Root Leader
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Code: {inviteCode}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNodeExpand("root")}
                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition"
                  >
                    {expandedNodes["root"] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Downline Team: <strong className="text-white font-bold">{totalTeamMembers}</strong></span>
                  <span>Est. Rebates: <strong className="text-emerald-400 font-bold">₦{grandTotalRebate.toLocaleString()}</strong></span>
                </div>
              </div>
            )}

            {/* TREE BRANCHES & CONNECTORS */}
            <div className="pl-3 sm:pl-4 space-y-3 border-l-2 border-slate-200 ml-4">
              
              {/* LEVEL 1 MEMBERS */}
              {(selectedLevelFilter === "all" || selectedLevelFilter === "l1") && filteredL1.map((l1User, idx) => {
                const l1Rebate = calculateUserRebate(l1User, 1);
                const isExpanded = expandedNodes[l1User.uid];
                
                // Find L2 children of this L1 user
                const directChildren = level2Users.filter(u => u.referredBy === l1User.referralCode);

                return (
                  <div key={l1User.uid || idx} className="relative space-y-2">
                    {/* Branch connector line */}
                    <div className="absolute -left-3 sm:-left-4 top-4 w-3 sm:w-4 h-0.5 bg-slate-200" />

                    {/* LEVEL 1 MEMBER CARD */}
                    <div className="bg-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs hover:border-emerald-400 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                            L1
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block font-mono">
                              {l1User.phone ? `${l1User.phone.slice(0, 7)}***` : `Partner ${idx + 1}`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Joined {l1User.joinedDate || "Recently"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex items-center space-x-2">
                          <div>
                            <span className="text-xs font-extrabold text-emerald-600 block">
                              +₦{l1Rebate.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 block">23% Commission</span>
                          </div>
                          {directChildren.length > 0 && (
                            <button
                              onClick={() => toggleNodeExpand(l1User.uid)}
                              className="p-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                        <span>Deposits: <strong className="text-emerald-700 font-bold">₦{getMemberDeposit(l1User).toLocaleString()}</strong></span>
                        <span>Downline: <strong className="text-slate-800 font-bold">{directChildren.length}</strong></span>
                      </div>
                    </div>

                    {/* LEVEL 2 CHILDREN BRANCH OF THIS L1 MEMBER */}
                    {isExpanded && directChildren.length > 0 && (
                      <div className="pl-3 sm:pl-4 space-y-2 border-l-2 border-sky-200 ml-3">
                        {directChildren.map((l2User, l2Idx) => {
                          const l2Rebate = calculateUserRebate(l2User, 2);
                          const l3Children = level3Users.filter(u => u.referredBy === l2User.referralCode);
                          const isL2Expanded = expandedNodes[l2User.uid];

                          return (
                            <div key={l2User.uid || l2Idx} className="relative space-y-2">
                              <div className="absolute -left-3 sm:-left-4 top-3.5 w-3 sm:w-4 h-0.5 bg-sky-200" />
                              
                              <div className="bg-sky-50/50 rounded-xl p-2.5 border border-sky-200/80 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 text-[9px] font-extrabold flex items-center justify-center shrink-0">
                                      L2
                                    </span>
                                    <div>
                                      <span className="text-xs font-bold text-slate-800 font-mono block">
                                        {l2User.phone ? `${l2User.phone.slice(0, 7)}***` : `L2 Partner`}
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-medium block">
                                        Deposits: ₦{getMemberDeposit(l2User).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-xs font-extrabold text-sky-700">
                                      +₦{l2Rebate.toLocaleString()} (3%)
                                    </span>
                                    {l3Children.length > 0 && (
                                      <button
                                        onClick={() => toggleNodeExpand(l2User.uid)}
                                        className="p-1 rounded-md bg-white text-slate-600 hover:bg-slate-100 transition"
                                      >
                                        {isL2Expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* LEVEL 3 CHILDREN BRANCH */}
                                {isL2Expanded && l3Children.length > 0 && (
                                  <div className="pl-3 space-y-1.5 border-l-2 border-amber-200 ml-2 pt-1">
                                    {l3Children.map((l3User, l3Idx) => {
                                      const l3Rebate = calculateUserRebate(l3User, 3);
                                      return (
                                        <div key={l3User.uid || l3Idx} className="bg-amber-50/60 rounded-lg p-2 border border-amber-200/70 flex items-center justify-between">
                                          <div className="flex items-center space-x-1.5">
                                            <span className="w-4 h-4 rounded-md bg-amber-200 text-amber-900 text-[8px] font-black flex items-center justify-center">
                                              L3
                                            </span>
                                            <div>
                                              <span className="text-[11px] font-bold text-slate-800 font-mono block">
                                                {l3User.phone ? `${l3User.phone.slice(0, 7)}***` : `L3 Partner`}
                                              </span>
                                              <span className="text-[8px] text-slate-500 font-medium block">
                                                Dep: ₦{getMemberDeposit(l3User).toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                          <span className="text-[11px] font-extrabold text-amber-800">
                                            +₦{l3Rebate.toLocaleString()} (1%)
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* UNNESTED LEVEL 2 FILTER VIEW */}
              {selectedLevelFilter === "l2" && filteredL2.map((l2User, idx) => {
                const rebate = calculateUserRebate(l2User, 2);
                return (
                  <div key={l2User.uid || idx} className="bg-sky-50 rounded-2xl p-3 border border-sky-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-sky-200 text-sky-900 text-[10px] font-extrabold flex items-center justify-center">
                        L2
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 font-mono block">
                          {l2User.phone ? `${l2User.phone.slice(0, 7)}***` : `L2 Partner ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">Referred by: {l2User.referredBy}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-sky-700">+₦{rebate.toLocaleString()} (3%)</span>
                  </div>
                );
              })}

              {/* UNNESTED LEVEL 3 FILTER VIEW */}
              {selectedLevelFilter === "l3" && filteredL3.map((l3User, idx) => {
                const rebate = calculateUserRebate(l3User, 3);
                return (
                  <div key={l3User.uid || idx} className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 text-[10px] font-extrabold flex items-center justify-center">
                        L3
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 font-mono block">
                          {l3User.phone ? `${l3User.phone.slice(0, 7)}***` : `L3 Partner ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">Referred by: {l3User.referredBy}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-800">+₦{rebate.toLocaleString()} (1%)</span>
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* SOCIAL SHARING ICONS */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Share invite link on social networks:</p>
          
          <div className="flex items-center gap-2.5">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join Coca-Cola Real Magic Investment! Earn daily returns on sponsorship plans. Use code ${inviteCode} or register here: ${inviteLink}`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>

            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`Join Coca-Cola Real Magic Investment! Use referral code: ${inviteCode}`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-xl bg-sky-50 text-sky-500 hover:bg-sky-100 flex items-center justify-center transition"
              title="Share on Telegram"
            >
              <Send className="w-4 h-4" />
            </a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition"
              title="Share on Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>

            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`Join Coca-Cola Real Magic Investment! Use referral code: ${inviteCode}`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition"
              title="Share on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>

            <button
              onClick={() => copyToClipboard(inviteLink, "Invitation Link")}
              className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center justify-center transition cursor-pointer"
              title="Copy Link"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING CUSTOMER SUPPORT BUTTON */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95 border border-slate-700"
        title="Customer Service"
      >
        <Headphones className="w-5 h-5 text-emerald-400" />
      </button>

      {/* CUSTOMER SERVICE MODAL */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl text-center">
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <Headphones className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Partner Support Desk</h3>
              <p className="text-xs text-slate-500">
                Our support desk is available 24/7 to assist with referral commissions, team tree tracking, and deposits.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a 
                href="https://t.me/+rCmqVoNN7SgwMzY8"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition block"
              >
                <span>Telegram Support Channel</span>
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

