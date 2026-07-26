import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, collection, getDocs, doc, updateDoc, addDoc, query, where, serverTimestamp 
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };
import { INVESTMENT_TIERS } from "../data";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const dbId = (firebaseConfig as any).firestoreDatabaseId;
const db = dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);

export interface DailyReturnResult {
  success: boolean;
  usersProcessed: number;
  dividendsCredited: number;
  totalPayoutAmount: number;
  timestamp: string;
  error?: string;
}

let quotaExceededUntil = 0;

export async function processDailyReturns(): Promise<DailyReturnResult> {
  if (Date.now() < quotaExceededUntil) {
    console.log("⏸️ Daily Return Engine paused (Quota cooldown active)");
    return {
      success: false,
      usersProcessed: 0,
      dividendsCredited: 0,
      totalPayoutAmount: 0,
      timestamp: new Date().toISOString(),
      error: "Firestore daily free read quota limit reached. Paused until quota resets."
    };
  }

  console.log("🔄 Starting Daily Return Engine calculation...");
  let usersProcessed = 0;
  let dividendsCredited = 0;
  let totalPayoutAmount = 0;

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    
    for (const userDoc of usersSnap.docs) {
      usersProcessed++;
      const userData = userDoc.data();
      const uid = userDoc.id;
      let userBalance = userData.balance || 0;
      let userTotalProfit = userData.totalProfit || 0;
      let userUpdated = false;

      // 1. Process active investments subcollection
      const investRef = collection(db, "users", uid, "investments");
      let activeInvestSnap: any = { docs: [], empty: true };
      try {
        activeInvestSnap = await getDocs(query(investRef, where("status", "==", "active")));
      } catch (err: any) {
        console.warn(`[DailyReturnEngine] Could not read investments for user ${uid}:`, err?.message);
      }

      for (const invDoc of activeInvestSnap.docs) {
        const inv = invDoc.data();
        const invId = invDoc.id;

        const daysRemaining = typeof inv.daysRemaining === "number" ? inv.daysRemaining : 100;
        if (daysRemaining <= 0) continue;

        const lastPayoutAt = inv.lastPayoutAt || inv.createdAt?.toMillis?.() || (Date.now() - 86400000);
        const elapsedMs = Date.now() - lastPayoutAt;
        const ONE_DAY_MS = 86400000;

        if (elapsedMs >= ONE_DAY_MS) {
          const pendingCycles = Math.min(daysRemaining, Math.floor(elapsedMs / ONE_DAY_MS));
          if (pendingCycles <= 0) continue;

          let payoutPerDay = inv.dailyReward;
          if (!payoutPerDay && inv.amountInvested && inv.dailyInterestRate) {
            payoutPerDay = inv.amountInvested * inv.dailyInterestRate;
          }
          if (!payoutPerDay && inv.planId) {
            const matchedTier = INVESTMENT_TIERS.find(t => t.id === inv.planId);
            if (matchedTier) payoutPerDay = matchedTier.dailyReward;
          }
          if (!payoutPerDay) payoutPerDay = (inv.amountInvested || 1000) * 0.1;

          const totalDividend = payoutPerDay * pendingCycles;
          const newDaysRemaining = daysRemaining - pendingCycles;
          const newStatus = newDaysRemaining <= 0 ? "completed" : "active";
          const newAccumulatedProfit = (inv.accumulatedProfit || 0) + totalDividend;

          // Update investment document
          try {
            await updateDoc(doc(db, "users", uid, "investments", invId), {
              daysRemaining: newDaysRemaining,
              accumulatedProfit: newAccumulatedProfit,
              status: newStatus,
              lastPayoutAt: Date.now(),
              lastPayoutDate: new Date().toISOString()
            });
          } catch (e) {
            console.warn(`[DailyReturnEngine] Failed to update investment doc ${invId}:`, e);
          }

          // Accumulate user balance
          userBalance += totalDividend;
          userTotalProfit += totalDividend;
          userUpdated = true;
          dividendsCredited++;
          totalPayoutAmount += totalDividend;

          // Add transaction log
          try {
            const transRef = collection(db, "users", uid, "transactions");
            await addDoc(transRef, {
              type: "deposit",
              amount: totalDividend,
              status: "approved",
              details: `Auto Daily Dividend: ${inv.planName || "Investment Plan"} (${pendingCycles} day payout)`,
              timestamp: new Date().toLocaleString("en-NG"),
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.warn(`[DailyReturnEngine] Failed to log transaction for ${uid}:`, e);
          }
        }
      }

      // 2. Check if user has currentTierId but no investment doc in Firestore subcollection yet
      if (userData.currentTierId && activeInvestSnap.empty) {
        const matchedTier = INVESTMENT_TIERS.find(t => t.id === userData.currentTierId);
        if (matchedTier) {
          try {
            // Auto create investment doc for existing currentTierId
            await addDoc(investRef, {
              id: "inv_" + Math.random().toString(36).substring(2, 8),
              planId: matchedTier.id,
              planName: matchedTier.name,
              amountInvested: matchedTier.price,
              dailyInterestRate: matchedTier.dailyReward / matchedTier.price,
              dailyReward: matchedTier.dailyReward,
              durationDays: matchedTier.durationDays || 100,
              daysRemaining: (matchedTier.durationDays || 100) - 1,
              accumulatedProfit: matchedTier.dailyReward,
              startDate: new Date().toLocaleDateString("en-NG"),
              lastPayoutAt: Date.now(),
              endDate: new Date(Date.now() + 86400000 * (matchedTier.durationDays || 100)).toLocaleDateString("en-NG"),
              status: "active",
              createdAt: serverTimestamp()
            });

            userBalance += matchedTier.dailyReward;
            userTotalProfit += matchedTier.dailyReward;
            userUpdated = true;
            dividendsCredited++;
            totalPayoutAmount += matchedTier.dailyReward;

            const transRef = collection(db, "users", uid, "transactions");
            await addDoc(transRef, {
              type: "deposit",
              amount: matchedTier.dailyReward,
              status: "approved",
              details: `Auto Daily Dividend: ${matchedTier.name} (Tier Payout)`,
              timestamp: new Date().toLocaleString("en-NG"),
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.warn(`[DailyReturnEngine] Auto-tier creation failed for ${uid}:`, e);
          }
        }
      }

      // Save user balance updates if any dividends were credited
      if (userUpdated) {
        try {
          await updateDoc(doc(db, "users", uid), {
            balance: userBalance,
            totalProfit: userTotalProfit,
            lastDividendProcessedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn(`[DailyReturnEngine] Failed user balance update for ${uid}:`, e);
        }
      }
    }

    console.log(`✅ Daily Return Engine completed: ${dividendsCredited} payouts credited to ${usersProcessed} users, total ₦${totalPayoutAmount.toLocaleString()}`);

    return {
      success: true,
      usersProcessed,
      dividendsCredited,
      totalPayoutAmount,
      timestamp: new Date().toISOString()
    };
  } catch (globalErr: any) {
    quotaExceededUntil = Date.now() + 15 * 60 * 1000; // 15-minute cooldown
    console.warn("⚠️ Daily Return Engine paused due to quota limit or Firestore read error:", globalErr?.message || globalErr);
    return {
      success: false,
      usersProcessed,
      dividendsCredited,
      totalPayoutAmount,
      timestamp: new Date().toISOString(),
      error: globalErr?.message || "Firestore quota limit reached. Paused until quota resets."
    };
  }
}
