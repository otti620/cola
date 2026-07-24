import React from "react";

export default function AppSkeletonLoader() {
  return (
    <div className="min-h-screen bg-[#F8F7F5] flex flex-col font-sans select-none overflow-hidden">
      <style>{`
        @keyframes topBarSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
        .animate-top-bar {
          animation: topBarSlide 1.6s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Top Animated Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-red-100/80 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#e41e2b] via-red-500 to-[#e41e2b] w-1/2 animate-top-bar" />
      </div>

      {/* App Header Skeleton */}
      <header className="bg-white/90 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#e41e2b] to-[#b8101c] flex items-center justify-center text-white font-black text-xl italic shadow-xs opacity-90 animate-pulse">
            C
          </div>
          <div className="space-y-1.5">
            <div className="w-24 h-4 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-16 h-2.5 bg-slate-100 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-28 h-8 bg-slate-100 rounded-full animate-pulse border border-slate-200/60" />
        </div>
      </header>

      {/* Minimal Floating Indicator Pill */}
      <div className="flex justify-center pt-4 pb-2">
        <div className="inline-flex items-center space-x-2 bg-white/90 border border-slate-200/90 shadow-xs rounded-full px-3.5 py-1.5 text-xs text-slate-600 font-medium backdrop-blur-sm">
          <div className="w-3.5 h-3.5 border-2 border-[#e41e2b] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Synchronizing portal state...</span>
        </div>
      </div>

      {/* Main Skeleton Layout */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-2 space-y-4">
        {/* Hero Card Skeleton */}
        <div className="w-full h-44 bg-gradient-to-br from-slate-200/90 to-slate-200/60 rounded-2xl animate-pulse p-5 flex flex-col justify-between border border-slate-200/60 shadow-xs">
          <div className="space-y-2">
            <div className="w-28 h-3 bg-slate-300/80 rounded-md" />
            <div className="w-48 h-7 bg-slate-300/80 rounded-lg" />
          </div>
          <div className="flex justify-between items-center pt-4">
            <div className="w-28 h-9 bg-slate-300/80 rounded-xl" />
            <div className="w-20 h-9 bg-slate-300/80 rounded-xl" />
          </div>
        </div>

        {/* Quick Action Grid Skeleton */}
        <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/50 animate-pulse flex items-center justify-center" />
              <div className="w-12 h-2.5 bg-slate-200 rounded-md animate-pulse" />
            </div>
          ))}
        </div>

        {/* Feed / Tier List Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3.5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="w-32 h-4 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-16 h-3 bg-slate-100 rounded-md animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 py-1.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/50 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-3.5 bg-slate-200 rounded-md animate-pulse" />
                <div className="w-1/2 h-2.5 bg-slate-100 rounded-md animate-pulse" />
              </div>
              <div className="w-16 h-7 bg-slate-100 border border-slate-200/60 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation Skeleton */}
      <footer className="bg-white/95 border-t border-slate-200/80 px-4 py-2.5 flex justify-around sticky bottom-0 z-40 backdrop-blur-md">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 rounded-lg bg-slate-200 animate-pulse" />
            <div className="w-8 h-2 bg-slate-100 rounded-md animate-pulse" />
          </div>
        ))}
      </footer>
    </div>
  );
}
