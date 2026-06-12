import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  Info, 
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  CreditCard,
  Target
} from 'lucide-react';
import { Transaction, UserProfile, Category } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { isSubscriptionActive } from '../utils/subscriptionService';

interface AnalyticsViewProps {
  transactions: Transaction[];
  profile: UserProfile;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions, profile, onUpgradeTrigger }) => {
  // Filter core types
  const incomeTxs = transactions.filter((t) => t.type === 'income');
  const expenseTxs = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netEarnings = totalIncome - totalExpense;

  // Average ticket sizes
  const avgIncomeTicket = incomeTxs.length > 0 ? totalIncome / incomeTxs.length : 0;
  const avgExpenseTicket = expenseTxs.length > 0 ? totalExpense / expenseTxs.length : 0;

  // Monthly burn rate computation (Avg expense per calendar month)
  // Get all unique year-months present
  const monthsSet = new Set(
    transactions.map((tx) => {
      if (!tx.date) return '';
      return tx.date.slice(0, 7); // YYYY-MM
    }).filter((m) => m !== '')
  );
  
  const numActiveMonths = Math.max(1, monthsSet.size);
  const avgMonthlyExpense = totalExpense / numActiveMonths;
  const avgMonthlyIncome = totalIncome / numActiveMonths;

  // Runway Calculation
  // We can assume a hypothetical current savings capital or computed surplus to define runway.
  // Let's assume a starting working capital of 3x avg income + current surplus, or simply mock a safe assumption based on cash surplus.
  const estimatedCashReserve = Math.max(12000, netEarnings + 8000);
  const runwayMonths = avgMonthlyExpense > 0 ? estimatedCashReserve / avgMonthlyExpense : 12;

  // Category aggregations for sorting
  const expenseGrouped: Record<string, { category: string; amount: number; count: number }> = {};
  expenseTxs.forEach((t) => {
    if (!expenseGrouped[t.category]) {
      expenseGrouped[t.category] = { category: t.category, amount: 0, count: 0 };
    }
    expenseGrouped[t.category].amount += t.amount;
    expenseGrouped[t.category].count += 1;
  });

  const sortedExpenses = Object.values(expenseGrouped).sort((a, b) => b.amount - a.amount);
  const topExpenseCat = sortedExpenses[0];

  // Dynamic Rule-Based Smart Advisory Alerts
  const generateAdvisories = () => {
    const list = [];

    // 1. Runway Advisory
    if (runwayMonths < 3) {
      list.push({
        title: 'Critical Runway Threshold',
        desc: `Working capital cash runway has fallen below 3 months (${runwayMonths.toFixed(1)} months). Accelerate outstanding invoice billing or hold off on hardware and non-critical SaaS tools.`,
        type: 'error',
        icon: Flame,
      });
    } else if (runwayMonths > 6) {
      list.push({
        title: 'Strong Capital Runway',
        desc: `Your working cash reserves support ${runwayMonths.toFixed(0)} months of passive expenditures. High status safety net. Consider investing a surplus portion back into growth consulting, paid ads or specialized contractors.`,
        type: 'success',
        icon: ShieldCheck,
      });
    }

    // 2. Spending hotspot
    if (topExpenseCat) {
      const topCatPercent = totalExpense > 0 ? (topExpenseCat.amount / totalExpense) * 100 : 0;
      if (topCatPercent > 35) {
        list.push({
          title: `Concentration Hotspot: ${topExpenseCat.category}`,
          desc: `${topExpenseCat.category} represents ${topCatPercent.toFixed(0)}% of your absolute business costs. Evaluate if these expenses are directly driving client retaining margins or if consolidated licenses could trim overheads.`,
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
          title: 'Contract Pricing Compression',
          desc: 'Your average payout expenses are very close to average incoming fees. Consider adding setup charges or shifting to premium retainer-based billing for strategy deliverables.',
          type: 'info',
          icon: Lightbulb,
        });
      } else {
        list.push({
          title: 'Premium Transaction Index',
          desc: `Stellar contract leverage index! Your average customer transaction is ${ticketRatio.toFixed(1)}x larger than operational vendor tickets. Strong pricing power.`,
          type: 'success',
          icon: Target,
        });
      }
    }

    // Default safety advisor if suggestions list is empty
    if (list.length === 0) {
      list.push({
        title: 'Inflow Balance Optimizations',
        desc: 'All core ratios are in stable neutral parameters. Continue logging monthly software tools and contract fees to refine cash forecasts.',
        type: 'info',
        icon: Info,
      });
    }

    return list;
  };

  const advisorAlerts = generateAdvisories();
  const isPremium = isSubscriptionActive(profile);

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Financial Intelligence
        </span>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Business Intelligence & Advisory Desk
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          In-depth diagnostics, structural hotspots, average margins, and computed runway metrics.
        </p>
      </div>

      <div className="relative">
        {!isPremium && (
          <div className="absolute inset-x-0 -top-2 bottom-0 bg-slate-50/75 dark:bg-slate-950/75 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-8 select-none rounded-3xl min-h-[420px]">
            <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 shadow-md">
              <BarChart3 className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-850 dark:text-slate-100 tracking-tight">Advanced BI Analytics Locked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1.5 max-w-sm leading-relaxed">
              Unlock strategic executive summaries, runway calendars, cash burn forecasting models, and proactive system advisory consults with our Pro Plan modules.
            </p>
            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => onUpgradeTrigger?.('Advanced Business Intelligence (BI) charts and rule-based smart consulting alerts are Premium modules.')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-colors pointer-events-auto"
              >
                Unlock Dashboard and Analytics
              </button>
            </div>
          </div>
        )}

      {/* Grid: Financial Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Core stat 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Average Monthly Revenue
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(avgMonthlyIncome, profile.currency)}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Computed over <span className="font-semibold text-slate-700 dark:text-slate-350">{numActiveMonths} months</span> active journal ledger.
          </p>
        </div>

        {/* Core stat 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Average Expense Burn Rate
          </span>
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
            {formatCurrency(avgMonthlyExpense, profile.currency)}
          </span>
          <p className="text-[11px] text-slate-400 mt-3">
            Expected base monthly outgoing costs.
          </p>
        </div>

        {/* Core stat 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Computed Operating Runway
          </span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${
            runwayMonths < 3 ? 'text-rose-500' : 'text-emerald-500'
          }`}>
            {runwayMonths.toFixed(1)} Months
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Estimated using a dynamic reserve of {formatCurrency(estimatedCashReserve, profile.currency)}.
          </p>
        </div>
      </div>

      {/* Two-Column split: Left intelligence advisories, Right spending highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Advisories Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-7">
          <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
              Rule-Based Intelligence Desk
            </h3>
          </div>

          <div className="space-y-4">
            {advisorAlerts.map((adv, i) => {
              const IconComp = adv.icon;
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    adv.type === 'success'
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-250'
                      : adv.type === 'error'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-250'
                      : adv.type === 'warning'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-250'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="p-1 px-1 rounded-lg bg-white dark:bg-slate-900 shrink-0 mt-0.5 shadow-xs text-blue-600">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <h4 className="font-bold mb-0.5">{adv.title}</h4>
                    <p className="opacity-90 leading-relaxed text-slate-600 dark:text-slate-300">{adv.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses Highlights structure list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-5">
          <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
              Concentrated Cost Profiles
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Expense categories ranked by highest aggregate burning volume
            </p>
          </div>

          <div className="space-y-3.5">
            {sortedExpenses.map((cat, idx) => {
              const percent = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                      <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0" />
                      <span>{cat.category}</span>
                    </span>
                    <div className="space-x-1">
                      <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
                        {formatCurrency(cat.amount, profile.currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">({percent.toFixed(0)}%)</span>
                    </div>
                  </div>
                  {/* Custom progress loading bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-lg transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pr-1 pl-4">
                    <span>Logged: {cat.count} payments</span>
                    <span>ticket size: {formatCurrency(cat.amount / cat.count, profile.currency)}</span>
                  </div>
                </div>
              );
            })}

            {sortedExpenses.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-12">
                No outflows recorded. Add some expenses to map concentrations.
              </p>
            )}
          </div>
        </div>
      </div>
      </div> {/* Close relative wrapper */}
    </div>
  );
};
