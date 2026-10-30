import React, { useState } from 'react';
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
  Target,
  Sparkles,
  HelpCircle
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

const GrowthTooltip: React.FC<{
  title: string;
  description: string;
  growthImpact: string;
}> = ({ title, description, growthImpact }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors pointer-events-auto rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500"
        title="Business Growth Impact"
        aria-label="Business Growth Impact"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl border border-slate-700/80 text-xs pointer-events-auto animate-fadeIn select-text text-left">
          <div className="flex items-center gap-1.5 font-bold text-blue-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{title}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
            {description}
          </p>
          <div className="pt-2 border-t border-slate-700/80 text-[10.5px] text-emerald-400 flex items-start gap-1.5 leading-snug">
            <span className="font-bold text-emerald-300 shrink-0">Growth Impact:</span>
            <span>{growthImpact}</span>
          </div>
        </div>
      )}
    </div>
  );
};

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Cash Runway (Based on Surplus)
              </span>
              <GrowthTooltip 
                title="Liquid Cash Runway"
                description="Calculates the exact number of operating months your business can sustain current monthly spending without additional revenue, based on net cash surplus."
                growthImpact="Eliminates surprise cash deficits, prevents emergency high-interest business loans, and gives you certainty on when it is financially safe to hire or invest in growth."
              />
            </div>
            {!isPremium && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                <Sparkles className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
          </div>
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Transaction Ticket Sizes</h3>
            <GrowthTooltip 
              title="Unit Economics & Deal Sizes"
              description="Measures your average client invoice amount against your average operational expenditure ticket."
              growthImpact="Identifies whether your pricing model maintains sufficient unit margin leverage to cover administrative overhead as transaction volumes scale."
            />
          </div>
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Expense Category Concentration</h3>
            <GrowthTooltip 
              title="Expense Concentration Risk"
              description="Tracks single-category cost dominance to prevent vendor lock-in and silent cost inflation."
              growthImpact="Highlights vendor renegotiation opportunities and prevents runaway operating expenses from eroding gross margins."
            />
          </div>
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Financial Health Insights & Advisory
              </h3>
              <GrowthTooltip 
                title="Continuous Financial Health Audits"
                description="Deterministic audit system testing spending concentration, runway safety thresholds, and net cash flow trends."
                growthImpact="Detects financial health risks weeks before month-end closing, preserving working capital and operational stability."
              />
            </div>
            <p className="text-xs text-slate-400">Deterministic observations grounded strictly in your transaction data</p>
          </div>
          {!isPremium && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-2.5 h-2.5" />
              PRO
            </span>
          )}
        </div>

        {!isPremium ? (
          <div className="p-8 text-center space-y-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Unlock Pro Financial Intelligence</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Access automated cash runway forecasting, spending hotspot detection, margin diagnostic alerts, and unit economics ratios.
              </p>
            </div>

            {/* Growth Impact Callout */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1.5 max-w-sm mx-auto shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>How This Drives Business Growth</span>
              </span>
              <ul className="text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-3.5 leading-snug">
                <li>Forecast cash runway to plan headcount and capital purchases risk-free.</li>
                <li>Catch recurring subscription creep and vendor price bumps early.</li>
                <li>Audit unit economics to maintain healthy profit multipliers on client accounts.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onUpgradeTrigger?.('Unlock Advanced Financial Health Insights & Cash Runway Forecasting with Pro.')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs pointer-events-auto transition-colors shadow-sm"
            >
              Upgrade to Pro (₹199/mo or $2.99/mo)
            </button>
          </div>
        ) : (
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
        )}
      </div>

    </div>
  );
};
