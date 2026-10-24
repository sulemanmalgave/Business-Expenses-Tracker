import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import { RecurringBill, Category, UserProfile, Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { advanceDueDate } from '../utils/recurringService';

interface RecurringBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringBills: RecurringBill[];
  categories: Category[];
  profile: UserProfile;
  onSaveBill: (bill: RecurringBill) => void;
  onDeleteBill: (id: string) => void;
  onMarkAsPaid: (bill: RecurringBill) => void;
}

export const RecurringBillsModal: React.FC<RecurringBillsModalProps> = ({
  isOpen,
  onClose,
  recurringBills,
  categories,
  profile,
  onSaveBill,
  onDeleteBill,
  onMarkAsPaid,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(categories[0]?.name || 'Other Expenses');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [project, setProject] = useState('');
  const [account, setAccount] = useState('Operating Account');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newBill: RecurringBill = {
      id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      description: description.trim(),
      amount: parsedAmount,
      type,
      category,
      frequency,
      startDate,
      nextDueDate: nextDueDate || startDate,
      endDate: endDate || undefined,
      project: project.trim() || undefined,
      account,
      paymentMethod,
      isActive: true,
    };

    onSaveBill(newBill);
    setDescription('');
    setAmount('');
    setShowAddForm(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const date30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const date60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const projected30Outflow = recurringBills
    .filter((b) => b.type === 'expense' && b.isActive && b.nextDueDate <= date30Days)
    .reduce((sum, b) => sum + b.amount, 0);

  const projected60Outflow = recurringBills
    .filter((b) => b.type === 'expense' && b.isActive && b.nextDueDate <= date60Days)
    .reduce((sum, b) => sum + b.amount, 0);

  const projected30Inflow = recurringBills
    .filter((b) => b.type === 'income' && b.isActive && b.nextDueDate <= date30Days)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Scheduled Obligations</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Recurring Bills & Subscriptions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage automatic recurring reminders. Bills remain projected until you confirm payment into the active ledger.
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

          {/* Cash Flow Forecast Impact Banner */}
          {recurringBills.length > 0 && (
            <div className="p-4 bg-linear-to-r from-slate-50 to-indigo-50/30 dark:from-slate-850 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Cash Flow Forecast (Scheduled Obligations)</span>
                </span>
                <span className="text-[10px] text-slate-400">Projections based on active schedules</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Next 30 Days Outflow</span>
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(projected30Outflow, profile.currency)}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Next 60 Days Outflow</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                    {formatCurrency(projected60Outflow, profile.currency)}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Next 30 Days Inflow</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(projected30Inflow, profile.currency)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Action button to show form */}
          {!showAddForm && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Configured Schedules ({recurringBills.length})
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all pointer-events-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Recurring Bill</span>
              </button>
            </div>
          )}

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleAdd} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">Create Recurring Schedule</span>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Description / Bill Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fiber Internet, Office Rent, AWS"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Amount ({profile.currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow Retainer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {categories.filter((c) => c.type === type).map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Cadence / Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Next Due Date *</label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Optional Project Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Project Apollo"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI / Digital Payment">UPI / Digital Payment</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          )}

          {/* List of Recurring Bills */}
          <div className="space-y-3">
            {recurringBills.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No Recurring Bills Configured</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Add subscriptions, rent, retainers, and utility schedules to track upcoming cash outflows and avoid surprises.
                </p>
              </div>
            ) : (
              recurringBills.map((bill) => {
                const isOverdue = bill.nextDueDate < todayStr;
                return (
                  <div
                    key={bill.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isOverdue
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          bill.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        }`}>
                          {bill.frequency}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{bill.description}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>Category: {bill.category}</span>
                        <span>•</span>
                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                          Due: {bill.nextDueDate} {isOverdue && '(Overdue!)'}
                        </span>
                        {bill.project && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-500 font-sans">Tag: {bill.project}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                        {formatCurrency(bill.amount, profile.currency)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onMarkAsPaid(bill)}
                          title="Confirm payment into active ledger"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 pointer-events-auto transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Paid</span>
                        </button>
                        <button
                          onClick={() => onDeleteBill(bill.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
