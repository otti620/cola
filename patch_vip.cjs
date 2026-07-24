const fs = require('fs');

function replaceFile(path, pairs) {
  if (fs.existsSync(path)) {
    let text = fs.readFileSync(path, 'utf8');
    pairs.forEach(p => {
      text = text.replace(p[0], p[1]);
    });
    fs.writeFileSync(path, text);
  }
}

replaceFile('src/components/AdminPanel.tsx', [
  [/2\. VIP Tiers/g, '2. Product Tiers'],
  [/VIP settings/g, 'Product settings'],
  [/VIP cost/g, 'Product cost'],
  [/SPONSORSHIP TIERS \(VIP LEVELS\)/g, 'SPONSORSHIP TIERS (PRODUCT LEVELS)'],
  [/Airport VIP Hub/g, 'Airport Hub'],
]);

replaceFile('src/components/HomeTab.tsx', [
  [/VIP Tier/g, 'Product Tier'],
  [/VIP products/g, 'products'],
  [/VIP tier/g, 'product tier'],
  [/>VIP</g, '>Products<'],
  [/VIP Level/g, 'Product Level']
]);

replaceFile('src/components/MineTab.tsx', [
  [/Careem VIP support/g, 'Careem Support'],
  [/VIP request/g, 'request'],
  [/lower.includes\("vip"\)/g, 'lower.includes("product")'],
  [/Higher VIP tiers/g, 'Higher product tiers'],
  [/A VIP 3 level/g, 'A Product 3 level'],
  [/Active VIP Member/g, 'Active Member'],
  [/2\. VIP Tier Upgrades/g, '2. Product Tier Upgrades'],
  [/\(VIP 1 to VIP 5\)/g, '(Product 1 to Product 5)'],
  [/Upgrade VIP\?/g, 'Upgrade Product?'],
  [/VIP DRIVER ACTIVE/g, 'DRIVER ACTIVE'],
  [/VIP tiers/g, 'product tiers']
]);

replaceFile('src/components/Navbar.tsx', [
  [/Current VIP level tag/g, 'Current product level tag']
]);

replaceFile('src/components/TaskTab.tsx', [
  [/VIP tab/g, 'Products tab']
]);

