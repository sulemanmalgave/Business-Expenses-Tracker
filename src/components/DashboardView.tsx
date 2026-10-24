import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Upload, 
  Clock, 
  AlertCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Transaction, UserProfile, RecurringBill } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { 
  calculateFinancials, 
  calculateMonthOverMonth, 
  getDateRangeForPeriod, 
  filterTransactions 
} from '../utils/financeCalculations';
import { evaluateRecurringBills } from '../utils/recurringService';
import { VisualChart } from './VisualChart';

interface DashboardViewProps {
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  profile: UserProfile;
  onNavigate: (tab: string) => void;
  onQuickAdd: (type: 'income' | 'expense') => void;
  onOpenBatchReceipts: () => void;
  onOpenRecurringBills: () => void;
  onMarkBillPaid: (bill: RecurringBill) => void;
  onOpenInvoices?: () => void;
  onResetToDemo?: () => void;
  onClearAll?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  recurringBills,
  profile,
  onNavigate,
  onQuickAdd,
  onOpenBatchReceipts,
  onOpenRecurringBills,
  onMarkBillPaid,
  onOpenInvoices,
  onResetToDemo,
  onClearAll,
}) => {
  const [chartMode, setChartMode] = useState<'incomeVsExpense' | 'categoryBreakdown'>('incomeVsExpense');
  const [selectedPeriod, setSelectedPeriod] = useState<
    'this_month' | 'last_month' | 'financial_year' | 'calendar_year' | 'all' | 'custom'
  >('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Active period calculation
  const periodRange = getDateRangeForPeriod(
    selectedPeriod,
    new Date(),
    profile.financialYearStart || 'April'
  );

  const activeStartDate = selectedPeriod === 'custom' ? customStartDate : periodRange.startDate;
  const activeEndDate = selectedPeriod === 'custom' ? customEndDate : periodRange.endDate;

  // Filter transactions according to selected period
  const filteredTransactions = filterTransactions(transactions, {
    startDate: activeStartDate,
    endDate: activeEndDate,
  });

  // Use unified calculation engine on filtered dataset
  const financials = calculateFinancials(filteredTransactions, profile.taxRate);
  const mom = calculateMonthOverMonth(transactions);

  // Evaluate upcoming bills
  const billStatus = evaluateRecurringBills(recurringBills);
  const nextUpcomingBills = [...billStatus.overdue, ...billStatus.dueSoon].slice(0, 3);

  // Recent transactions (limit 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const hasTransactions = transactions.length > 0;
  const isDemoActive = transactions.length > 0 && transactions.some((t) => t.id.startsWith('tx_starter_'));

  return (
    <div className="space-y-6">
      
      {/* Demo Dataset Active Notification Banner */}
      {isDemoActive && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Sample Demo Dataset Active:</strong> You are viewing realistic sample transactions. Your financial metrics reflect preview data.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClearAll}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors pointer-events-auto"
            >
              Clear Demo & Start Fresh
            </button>
            <button
              onClick={() => onNavigate('backup')}
              className="px-2.5 py-1 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs hover:bg-amber-500/10 transition-colors pointer-events-auto"
            >
              Export / Backup
            </button>
          </div>
        </div>
      )}
      
      {/* Top Welcome Title & Primary Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Overview Hub
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Welcome Back, {profile.ownerName || 'Finance Manager'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time status for <span className="font-semibold">{profile.businessName || 'Business Workspace'}</span>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onQuickAdd('income')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors pointer-events-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Income</span>
          </button>

          <button
            onClick={() => onQuickAdd('expense')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors pointer-events-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={onOpenBatchReceipts}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors pointer-events-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Batch Receipts</span>
          </button>

          {onOpenInvoices && (
            <button
              onClick={onOpenInvoices}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors pointer-events-auto"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors pointer-events-auto"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-slate-500 shrink-0">Period:</span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium shrink-0">
            <button
              onClick={() => setSelectedPeriod('this_month')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedPeriod === 'this_month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod('last_month')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedPeriod === 'last_month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setSelectedPeriod('financial_year')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedPeriod === 'financial_year'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {profile.financialYearStart === 'January' ? 'Calendar Year' : 'Financial Year (FY)'}
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedPeriod === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setSelectedPeriod('custom')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedPeriod === 'custom'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Range Label / Custom Date Inputs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {selectedPeriod === 'custom' ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-800 dark:text-slate-200"
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-800 dark:text-slate-200"
              />
            </div>
          ) : (
            <span className="font-medium bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 text-[11px]">
              Active: <strong className="text-slate-800 dark:text-slate-100">{periodRange.label}</strong>
              {activeStartDate && activeEndDate && (
                <span className="ml-1 text-slate-400">({activeStartDate} to {activeEndDate})</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Main KPI Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Total Income */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Total Income
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(financials.totalIncome, profile.currency, profile.numberFormatPreference)}
          </span>
          <div className="mt-4 flex items-center space-x-2 text-xs">
            {mom.hasComparableHistoricalData && mom.incomeChangePercentage !== null ? (
              <>
                <span className={`font-mono font-semibold ${mom.incomeChangePercentage >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {mom.incomeChangePercentage >= 0 ? '+' : ''}
                  {mom.incomeChangePercentage.toFixed(1)}%
                </span>
                <span className="text-slate-400 dark:text-slate-500">vs last month</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">
                {hasTransactions ? 'Prior month has no comparison records' : 'No records logged'}
              </span>
            )}
          </div>
        </motion.div>

        {/* Card 2: Total Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Total Expenses
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(financials.totalExpenses, profile.currency, profile.numberFormatPreference)}
          </span>
          <div className="mt-4 flex items-center space-x-2 text-xs">
            {mom.hasComparableHistoricalData && mom.expenseChangePercentage !== null ? (
              <>
                <span className={`font-mono font-semibold ${mom.expenseChangePercentage <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {mom.expenseChangePercentage >= 0 ? '+' : ''}
                  {mom.expenseChangePercentage.toFixed(1)}%
                </span>
                <span className="text-slate-400 dark:text-slate-500">vs last month</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">
                {hasTransactions ? 'Prior month has no comparison records' : 'No records logged'}
              </span>
            )}
          </div>
        </motion.div>

        {/* Card 3: Net Cash Flow & Net Profit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Net Cash Flow / Profit
          </span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            financials.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(financials.netCashFlow, profile.currency, profile.numberFormatPreference)}
          </span>
          <div className="mt-4 flex items-center space-x-2 text-xs">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {financials.profitMargin.toFixed(1)}% Profit Margin
            </span>
            <span className="text-slate-400 dark:text-slate-500">Cash Basis</span>
          </div>
        </motion.div>

      </div>

      {/* Meaningful Empty State when Zero Transactions Exist */}
      {!hasTransactions && (
        <div className="p-8 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Financial Records Logged Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Get started by recording your first invoice, overhead expense, or import a bank statement CSV to activate live analytics and charts.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onQuickAdd('income')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold pointer-events-auto shadow-xs"
            >
              + Record First Income
            </button>
            <button
              onClick={() => onQuickAdd('expense')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold pointer-events-auto shadow-xs"
            >
              + Record First Expense
            </button>
            <button
              onClick={onOpenBatchReceipts}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold pointer-events-auto shadow-xs"
            >
              Import Receipts
            </button>
            {onResetToDemo && (
              <button
                onClick={onResetToDemo}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold pointer-events-auto transition-colors"
              >
                Load Sample Data (Preview Demo)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid: Charts + Upcoming Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual Trends & Category Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {chartMode === 'incomeVsExpense' ? 'Income vs Expenses Trend' : 'Expense Category Allocation'}
                </h3>
                <p className="text-xs text-slate-400">
                  {chartMode === 'incomeVsExpense' ? 'Monthly cash flow trajectories' : 'Proportional breakdown by category'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    onClick={() => setChartMode('incomeVsExpense')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      chartMode === 'incomeVsExpense'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Monthly Cash Flow
                  </button>
                  <button
                    onClick={() => setChartMode('categoryBreakdown')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      chartMode === 'categoryBreakdown'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Category Donut
                  </button>
                </div>
                <button
                  onClick={() => onNavigate('analytics')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pointer-events-auto shrink-0 pl-1"
                >
                  <span>BI Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="h-64">
              <VisualChart 
                transactions={filteredTransactions} 
                type={chartMode} 
                currency={profile.currency} 
                profile={profile} 
              />
            </div>
          </div>

          {/* Expense Category Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Expense Allocation Breakdown
            </h3>
            
            {financials.expenseCategories.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {financials.expenseCategories.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.category}</span>
                      <div className="space-x-2 font-mono">
                        <span className="text-slate-900 dark:text-white font-bold">
                          {formatCurrency(cat.amount, profile.currency, profile.numberFormatPreference)}
                        </span>
                        <span className="text-slate-400 text-[11px]">({cat.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Bills & Recent Transactions */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Bills Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Upcoming Bills
                </h3>
              </div>
              <button
                onClick={onOpenRecurringBills}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline pointer-events-auto"
              >
                Manage All
              </button>
            </div>

            {nextUpcomingBills.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">No bills due in next 7 days</p>
                <button
                  onClick={onOpenRecurringBills}
                  className="text-[11px] font-bold text-indigo-600 underline pointer-events-auto"
                >
                  Configure recurring bills
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {nextUpcomingBills.map((bill) => {
                  const isOverdue = bill.nextDueDate < new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={bill.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isOverdue
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{bill.description}</p>
                        <p className={`text-[10px] font-mono ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          Due: {bill.nextDueDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(bill.amount, profile.currency, profile.numberFormatPreference)}
                        </span>
                        <button
                          onClick={() => onMarkBillPaid(bill)}
                          title="Confirm and create transaction"
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm pointer-events-auto transition-colors"
                        >
                          Pay
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Recent Transactions
              </h3>
              <button
                onClick={() => onNavigate('reports')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pointer-events-auto"
              >
                Full Ledger
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{tx.date} • {tx.category}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold shrink-0 ${
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, profile.currency, profile.numberFormatPreference)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
