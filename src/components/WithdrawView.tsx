import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, AlertTriangle, Headphones, Plus, CreditCard, CheckCircle2, X, ArrowUp, Sparkles, Check, Building2, Lock, Wallet
} from "lucide-react";
import { UserProfile } from "../types";
import { db, auth } from "../lib/firebase";
import { doc, updateDoc, collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { NIGERIAN_BANKS, predictBankFromNuban, resolveNubanAccount, BankInfo } from "../utils/nuban";
import { notifyToast } from "../utils/toast";

interface WithdrawViewProps {
  user: UserProfile;
  onBack: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  onSuccess?: () => void;
  onNavigateToRecharge?: () => void;
}

const PRESET_WITHDRAWALS = [1200, 5000, 20000, 50000, 100000];

export default function WithdrawView({ user, onBack, onUpdateUser, onSuccess, onNavigateToRecharge }: WithdrawViewProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | "">(1200);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  
  // Deposit verification state
  const [hasMadeDeposit, setHasMadeDeposit] = useState<boolean>(true);
  const [checkingDepositStatus, setCheckingDepositStatus] = useState<boolean>(true);

  // Bank details form
  const [bankName, setBankName] = useState(user.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user.bankAccount || "");
  const [accountName, setAccountName] = useState(user.fullName || "");
  const [savingCard, setSavingCard] = useState(false);

  // NUBAN prediction & auto-resolution states
  const [predictedBank, setPredictedBank] = useState<BankInfo | null>(null);
  const [resolvingNuban, setResolvingNuban] = useState(false);
  const [nubanVerified, setNubanVerified] = useState(false);

  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Check deposit requirement for withdrawals
  useEffect(() => {
    const checkDepositHistory = async () => {
      try {
        const uid = auth.currentUser?.uid || user.uid;
        if (!uid) {
          setCheckingDepositStatus(false);
          return;
        }

        if ((user as any).totalDeposit && (user as any).totalDeposit > 0) {
          setHasMadeDeposit(true);
          setCheckingDepositStatus(false);
          return;
        }

        const transRef = collection(db, "users", uid, "transactions");
        const q = query(transRef, where("type", "==", "deposit"));
        const snap = await getDocs(q);

        if (!snap.empty) {
          setHasMadeDeposit(true);
        } else {
          setHasMadeDeposit(false);
        }
      } catch (e) {
        console.warn("Deposit check error:", e);
        setHasMadeDeposit(false);
      } finally {
        setCheckingDepositStatus(false);
      }
    };
    checkDepositHistory();
  }, [user]);

  const currentBankCard = user.bankAccount ? {
    bankName: user.bankName || "Bank Account",
    accountNumber: user.bankAccount,
    accountName: user.fullName || "Account Holder"
  } : null;

  // Real-time NUBAN bank prediction and account name lookup
  useEffect(() => {
    const cleanNum = accountNumber.replace(/\D/g, "");
    if (cleanNum.length >= 3) {
      const bank = predictBankFromNuban(cleanNum);
      if (bank) {
        setPredictedBank(bank);
        if (!bankName || bankName === "Bank Account") {
          setBankName(bank.name);
        }
      }
    } else {
      setPredictedBank(null);
    }

    if (cleanNum.length === 10) {
      setResolvingNuban(true);
      const targetBank = predictedBank ? predictedBank.name : (bankName || "Commercial Bank");
      resolveNubanAccount(cleanNum, targetBank, user.fullName).then((res) => {
        setAccountName(res.accountName);
        setNubanVerified(res.isVerified);
        setResolvingNuban(false);
      });
    } else {
      setNubanVerified(false);
    }
  }, [accountNumber]);

  const handleSaveBankCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      alert("Please fill in all bank details.");
      return;
    }

    setSavingCard(true);
    try {
      const uid = auth.currentUser?.uid || user.uid;
      if (uid) {
        const userRef = doc(db, "users", uid);
        const updated = {
          ...user,
          bankName,
          bankAccount: accountNumber,
          fullName: accountName
        };
        await updateDoc(userRef, {
          bankName,
          bankAccount: accountNumber,
          fullName: accountName
        });
        if (onUpdateUser) onUpdateUser(updated);
      }
      setShowAddCardModal(false);
    } catch (err) {
      console.error("Error saving bank card:", err);
      alert("Failed to save bank card. Please try again.");
    } finally {
      setSavingCard(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    setErrorMessage("");

    if (!hasMadeDeposit) {
      setErrorMessage("You must complete at least one deposit (minimum ₦3,000) before you can place a withdrawal request.");
      return;
    }

    const amt = typeof selectedAmount === "number" ? selectedAmount : parseFloat(selectedAmount as string);

    if (!amt || isNaN(amt)) {
      setErrorMessage("Please select or enter a valid amount.");
      return;
    }

    if (amt < 1200) {
      setErrorMessage("The minimum withdrawal amount is ₦1,200.");
      return;
    }

    if (!user.bankAccount) {
      setShowAddCardModal(true);
      return;
    }

    if (user.balance < amt) {
      setErrorMessage("Insufficient account balance for this withdrawal.");
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      const uid = auth.currentUser?.uid || user.uid;
      const netPayout = Math.round(amt * 0.88); // 12% fee deducted

      if (uid) {
        const newBalance = user.balance - amt;
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          balance: newBalance
        });

        const transRef = collection(db, "users", uid, "transactions");
        await addDoc(transRef, {
          type: "withdrawal",
          amount: amt,
          fee: Math.round(amt * 0.12),
          netPayout,
          status: "pending",
          timestamp: new Date().toLocaleString("en-NG"),
          details: `Withdrawal to ${user.bankName} (${user.bankAccount})`,
          createdAt: serverTimestamp()
        });

        if (onUpdateUser) {
          onUpdateUser({
            ...user,
            balance: newBalance
          });
        }
      }

      setWithdrawalSuccess(true);
      notifyToast({
        title: "⏳ Withdrawal Requested",
        message: `Your request for ₦${amt.toLocaleString()} has been submitted for admin processing.`,
        type: "info",
        amount: amt
      });
    } catch (err) {
      console.error("Withdrawal error:", err);
      setErrorMessage("Withdrawal failed. Please check your network connection.");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const parsedAmt = typeof selectedAmount === "number" ? selectedAmount : parseFloat(selectedAmount as string);
  const isFormValid = !!(
    hasMadeDeposit &&
    parsedAmt && 
    !isNaN(parsedAmt) && 
    parsedAmt >= 1200 && 
    user.bankAccount
  );

  return (
    <div className="min-h-screen bg-[#f8f7f5] pb-36 font-sans animate-fade-in relative">
      
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 flex items-center justify-between shadow-xs">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-800 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display">
          Withdraw Funds
        </h1>
        <div className="w-8" />
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5">

        {/* Deposit Requirement Warning Banner */}
        {!hasMadeDeposit && !checkingDepositStatus && (
          <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 text-amber-900 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-amber-950">Deposit Verification Required</h3>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  To protect partner accounts, you must make at least one initial deposit (minimum ₦3,000) before you can initiate withdrawal payouts.
                </p>
              </div>
            </div>

            {onNavigateToRecharge && (
              <button
                onClick={onNavigateToRecharge}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Recharge Account Now</span>
              </button>
            )}
          </div>
        )}

        {/* Card 1: Amount Selection & Custom Input */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Withdrawal Amount</p>
            <span className="text-[10px] font-mono text-slate-400">Min: ₦1,200</span>
          </div>

          {/* Editable Custom Withdrawal Input */}
          <div className="bg-[#fff2ed]/70 rounded-2xl p-4 text-center border border-[#ffccd0]/70 space-y-2">
            <div className="flex items-center justify-center space-x-1">
              <span className="text-2xl sm:text-3xl font-black text-[#c83a00]">₦</span>
              <input
                type="number"
                value={selectedAmount === "" ? "" : selectedAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAmount(val === "" ? "" : Number(val));
                  setErrorMessage("");
                }}
                placeholder="1200"
                min={1200}
                className="bg-white text-2xl sm:text-3xl font-black text-[#c83a00] text-center w-full max-w-[220px] px-3 py-1.5 rounded-xl border border-[#ffccd0] focus:outline-none focus:ring-2 focus:ring-[#c83a00] shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Type custom withdrawal amount or tap a preset chip below
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 font-mono">
            ₦1,200 ~ ₦1,000,000
          </p>

          {/* Preset Buttons Grid (3 cols) */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {PRESET_WITHDRAWALS.map((amt) => {
              const isSelected = selectedAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setErrorMessage("");
                  }}
                  className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-white text-[#c83a00] border-2 border-[#c83a00] shadow-xs font-bold"
                      : "bg-white text-slate-800 border border-slate-300 hover:border-slate-400 font-medium"
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs text-center font-bold">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Card 2: WITHDRAW TO Section */}
        <div className="space-y-2 pt-1">
          <p className="text-xs text-slate-400 font-bold tracking-wider uppercase px-1">
            WITHDRAW TO
          </p>

          {!currentBankCard ? (
            /* Add Card Box matching exact styling from screenshot */
            <button
              onClick={() => setShowAddCardModal(true)}
              className="w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xs border-dashed hover:border-[#c83a00] transition flex flex-col items-center justify-center space-y-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-[#c83a00] group-hover:border-[#c83a00] transition">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-[#c83a00]">
                Add card
              </span>
            </button>
          ) : (
            /* Display Linked Bank Card */
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#fff2ed] text-[#c83a00] flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{currentBankCard.bankName}</h3>
                    <p className="text-xs text-slate-500 font-mono">•••• {currentBankCard.accountNumber.slice(-4)}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddCardModal(true)}
                  className="text-xs font-bold text-[#c83a00] bg-[#fff2ed] hover:bg-[#ffe5dc] px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Edit
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <span>Account Name:</span>
                <span className="font-bold text-slate-800">{currentBankCard.accountName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Withdrawal Rules */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-slate-600 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Withdrawal Rules:</span>
          </div>

          <ol className="space-y-3 text-xs text-slate-500 leading-relaxed list-decimal pl-4 font-normal">
            <li>
              The minimum withdrawal amount is <strong className="text-slate-800 font-bold">₦1200</strong>.
            </li>
            <li>
              There is no limit to the number of withdrawals per day.
            </li>
            <li>
              A 12% processing fee will be charged for each withdrawal.
            </li>
            <li>
              If a withdrawal fails, you may resubmit your request or attempt to withdraw using a different bank account.
            </li>
            <li>
              Withdrawal requests are processed Monday through Sunday, from <strong className="text-slate-800 font-bold">10:00 AM to 5:00 PM</strong>.
            </li>
            <li>
              Withdrawn funds will be credited to your account within 24 hours (barring exceptional circumstances). Please wait patiently while our banking team processes your withdrawal request.
            </li>
          </ol>
        </div>

      </div>

      {/* Floating Customer Service Headphones Button */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-[#c83a00] hover:bg-[#a32e00] text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95"
        title="Customer Support"
      >
        <Headphones className="w-6 h-6" />
      </button>

      {/* Bottom Fixed Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 z-50 shadow-2xl space-y-1.5 text-center">
        <div className="max-w-md mx-auto space-y-1.5">
          <button
            onClick={handleConfirmWithdrawal}
            disabled={!isFormValid || submittingWithdrawal}
            className={`w-full font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition shadow-xs cursor-pointer active:scale-98 ${
              isFormValid && !submittingWithdrawal
                ? "bg-[#c83a00] hover:bg-[#a32e00] text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <ArrowUp className="w-5 h-5" />
            <span>{submittingWithdrawal ? "Processing..." : "Confirm withdrawal"}</span>
          </button>

          <p className="text-[11px] text-slate-400 font-medium">
            Service hours: 09:00-19:00
          </p>
        </div>
      </div>

      {/* Add Bank Card Modal with Smart NUBAN Bank Prediction */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setShowAddCardModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#c83a00]" />
                <h3 className="text-lg font-bold text-slate-900">Link Bank Account</h3>
              </div>
              <p className="text-xs text-slate-500">
                Supports automatic NUBAN bank prediction and NIBSS verification.
              </p>
            </div>

            <form onSubmit={handleSaveBankCard} className="space-y-3 pt-1">
              
              {/* Account Number with Auto-Prediction */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">10-Digit Account Number</label>
                  {resolvingNuban && (
                    <span className="text-[10px] text-[#c83a00] font-medium flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3" /> NIBSS Lookup...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 0120122888"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-sm font-mono font-bold outline-none focus:border-[#c83a00]"
                  required
                />
              </div>

              {/* Predicted Bank Indicator Pill */}
              {predictedBank && (
                <div className="p-2.5 rounded-xl border flex items-center justify-between text-xs animate-fade-in" style={{ backgroundColor: predictedBank.bgLight, borderColor: predictedBank.color }}>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: predictedBank.color }} />
                    <span className="font-bold text-slate-900">
                      Auto-Detected: {predictedBank.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-white rounded text-slate-700 shadow-2xs">
                    NUBAN Match
                  </span>
                </div>
              )}

              {/* Bank Selection Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Select Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#c83a00] bg-white cursor-pointer"
                  required
                >
                  <option value="">-- Choose Bank --</option>
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Account Name</label>
                  {nubanVerified && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> NUBAN Verified
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Official name on bank account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className={`w-full px-3.5 py-3 rounded-2xl border text-xs font-medium outline-none focus:border-[#c83a00] ${
                    nubanVerified ? "bg-emerald-50/50 border-emerald-200 text-emerald-950 font-bold" : "border-slate-200"
                  }`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingCard}
                className="w-full bg-[#c83a00] hover:bg-[#a32e00] text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer mt-2"
              >
                {savingCard ? "Linking Card..." : "Save Bank Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Success Confirmation Modal */}
      {withdrawalSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 relative shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Withdrawal Submitted!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your request to withdraw <strong className="text-slate-900">₦{typeof selectedAmount === "number" ? selectedAmount.toLocaleString() : selectedAmount}</strong> has been received.
              </p>
              <p className="text-[11px] text-slate-400">
                Net payout after 12% fee: <strong className="text-slate-800">₦{Math.round((typeof selectedAmount === "number" ? selectedAmount : 1200) * 0.88).toLocaleString()}</strong>
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Funds will be processed directly to your local bank account within standard processing hours.
              </p>
            </div>

            <button
              onClick={() => {
                setWithdrawalSuccess(false);
                if (onSuccess) onSuccess();
                else onBack();
              }}
              className="w-full bg-[#c83a00] text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Support CS Modal */}
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
              <h3 className="text-xl font-extrabold text-slate-900">Withdrawal Support</h3>
              <p className="text-xs text-slate-500">
                Need help with your payout or bank card link? Contact our support team.
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
