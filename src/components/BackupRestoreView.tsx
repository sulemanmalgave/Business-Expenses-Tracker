import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Upload, 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  BadgeAlert
} from 'lucide-react';
import { Transaction, Category, UserProfile } from '../types';
import { parseCSVData } from '../utils/financeUtils';

interface BackupRestoreViewProps {
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  onRestoreData: (restoredTransactions: Transaction[], restoredCategories?: Category[], restoredProfile?: UserProfile) => void;
  onImportTransactions: (imported: Omit<Transaction, 'id'>[]) => void;
  onResetToDemo: () => void;
  onClearAll: () => void;
  onResetApplication?: () => void;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  transactions,
  categories,
  profile,
  onRestoreData,
  onImportTransactions,
  onResetToDemo,
  onClearAll,
  onResetApplication,
  isPremium = false,
  onUpgradeTrigger,
}) => {
  const [dragActiveJson, setDragActiveJson] = useState(false);
  const [dragActiveCsv, setDragActiveCsv] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({
    text: '',
    type: null,
  });

  const fileInputJsonRef = useRef<HTMLInputElement>(null);
  const fileInputCsvRef = useRef<HTMLInputElement>(null);

  // Helper trigger message
  const triggerMsg = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: '', type: null });
    }, 4500);
  };

  // Full backup to JSON helper
  const handleBackupJson = () => {
    try {
      const backupPayload = {
        app_signature: 'finance_tracker_backup_v1',
        timestamp: new Date().toISOString(),
        transactions,
        categories,
        profile,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'business_finance_backup.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      triggerMsg('Database backup JSON compiled and downloaded successfully.', 'success');
    } catch (err) {
      triggerMsg('Failed to compile local ledger backups. Please retry.', 'error');
    }
  };

  // Full Restore from JSON handler
  const handleRestoreJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.app_signature !== 'finance_tracker_backup_v1' && !parsed.transactions) {
          triggerMsg('Invalid file schema. Backup is not formatted correctly.', 'error');
          return;
        }

        onRestoreData(parsed.transactions || [], parsed.categories || [], parsed.profile || undefined);
        triggerMsg('Ledger entries and categories loaded successfully. UI updated.', 'success');
      } catch (err) {
        triggerMsg('Parser failed to decode backup file. Confirm standard JSON formatting.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Import rows from standard business CSV helper
  const handleImportCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedRaw = parseCSVData(text);

        if (parsedRaw.length === 0) {
          triggerMsg('CSV file is empty or formatted incorrectly. Confirm columns headers.', 'error');
          return;
        }

        const validImports: Omit<Transaction, 'id'>[] = parsedRaw.map((t) => ({
          type: t.type || 'expense',
          amount: t.amount || 0,
          category: t.category || 'Other Expenses',
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || 'Imported Line',
          isRecurring: false,
          recurrencePeriod: 'none',
          currency: profile.currency,
          exchangeRate: 1.0,
        }));

        onImportTransactions(validImports);
        triggerMsg(`Successfully ingested ${validImports.length} transaction entries into active ledger.`, 'success');
      } catch (err) {
        triggerMsg('Csv parsing exception. Check delimiter commas and date formats.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop events JSON
  const handleDragJson = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveJson(true);
    } else if (e.type === 'dragleave') {
      setDragActiveJson(false);
    }
  };

  const handleDropJson = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveJson(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRestoreJsonFile(e.dataTransfer.files[0]);
    }
  };

  // Drag and drop events CSV
  const handleDragCsv = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveCsv(true);
    } else if (e.type === 'dragleave') {
      setDragActiveCsv(false);
    }
  };

  const handleDropCsv = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveCsv(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportCsvFile(e.dataTransfer.files[0]);
    }
  };

  // Storage Stats Calculator
  const getDatabaseByteSize = () => {
    let totals = 0;
    try {
      totals += JSON.stringify(transactions).length;
      totals += JSON.stringify(categories).length;
      totals += JSON.stringify(profile).length;
    } catch (_) {}
    return totals;
  };

  const dbSizeInBytes = getDatabaseByteSize();
  const dbFormatSize = (dbSizeInBytes / 1024).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
          Data Security Office
        </span>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Backup, Restore & Data Migration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Secure sandbox export. Save secure backups offline or batch import excel CSV bookkeeping rows.
        </p>
      </div>

      {/* Floating dynamic messages banner */}
      {statusMessage.text && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 text-slate-900 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-350' 
            : statusMessage.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-350'
            : 'bg-indigo-50 border-indigo-250 text-indigo-850'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          )}
          <span className="text-xs font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Database Diagnostic Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ledger Entries</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">{transactions.length} Rows</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Schedules Recurring</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {transactions.filter((t) => t.isRecurring).length} Contracts
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Taxonomy Categories</span>
          <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {categories.filter((c) => c.isCustom).length} Streams
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Database Storage Footprint</span>
          <span className="text-lg font-bold font-mono text-indigo-500 mt-1 block">{dbFormatSize} KB</span>
        </div>
      </div>

      {/* Drag & drop sections Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Box Left: Restore JSON Backups */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between relative overflow-hidden">
          {!isPremium && (
            <div className="absolute inset-0 bg-white/75 dark:bg-slate-950/75 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 select-none">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3 border border-indigo-200 dark:border-indigo-800/40 text-indigo-500">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-150">Durable JSON Backups Locked</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Purchase a Pro license to download complete ledger JSON snapshots or restore historic savepoints in one drag & drop.
              </p>
              <button
                type="button"
                onClick={() => onUpgradeTrigger?.('Durable database backup & restoration is a Premium module.')}
                className="mt-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold pointer-events-auto transition-colors"
              >
                Unlock Backup & Restore
              </button>
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center space-x-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Full Local Database Save-point</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Download complete database backups or drop an existing `.json` ledger archive back into the system.
            </p>
          </div>

          {/* Backup Action Trigger Button */}
          <button
            onClick={handleBackupJson}
            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors pointer-events-auto"
          >
            <Download className="w-4 h-4" />
            <span>Generate Ledger JSON Backup</span>
          </button>

          {/* Drag & drop JSON */}
          <div
            onDragEnter={handleDragJson}
            onDragOver={handleDragJson}
            onDragLeave={handleDragJson}
            onDrop={handleDropJson}
            onClick={() => fileInputJsonRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              dragActiveJson
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 hover:bg-slate-50/40 dark:hover:bg-slate-800/10'
            }`}
          >
            <input
              type="file"
              ref={fileInputJsonRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRestoreJsonFile(file);
              }}
              accept=".json"
              className="hidden"
            />
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Drop JSON database backup here</span>
            <span className="text-[10px] text-slate-400 mt-1 block">or click to browse local files</span>
          </div>
        </div>

        {/* Box Right: Import Excel-like CSV */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Import Ledger Rows from CSV</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Bulk upload external payments from banks or spreadsheet. CSV headers expected: `Date`, `Description`, `Category`, `Amount`, `Type`.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-divider">
            <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Expected Column Blueprint</h4>
            <code className="text-[9px] font-mono text-indigo-500 block mt-1">
              Date,Amount,Type,Category,Description
            </code>
            <code className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block">
              2026-06-10,120.00,expense,Office Rent,Coworking workspace fee
            </code>
          </div>

          {/* Drag & drop CSV */}
          <div
            onDragEnter={handleDragCsv}
            onDragOver={handleDragCsv}
            onDragLeave={handleDragCsv}
            onDrop={handleDropCsv}
            onClick={() => fileInputCsvRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              dragActiveCsv
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 hover:bg-slate-50/40 dark:hover:bg-slate-800/10'
            }`}
          >
            <input
              type="file"
              ref={fileInputCsvRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportCsvFile(file);
              }}
              accept=".csv"
              className="hidden"
            />
            <FileSpreadsheet className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Drop spreadsheet CSV here</span>
            <span className="text-[10px] text-slate-400 mt-1 block">or click to browse local folders</span>
          </div>
        </div>
      </div>

      {/* Danger Zone: reset ledger or wipe demo data */}
      <div className="bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/40 p-5 rounded-3xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center space-x-1.5">
            <BadgeAlert className="w-4 h-4 text-rose-500" />
            <span>Operational Risk Management Zone</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Destructive utilities. Wiping databases clears all local history. Re-seeding restores real-world demo rows for preview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              if (confirm('Re-seeding will reload realistic business data. Proceed?')) {
                onResetToDemo();
                triggerMsg('Database restored to original interactive demo rows.', 'success');
              }
            }}
            className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-slate-250 dark:border-slate-800 pointer-events-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Repopulate Demo Rows</span>
          </button>

          <button
            onClick={() => {
              if (confirm('This will wipe all data and relaunch the Setup Wizard. Proceed?')) {
                onResetApplication?.();
              }
            }}
            className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-600/10 pointer-events-auto shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Reset & Relaunch Setup Wizard</span>
          </button>

          <button
            onClick={() => {
              if (confirm('CRITICAL ACTION: This wipes ALL custom transactions, receipts, and profiles permanently. Proceed?')) {
                onClearAll();
                triggerMsg('Clean database initialized. All local history purged.', 'info');
              }
            }}
            className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm shadow-rose-600/15 pointer-events-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe Local History database</span>
          </button>
        </div>
      </div>
    </div>
  );
};
