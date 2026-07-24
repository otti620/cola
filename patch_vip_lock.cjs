const fs = require('fs');

let content = fs.readFileSync('src/components/VipTab.tsx', 'utf8');

// replace sizes
content = content.replace(/h-40 md:h-48/g, 'h-28 md:h-36');
content = content.replace(/text-xl md:text-2xl/g, 'text-lg md:text-xl');

// Add lock imports
if (!content.includes('Lock')) {
  content = content.replace('ArrowRightCircle', 'ArrowRightCircle, Lock');
}

const mapFnStart = content.indexOf('tiersList.map((tier) => {');
const buttonStart = content.indexOf('<button', mapFnStart);
const buttonEnd = content.indexOf('</button>', buttonStart) + 9;

const oldButton = content.substring(buttonStart, buttonEnd);

const newButton = `
                  <button
                    onClick={() => !tier.isLocked && setSelectedTier(tier)}
                    disabled={isActive || tier.isLocked}
                    className={\`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 \${
                      tier.isLocked 
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : isActive 
                           ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default" 
                           : "bg-gradient-to-tr from-careem-green to-[#00B398] hover:scale-[1.02] active:scale-95 text-white shadow-md cursor-pointer"
                    }\`}
                  >
                    {tier.isLocked ? <><Lock className="w-4 h-4" /> Locked</> : isActive ? "Currently Sponsoring" : "Unlock Package"}
                  </button>
`;

content = content.replace(oldButton, newButton);

fs.writeFileSync('src/components/VipTab.tsx', content);

