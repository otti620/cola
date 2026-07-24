const fs = require('fs');

let content = fs.readFileSync('src/components/VipTab.tsx', 'utf8');

const oldUpgradeUser = `    // Deduct balance and upgrade tier
    const updatedUser: UserProfile = {
      ...user,
      balance: user.balance - tier.price,
      currentTierId: tier.id,
      gameOpportunities: (user.gameOpportunities || 0) + 1
    };`;

const newUpgradeUser = `    // Deduct balance and upgrade tier
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + (tier.durationDays || 100));
    
    const updatedUser: UserProfile = {
      ...user,
      balance: user.balance - tier.price,
      currentTierId: tier.id,
      gameOpportunities: (user.gameOpportunities || 0) + 1,
      tierExpirationDate: expirationDate.toISOString()
    };`;

content = content.replace(oldUpgradeUser, newUpgradeUser);
fs.writeFileSync('src/components/VipTab.tsx', content);

