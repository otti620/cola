const fs = require('fs');
let content = fs.readFileSync('src/components/VipTab.tsx', 'utf8');

content = content.replace(/h-64 md:h-80/g, 'h-40 md:h-48');
content = content.replace(/text-2xl md:text-3xl/g, 'text-xl md:text-2xl');
content = content.replace(/p-6 md:p-8/g, 'p-4 md:p-5');
content = content.replace(/gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-xs font-mono/g, 'gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[10px] font-mono');
content = content.replace(/Daily Income Level Packages/g, 'Product Packages');

fs.writeFileSync('src/components/VipTab.tsx', content);
