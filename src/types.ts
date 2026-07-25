export interface UserProfile {
  uid: string;
  phone: string;
  email: string;
  fullName?: string;
  balance: number;
  totalProfit: number;
  referralCode: string;
  referredBy?: string | null;
  hasMadeFirstDeposit?: boolean;
  joinedDate: string;
  creditScore: number;
  currentTierId: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  dailyTasksCompleted?: number;
  lastTaskDate?: string;
  gameOpportunities: number;
  tierExpirationDate?: string;
  isPromoter?: boolean;
  isBanned?: boolean;
  bannedReason?: string;
  password?: string;
  oldPassword?: string;
}

export interface InvestmentTier {
  id: string;
  name: string;
  price: number;
  dailyTasksCount: number;
  dailyReward: number;
  monthlyReward: number;
  yearlyReward: number;
  region: string;
  description: string;
  imageUrl?: string;
  isLocked?: boolean;
  durationDays?: number;
}

export interface CareemTask {
  id: string;
  title: string;
  category: "rides" | "delivery" | "pay" | "operations";
  description: string;
  reward: number; // AED
  durationSeconds: number;
}

export interface TransactionRecord {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected" | string;
  timestamp: string;
  details?: string;
  fee?: number;
  netPayout?: number;
  payoutAmount?: number;
}

export interface CareemNewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  category: string;
}

export interface EducationalResource {
  id: string;
  title: string;
  category: "How to Start" | "What is Careem?" | "Safety & Growth";
  summary: string;
  content: string;
}

