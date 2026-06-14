import React from 'react';
import { Shield, Eye, Database, Share2, Download, Trash2, ArrowLeft } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pointer-events-auto"
          id="privacy-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Legal Agreement</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Privacy Policy</h1>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">Effective June 2026 • Version 1.1.0</p>
      </header>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <span>1. Local Sandboxed Data Engine</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            By default, the <strong>Business Expense Tracker</strong> operates using an isolated client-side sandbox architecture. All transactions, category lists, fiscal setups, and company profiles you log are stored directly inside your browser's persistent sandbox storage layers (including standard <code>localStorage</code>, <code>sessionStorage</code>, or IndexedDB APIs).
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Because this application operates offline-first, your financial records never automatically touch third-party external cloud systems or remote processing environments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500" />
            <span>2. Zero Sale of Personal Financial Data</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            We hold a strong ethical commitment to commercial integrity and privacy:
          </p>
          <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <li><strong>No telemetry harvesting:</strong> We never log, aggregate, tracking-pixel, or telemetry-stream your transaction figures, vendor descriptors, or ledger items.</li>
            <li><strong>No advertisement loops:</strong> Your cashflow history is never shared, marketed, leased, or sold to external broker firms, marketing list owners, or corporate analytical aggregators.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-500" />
            <span>3. Complete User Control & Entity Boundaries</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            You maintain absolute, sovereign control over your business logs:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Exportable Format Integrity</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
                Generate high-fidelity, structured exports of your sandbox data at any time under the Backup & Restore panel. This produces raw, parseable JSON files containing your full database matrices.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Nuclear Deletion Toggle</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
                You can immediately wipe your entire application state. Clicking "Reset Application" in your dashboard settings triggers a absolute cache purge that completely destroys all offline ledger databases. This action is irreversible.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            <span>4. Security Controls & Sandboxed Isolation</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Because this application uses standard Progressive Web App container sandboxes and runs strictly locally in the browser context, the ultimate safety of your journals rests upon the integrity of your personal device.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            We highly recommend using local system authentication keys (such as Windows Hello, Windows Hello PIN codes, or macOS Touch ID), keeping your web browser updated, and performing backup sweeps weekly to protect your business records from physical or unauthorized network hardware interventions.
          </p>
        </section>
      </div>
    </div>
  );
};
