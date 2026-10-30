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
  HelpCircle,
  Eye,
  RefreshCw,
  Tag,
  CreditCard,
  Building,
  Users,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Transaction, Category, UserProfile, RecurrencePeriod, Client } from '../types';
import { DEFAULT_CURRENCIES, formatCurrency, compressImage } from '../utils/financeUtils';
import { validateTransaction, roundMoney } from '../utils/financeCalculations';
import { ClientSelector } from './ClientSelector';

interface ExpensesViewProps {
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  clients?: Client[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (id: string, updated: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCustomCategory: (name: string, type: 'income' | 'expense') => void;
  onAddClient?: (client: Client) => void;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  transactions,
  categories,
  profile,
  clients = [],
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onAddCustomCategory,
  onAddClient,
  isPremium = false,
  onUpgradeTrigger,
}) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Transaction Form states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(profile.currency);
  const [exchangeRate, setExchangeRate] = useState('1');
  const [selectedCat, setSelectedCat] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [account, setAccount] = useState('Operating Account');
  const [project, setProject] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [notes, setNotes] = useState('');
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

  // Extract unique projects present in expenses for filtering
  const existingProjects = Array.from(
    new Set(
      transactions
        .filter((t) => t.type === 'expense' && (t.clientName || t.project))
        .map((t) => (t.clientName || t.project)!.trim())
    )
  );

  // Filter logic
  const expenses = transactions.filter((t) => {
    if (t.isTransfer || (t.category && (t.category.toLowerCase() === 'transfer' || t.category.toLowerCase() === 'account transfer'))) {
      return false;
    }
    return t.type === 'expense';
  });

  const filteredExpenses = expenses.filter((t) => {
    const matchesSearch = 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesProject = selectedProject === 'All' || (t.clientName || t.project || 'Unassigned') === selectedProject;
    const matchesMethod = selectedPaymentMethod === 'All' || (t.paymentMethod || 'Other') === selectedPaymentMethod;
    const matchesStartDate = !startDate || t.date >= startDate;
    const matchesEndDate = !endDate || t.date <= endDate;
    return matchesSearch && matchesCategory && matchesProject && matchesMethod && matchesStartDate && matchesEndDate;
  });

  const totalExpenseFiltered = roundMoney(
    filteredExpenses.reduce((sum, t) => {
      const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
      return sum + t.amount * rate;
    }, 0)
  );

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
        const compressed = await compressImage(base64);
        setReceiptBase64(compressed);
      } catch (err) {
        setReceiptBase64(base64);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setCurrency(tx.currency || profile.currency);
    setExchangeRate((tx.exchangeRate || 1).toString());
    setSelectedCat(tx.category);
    setDate(tx.date);
    setDescription(tx.description);
    setPaymentMethod(tx.paymentMethod || 'Credit Card');
    setAccount(tx.account || 'Operating Account');
    setProject(tx.project || '');
    setSelectedClientId(tx.clientId || '');
    setSelectedClientName(tx.clientName || tx.project || '');
    setNotes(tx.notes || '');
    setIsRecurring(tx.isRecurring);
    setRecurrencePeriod(tx.recurrencePeriod);
    setReceiptBase64(tx.receipt || '');
    setReceiptFileName(tx.receiptName || '');
    setFormErrors([]);
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
    setPaymentMethod('Credit Card');
    setAccount('Operating Account');
    setProject('');
    setSelectedClientId('');
    setSelectedClientName('');
    setNotes('');
    setIsRecurring(false);
    setRecurrencePeriod('monthly');
    setReceiptBase64('');
    setReceiptFileName('');
    setShowAddModal(false);
    setShowCatInput(false);
    setNewCatName('');
    setFormErrors([]);
    setIsSubmitting(false);
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
    if (isSubmitting) return;

    const parsedAmount = parseFloat(amount);
    const parsedExchangeRate = parseFloat(exchangeRate) || 1.0;
    const chosenCat = selectedCat || (expenseCategories[0]?.name || 'Other Expenses');

    const payloadCandidate: Partial<Transaction> = {
      type: 'expense',
      amount: parsedAmount,
      currency,
      exchangeRate: parsedExchangeRate,
      category: chosenCat,
      date,
      description: description.trim() || `Expense for ${chosenCat}`,
    };

    const validation = validateTransaction(payloadCandidate);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const transactionPayload = {
      type: 'expense' as const,
      amount: roundMoney(parsedAmount),
      currency,
      exchangeRate: parsedExchangeRate,
      category: chosenCat,
      date,
      description: description.trim() || `Expense for ${chosenCat}`,
      paymentMethod,
      account,
      clientId: selectedClientId || undefined,
      clientName: selectedClientName || undefined,
      project: project.trim() || selectedClientName || undefined,
      notes: notes.trim() || undefined,
      isRecurring,
      recurrencePeriod: isRecurring ? recurrencePeriod : ('none' as const),
      receipt: receiptBase64 || undefined,
      receiptName: receiptFileName || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (editingTx) {
      onEditTransaction(editingTx.id, transactionPayload);
    } else {
      onAddTransaction({
        ...transactionPayload,
        createdAt: new Date().toISOString(),
      });
    }

    closeForm();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedProject('All');
    setSelectedPaymentMethod('All');
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
            Expenses
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log overhead, vendor payouts, receipts, and organize by project tags and payment accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCat(expenseCategories[0]?.name || '');
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 md:py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors pointer-events-auto shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Filter and Query Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, notes or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
            >
              <option value="All">All Categories</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
            >
              <option value="All">All Projects</option>
              {existingProjects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
            >
              <option value="All">All Payment Methods</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
              <option value="UPI / Digital Payment">UPI / Digital Payment</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline font-semibold"
            >
              Reset Filters
            </button>
          </div>

        </div>

        {/* Date boundary selection */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          />
          <div className="ml-auto font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            Total Filtered: <span className="text-rose-600">{formatCurrency(totalExpenseFiltered, profile.currency, profile.numberFormatPreference)}</span>
          </div>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Receipt</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.description}</p>
                    {tx.notes && <p className="text-[10px] text-slate-400 italic line-clamp-1">{tx.notes}</p>}
                    {tx.isRecurring && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-bold text-indigo-500 font-mono">
                        <RefreshCw className="w-2.5 h-2.5" /> Recurring ({tx.recurrencePeriod})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {tx.clientName ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{tx.clientName}</span>
                      </span>
                    ) : tx.project ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                        <Tag className="w-3 h-3" /> {tx.project}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">–</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {tx.paymentMethod || 'Credit Card'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {tx.receipt ? (
                      <button
                        onClick={() => setActiveReceiptUrl(tx.receipt || null)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 pointer-events-auto"
                        title="View Attached Receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">–</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(tx.amount, profile.currency, profile.numberFormatPreference)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 pointer-events-auto"
                        title="Edit Row"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTx(tx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 pointer-events-auto"
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
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No expense records match your filters</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting search filters or record a new expense.</p>
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Expense Ledger</span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {editingTx ? 'Edit Expense Record' : 'Record Business Expense'}
                  </h3>
                </div>
                <button onClick={closeForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Validation Errors Display */}
              {formErrors.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs space-y-1">
                  {formErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                
                {/* Amount and Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Amount ({currency}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Description / Vendor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Cloud Hosting, Office Supplies, Client Dinner"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-500">Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowCatInput(!showCatInput)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      {showCatInput ? 'Close' : '+ New Category'}
                    </button>
                  </div>
                  
                  {showCatInput ? (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="New category name"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                  ) : null}

                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Optional Client Association */}
                <ClientSelector
                  clients={clients}
                  selectedClientId={selectedClientId}
                  selectedClientName={selectedClientName}
                  onSelectClient={(client) => {
                    if (client) {
                      setSelectedClientId(client.id);
                      setSelectedClientName(client.name);
                      if (!project.trim()) {
                        setProject(client.name);
                      }
                    } else {
                      setSelectedClientId('');
                      setSelectedClientName('');
                    }
                  }}
                  onAddNewClient={onAddClient}
                  label="Associated Client (Optional)"
                  placeholder="None / General business expense"
                />

                {/* Project Tag & Account */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Project / Client Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Project Apollo"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI / Digital Payment">UPI / Digital Payment</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Notes / Internal Reference</label>
                  <textarea
                    rows={2}
                    placeholder="Optional details, invoice #, or tax note..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Receipt Attachment */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Receipt Attachment</span>
                      {!isPremium && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <Sparkles className="w-2 h-2" />
                          PRO
                        </span>
                      )}
                    </span>
                    {receiptBase64 && (
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptBase64('');
                          setReceiptFileName('');
                        }}
                        className="text-[10px] text-rose-500 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {receiptBase64 ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={receiptBase64}
                        alt="Receipt"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                      <span className="text-xs font-mono text-slate-600 truncate">{receiptFileName || 'Receipt Attached'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {isUploading ? 'Compressing receipt...' : 'Click to attach receipt image'}
                    </button>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all"
                  >
                    {isSubmitting ? 'Saving...' : editingTx ? 'Save Changes' : 'Record Expense'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Viewer Full Modal */}
      {activeReceiptUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setActiveReceiptUrl(null)}
        >
          <div className="max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl p-4 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveReceiptUrl(null)}
              className="absolute top-2 right-2 p-1.5 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activeReceiptUrl} alt="Receipt" className="max-h-[75vh] w-auto mx-auto rounded-lg object-contain" />
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal: Delete Transaction */}
      {confirmDeleteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Expense Record?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">"{confirmDeleteTx.description}"</strong>?
              </p>
              <div className="mt-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-mono font-bold text-rose-600">
                {formatCurrency(confirmDeleteTx.amount, profile.currency, profile.numberFormatPreference)} • {confirmDeleteTx.date}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTx(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(confirmDeleteTx.id);
                  setConfirmDeleteTx(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
