const fs = require('fs');

let content = fs.readFileSync('src/components/VipTab.tsx', 'utf8');

const oldGrid = `<div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[10px] font-mono">
                  <div className="space-y-1">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Required Capital</span>
                    <span className="text-slate-950 font-black text-base">₦{tier.price.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-4">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Daily Interest</span>
                    <span className="text-careem-green font-black text-base">+₦{tier.dailyReward.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-4">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Monthly Profit</span>
                    <span className="text-slate-950 font-black text-base">₦{tier.monthlyReward.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-4">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Daily Profit Claims</span>
                    <span className="text-slate-950 font-black text-base">{tier.dailyTasksCount} Claims</span>
                  </div>
                </div>`;

const newGrid = `<div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[10px] font-mono">
                  <div className="space-y-1">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Capital</span>
                    <span className="text-slate-950 font-black text-base">₦{tier.price.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Daily</span>
                    <span className="text-careem-green font-black text-base">+₦{tier.dailyReward.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Total</span>
                    <span className="text-slate-950 font-black text-base">₦{tier.yearlyReward.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Duration</span>
                    <span className="text-slate-950 font-black text-base">{tier.durationDays || 100} Days</span>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Claims</span>
                    <span className="text-slate-950 font-black text-base">{tier.dailyTasksCount}/day</span>
                  </div>
                </div>`;

content = content.replace(oldGrid, newGrid);

const oldOverlay = `<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />`;
const newOverlay = `<div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                {tier.isLocked && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                     <div className="bg-black/80 px-4 py-2 rounded-xl text-white font-bold tracking-widest flex items-center gap-2">
                       <Lock className="w-5 h-5" /> LOCKED
                     </div>
                  </div>
                )}`;

content = content.replace(oldOverlay, newOverlay);

fs.writeFileSync('src/components/VipTab.tsx', content);

