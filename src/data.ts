import { InvestmentTier, CareemTask, CareemNewsItem, EducationalResource } from "./types";
import { COCA_COLA_BRAND_ASSETS } from "./data/brandImages";

export const INVESTMENT_TIERS: InvestmentTier[] = [
  {
    id: "t1",
    name: "Plan 1 - Classic Glass Contour",
    price: 4000,
    dailyTasksCount: 1,
    dailyReward: 1000,
    monthlyReward: 30000,
    yearlyReward: 365000,
    region: "Ibadan Bottling Plant",
    description: "Consistent branding & daily dividend yield on iconic glass contour bottle sales.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.consistentBranding.url
  },
  {
    id: "t2",
    name: "Plan 2 - Multi-Pack Distribution",
    price: 8000,
    dailyTasksCount: 1,
    dailyReward: 2060,
    monthlyReward: 61800,
    yearlyReward: 751900,
    region: "Kano Commercial Hub",
    description: "Iconic inside, timeless outside. Sponsor 24-can crates & multi-pack retail inventory.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.url
  },
  {
    id: "t3",
    name: "Plan 3 - Effervescent Fizz Growth",
    price: 18000,
    dailyTasksCount: 1,
    dailyReward: 4700,
    monthlyReward: 141000,
    yearlyReward: 1715500,
    region: "Benue Bottling Belt",
    description: "Open happiness & instant daily yield cashflow backed by high-velocity carbonated beverage output.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.fizzSplashHappiness.url
  },
  {
    id: "t4",
    name: "Plan 4 - Real Magic Global Network",
    price: 40000,
    dailyTasksCount: 1,
    dailyReward: 10800,
    monthlyReward: 324000,
    yearlyReward: 3942000,
    region: "Ogun Industrial Zone",
    description: "Pan-African billboard and retail distribution network equity participation.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.realMagicCollage.url
  },
  {
    id: "t5",
    name: "Plan 5 - Enterprise Facility Cube",
    price: 90000,
    dailyTasksCount: 1,
    dailyReward: 25000,
    monthlyReward: 750000,
    yearlyReward: 9125000,
    region: "Abuja Enterprise Hub",
    description: "Direct asset sponsorship in modern 3D automated logistics and corporate distribution centers.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.architecturalCube.url
  },
  {
    id: "t6",
    name: "Plan 6 - Food Service & Retail Yield",
    price: 200000,
    dailyTasksCount: 1,
    dailyReward: 58000,
    monthlyReward: 1740000,
    yearlyReward: 21170000,
    region: "Kaduna Mega Logistics Hub",
    description: "High-volume food pairing and restaurant supply chain contract yields.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.mealSignage.url
  },
  {
    id: "t7",
    name: "Plan 7 - Pan-African Bottling Syndicate",
    price: 450000,
    dailyTasksCount: 1,
    dailyReward: 135000,
    monthlyReward: 4050000,
    yearlyReward: 49275000,
    region: "Pan-African Bottling Network",
    description: "Institutional equity in automated high-speed canning and recycling plants.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.url
  },
  {
    id: "t8",
    name: "Plan 8 - Global Logistics Infrastructure",
    price: 1000000,
    dailyTasksCount: 1,
    dailyReward: 310000,
    monthlyReward: 9300000,
    yearlyReward: 113150000,
    region: "Lagos Port Industrial Complex",
    description: "Mega-tier institutional investment in continental shipping, storage, and automated retail supply.",
    durationDays: 100,
    imageUrl: COCA_COLA_BRAND_ASSETS.realMagicCollage.url
  }
];

export const CAREEM_TASKS: CareemTask[] = [];

export const CAREEM_NEWS: CareemNewsItem[] = [];

export const EDUCATIONAL_RESOURCES: EducationalResource[] = [];

