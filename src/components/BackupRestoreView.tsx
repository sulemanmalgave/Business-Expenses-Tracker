import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Upload, 
  Database, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { Transaction, Category, UserProfile, RecurringBill, Client } from '../types';
import { parseCSVData, formatCurrency } from '../utils/financeUtils';
import { validateTransaction } from '../utils/financeCalculations';

interface BackupRestoreViewProps {
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  recurringBills?: RecurringBill[];
  clients?: Client[];
  onRestoreData: (
    restoredTransactions: Transaction[], 
    restoredCategories?: Category[], 
    restoredProfile?: UserProfile,
    restoredBills?: RecurringBill[],
    restoredClients?: Client[]
  ) => void;
  onImportTransactions: (imported: Omit<Transaction, 'id'>[]) => void;
  onResetToDemo: () => void;
  onClearAll: () => void;
  onResetApplication?: () => void;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

interface BackupFilePayload {
  version: number;
  app: string;
  timestamp: string;
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  recurringBills?: RecurringBill[];
  clients?: Client[];
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  transactions,
  categories,
  profile,
  recurringBills = [],
  clients = [],
  onRestoreData,
  onImportTransactions,
  onResetToDemo,
  onClearAll,
  onResetApplication,
}) => {
  const [dragActiveJson, setDragActiveJson] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({
    text: '',
    type: null,
  });

  // Restore Modal State
  const [pendingRestore, setPendingRestore] = useState<{
    payload: BackupFilePayload;
    duplicateCount: number;
    newCount: number;
  } | null>(null);

  // CSV Import Preview State
  const [pendingCsvRows, setPendingCsvRows] = useState<Partial<Transaction>[] | null>(null);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  const [maintenanceAction, setMaintenanceAction] = useState<'demo' | 'clear' | null>(null);

  const fileInputJsonRef = useRef<HTMLInputElement>(null);
  const fileInputCsvRef = useRef<HTMLInputElement>(null);

  const triggerMsg = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: '', type: null });
    }, 5000);
  };

  // Compile and Export Full Versioned JSON Backup
  const handleExportBackupJson = () => {
    try {
      const backupPayload: BackupFilePayload = {
        version: 2,
        app: 'business_expense_tracker',
        timestamp: new Date().toISOString(),
        transactions,
        categories,
        profile,
        recurringBills,
        clients,
      };

      const dateTag = new Date().toISOString().split('T')[0];
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `business_expense_tracker_backup_${dateTag}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      localStorage.setItem('finance_app_last_backup', new Date().toISOString());
      triggerMsg(`Database backup (${transactions.length} records) exported safely.`, 'success');
    } catch (err) {
      triggerMsg('Failed to compile local database backup file.', 'error');
    }
  };

  // Validate and parse incoming JSON file
  const handleInspectJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation of file structure
        if (!parsed || (typeof parsed !== 'object')) {
          triggerMsg('Invalid backup file: Not a valid JSON document.', 'error');
          return;
        }

        const rawTxs: any[] = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        const rawCats: any[] = Array.isArray(parsed.categories) ? parsed.categories : [];
        const rawClients: Client[] = Array.isArray(parsed.clients) ? parsed.clients : [];

        // Check for required transaction fields
        const validTxs: Transaction[] = [];
        for (const t of rawTxs) {
          if (t && typeof t === 'object' && t.id && t.type && typeof t.amount === 'number' && t.date) {
            validTxs.push({
              id: String(t.id),
              type: t.type === 'income' ? 'income' : 'expense',
              amount: Math.abs(t.amount),
              currency: t.currency || profile.currency,
              exchangeRate: typeof t.exchangeRate === 'number' ? t.exchangeRate : 1.0,
              category: t.category || (t.type === 'income' ? 'Client Services' : 'Other Expenses'),
              date: t.date,
              description: t.description || 'Restored Record',
              paymentMethod: t.paymentMethod,
              account: t.account,
              clientId: t.clientId,
              clientName: t.clientName,
              project: t.project,
              notes: t.notes,
              receipt: t.receipt,
              receiptName: t.receiptName,
              isRecurring: !!t.isRecurring,
              recurrencePeriod: t.recurrencePeriod || 'none',
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            });
          }
        }

        // Count potential duplicates against active ledger
        const existingIds = new Set(transactions.map((t) => t.id));
        let duplicateCount = 0;
        let newCount = 0;

        for (const t of validTxs) {
          if (existingIds.has(t.id)) {
            duplicateCount++;
          } else {
            newCount++;
          }
        }

        const payload: BackupFilePayload = {
          version: parsed.version || 1,
          app: parsed.app || 'business_expense_tracker',
          timestamp: parsed.timestamp || new Date().toISOString(),
          transactions: validTxs,
          categories: rawCats,
          profile: parsed.profile || profile,
          recurringBills: Array.isArray(parsed.recurringBills) ? parsed.recurringBills : [],
          clients: rawClients,
        };

        setPendingRestore({
          payload,
          duplicateCount,
          newCount,
        });
      } catch (err) {
        triggerMsg('Could not parse backup file. Please ensure it is a valid JSON backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Perform Destructive Replace Restore with automatic pre-restore safety snapshot
  const executeReplaceRestore = () => {
    if (!pendingRestore) return;

    // 1. Create safety recovery copy first!
    try {
      const emergencySnapshot = {
        timestamp: new Date().toISOString(),
        transactions,
        categories,
        profile,
        clients,
      };
      localStorage.setItem('finance_app_pre_restore_safety_snapshot', JSON.stringify(emergencySnapshot));
    } catch (_) {}

    // 2. Restore data
    onRestoreData(
      pendingRestore.payload.transactions,
      pendingRestore.payload.categories,
      pendingRestore.payload.profile,
      pendingRestore.payload.recurringBills,
      pendingRestore.payload.clients
    );

    triggerMsg(
      `Restored ${pendingRestore.payload.transactions.length} transactions, categories, and clients. Pre-restore safety snapshot saved.`,
      'success'
    );
    setPendingRestore(null);
  };

  // Perform Non-Destructive Merge Restore
  const executeMergeRestore = () => {
    if (!pendingRestore) return;

    const existingIds = new Set(transactions.map((t) => t.id));
    const mergedTxs = [...transactions];

    for (const t of pendingRestore.payload.transactions) {
      if (!existingIds.has(t.id)) {
        mergedTxs.push(t);
      }
    }

    // Merge categories
    const existingCatNames = new Set(categories.map((c) => `${c.name}_${c.type}`.toLowerCase()));
    const mergedCats = [...categories];
    for (const c of pendingRestore.payload.categories) {
      const key = `${c.name}_${c.type}`.toLowerCase();
      if (!existingCatNames.has(key)) {
        mergedCats.push(c);
      }
    }

    // Merge clients
    const existingClientIds = new Set(clients.map((cl) => cl.id));
    const existingClientNames = new Set(clients.map((cl) => cl.name.trim().toLowerCase()));
    const mergedClients = [...clients];
    if (pendingRestore.payload.clients) {
      for (const cl of pendingRestore.payload.clients) {
        if (!existingClientIds.has(cl.id) && !existingClientNames.has(cl.name.trim().toLowerCase())) {
          mergedClients.push(cl);
        }
      }
    }

    onRestoreData(mergedTxs, mergedCats, undefined, pendingRestore.payload.recurringBills, mergedClients);
    triggerMsg(`Merged ${pendingRestore.newCount} new transactions into active ledger.`, 'success');
    setPendingRestore(null);
  };

  // CSV File Handler
  const handleInspectCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedRaw = parseCSVData(text);

        if (parsedRaw.length === 0) {
          triggerMsg('CSV file is empty or formatted incorrectly. Please check column headers.', 'error');
          return;
        }

        const errors: string[] = [];
        const validatedRows: Partial<Transaction>[] = [];

        parsedRaw.forEach((row, idx) => {
          const rowNum = idx + 2; // account for 1-indexed and header
          if (!row.amount || isNaN(row.amount) || row.amount <= 0) {
            errors.push(`Row ${rowNum}: Invalid or missing amount (${row.amount})`);
          } else {
            validatedRows.push(row);
          }
        });

        setCsvValidationErrors(errors);
        setPendingCsvRows(validatedRows);
      } catch (err) {
        triggerMsg('Error reading CSV file. Confirm valid comma-separated values.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const executeCsvImport = () => {
    if (!pendingCsvRows || pendingCsvRows.length === 0) return;

    const validImports: Omit<Transaction, 'id'>[] = pendingCsvRows.map((t) => ({
      type: t.type === 'income' ? 'income' : 'expense',
      amount: t.amount || 0,
      currency: profile.currency,
      exchangeRate: 1.0,
      category: t.category || (t.type === 'income' ? 'Client Services' : 'Other Expenses'),
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'Imported Transaction',
      isRecurring: false,
      recurrencePeriod: 'none',
      createdAt: new Date().toISOString(),
    }));

    onImportTransactions(validImports);
    triggerMsg(`Successfully ingested ${validImports.length} transactions from CSV.`, 'success');
    setPendingCsvRows(null);
    setCsvValidationErrors([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Data Portability & Safety
        </span>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Backup & Restore
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Export complete financial archives, restore snapshots with duplicate detection, or import CSV bank statements.
        </p>
      </div>

      {/* Notification Toast */}
      {statusMessage.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
            : statusMessage.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
            : 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Full JSON Backup Export & Restore */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Full Workspace Backup (JSON)</h3>
              <p className="text-[11px] text-slate-400">Versioned backup containing transactions, categories, and settings</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Download a portable snapshot of all financial records. You can restore this file on any device or after reinstalling.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleExportBackupJson}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors pointer-events-auto shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Backup</span>
            </button>

            <button
              onClick={() => fileInputJsonRef.current?.click()}
              className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors pointer-events-auto"
            >
              <Upload className="w-4 h-4" />
              <span>Restore from Backup</span>
            </button>
            <input
              ref={fileInputJsonRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleInspectJsonFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>

        {/* Card 2: CSV Import */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Import Bank Statement (CSV)</h3>
              <p className="text-[11px] text-slate-400">Import CSV files with column mapping & error checks</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ingest external records from banks or bookkeeping software. Standard headers: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">Date, Description, Amount, Category, Type</code>.
          </p>

          <div className="pt-2">
            <button
              onClick={() => fileInputCsvRef.current?.click()}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors pointer-events-auto"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Select CSV File</span>
            </button>
            <input
              ref={fileInputCsvRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleInspectCsvFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>

      </div>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {pendingRestore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Confirm Backup Restoration
                  </h3>
                </div>
                <button onClick={() => setPendingRestore(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Backup Export Date:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {new Date(pendingRestore.payload.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Records in File:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {pendingRestore.payload.transactions.length} records
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New (Unique) Records:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    +{pendingRestore.newCount}
                  </span>
                </div>
                {pendingRestore.duplicateCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Matching / Existing IDs:</span>
                    <span className="font-mono font-bold text-amber-500">
                      {pendingRestore.duplicateCount}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Choose how you want to restore these records. Replacing will create an automatic pre-restore safety snapshot.
              </p>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={executeMergeRestore}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 pointer-events-auto transition-colors"
                >
                  <span>Merge with Existing Records (Skip {pendingRestore.duplicateCount} duplicates)</span>
                </button>

                <button
                  onClick={executeReplaceRestore}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 pointer-events-auto transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Replace Entire Workspace (Save Pre-Restore Backup)</span>
                </button>

                <button
                  onClick={() => setPendingRestore(null)}
                  className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Preview Modal */}
      <AnimatePresence>
        {pendingCsvRows && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl p-6 flex flex-col space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    CSV Records Preview ({pendingCsvRows.length} valid)
                  </h3>
                  <p className="text-[11px] text-slate-400">Review parsed rows before committing to your ledger</p>
                </div>
                <button onClick={() => setPendingCsvRows(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {csvValidationErrors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-400 space-y-1">
                  <span className="font-bold">Notice: Some rows were skipped due to formatting errors:</span>
                  <ul className="list-disc pl-4 text-[11px]">
                    {csvValidationErrors.slice(0, 3).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {csvValidationErrors.length > 3 && <li>...and {csvValidationErrors.length - 3} more</li>}
                  </ul>
                </div>
              )}

              <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingCsvRows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono text-slate-400">{r.date}</td>
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{r.description}</td>
                        <td className="py-2 px-3 text-slate-500">{r.category}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.type === 'income' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(r.amount || 0, profile.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setPendingCsvRows(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={executeCsvImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Import {pendingCsvRows.length} Transactions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Danger Zone: Reset & Clean */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ledger Maintenance & Reset</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMaintenanceAction('demo')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors pointer-events-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Load Realistic Starter Sample Data</span>
          </button>

          <button
            type="button"
            onClick={() => setMaintenanceAction('clear')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-1.5 transition-colors pointer-events-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Transactions</span>
          </button>
        </div>
      </div>

      {/* In-App Confirmation Modal for Maintenance Actions */}
      <AnimatePresence>
        {maintenanceAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <div className={`p-3 rounded-2xl ${maintenanceAction === 'clear' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600'}`}>
                  {maintenanceAction === 'clear' ? <AlertTriangle className="w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {maintenanceAction === 'clear' ? 'Clear All Transactions?' : 'Load Sample Data?'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {maintenanceAction === 'clear' ? 'This removes existing transactions from local storage.' : 'Populates the ledger with realistic small business starter data.'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {maintenanceAction === 'clear' ? (
                  <>You can export a JSON or CSV backup before proceeding. Are you sure you want to delete all {transactions.length} transactions?</>
                ) : (
                  <>This will load sample income and expense records so you can test features and charts. Are you sure you want to proceed?</>
                )}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceAction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (maintenanceAction === 'clear') {
                      onClearAll();
                    } else if (maintenanceAction === 'demo') {
                      onResetToDemo();
                    }
                    setMaintenanceAction(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-colors ${
                    maintenanceAction === 'clear' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {maintenanceAction === 'clear' ? 'Yes, Clear All' : 'Load Sample Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
