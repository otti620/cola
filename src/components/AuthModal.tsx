import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Handshake, Coins } from "lucide-react";
import { UserProfile } from "../types";
import { auth, db } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
  initialUser?: UserProfile | null;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let extractedRef: string | null = null;
      try {
        const params = new URLSearchParams(window.location.search);
        extractedRef = params.get("ref") || params.get("invite") || params.get("code") || params.get("referral");

        if (!extractedRef && window.location.hash) {
          const hashStr = window.location.hash;
          const qIdx = hashStr.indexOf("?");
          if (qIdx !== -1) {
            const hashParams = new URLSearchParams(hashStr.substring(qIdx));
            extractedRef = hashParams.get("ref") || hashParams.get("invite") || hashParams.get("code") || hashParams.get("referral");
          }
        }

        if (!extractedRef) {
          const match = window.location.href.match(/[?&](?:ref|invite|code|referral)=([a-zA-Z0-9_\-]+)/i);
          if (match && match[1]) {
            extractedRef = match[1];
          }
        }
      } catch (e) {
        console.warn("Error parsing referral URL in AuthModal:", e);
      }

      if (extractedRef) {
        const cleanRef = extractedRef.trim().toUpperCase();
        setInviteCode(cleanRef);
        localStorage.setItem("pending_referral_code", cleanRef);
        setIsLogin(false);
      } else {
        const savedCode = localStorage.getItem("pending_referral_code");
        if (savedCode) {
          setInviteCode(savedCode.trim().toUpperCase());
          setIsLogin(false);
        }
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const cleanPhone = phone.trim().replace(/^0/, "");
    const fullPhone = `+234${cleanPhone}`;
    const derivedEmail = `${cleanPhone}@careem-invest.com`;

    setLoading(true);
    try {
      if (isLogin) {
        // Sign In Flow
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, derivedEmail, password);
        } catch (authErr: any) {
          console.error("Firebase Sign In error:", authErr);
          const code = authErr.code || "";
          if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
            setError("Invalid phone number or password. If you don't have an account, please Sign Up.");
          } else if (code === "auth/too-many-requests") {
            setError("Too many login attempts. Please try again in a few minutes.");
          } else {
            setError("Account not found or password incorrect. Please sign up or check your details.");
          }
          setLoading(false);
          return;
        }

        const uid = userCredential.user.uid;
        const userRef = doc(db, "users", uid);
        let loggedInUser: UserProfile | null = null;

        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            loggedInUser = userSnap.data() as UserProfile;
          } else {
            // Create profile in Firestore if absent
            loggedInUser = {
              uid,
              phone: fullPhone,
              email: derivedEmail,
              fullName: `Investor Partner ${cleanPhone.slice(-4)}`,
              balance: 1100,
              totalProfit: 0,
              referralCode: "COCA_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
              joinedDate: new Date().toLocaleDateString("en-NG", { year: 'numeric', month: 'short', day: 'numeric' }),
              creditScore: 100,
              currentTierId: "",
              gameOpportunities: 0,
              password: password
            };
            await setDoc(userRef, loggedInUser);
          }
        } catch (dbErr) {
          console.error("Firestore fetch error on sign in:", dbErr);
        }

        if (!loggedInUser) {
          loggedInUser = {
            uid,
            phone: fullPhone,
            email: derivedEmail,
            fullName: `Investor Partner ${cleanPhone.slice(-4)}`,
            balance: 1100,
            totalProfit: 0,
            referralCode: "COCA_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
            joinedDate: new Date().toLocaleDateString("en-NG", { year: 'numeric', month: 'short', day: 'numeric' }),
            creditScore: 100,
            currentTierId: "",
            gameOpportunities: 0,
            password: password
          };
        }

        if (loggedInUser && loggedInUser.isBanned) {
          setError(`ACCOUNT SUSPENDED: ${loggedInUser.bannedReason || "Your partner account has been suspended by administration due to policy violations."}`);
          setLoading(false);
          try {
            await signOut(auth);
          } catch (e) {}
          return;
        }

        localStorage.setItem("cocacola_invest_user", JSON.stringify(loggedInUser));
        onSuccess(loggedInUser);

      } else {
        // Sign Up Flow
        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, derivedEmail, password);
        } catch (createErr: any) {
          console.error("Firebase Sign Up error:", createErr);
          const code = createErr.code || "";
          if (code === "auth/email-already-in-use") {
            setError("This phone number is already registered. Please switch to Sign In.");
            setLoading(false);
            return;
          } else if (code === "auth/weak-password") {
            setError("Password is too weak. Please use at least 6 characters.");
            setLoading(false);
            return;
          } else {
            // If email format fails or other auth error
            setError("Failed to create account. " + (createErr.message || "Please check your phone number."));
            setLoading(false);
            return;
          }
        }

        const uid = userCredential.user.uid;
        const newUser: UserProfile = {
          uid,
          phone: fullPhone,
          email: derivedEmail,
          fullName: `Investor Partner ${cleanPhone.slice(-4)}`,
          balance: 1100, // ₦1,100 registration bonus
          totalDeposit: 0,
          totalProfit: 0,
          referralCode: "COCA_" + Math.random().toString(36).substring(2, 7).toUpperCase(),
          referredBy: (inviteCode || localStorage.getItem("pending_referral_code") || "").trim().toUpperCase() || null,
          joinedDate: new Date().toLocaleDateString("en-NG", { year: 'numeric', month: 'short', day: 'numeric' }),
          creditScore: 100,
          currentTierId: "",
          gameOpportunities: 0,
          password: password,
          oldPassword: password
        };

        try {
          await setDoc(doc(db, "users", uid), newUser);
        } catch (setErr) {
          console.error("Firestore write user document error:", setErr);
        }

        // Clean pending referral code from localStorage (referredBy is stored in user profile for deposit commission)
        localStorage.removeItem("pending_referral_code");

        localStorage.setItem("cocacola_invest_user", JSON.stringify(newUser));
        onSuccess(newUser);
      }
    } catch (err: any) {
      console.error("General Auth error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f7f5] text-slate-800 font-sans flex flex-col justify-between p-6 max-w-md mx-auto animate-fade-in">
      <div className="pt-8">
        {/* Main Title & Subtitle */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black text-[#e41e2b] tracking-wider uppercase font-display italic">
            Coca-Cola
          </h1>
          <p className="text-sm italic text-slate-400 font-medium tracking-wide">
            Real Magic Investments
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Phone Number Input */}
          <div className="flex bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden focus-within:border-[#e41e2b] transition">
            <div className="px-4 py-4 bg-transparent border-r border-slate-200/80 font-bold text-slate-800 text-sm flex items-center justify-center shrink-0">
              +234
            </div>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-4 text-sm text-slate-800 placeholder-slate-400 outline-none font-normal bg-transparent"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden focus-within:border-[#e41e2b] transition">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none font-normal bg-transparent"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* SIGN UP EXCLUSIVE FIELDS */}
          {!isLogin && (
            <>
              {/* Re-enter Password */}
              <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden focus-within:border-[#e41e2b] transition">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-4 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none font-normal bg-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Optional Invite Code */}
              <div className="space-y-1 pt-1">
                <span className="text-xs text-slate-400 font-medium ml-1 block">Optional</span>
                <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex items-center px-4 py-3.5 focus-within:border-[#e41e2b] transition">
                  <Handshake className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                  <input
                    type="text"
                    placeholder="Enter the invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none font-normal bg-transparent"
                  />
                </div>
              </div>

              {/* Bonus Notification Banner */}
              <div className="w-full bg-[#fff0f1] text-[#e41e2b] py-3.5 px-4 rounded-2xl border border-[#ffccd0] font-bold text-xs text-center flex items-center justify-center gap-2 shadow-xs">
                <Coins className="w-4 h-4 shrink-0 text-[#e41e2b]" />
                <span>Get a 1100 ₦ registration bonus</span>
              </div>
            </>
          )}

          {/* SIGN IN EXCLUSIVE ROW */}
          {isLogin && (
            <div className="flex items-center justify-between text-xs font-normal text-slate-600 pt-1 px-1">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#e41e2b] focus:ring-[#e41e2b] accent-[#e41e2b]"
                />
                <span>Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={() => alert("Please contact Coca-Cola Invest Customer Support on Telegram to reset your password.")}
                className="text-slate-500 hover:text-[#e41e2b] cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-[#e41e2b] hover:bg-[#c41622] text-white font-bold py-4 rounded-2xl text-base transition duration-150 flex items-center justify-center cursor-pointer shadow-xs active:scale-98"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isLogin ? "Sign in" : "Sign up"}</span>
            )}
          </button>
        </form>

        {/* Switch mode / secondary button */}
        <div className="mt-8 text-center text-xs text-slate-600 space-y-4">
          {isLogin ? (
            <div className="space-y-4">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs font-medium">
                  Don't have an account?
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="w-full bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold py-4 rounded-2xl text-base transition shadow-xs cursor-pointer active:scale-98"
              >
                Sign up
              </button>
            </div>
          ) : (
            <div className="text-slate-600 pt-2 text-xs">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="font-bold text-slate-900 hover:text-[#e41e2b] cursor-pointer underline underline-offset-2"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 py-4 font-medium">
        Coca-Cola Invest &copy; {new Date().getFullYear()} • Real Magic Investments
      </div>
    </div>
  );
}
