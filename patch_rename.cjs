const fs = require('fs');

const files = [
  'src/components/AdminPanel.tsx',
  'src/components/HomeTab.tsx',
  'src/components/MineTab.tsx',
  'src/components/Navbar.tsx',
  'src/components/VipTab.tsx',
  'src/components/TaskTab.tsx'
];

files.forEach(f => {
  if(fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/VIP Level/g, 'Product Level');
    content = content.replace(/VIP Sponsorship Level Configuration/g, 'Product Configuration');
    content = content.replace(/VIP Tier Level/g, 'Product Level');
    content = content.replace(/"vip"/g, '"vip"'); // Leave id values alone
    
    // Changing Tasks -> Profit
    content = content.replace(/Task tab/gi, 'Profit tab');
    content = content.replace(/Tasks tab/gi, 'Profit tab');
    content = content.replace(/>Tasks</g, '>Profit<');
    content = content.replace(/>Task</g, '>Profit<');
    fs.writeFileSync(f, content);
  }
});
