import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Calendar, 
  Paperclip, 
  X, 
  FolderPlus, 
  HelpCircle,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Transaction, Category, UserProfile, RecurrencePeriod } from '../types';
import { DEFAULT_CURRENCIES, formatCurrency, compressImage } from '../utils/financeUtils';

interface ExpensesViewProps {
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (id: string, updated: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCustomCategory: (name: string, type: 'income' | 'expense') => void;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  transactions,
  categories,
  profile,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onAddCustomCategory,
  isPremium = false,
  onUpgradeTrigger,
}) => {
  // Local filtered expense state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // New Transaction Form states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(profile.currency);
  const [exchangeRate, setExchangeRate] = useState('1');
  const [selectedCat, setSelectedCat] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('monthly');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Custom inline category builder
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Viewer state for receipts
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Filter logic
  const expenses = transactions.filter((t) => t.type === 'expense');
  const filteredExpenses = expenses.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesStartDate = !startDate || t.date >= startDate;
    const matchesEndDate = !endDate || t.date <= endDate;
    return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
  });

  const totalExpenseFiltered = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);

  // File Upload receipt converter
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const compressed = await compressImage(base64, 400, 400);
        setReceiptBase64(compressed);
      } catch (err) {
        console.error('Failed to compress receipt, using high-resfallback', err);
        setReceiptBase64(base64);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open modal for editing
  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setCurrency(tx.currency);
    setExchangeRate(tx.exchangeRate.toString());
    setSelectedCat(tx.category);
    setDate(tx.date);
    setDescription(tx.description);
    setIsRecurring(tx.isRecurring);
    setRecurrencePeriod(tx.recurrencePeriod);
    setReceiptBase64(tx.receipt || '');
    setReceiptFileName(tx.receiptName || '');
    setShowAddModal(true);
  };

  const closeForm = () => {
    setEditingTx(null);
    setAmount('');
    setCurrency(profile.currency);
    setExchangeRate('1');
    setSelectedCat('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsRecurring(false);
    setRecurrencePeriod('monthly');
    setReceiptBase64('');
    setReceiptFileName('');
    setShowAddModal(false);
    setShowCatInput(false);
    setNewCatName('');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCustomCategory(newCatName.trim(), 'expense');
    setSelectedCat(newCatName.trim());
    setNewCatName('');
    setShowCatInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const parsedExchangeRate = parseFloat(exchangeRate);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (isNaN(parsedExchangeRate) || parsedExchangeRate <= 0) return;

    const chosenCat = selectedCat || (expenseCategories[0]?.name || 'Other Expenses');

    const transactionPayload = {
      type: 'expense' as const,
      amount: parsedAmount,
      currency,
      exchangeRate: parsedExchangeRate,
      category: chosenCat,
      date,
      description: description.trim() || `Expense for ${chosenCat}`,
      isRecurring,
      recurrencePeriod: isRecurring ? recurrencePeriod : ('none' as const),
      receipt: receiptBase64 || undefined,
      receiptName: receiptFileName || undefined,
    };

    if (editingTx) {
      onEditTransaction(editingTx.id, transactionPayload);
    } else {
      onAddTransaction(transactionPayload);
    }
    closeForm();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-500 dark:text-rose-400">
            Outflows Ledger
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Business Expense Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log raw costs, invoice vendor payouts, archive receipts, and organize taxonomy.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCat(expenseCategories[0]?.name || '');
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 md:py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-rose-600/10 transition-colors pointer-events-auto shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense Row</span>
        </button>
      </div>

      {/* Filter and Search Action Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Search bar */}
          <div className="lg:col-span-4 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Query Keywords
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search description, store, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-3 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Exp Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
            >
              <option value="All">All Categories</option>
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="lg:col-span-3 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Period Frame (From - To)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 rounded-xl text-[10px] outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 rounded-xl text-[10px] outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-2">
            <button
              onClick={clearFilters}
              disabled={!searchTerm && selectedCategory === 'All' && !startDate && !endDate}
              className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors pointer-events-auto"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Expenses Table or Empty Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-500">Showing {filteredExpenses.length} rows</span>
            {(searchTerm || selectedCategory !== 'All' || startDate || endDate) && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded">
                Filtered active
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              Total Expenses Filtered
            </span>
            <span className="text-sm font-semibold font-mono text-rose-500">
              {formatCurrency(totalExpenseFiltered, profile.currency)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-4">Description / Vendor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Receipt</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {filteredExpenses.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-3 px-5 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="py-3 px-4 py-3">
                    <div className="min-w-[150px] max-w-[280px]">
                      <span className="text-slate-700 dark:text-slate-200 font-medium line-clamp-1">
                        {tx.description}
                      </span>
                      {tx.isRecurring && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-[9px] text-blue-600 dark:text-blue-400 font-bold max-w-max font-sans">
                          <RefreshCw className="w-2.5 h-2.5 stroke-[2.5]" />
                          Recurring: {tx.recurrencePeriod}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-bold text-rose-500 tracking-wide uppercase">
                      Debit
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {tx.receipt ? (
                      <button
                        onClick={() => setActiveReceiptUrl(tx.receipt || null)}
                        className="p-1 text-slate-400 hover:text-blue-600 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 pointer-events-auto"
                        title="View Receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-[10px] font-mono">–</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {formatCurrency(tx.amount, profile.currency)}
                  </td>
                  <td className="py-3 px-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1 px-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg pointer-events-auto"
                        title="Edit Row"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense history row?')) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="p-1 px-1.5 text-slate-400 hover:text-rose-500 rounded-lg pointer-events-auto"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-sm">No expenses matched your parameters</p>
                      <p className="text-[11px] mt-1 text-slate-400 dark:text-slate-500">
                        Adjust dates, categories or keyword parameters to view older items.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Add / Edit Expense Row */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {editingTx ? 'Modify Expense Row' : 'Record Business Expense Row'}
                </h3>
                <button
                  onClick={closeForm}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg pointer-events-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Amount ({currency}) *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                    >
                      {DEFAULT_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exchange Rate */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Exchange Rate to {profile.currency} *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="1.0"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Description / Vendor / Item *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. AWS Hosting Server billing, Office desk supplies"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Expense Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCatInput(!showCatInput)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold pointer-events-auto"
                    >
                      {showCatInput ? 'Select Existing' : '+ Custom Category'}
                    </button>
                  </div>

                  {!showCatInput ? (
                    <select
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto focus:border-blue-500"
                    >
                      {expenseCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="E.g. SaaS Subscriptions, Logistics"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-850 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold pointer-events-auto"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Expense Billing Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 focus:border-blue-500 pointer-events-auto"
                  />
                </div>

                {/* Recurring Options */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        Is this a Recurring Expense?
                        {!isPremium && <span className="text-[8px] font-bold text-blue-500 bg-blue-500/10 px-1 py-0.2 rounded-full uppercase">🔒 Pro</span>}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Automatically highlights upcoming months
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer pointer-events-auto">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => {
                          if (!isPremium) {
                            onUpgradeTrigger?.('Recurring expense scheduling is a Premium module.');
                            return;
                          }
                          setIsRecurring(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {isRecurring && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Period</span>
                        <select
                          value={recurrencePeriod}
                          onChange={(e) => setRecurrencePeriod(e.target.value as RecurrencePeriod)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto font-medium"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt Upload & Attachment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Receipt Attachment (Compressed)
                  </label>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPremium) {
                          onUpgradeTrigger?.('Receipt image attachment upload is a Premium module.');
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center space-x-1.5 px-3 py-2 border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl text-xs text-slate-600 dark:text-slate-300 pointer-events-auto hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{receiptBase64 ? 'Replace Attachment' : 'Upload File'} {!isPremium && '🔒'}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {isUploading && (
                      <span className="text-[10px] text-slate-400 font-medium animate-pulse">
                        Compressing PNG/JPG...
                      </span>
                    )}

                    {receiptBase64 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-emerald-500 font-medium font-mono truncate max-w-[120px]">
                          {receiptFileName || 'receipt.jpg'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptBase64('');
                            setReceiptFileName('');
                          }}
                          className="text-xs text-rose-500 font-bold hover:underline pointer-events-auto"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-rose-650 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-all tracking-wide pointer-events-auto shadow-sm"
                  >
                    {editingTx ? 'Apply Upgraded Ledger Row' : 'Submit Business expense'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:text-slate-800 rounded-xl text-xs font-semibold pointer-events-auto transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox / Receipt image dialog viewer */}
      <AnimatePresence>
        {activeReceiptUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-lg w-full flex flex-col items-center">
              <button
                onClick={() => setActiveReceiptUrl(null)}
                className="absolute right-4 top-4 bg-slate-850 p-1.5 rounded-lg text-slate-400 hover:text-white pointer-events-auto"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
                Attached Expense Receipt Receipt Archive
              </h3>
              <div className="bg-slate-950 p-2.5 rounded-2xl w-full flex justify-center">
                <img
                  src={activeReceiptUrl}
                  alt="Receipt Preview"
                  className="max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-800"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-3 text-center">
                Medium resolution canvas compression. Secure offline sandbox persistence.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
