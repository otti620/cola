const fs = require('fs');

const dataContent = `import { InvestmentTier, CareemTask, CareemNewsItem, EducationalResource } from "./types";

export const INVESTMENT_TIERS: InvestmentTier[] = [
  {
    id: "temps",
    name: "Temporary",
    price: 0,
    dailyTasksCount: 0,
    dailyReward: 0,
    monthlyReward: 0,
    yearlyReward: 0,
    region: "",
    description: "",
    durationDays: 0
  },
  {
    id: "t1",
    name: "Careem Taxi Partner (Level 1)",
    price: 5000,
    dailyTasksCount: 5,
    dailyReward: 1000,
    monthlyReward: 30000,
    yearlyReward: 100000,
    region: "City Center",
    description: "Sponsor active city-center hybrid passenger taxis. Earn ₦1,000 daily.",
    durationDays: 100,
    isLocked: false
  },
  {
    id: "t2",
    name: "Careem Delivery Partner (Level 2)",
    price: 15000,
    dailyTasksCount: 5,
    dailyReward: 3333,
    monthlyReward: 99990,
    yearlyReward: 333300,
    region: "Suburbs & Docks",
    description: "Support electric delivery bikes with tires and batteries. Earn ₦3,333 daily.",
    durationDays: 100,
    isLocked: false
  },
  {
    id: "t3",
    name: "Careem Luxury Fleet (Level 3)",
    price: 30000,
    dailyTasksCount: 5,
    dailyReward: 7500,
    monthlyReward: 225000,
    yearlyReward: 750000,
    region: "Airport Hub",
    description: "Sponsor premium airport shuttle vans and luxury airport cars. Earn ₦7,500 daily.",
    durationDays: 100,
    isLocked: false
  },
  {
    id: "t4",
    name: "Careem Pay Gateway (Level 4)",
    price: 50000,
    dailyTasksCount: 5,
    dailyReward: 12500,
    monthlyReward: 375000,
    yearlyReward: 1250000,
    region: "Online Systems",
    description: "Sponsor secure merchant checkout payment gateways. Earn ₦12,500 daily.",
    durationDays: 100,
    isLocked: true
  },
  {
    id: "t5",
    name: "Careem Super Network (Level 5)",
    price: 100000,
    dailyTasksCount: 5,
    dailyReward: 25000,
    monthlyReward: 750000,
    yearlyReward: 2500000,
    region: "Full City Network",
    description: "Become a major city logistics director. Sponsor cloud server dispatch systems. Earn ₦25,000 daily.",
    durationDays: 100,
    isLocked: true
  }
];
`;

let content = fs.readFileSync('src/data.ts', 'utf8');
const rest = content.substring(content.indexOf('export const CAREEM_TASKS: CareemTask[] = ['));
fs.writeFileSync('src/data.ts', dataContent + "\n" + rest);

