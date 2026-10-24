import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  ShieldCheck, 
  Info, 
  AlertTriangle,
  Lightbulb,
  CreditCard,
  Target
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { isSubscriptionActive } from '../utils/subscriptionService';
import { calculateFinancials } from '../utils/financeCalculations';

interface AnalyticsViewProps {
  transactions: Transaction[];
  profile: UserProfile;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions, profile, onUpgradeTrigger }) => {
  const isPremium = isSubscriptionActive(profile);
  const financials = calculateFinancials(transactions, profile.taxRate);

  // Filter core types
  const incomeTxs = transactions.filter((t) => t.type === 'income');
  const expenseTxs = transactions.filter((t) => t.type === 'expense');

  const totalIncome = financials.totalIncome;
  const totalExpense = financials.totalExpenses;
  const netEarnings = financials.netCashFlow;

  // Average ticket sizes
  const avgIncomeTicket = incomeTxs.length > 0 ? totalIncome / incomeTxs.length : 0;
  const avgExpenseTicket = expenseTxs.length > 0 ? totalExpense / expenseTxs.length : 0;

  // Monthly burn rate computation (Avg expense per active calendar month)
  const monthsSet = new Set(
    transactions
      .map((tx) => (tx.date ? tx.date.slice(0, 7) : ''))
      .filter((m) => m !== '')
  );
  
  const numActiveMonths = Math.max(1, monthsSet.size);
  const avgMonthlyExpense = totalExpense / numActiveMonths;
  const avgMonthlyIncome = totalIncome / numActiveMonths;

  // Genuine Runway Calculation based strictly on recorded positive net cash surplus
  // No fabricated numbers or arbitrary constants!
  const runwayMonths = (avgMonthlyExpense > 0 && netEarnings > 0)
    ? netEarnings / avgMonthlyExpense 
    : null;

  // Top spending hotspot from real categories
  const topExpenseCat = financials.expenseCategories[0];

  // Dynamic Rule-Based Smart Advisory Alerts (based only on genuine data)
  const generateAdvisories = () => {
    const list = [];

    if (transactions.length === 0) {
      list.push({
        title: 'No Data Available',
        desc: 'Log income and expense records to activate analytical ratios and cost analysis.',
        type: 'info',
        icon: Info,
      });
      return list;
    }

    // 1. Runway Advisory
    if (runwayMonths !== null) {
      if (runwayMonths < 3) {
        list.push({
          title: 'Tight Cash Runway Window',
          desc: `Recorded net cash surplus covers approximately ${runwayMonths.toFixed(1)} months of average monthly expenses. Prioritize receivables collections and defer optional expenditures.`,
          type: 'warning',
          icon: Flame,
        });
      } else if (runwayMonths > 6) {
        list.push({
          title: 'Healthy Operating Buffer',
          desc: `Recorded net surplus provides approximately ${runwayMonths.toFixed(0)} months of operating buffer based on average monthly expenses.`,
          type: 'success',
          icon: ShieldCheck,
        });
      }
    } else if (netEarnings < 0) {
      list.push({
        title: 'Negative Cash Flow Alert',
        desc: 'Current recorded expenses exceed recorded income. Review highest expense categories to preserve working capital.',
        type: 'error',
        icon: AlertTriangle,
      });
    }

    // 2. Spending hotspot
    if (topExpenseCat && totalExpense > 0) {
      if (topExpenseCat.percentage > 35) {
        list.push({
          title: `Concentration Hotspot: ${topExpenseCat.category}`,
          desc: `${topExpenseCat.category} represents ${topExpenseCat.percentage.toFixed(0)}% of your total business costs. Consider auditing provider contracts to optimize margins.`,
          type: 'warning',
          icon: AlertTriangle,
        });
      }
    }

    // 3. Ticket size ratio
    if (avgIncomeTicket > 0 && avgExpenseTicket > 0) {
      const ticketRatio = avgIncomeTicket / avgExpenseTicket;
      if (ticketRatio < 1.5) {
        list.push({
          title: 'Pricing & Expense Alignment',
          desc: 'Average income ticket size is close to your average expense item. Review project scope pricing to ensure sustainable gross margins.',
          type: 'info',
          icon: Lightbulb,
        });
      } else {
        list.push({
          title: 'Positive Unit Economics',
          desc: `Average client ticket is ${ticketRatio.toFixed(1)}x larger than your average expense ticket.`,
          type: 'success',
          icon: Target,
        });
      }
    }

    if (list.length === 0) {
      list.push({
        title: 'Balanced Financial Metrics',
        desc: 'All core indicators are in balance. Continue recording transactions regularly to track trends.',
        type: 'info',
        icon: Info,
      });
    }

    return list;
  };

  const advisorAlerts = generateAdvisories();

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Financial Intelligence
        </span>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Analytics & Business Metrics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          In-depth diagnostics, structural hotspots, ticket ratios, and monthly burn rate.
        </p>
      </div>

      {/* Grid: Financial Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Core stat 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Average Monthly Income
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(avgMonthlyIncome, profile.currency, profile.numberFormatPreference)}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Computed over <span className="font-semibold text-slate-700 dark:text-slate-300">{numActiveMonths} active month(s)</span>.
          </p>
        </div>

        {/* Core stat 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Average Monthly Burn Rate
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(avgMonthlyExpense, profile.currency, profile.numberFormatPreference)}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Average monthly operational expenditures.
          </p>
        </div>

        {/* Core stat 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Cash Runway (Based on Surplus)
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {runwayMonths !== null ? `${runwayMonths.toFixed(1)} Months` : 'N/A (No Net Surplus)'}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            {runwayMonths !== null ? 'Months of runway based on recorded surplus.' : 'Requires positive net cash surplus to calculate.'}
          </p>
        </div>
      </div>

      {/* Ticket Size and Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Transaction Ticket Sizes</h3>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Avg Income Ticket</span>
              <p className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(avgIncomeTicket, profile.currency, profile.numberFormatPreference)}
              </p>
              <span className="text-[10px] text-slate-400">{incomeTxs.length} invoices logged</span>
            </div>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Avg Expense Ticket</span>
              <p className="text-lg font-mono font-bold text-rose-700 dark:text-rose-400">
                {formatCurrency(avgExpenseTicket, profile.currency, profile.numberFormatPreference)}
              </p>
              <span className="text-[10px] text-slate-400">{expenseTxs.length} expense tickets</span>
            </div>
          </div>
        </div>

        {/* Top Expense Concentration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Expense Category Concentration</h3>
          {topExpenseCat ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{topExpenseCat.category}</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  {formatCurrency(topExpenseCat.amount, profile.currency, profile.numberFormatPreference)}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${Math.min(100, topExpenseCat.percentage)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Accounts for <span className="font-bold text-slate-700 dark:text-slate-300">{topExpenseCat.percentage.toFixed(1)}%</span> of all recorded business expenses.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded.</p>
          )}
        </div>
      </div>

      {/* Advisory Insights (Rule-based, verifiable observations) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Financial Health Insights
            </h3>
            <p className="text-xs text-slate-400">Deterministic observations grounded strictly in your transaction data</p>
          </div>
        </div>

        <div className="space-y-3">
          {advisorAlerts.map((adv, idx) => {
            const Icon = adv.icon;
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs ${
                  adv.type === 'error'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                    : adv.type === 'warning'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
                    : adv.type === 'success'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                    : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300'
                }`}
              >
                <div className="p-1 rounded-lg bg-white/80 dark:bg-slate-900 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold mb-0.5 text-[13px]">{adv.title}</h4>
                  <p className="opacity-90 leading-relaxed">{adv.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
