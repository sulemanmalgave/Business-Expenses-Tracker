import React from 'react';
import { Info, Sparkles, PhoneCall, History, Check, ArrowLeft, Layers, Heart } from 'lucide-react';

interface AboutViewProps {
  onBack?: () => void;
  onNavigate?: (tab: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pointer-events-auto"
          id="about-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Suite Information</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">About Business Expense Tracker</h1>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">App Version 1.1.0 • Built for Web & Windows</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-sm">
        {/* Core Description block */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            <span>Product Mission</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Business Expense Tracker</strong> is a high-fidelity, sandbox finance dashboard designed for freelancers, business consultants, agency owners, and growing retail startups. Our mission is to combine desktop-grade bookkeeping capabilities with the portability of web-installed PWA solutions. No centralized endpoints, no complex trackers, and absolutely no data harvesting loops.
          </p>
        </div>

        {/* Feature Checklists */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Core Feature Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Offline-First Ledger Matrix',
                desc: 'Store cash flows, multi-entity records, and files without ongoing cloud dependency.',
              },
              {
                title: 'Robust Dynamic Analytics',
                desc: 'Slice and analyze overhead allocations, flow tendencies, and Profit & Loss ratios.',
              },
              {
                title: 'Custom Local Backup',
                desc: 'Instantly download cryptographically sound local backup dumps or migrate databases in seconds.',
              },
              {
                title: 'Native Windows & Display Match',
                desc: 'Fully prepared for High DPI resolution screens, seamless mouse or keyboard layouts, and touchscreen inputs.',
              },
            ].map((item, id) => (
              <div key={id} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Release Notes section */}
        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-500" />
            <span>Product Release Notes (v1.1.0)</span>
          </h2>
          
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="inline-block text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase">June 2026 Release (v1.1.0)</span>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Microsoft Store & Progressive Web App optimization sweep:</p>
              <ul className="list-disc pl-5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                <li>Integrated offline PWA caches via Service Worker and <code>manifest.webmanifest</code> configurations.</li>
                <li>Added support for standalone startup screens, customized dynamic splash colors, and safe non-UI window borders compatible with Microsoft PWA Builder guidelines.</li>
                <li>Implemented fully clickable Profile shortcut menu container, replacing persistent sidebar premium clutter with clean workflow controls.</li>
                <li>Introduced three versatile pricing choices: Pro Monthly, Pro Yearly, and Lifetime Plan tiers with explicit feature list comparisons.</li>
                <li>Fixed navigation tracking errors, updated visual Recharts pie graphics, and set precise high DPI rendering guidelines for Windows 10 & 11 operating tables.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Support & developer footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Heart className="w-4 h-4 text-rose-500 animate-pulse fill-rose-500" />
            <span>Refined by Professional Engineers. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.('help')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors pointer-events-auto shadow-sm"
              id="about-support-btn"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Contact Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
