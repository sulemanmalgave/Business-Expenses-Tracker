import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  X, 
  FileText, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Eye, 
  Layers, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Transaction, Category, UserProfile } from '../types';
import { BatchReceiptItem, parseReceiptLocally } from '../utils/receiptParser';
import { formatCurrency } from '../utils/financeUtils';

interface BatchReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  profile: UserProfile;
  existingTransactions: Transaction[];
  onCommitTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
}

export const BatchReceiptModal: React.FC<BatchReceiptModalProps> = ({
  isOpen,
  onClose,
  categories,
  profile,
  existingTransactions,
  onCommitTransactions,
}) => {
  const [items, setItems] = useState<BatchReceiptItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewItem, setPreviewItem] = useState<BatchReceiptItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleFiles = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    const newItems: BatchReceiptItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Supported: PDF, JPG, JPEG, PNG, WEBP
      if (!file.type.match(/(image\/(jpeg|png|webp)|application\/pdf)/i) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
        continue;
      }
      const item = await parseReceiptLocally(file, existingTransactions, profile.currency);
      newItems.push(item);
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<BatchReceiptItem['suggestedData']>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              suggestedData: {
                ...item.suggestedData,
                ...updates,
              },
            }
          : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (previewItem?.id === id) setPreviewItem(null);
  };

  const handleCommitAll = () => {
    const validTransactions: Omit<Transaction, 'id'>[] = items.map((item) => ({
      type: 'expense',
      amount: Math.max(0.01, item.suggestedData.amount || 1.0),
      currency: item.suggestedData.currency || profile.currency,
      exchangeRate: 1.0,
      category: item.suggestedData.category || expenseCategories[0]?.name || 'Other Expenses',
      date: item.suggestedData.date,
      description: item.suggestedData.vendor || item.fileName,
      paymentMethod: item.suggestedData.paymentMethod || 'Credit Card',
      account: 'Operating Account',
      receipt: item.dataUrl || undefined,
      receiptName: item.fileName,
      notes: `Locally extracted receipt archive: ${item.fileName}`,
      isRecurring: false,
      recurrencePeriod: 'none',
      createdAt: new Date().toISOString(),
    }));

    onCommitTransactions(validTransactions);
    setItems([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Receipt Attachment & Ingest</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full font-bold">Offline-First</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Batch Receipt & Invoice Ingest</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Attach multiple receipts (PDF, PNG, JPG, WebP). Files and auto-detected details are processed client-side without uploading to external servers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-500">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Drop multiple receipt files here, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse computer</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Supports bulk PDF, PNG, JPG, JPEG, and WebP invoices.
              </p>
            </div>
          </div>

          {/* Extracted Items Review Table */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Extracted Records ({items.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Verify or edit values before committing to expense ledger
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">File / Preview</th>
                        <th className="py-2.5 px-3">Vendor / Title</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {item.dataUrl && item.fileType.startsWith('image') ? (
                                <img
                                  src={item.dataUrl}
                                  alt="thumb"
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  onClick={() => setPreviewItem(item)}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}
                              <span className="truncate max-w-[110px] font-mono text-[11px] text-slate-600 dark:text-slate-300" title={item.fileName}>
                                {item.fileName}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.suggestedData.vendor}
                              onChange={(e) => handleUpdateItem(item.id, { vendor: e.target.value })}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-full max-w-[140px] text-slate-900 dark:text-white"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="date"
                              value={item.suggestedData.date}
                              onChange={(e) => handleUpdateItem(item.id, { date: e.target.value })}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={item.suggestedData.category}
                              onChange={(e) => handleUpdateItem(item.id, { category: e.target.value })}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white max-w-[130px]"
                            >
                              {expenseCategories.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.suggestedData.amount}
                              onChange={(e) => handleUpdateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-20 font-mono font-bold text-slate-900 dark:text-white"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {item.suggestedData.isDuplicateCandidate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full" title="Possible duplicate on this date with matching amount">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Check Dupe</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" />
                                <span>Ready</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {items.length === 0 ? 'No files queued' : `${items.length} item(s) ready to create in ledger`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitAll}
              disabled={items.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 pointer-events-auto"
            >
              <span>Commit {items.length} Transactions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Image Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80" onClick={() => setPreviewItem(null)}>
          <div className="max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl p-4 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-2 right-2 p-1.5 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewItem.dataUrl} alt="Receipt preview" className="max-h-[75vh] w-auto mx-auto rounded-lg object-contain" />
            <p className="text-center text-xs text-slate-300 mt-2 font-mono">{previewItem.fileName}</p>
          </div>
        </div>
      )}
    </div>
  );
};
