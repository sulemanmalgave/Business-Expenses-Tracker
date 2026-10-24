import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  HelpCircle,
  RefreshCw,
  Tag,
  CreditCard,
  Building,
  AlertCircle
} from 'lucide-react';
import { Transaction, Category, UserProfile, RecurrencePeriod } from '../types';
import { DEFAULT_CURRENCIES, formatCurrency } from '../utils/financeUtils';
import { validateTransaction, roundMoney } from '../utils/financeCalculations';

interface IncomeViewProps {
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

export const IncomeView: React.FC<IncomeViewProps> = ({
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

  // Form parameters
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(profile.currency);
  const [exchangeRate, setExchangeRate] = useState('1');
  const [selectedCat, setSelectedCat] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [account, setAccount] = useState('Operating Account');
  const [project, setProject] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('monthly');

  // Custom inline category creator
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const incomeCategories = categories.filter((c) => c.type === 'income');

  // Extract unique projects
  const existingProjects = Array.from(
    new Set(
      transactions
        .filter((t) => t.type === 'income' && t.project && t.project.trim())
        .map((t) => t.project!.trim())
    )
  );

  // Filter logic
  const incomes = transactions.filter((t) => {
    if (t.isTransfer || (t.category && (t.category.toLowerCase() === 'transfer' || t.category.toLowerCase() === 'account transfer'))) {
      return false;
    }
    return t.type === 'income';
  });

  const filteredIncomes = incomes.filter((t) => {
    const matchesSearch = 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesProject = selectedProject === 'All' || (t.project || 'Unassigned') === selectedProject;
    const matchesMethod = selectedPaymentMethod === 'All' || (t.paymentMethod || 'Other') === selectedPaymentMethod;
    const matchesStartDate = !startDate || t.date >= startDate;
    const matchesEndDate = !endDate || t.date <= endDate;
    return matchesSearch && matchesCategory && matchesProject && matchesMethod && matchesStartDate && matchesEndDate;
  });

  const totalIncomeFiltered = roundMoney(
    filteredIncomes.reduce((sum, t) => {
      const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
      return sum + t.amount * rate;
    }, 0)
  );

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setCurrency(tx.currency || profile.currency);
    setExchangeRate((tx.exchangeRate || 1).toString());
    setSelectedCat(tx.category);
    setDate(tx.date);
    setDescription(tx.description);
    setPaymentMethod(tx.paymentMethod || 'Bank Transfer');
    setAccount(tx.account || 'Operating Account');
    setProject(tx.project || '');
    setNotes(tx.notes || '');
    setIsRecurring(tx.isRecurring);
    setRecurrencePeriod(tx.recurrencePeriod);
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
    setPaymentMethod('Bank Transfer');
    setAccount('Operating Account');
    setProject('');
    setNotes('');
    setIsRecurring(false);
    setRecurrencePeriod('monthly');
    setShowAddModal(false);
    setShowCatInput(false);
    setNewCatName('');
    setFormErrors([]);
    setIsSubmitting(false);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCustomCategory(newCatName.trim(), 'income');
    setSelectedCat(newCatName.trim());
    setNewCatName('');
    setShowCatInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = parseFloat(amount);
    const parsedExchangeRate = parseFloat(exchangeRate) || 1.0;
    const chosenCat = selectedCat || (incomeCategories[0]?.name || 'Client Services');

    const payloadCandidate: Partial<Transaction> = {
      type: 'income',
      amount: parsedAmount,
      currency,
      exchangeRate: parsedExchangeRate,
      category: chosenCat,
      date,
      description: description.trim() || `Income from ${chosenCat}`,
    };

    const validation = validateTransaction(payloadCandidate);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    const transactionPayload = {
      type: 'income' as const,
      amount: roundMoney(parsedAmount),
      currency,
      exchangeRate: parsedExchangeRate,
      category: chosenCat,
      date,
      description: description.trim() || `Income from ${chosenCat}`,
      paymentMethod,
      account,
      project: project.trim() || undefined,
      notes: notes.trim() || undefined,
      isRecurring,
      recurrencePeriod: isRecurring ? recurrencePeriod : ('none' as const),
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
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Inflows Ledger
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Income
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track client invoices, retainer collections, product revenue, and project accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCat(incomeCategories[0]?.name || '');
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors pointer-events-auto shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Record Income</span>
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
              {incomeCategories.map((c) => (
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
            Total Filtered: <span className="text-emerald-600">{formatCurrency(totalIncomeFiltered, profile.currency, profile.numberFormatPreference)}</span>
          </div>
        </div>
      </div>

      {/* Main Income Table */}
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
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIncomes.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {tx.date}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.description}</p>
                    {tx.notes && <p className="text-[10px] text-slate-400 italic line-clamp-1">{tx.notes}</p>}
                    {tx.isRecurring && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-bold text-emerald-500 font-mono">
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
                    {tx.project ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                        <Tag className="w-3 h-3" /> {tx.project}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">–</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {tx.paymentMethod || 'Bank Transfer'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +{formatCurrency(tx.amount, profile.currency, profile.numberFormatPreference)}
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

              {filteredIncomes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No income records match your filters</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting the date boundaries or add an income entry.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Add / Edit Income Row */}
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Income Ledger</span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {editingTx ? 'Edit Income Record' : 'Record Business Income'}
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
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Description / Client *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Advisory Retainer, UI Design Milestone"
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
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
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
                        className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl"
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
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Project Tag & Account */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Project / Client Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
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
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
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
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Notes / Invoice Reference</label>
                  <textarea
                    rows={2}
                    placeholder="Optional details, invoice #, or payment terms..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Recurring Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isRecurringIncome"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isRecurringIncome" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                    Recurring retainer income
                  </label>
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all"
                  >
                    {isSubmitting ? 'Saving...' : editingTx ? 'Save Changes' : 'Record Income'}
                  </button>
                </div>
              </form>
            </motion.div>
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Income Record?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">"{confirmDeleteTx.description}"</strong>?
                </p>
                <div className="mt-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-mono font-bold text-emerald-600">
                  +{formatCurrency(confirmDeleteTx.amount, profile.currency, profile.numberFormatPreference)} • {confirmDeleteTx.date}
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
      </AnimatePresence>

    </div>
  );
};
