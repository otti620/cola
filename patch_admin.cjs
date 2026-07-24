const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const oldDefaults = `      const defaults = [
        { id: "t1", name: "Careem Taxi Partner (Level 1)", price: 8000, dailyTasksCount: 5, dailyReward: 440, monthlyReward: 13200, yearlyReward: 160600, region: "City Center", description: "Sponsor active city-center hybrid passenger taxis. Earn a stable ₦440 daily (5.5%)." },
        { id: "t2", name: "Careem Delivery Partner (Level 2)", price: 25000, dailyTasksCount: 5, dailyReward: 1250, monthlyReward: 37500, yearlyReward: 456250, region: "Suburbs & Docks", description: "Support electric delivery bikes with tires and batteries. Earn ₦1,250 daily (5%)." },
        { id: "t3", name: "Careem Luxury Fleet (Level 3)", price: 80000, dailyTasksCount: 5, dailyReward: 3600, monthlyReward: 108000, yearlyReward: 1314000, region: "Airport Hub", description: "Sponsor premium airport shuttle vans and airport cars. Earn ₦3,600 daily (4.5%)." },
        { id: "t4", name: "Careem Pay Gateway (Level 4)", price: 200000, dailyTasksCount: 5, dailyReward: 8400, monthlyReward: 252000, yearlyReward: 3066000, region: "Online Systems", description: "Sponsor secure merchant checkout payment gateways. Earn ₦8,400 daily (4.2%)." },
        { id: "t5", name: "Careem Super Network (Level 5)", price: 500000, dailyTasksCount: 5, dailyReward: 20000, monthlyReward: 600000, yearlyReward: 7300000, region: "Full City Network", description: "Become a major city logistics director. Sponsor cloud server dispatch systems. Earn ₦20,000 daily (4%)." }
      ];`;

const newDefaults = `      const defaults = [
        { id: "t1", name: "Careem Taxi Partner (Level 1)", price: 5000, dailyTasksCount: 5, dailyReward: 1000, monthlyReward: 30000, yearlyReward: 100000, region: "City Center", description: "Sponsor active city-center hybrid passenger taxis. Earn ₦1,000 daily.", durationDays: 100, isLocked: false },
        { id: "t2", name: "Careem Delivery Partner (Level 2)", price: 15000, dailyTasksCount: 5, dailyReward: 3333, monthlyReward: 99990, yearlyReward: 333300, region: "Suburbs & Docks", description: "Support electric delivery bikes with tires and batteries. Earn ₦3,333 daily.", durationDays: 100, isLocked: false },
        { id: "t3", name: "Careem Luxury Fleet (Level 3)", price: 30000, dailyTasksCount: 5, dailyReward: 7500, monthlyReward: 225000, yearlyReward: 750000, region: "Airport Hub", description: "Sponsor premium airport shuttle vans and luxury airport cars. Earn ₦7,500 daily.", durationDays: 100, isLocked: false },
        { id: "t4", name: "Careem Pay Gateway (Level 4)", price: 50000, dailyTasksCount: 5, dailyReward: 12500, monthlyReward: 375000, yearlyReward: 1250000, region: "Online Systems", description: "Sponsor secure merchant checkout payment gateways. Earn ₦12,500 daily.", durationDays: 100, isLocked: true },
        { id: "t5", name: "Careem Super Network (Level 5)", price: 100000, dailyTasksCount: 5, dailyReward: 25000, monthlyReward: 750000, yearlyReward: 2500000, region: "Full City Network", description: "Become a major city logistics director. Sponsor cloud server dispatch systems. Earn ₦25,000 daily.", durationDays: 100, isLocked: true }
      ];`;

content = content.replace(oldDefaults, newDefaults);
fs.writeFileSync('src/components/AdminPanel.tsx', content);

