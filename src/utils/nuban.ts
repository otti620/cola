// NUBAN Bank Prediction & Bank Asset Resolution Utility
// Based on Nigerian NUBAN standards (Blockroll-Tech open-assets & nuban-bank-prediction)

export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  category: "fintech" | "commercial";
  color: string;
  bgLight: string;
}

export const NIGERIAN_BANKS: BankInfo[] = [
  { code: "901", name: "OPay Digital Services (PayCom)", shortName: "OPay", category: "fintech", color: "#00b875", bgLight: "#e6f8f1" },
  { code: "990", name: "PalmPay Microfinance Bank", shortName: "PalmPay", category: "fintech", color: "#6200ee", bgLight: "#f0e6ff" },
  { code: "505", name: "Moniepoint Microfinance Bank", shortName: "Moniepoint", category: "fintech", color: "#0052cc", bgLight: "#e6f0ff" },
  { code: "502", name: "Kuda Microfinance Bank", shortName: "Kuda", category: "fintech", color: "#40196d", bgLight: "#f2ebf9" },
  { code: "058", name: "Guaranty Trust Bank (GTBank)", shortName: "GTBank", category: "commercial", color: "#dd4b39", bgLight: "#fcebe8" },
  { code: "044", name: "Access Bank", shortName: "Access Bank", category: "commercial", color: "#ff6600", bgLight: "#fff0e6" },
  { code: "057", name: "Zenith Bank", shortName: "Zenith Bank", category: "commercial", color: "#cc0000", bgLight: "#ffe6e6" },
  { code: "011", name: "First Bank of Nigeria", shortName: "First Bank", category: "commercial", color: "#002d62", bgLight: "#e6edf5" },
  { code: "033", name: "United Bank for Africa (UBA)", shortName: "UBA", category: "commercial", color: "#d32f2f", bgLight: "#fbe9e9" },
  { code: "035", name: "Wema Bank / ALAT", shortName: "Wema Bank", category: "commercial", color: "#7b1fa2", bgLight: "#f3e5f5" },
  { code: "214", name: "First City Monument Bank (FCMB)", shortName: "FCMB", category: "commercial", color: "#512da8", bgLight: "#ede7f6" },
  { code: "232", name: "Sterling Bank", shortName: "Sterling Bank", category: "commercial", color: "#c62828", bgLight: "#ffebee" },
  { code: "070", name: "Fidelity Bank", shortName: "Fidelity Bank", category: "commercial", color: "#1565c0", bgLight: "#e3f2fd" },
  { code: "221", name: "Stanbic IBTC Bank", shortName: "Stanbic IBTC", category: "commercial", color: "#0d47a1", bgLight: "#e8eaf6" },
  { code: "032", name: "Union Bank of Nigeria", shortName: "Union Bank", category: "commercial", color: "#0288d1", bgLight: "#e1f5fe" },
  { code: "101", name: "Providus Bank", shortName: "Providus", category: "commercial", color: "#f57c00", bgLight: "#fff3e0" },
  { code: "068", name: "Standard Chartered Bank", shortName: "Standard Chartered", category: "commercial", color: "#2e7d32", bgLight: "#e8f5e9" },
  { code: "215", name: "Unity Bank", shortName: "Unity Bank", category: "commercial", color: "#388e3c", bgLight: "#e8f5e9" },
  { code: "030", name: "Heritage Bank", shortName: "Heritage Bank", category: "commercial", color: "#2e7d32", bgLight: "#e8f5e9" },
  { code: "082", name: "Keystone Bank", shortName: "Keystone Bank", category: "commercial", color: "#0288d1", bgLight: "#e1f5fe" },
  { code: "301", name: "Jaiz Bank", shortName: "Jaiz Bank", category: "commercial", color: "#00796b", bgLight: "#e0f2f1" },
  { code: "000", name: "Other Commercial / MFB", shortName: "Other Bank", category: "commercial", color: "#616161", bgLight: "#f5f5f5" }
];

/**
 * Predicts the most likely Nigerian Bank based on the 10-digit NUBAN number structure
 */
export function predictBankFromNuban(accNumber: string): BankInfo | null {
  const clean = accNumber.trim().replace(/\D/g, "");
  if (clean.length < 3) return null;

  // Prefix matching heuristics derived from Nigerian bank NUBAN algorithms
  const prefix3 = clean.substring(0, 3);
  const prefix2 = clean.substring(0, 2);

  // Exact prefix match
  const exact = NIGERIAN_BANKS.find(b => b.code === prefix3);
  if (exact) return exact;

  // Common account series patterns in Nigeria
  if (clean.startsWith("90") || clean.startsWith("80") || clean.startsWith("70") || clean.startsWith("91")) {
    // Mobile phone-based numbers are overwhelmingly OPay / PalmPay / Moniepoint
    if (prefix2 === "90" || prefix2 === "80") return NIGERIAN_BANKS[0]; // OPay
    if (prefix2 === "91" || prefix2 === "70") return NIGERIAN_BANKS[1]; // PalmPay
  }

  if (clean.startsWith("62") || clean.startsWith("505")) {
    return NIGERIAN_BANKS[2]; // Moniepoint
  }

  if (clean.startsWith("50") || clean.startsWith("20")) {
    return NIGERIAN_BANKS[3]; // Kuda
  }

  if (clean.startsWith("01") || clean.startsWith("30")) {
    return NIGERIAN_BANKS[7]; // First Bank
  }

  if (clean.startsWith("02") || clean.startsWith("05")) {
    return NIGERIAN_BANKS[4]; // GTBank
  }

  if (clean.startsWith("04") || clean.startsWith("06")) {
    return NIGERIAN_BANKS[5]; // Access Bank
  }

  if (clean.startsWith("03") || clean.startsWith("21")) {
    return NIGERIAN_BANKS[6]; // Zenith Bank
  }

  return null;
}

/**
 * Simulates real NIBSS account resolution lookup (NUBAN name query)
 */
export async function resolveNubanAccount(accNumber: string, bankName: string, userFullName?: string): Promise<{
  accountName: string;
  isVerified: boolean;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (accNumber.length !== 10) {
        resolve({ accountName: "", isVerified: false });
        return;
      }

      // Generate a realistic Nigerian name matching account if user didn't specify
      let generatedName = userFullName && userFullName.trim().length > 3
        ? userFullName.toUpperCase()
        : "CHINEDU EMMANUEL OKONKWO";

      resolve({
        accountName: generatedName,
        isVerified: true
      });
    }, 600);
  });
}
