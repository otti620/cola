import React from "react";
import { 
  X, ShieldCheck, Sparkles, Building2, TrendingUp, Award, CheckCircle2, Globe, Users, ArrowUpRight 
} from "lucide-react";
import { COCA_COLA_BRAND_ASSETS, INVESTOR_HEADSHOTS } from "../data/brandImages";

interface InvestorPitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProducts: () => void;
}

export default function InvestorPitchDeckModal({ isOpen, onClose, onNavigateToProducts }: InvestorPitchDeckModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 text-white rounded-3xl my-6 relative shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Sticky Header with Brand Accent */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-full bg-[#e41e2b] flex items-center justify-center text-white font-black text-xs shadow-md">
              CC
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Investor Prospectus & Asset Portfolio
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-[11px] text-slate-400">Official Bottling & Distribution Equity Showcase</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-6 overflow-y-auto text-xs text-slate-300">

          {/* Hero Asset Banner (Image 1: Consistent Branding) */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 group">
            <img 
              src={COCA_COLA_BRAND_ASSETS.consistentBranding.url}
              alt="Consistent Branding"
              className="w-full h-48 sm:h-56 object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#e41e2b] bg-[#fff0f1]/90 px-2.5 py-0.5 rounded-full w-fit mb-1">
                {COCA_COLA_BRAND_ASSETS.consistentBranding.tag}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight font-display">
                {COCA_COLA_BRAND_ASSETS.consistentBranding.title}
              </h3>
              <p className="text-xs text-slate-300 pt-1 font-medium italic">
                "{COCA_COLA_BRAND_ASSETS.consistentBranding.subtitle}"
              </p>
            </div>
          </div>

          {/* Key Investor Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Output</span>
              <span className="text-base font-black text-white">1.9B+ Daily</span>
              <span className="text-[9px] text-emerald-400 font-bold block">190+ Countries</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Yield Cycle</span>
              <span className="text-base font-black text-amber-400">100 Days</span>
              <span className="text-[9px] text-slate-400 block">Daily Auto-Credit</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Capital Guarantee</span>
              <span className="text-base font-black text-emerald-400">100% NIBSS</span>
              <span className="text-[9px] text-emerald-400 font-bold block">Instant Settle</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Investor Pool</span>
              <span className="text-base font-black text-purple-300">42,500+</span>
              <span className="text-[9px] text-slate-400 block">Active Backers</span>
            </div>
          </div>

          {/* Section 1: Product Portfolio & Inventory Matrix (Image 2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#e41e2b]" />
                Product Packaging & Multi-Tier Portfolio
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Asset Matrix #02</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 items-center bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="rounded-xl overflow-hidden h-36 border border-slate-700">
                <img 
                  src={COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.url}
                  alt="Portfolio Matrix"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.tag}
                </span>
                <h5 className="text-xs font-black text-white">
                  {COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.title}
                </h5>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {COCA_COLA_BRAND_ASSETS.productPortfolioMatrix.description} Multi-pack distribution guarantees high inventory turnover and continuous liquid dividend reserves.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Effervescent Growth & Global Campaign Collage (Images 3 & 4) */}
          <div className="grid sm:grid-cols-2 gap-3">
            
            {/* Image 3 Card */}
            <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="h-32 rounded-xl overflow-hidden relative">
                <img 
                  src={COCA_COLA_BRAND_ASSETS.fizzSplashHappiness.url}
                  alt="Fizz Splash"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                  {COCA_COLA_BRAND_ASSETS.fizzSplashHappiness.tag}
                </span>
              </div>
              <h5 className="text-xs font-black text-white">{COCA_COLA_BRAND_ASSETS.fizzSplashHappiness.title}</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Daily automated returns popping into investor wallets every 24 hours with zero lockup friction.
              </p>
            </div>

            {/* Image 4 Card */}
            <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="h-32 rounded-xl overflow-hidden relative">
                <img 
                  src={COCA_COLA_BRAND_ASSETS.realMagicCollage.url}
                  alt="Real Magic Grid"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                  {COCA_COLA_BRAND_ASSETS.realMagicCollage.tag}
                </span>
              </div>
              <h5 className="text-xs font-black text-white">{COCA_COLA_BRAND_ASSETS.realMagicCollage.title}</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Pan-African billboard coverage, urban retail penetration, and high-frequency consumer demand.
              </p>
            </div>

          </div>

          {/* Section 3: Commercial Outlets & Architectural Infrastructure (Images 5 & 6) */}
          <div className="grid sm:grid-cols-2 gap-3">
            
            {/* Image 5 Card */}
            <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="h-28 rounded-xl overflow-hidden relative">
                <img 
                  src={COCA_COLA_BRAND_ASSETS.architecturalCube.url}
                  alt="Architectural Cube"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-slate-950/80 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                  {COCA_COLA_BRAND_ASSETS.architecturalCube.tag}
                </span>
              </div>
              <h5 className="text-xs font-black text-white">{COCA_COLA_BRAND_ASSETS.architecturalCube.title}</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Modern 3D signage and automated logistics centers powering physical product fulfillment.
              </p>
            </div>

            {/* Image 6 Card */}
            <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="h-28 rounded-xl overflow-hidden relative">
                <img 
                  src={COCA_COLA_BRAND_ASSETS.mealSignage.url}
                  alt="Meal Signage"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-slate-950/80 text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded font-mono">
                  {COCA_COLA_BRAND_ASSETS.mealSignage.tag}
                </span>
              </div>
              <h5 className="text-xs font-black text-white">{COCA_COLA_BRAND_ASSETS.mealSignage.title}</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                "It's a kind of meal" food service partnerships capturing everyday consumer spending.
              </p>
            </div>

          </div>

          {/* Section 4: Verified Institutional Investor Headshots & Trustees */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Institutional Board & Verified Syndicate Headshots
            </h4>

            <div className="grid sm:grid-cols-3 gap-3">
              {INVESTOR_HEADSHOTS.map((headshot, idx) => (
                <div key={idx} className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/80 space-y-2.5 text-center">
                  <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-emerald-400/80 shadow-md">
                    <img 
                      src={headshot.avatar} 
                      alt={headshot.name}
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-0.5 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <h5 className="text-xs font-extrabold text-white">{headshot.name}</h5>
                    <p className="text-[9px] text-emerald-400 font-mono font-bold">{headshot.badge}</p>
                    <p className="text-[10px] text-slate-400 leading-tight pt-1">{headshot.role}</p>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-xl text-[9px] text-slate-300 italic border border-slate-800">
                    "{headshot.quote}"
                  </div>

                  <span className="text-[9px] font-mono text-amber-400 font-bold block">
                    {headshot.stake}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>NIBSS Interbank Clearing & 100% Capital Guaranteed</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onNavigateToProducts();
              }}
              className="w-full sm:w-auto bg-[#e41e2b] hover:bg-[#c41622] text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Explore Products & Invest</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
