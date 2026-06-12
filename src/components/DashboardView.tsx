import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Briefcase, 
  Tag, 
  Calendar, 
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { VisualChart } from './VisualChart';

interface DashboardViewProps {
  transactions: Transaction[];
  profile: UserProfile;
  onNavigate: (tab: string) => void;
  onQuickAdd: (type: 'income' | 'expense') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  profile,
  onNavigate,
  onQuickAdd,
}) => {
  const [insightClosed, setInsightClosed] = useState(false);

  // Financial calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Recent transactions (limit to 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Monthly summary cards (Current Month vs Previous Month calculations)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonthStr));
  const prevMonthTxs = transactions.filter((t) => t.date.startsWith(prevMonthStr));

  const curMonthInc = currentMonthTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const curMonthExp = currentMonthTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const prevMonthInc = prevMonthTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const prevMonthExp = prevMonthTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // Growth percentages
  const calculateChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  const incChange = calculateChange(curMonthInc, prevMonthInc);
  const expChange = calculateChange(curMonthExp, prevMonthExp);

  // Smart quick insight text
  const getSmartInsight = () => {
    if (profitMargin > 25) {
      return {
        title: 'Strong Financial Health',
        desc: `High net margin of ${profitMargin.toFixed(0)}%. Your revenue continues to outpace expenses cleanly. Perfect runway to invest in expansion, SaaS tools, or office infrastructure.`,
        type: 'success',
      };
    } else if (netProfit < 0) {
      return {
        title: 'Net Cash Burning Out',
        desc: 'Alert: Your current expenses exceed your total incoming receipts. We recommend cutting Software subscriptions or reviewing marketing campaigns in the Analytics menu.',
        type: 'danger',
      };
    } else {
      return {
        title: 'Moderate Margins',
        desc: `Net margin is stable at ${profitMargin.toFixed(0)}%. Consider automating recurring invoices for key services to stabilize weekly client inputs.`,
        type: 'warning',
      };
    }
  };

  const insight = getSmartInsight();

  return (
    <div className="space-y-6">
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Overview Hub
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            Welcome Back, {profile.ownerName || 'sarah'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time financial status of <span className="font-semibold">{profile.businessName || 'Apex Consulting'}</span>.
          </p>
        </div>

        {/* Quick action controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onQuickAdd('income')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/10 transition-colors pointer-events-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => onQuickAdd('expense')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-rose-600/10 transition-colors pointer-events-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Main KPI Card Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Income */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Total Revenue
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(totalIncome, profile.currency)}
          </span>
          <div className="mt-4 flex items-center space-x-2 text-xs">
            <span className={`font-mono font-semibold ${incChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {incChange >= 0 ? '+' : ''}
              {incChange.toFixed(1)}%
            </span>
            <span className="text-slate-400 dark:text-slate-500">from last month</span>
          </div>
        </motion.div>

        {/* Card 2: Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Total Expenditures
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(totalExpenses, profile.currency)}
          </span>
          <div className="mt-4 flex items-center space-x-2 text-xs">
            <span className={`font-mono font-semibold ${expChange <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {expChange >= 0 ? '+' : ''}
              {expChange.toFixed(1)}%
            </span>
            <span className="text-slate-400 dark:text-slate-500">from last month</span>
          </div>
        </motion.div>

        {/* Card 3: Net Income */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className={`absolute right-4 top-4 p-2.5 rounded-xl shrink-0 ${
            netProfit >= 0 
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' 
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
          }`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Net Profit Margin
          </span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(netProfit, profile.currency)}
          </span>
          <div className="mt-4 flex items-center space-x-2 text-xs">
            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {profitMargin.toFixed(1)}% Margin
            </span>
            <span className="text-slate-400 dark:text-slate-500">of operations</span>
          </div>
        </motion.div>
      </div>

      {/* Interactive Insights Banner */}
      {!insightClosed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl border flex items-start gap-3.5 relative ${
            insight.type === 'success'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
              : insight.type === 'danger'
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="p-1 px-1 rounded-lg bg-white/80 dark:bg-slate-900 shrink-0 mt-0.5 shadow-sm text-blue-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold mb-0.5 text-[13px]">{insight.title}</h4>
            <p className="opacity-85 text-slate-600 dark:text-slate-300 leading-relaxed max-w-[90%]">
              {insight.desc}
            </p>
          </div>
          <button
            onClick={() => setInsightClosed(true)}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold font-sans pointer-events-auto"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Income vs Expense Trend Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Performance Timeline
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Compare cash inflows vs expenses over the last 6 months
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" />
                <span>Revenue</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" />
                <span>Expenses</span>
              </span>
            </div>
          </div>
          <VisualChart transactions={transactions} type="incomeVsExpense" currency={profile.currency} />
        </div>

        {/* Right: Dynamic Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Operating Cost Breakdown
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Distribution of expenses across top business categories
              </p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-[10px] text-blue-600 hover:underline font-bold"
            >
              Details
            </button>
          </div>
          <VisualChart
            transactions={transactions}
            type="categoryBreakdown"
            transactionTypeFilter="expense"
            currency={profile.currency}
          />
        </div>
      </div>

      {/* Bottom Grid: Recent Ledger Items vs Monthly summary grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ledger items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm lg:col-span-8 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Recent Bookkeeping Ledger
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Latest 5 incoming & outgoing ledger rows
              </p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              Full Ledger
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center space-x-1.5 min-w-0 max-w-[200px] md:max-w-xs">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                          {tx.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`py-2.5 text-right font-bold font-mono whitespace-nowrap ${
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, profile.currency)}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No business records entered. Click Plus above to register your first client fee or SaaS tool.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Summary mini matrix */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Active Month Status
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">
              Real-time summary billing of current month ({currentMonthStr})
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Month Income</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrency(curMonthInc, profile.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Month Expenses</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrency(curMonthExp, profile.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Net Month Pool</span>
                </div>
                <span className={`text-xs font-mono font-bold ${
                  (curMonthInc - curMonthExp) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatCurrency(curMonthInc - curMonthExp, profile.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Offline DB active</span>
            </span>
            <span className="font-semibold text-blue-650 hover:underline cursor-pointer" onClick={() => onNavigate('backup')}>
              JSON Saved
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
