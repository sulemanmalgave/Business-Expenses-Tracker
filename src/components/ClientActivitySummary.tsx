import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Calendar, Clock, ArrowUpRight } from 'lucide-react';
import { Client, Transaction, UserProfile } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { getClientFinancialSummary } from '../utils/clientUtils';

export interface ClientActivitySummaryProps {
  client: Client;
  transactions: Transaction[];
  profile: UserProfile;
  className?: string;
  showDetails?: boolean;
}

/**
 * Client Activity Summary component
 * Calculates and displays the total revenue, transaction activity, and last active date
 * directly on a client's card in ClientsView.
 */
export const ClientActivitySummary: React.FC<ClientActivitySummaryProps> = ({
  client,
  transactions,
  profile,
  className = '',
  showDetails = true,
}) => {
  const summary = useMemo(() => {
    return getClientFinancialSummary(client, transactions);
  }, [client, transactions]);

  const hasRevenue = summary.totalIncome > 0;
  const currencyCode = client.defaultCurrency || profile.currency || 'USD';

  return (
    <div
      className={`rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 p-3 text-xs transition-colors ${className}`}
      data-testid={`client-activity-summary-${client.id}`}
    >
      {/* Primary Row: Total Revenue & Transaction Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <span>Total Revenue</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span
              className={`font-mono font-black text-sm tracking-tight ${
                hasRevenue
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {formatCurrency(summary.totalIncome, currencyCode, profile.numberFormatPreference)}
            </span>
            {hasRevenue && (
              <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <ArrowUpRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Activity Count Badge */}
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Activity
          </span>
          <span
            className={`inline-block mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${
              summary.incomeCount > 0
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            {summary.incomeCount} payment{summary.incomeCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Secondary Meta: Latest payment / activity timestamp */}
      {showDetails && (
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 truncate">
            {summary.latestTransactionDate ? (
              <>
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">
                  Latest: <span className="font-medium text-slate-700 dark:text-slate-300">{summary.latestTransactionDate}</span>
                </span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="italic text-slate-400">No transactions recorded</span>
              </>
            )}
          </div>

          {summary.totalExpenses > 0 && (
            <div className="shrink-0 text-[10px] font-mono text-slate-400">
              Net: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(summary.netContribution, currencyCode, profile.numberFormatPreference)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
