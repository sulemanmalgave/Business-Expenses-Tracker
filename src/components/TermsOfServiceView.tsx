import React from 'react';
import { Scale, FileText, CheckCircle2, ShieldAlert, Key, ArrowLeft } from 'lucide-react';

interface TermsOfServiceViewProps {
  onBack?: () => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pointer-events-auto"
          id="terms-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Legal Agreement</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Terms of Service</h1>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">Last Updated June 2026 • Version 1.1.0</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>1. Acceptance of Sandboxed Usage Conditions</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            By installing or launching <strong>Business Expense Tracker</strong> (accessible via our Web URL, Progressive Web App install prompt, or the Microsoft Store app package installer), you explicitly agree to these Terms of Service. If you do not accept these provisions, you must immediately uninstall the applet and clear your browser cache.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            <span>2. Provisioning and Tier Boundaries</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The applet provides a dual-tiered finance management model. Under the Free Plan, you are granted a non-exclusive license to track and store up to 500 transaction cards inside your client-side sandbox.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            To lift this storage cap and unlock Premium capabilities (e.g., unlimited ledger cards, PDF exports, custom receipt image attachments, advanced BI charts, and multiple independent company sandbox configurations), you must acquire a monthly, yearly, or lifetime pro upgrade. All processing is securely and transiently managed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>3. No Storage Archival Guarantee</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Because All your database matrices exist locally on your browser context, the ultimate longevity of your data depends completely on your client machine's cache health. It is your sole responsibility to conduct regular export dumps (JSON / CSV tables) to guard against browser state corruption, device loss, or operating system reinstalls.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-500" />
            <span>4. Disclaimer of Commercial Liability</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The software utility is distributed "AS IS" and "WITH ALL FAULTS" without any warranties of any kind, whether express, statutory, or implied.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Neither the creator nor any distributor of this tool shall be held liable for any commercial losses, incorrect tax filings, operational business interruptions, accidental local data purges, or computational errors resulting from the use of our balance tallies or Profit & Loss spreadsheets. Always consult a certified CPA before finalizing statutory corporate declarations.
          </p>
        </section>
      </div>
    </div>
  );
};
