import React, { useState, useEffect } from "react";
import { 
  Copy, Share2, Headphones, CheckCircle2, MessageCircle, Send, Facebook, Twitter, Link2, X
} from "lucide-react";
import { UserProfile } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface TeamTabProps {
  user: UserProfile;
}

export default function TeamTab({ user }: TeamTabProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const inviteLink = typeof window !== "undefined" 
    ? `${window.location.origin}/register?ref=${user.referralCode || "9JFXJX"}`
    : `https://www.cocacolainvest.com/register?ref=${user.referralCode || "9JFXJX"}`;

  const refCode = user.referralCode || "9JFXJX";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`Copied ${label} to clipboard!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Coca-Cola Invest Platform",
          text: `Use my invite code ${refCode} to earn daily returns on Coca-Cola Invest sponsorship!`,
          url: inviteLink,
        });
      } catch (err) {
        console.log("Share dismissed");
      }
    } else {
      copyToClipboard(inviteLink, "Invitation Link");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in pb-20 pt-2 px-1 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* COCA-COLA PARTNER REFERRAL PORTAL HEADER */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-1">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e41e2b] animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#e41e2b]">
            Coca-Cola Partner Referral Portal
          </span>
        </div>
        <h1 className="text-xl font-black text-slate-900 font-display">Invite & Earn Dividends</h1>
        <p className="text-xs text-slate-500 font-medium">Earn up to 27% multi-tier team commissions on direct referral investments</p>
      </div>

      {/* CARD 1: INVITE CODE CARD */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3.5">
        <span className="text-xs text-slate-500 font-medium">Invite code</span>
        
        {/* Code display with copy icon button */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-3xl font-black text-slate-900 tracking-wider font-mono">
            {refCode}
          </span>
          <button
            onClick={() => copyToClipboard(refCode, "Invite Code")}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#e41e2b] hover:border-[#e41e2b] transition cursor-pointer active:scale-95"
            title="Copy Invite Code"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* Input link with red Copy button inside */}
        <div className="bg-[#f8f7f5] rounded-2xl p-2.5 border border-slate-200 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 font-mono truncate flex-1 pl-1">
            {inviteLink}
          </span>
          <button
            onClick={() => copyToClipboard(inviteLink, "Invitation Link")}
            className="text-xs font-bold text-[#e41e2b] hover:text-[#c41622] px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 font-sans"
          >
            Copy
          </button>
        </div>

        {/* Rebate Tier Summary line */}
        <p className="text-xs text-slate-500 font-medium pt-0.5">
          L1: 23% · L2: 3% · L3: 1%
        </p>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 rounded-2xl border border-slate-300 text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Share2 className="w-4 h-4 text-slate-700" />
          <span>Share</span>
        </button>
      </div>

      {/* CARD 2: REBATE CARD */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Rebate</h2>

        {/* Level Rows */}
        <div className="space-y-3.5">
          {/* Level 1 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-[#e41e2b] text-white text-xs font-bold flex items-center justify-center shrink-0">
                L1
              </span>
              <span className="text-xs font-bold text-slate-800">Level 1 (direct)</span>
            </div>
            <div className="h-2 bg-[#e41e2b] rounded-full w-full" />
          </div>

          {/* Level 2 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-[#fff0f1] text-[#e41e2b] text-xs font-bold flex items-center justify-center shrink-0">
                L2
              </span>
              <span className="text-xs font-bold text-slate-800">Level 2</span>
            </div>
            <div className="h-1.5 bg-[#e41e2b]/30 rounded-full w-2/5" />
          </div>

          {/* Level 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-[#fff0f1] text-[#e41e2b] text-xs font-bold flex items-center justify-center shrink-0">
                L3
              </span>
              <span className="text-xs font-bold text-slate-800">Level 3</span>
            </div>
            <div className="h-1.5 bg-[#e41e2b]/20 rounded-full w-12" />
          </div>
        </div>

        {/* Text Guidelines */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500 leading-relaxed font-medium">
          <h3 className="font-bold text-slate-800 text-sm">3-Level Commission System.</h3>
          <p className="text-slate-400">
            (You will receive a percentage rebate for each equipment investment made by your downline members.)
          </p>

          <div className="space-y-1 pt-1 font-medium text-slate-600">
            <p>Level 1: <strong className="text-slate-900 font-bold">23%</strong> Commission</p>
            <p>Level 2: <strong className="text-slate-900 font-bold">3%</strong> Commission</p>
            <p>Level 3: <strong className="text-slate-900 font-bold">1%</strong> Commission</p>
          </div>
        </div>

        {/* Social Sharing Icons */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Share your invitation link on:</p>
          
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join IITA Agricultural Yield Platform! Registration link: ${inviteLink}`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </a>

            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Join IITA Agricultural Yield Platform!")}`}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-500 hover:bg-sky-100 flex items-center justify-center transition"
              title="Share on Telegram"
            >
              <Send className="w-5 h-5" />
            </a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition"
              title="Share on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>

            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Join IITA Agricultural Yield Platform!")}`}
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition"
              title="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>

            <button
              onClick={() => copyToClipboard(inviteLink, "Invitation Link")}
              className="w-10 h-10 rounded-2xl bg-[#fff2ed] text-[#c83a00] hover:bg-[#ffe5dc] flex items-center justify-center transition cursor-pointer"
              title="Copy Link"
            >
              <Link2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Customer Service Button */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-[#c83a00] hover:bg-[#a32e00] text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95"
        title="Customer Service"
      >
        <Headphones className="w-6 h-6" />
      </button>

      {/* Support / Customer Service Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl text-center">
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#fff2ed] flex items-center justify-center text-[#c83a00] mx-auto">
              <Headphones className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">IITA Customer Care</h3>
              <p className="text-xs text-slate-500">
                Our support team is available 24/7 to assist with deposits, withdrawals, and account inquiries.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a 
                href="https://t.me/careeminvest"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition block"
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
