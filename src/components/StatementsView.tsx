import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Building,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Printer,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Wallet,
  Tag,
  CreditCard,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Transaction, UserProfile, Category } from '../types';
import { formatCurrency, formatIndianLakhsCrores } from '../utils/financeUtils';
import {
  getAvailableAccounts,
  calculateAccountStatement,
  calculateIncomeExpenseStatement,
  exportAccountStatementCSV,
  exportIncomeExpenseStatementCSV,
  printStatementToPDF,
  AccountStatementData,
  IncomeExpenseStatementData
} from '../utils/statementGenerator';
import { getDateRangeForPeriod, getFinancialYearDates } from '../utils/financeCalculations';

interface StatementsViewProps {
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const StatementsView: React.FC<StatementsViewProps> = ({
  transactions,
  categories,
  profile,
  isPremium = false,
  onUpgradeTrigger,
}) => {
  const [statementTab, setStatementTab] = useState<'account' | 'income_expense'>('account');

  // Available Accounts
  const availableAccounts = useMemo(() => getAvailableAccounts(transactions), [transactions]);
  const projectsList = useMemo(() => {
    const list = Array.from(new Set(transactions.map((t) => t.project).filter(Boolean))) as string[];
    return list.sort();
  }, [transactions]);

  const yearsList = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    years.add(String(currentYear));
    years.add(String(currentYear - 1));
    transactions.forEach((t) => {
      if (t.date) years.add(t.date.split('-')[0]);
    });
    return Array.from(years).sort().reverse();
  }, [transactions]);

  // Account Statement State
  const [selectedAccount, setSelectedAccount] = useState<string>('Operating Account');
  const [accountPeriodPreset, setAccountPeriodPreset] = useState<
    'this_month' | 'last_month' | 'financial_year' | 'last_financial_year' | 'custom'
  >('this_month');
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  const [accountStartDate, setAccountStartDate] = useState<string>(firstOfMonthStr);
  const [accountEndDate, setAccountEndDate] = useState<string>(todayStr);
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [accountValidationError, setAccountValidationError] = useState<string | null>(null);

  // Income & Expense Statement State
  const [ieMode, setIeMode] = useState<'monthly' | 'custom'>('monthly');
  const [ieSelectedMonth, setIeSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [ieSelectedYear, setIeSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [ieStartDate, setIeStartDate] = useState<string>(firstOfMonthStr);
  const [ieEndDate, setIeEndDate] = useState<string>(todayStr);
  const [ieCategoryFilter, setIeCategoryFilter] = useState<string>('All');
  const [ieProjectFilter, setIeProjectFilter] = useState<string>('All');
  const [ieAccountFilter, setIeAccountFilter] = useState<string>('All');
  const [ieTypeFilter, setIeTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [ieValidationError, setIeValidationError] = useState<string | null>(null);

  // Success Feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Synchronize Preset Range for Account Statement
  const handleAccountPeriodChange = (preset: typeof accountPeriodPreset) => {
    setAccountPeriodPreset(preset);
    setAccountValidationError(null);

    if (preset === 'custom') {
      return;
    }

    const bounds = getDateRangeForPeriod(preset as any, new Date(), profile.financialYearStart || 'April');
    if (bounds.startDate && bounds.endDate) {
      setAccountStartDate(bounds.startDate);
      setAccountEndDate(bounds.endDate);
    }
  };

  // Synchronize Preset Range for Income & Expense Statement
  const handleIePresetChange = (preset: 'this_month' | 'last_month' | 'financial_year' | 'last_financial_year') => {
    setIeMode('custom');
    setIeValidationError(null);
    const bounds = getDateRangeForPeriod(preset as any, new Date(), profile.financialYearStart || 'April');
    if (bounds.startDate && bounds.endDate) {
      setIeStartDate(bounds.startDate);
      setIeEndDate(bounds.endDate);
    }
  };

  // Compute Account Statement Data
  const accountStatement: AccountStatementData = useMemo(() => {
    if (accountEndDate < accountStartDate) {
      return calculateAccountStatement({
        transactions,
        account: selectedAccount,
        startDate: accountStartDate,
        endDate: accountStartDate,
        periodLabel: 'Invalid Date Range',
        typeFilter: accountTypeFilter,
      });
    }

    let label = `${accountStartDate} to ${accountEndDate}`;
    if (accountPeriodPreset === 'this_month') label = 'This Month';
    else if (accountPeriodPreset === 'last_month') label = 'Last Month';
    else if (accountPeriodPreset === 'financial_year') label = `This Financial Year (${profile.financialYearStart || 'April'}–March)`;
    else if (accountPeriodPreset === 'last_financial_year') label = 'Last Financial Year';

    return calculateAccountStatement({
      transactions,
      account: selectedAccount,
      startDate: accountStartDate,
      endDate: accountEndDate,
      periodLabel: label,
      typeFilter: accountTypeFilter,
    });
  }, [
    transactions,
    selectedAccount,
    accountStartDate,
    accountEndDate,
    accountPeriodPreset,
    accountTypeFilter,
    profile.financialYearStart,
  ]);

  // Compute Income & Expense Statement Data
  const ieStatement: IncomeExpenseStatementData = useMemo(() => {
    let start = ieStartDate;
    let end = ieEndDate;
    let label = `${ieStartDate} to ${ieEndDate}`;
    let title = 'Income & Expense Statement';

    if (ieMode === 'monthly') {
      const year = parseInt(ieSelectedYear, 10);
      const month = parseInt(ieSelectedMonth, 10);
      start = `${ieSelectedYear}-${ieSelectedMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      end = `${ieSelectedYear}-${ieSelectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const monthName = new Date(year, month - 1, 1).toLocaleString('en', { month: 'long' });
      label = `${monthName} ${ieSelectedYear}`;
      title = `Monthly Income & Expense Statement (${monthName} ${ieSelectedYear})`;
    } else {
      title = `Custom Period Statement (${start} to ${end})`;
    }

    if (end < start) {
      return calculateIncomeExpenseStatement({
        transactions,
        startDate: start,
        endDate: start,
        periodLabel: 'Invalid Date Range',
        statementTitle: title,
        categoryFilter: ieCategoryFilter,
        projectFilter: ieProjectFilter,
        accountFilter: ieAccountFilter,
        typeFilter: ieTypeFilter,
      });
    }

    return calculateIncomeExpenseStatement({
      transactions,
      startDate: start,
      endDate: end,
      periodLabel: label,
      statementTitle: title,
      categoryFilter: ieCategoryFilter,
      projectFilter: ieProjectFilter,
      accountFilter: ieAccountFilter,
      typeFilter: ieTypeFilter,
    });
  }, [
    transactions,
    ieMode,
    ieSelectedMonth,
    ieSelectedYear,
    ieStartDate,
    ieEndDate,
    ieCategoryFilter,
    ieProjectFilter,
    ieAccountFilter,
    ieTypeFilter,
  ]);

  // Download Handlers - Account Statement
  const handleDownloadAccountCSV = () => {
    if (accountEndDate < accountStartDate) {
      setAccountValidationError('Cannot export: End date is earlier than start date.');
      return;
    }
    exportAccountStatementCSV(accountStatement, profile);
    showFeedback('Account Statement CSV successfully generated and downloaded.');
  };

  const handlePrintAccountPDF = () => {
    if (!isPremium && onUpgradeTrigger) {
      onUpgradeTrigger('Generating printable PDF Account Statements with bank-grade formatting is a Pro capability.');
      return;
    }
    if (accountEndDate < accountStartDate) {
      setAccountValidationError('Cannot print: End date is earlier than start date.');
      return;
    }
    printStatementToPDF('account', accountStatement, profile);
    showFeedback('Opened printable PDF dialog.');
  };

  // Download Handlers - Income & Expense Statement
  const handleDownloadIeCSV = () => {
    const start = ieMode === 'monthly' ? ieStatement.startDate : ieStartDate;
    const end = ieMode === 'monthly' ? ieStatement.endDate : ieEndDate;
    if (end < start) {
      setIeValidationError('Cannot export: End date is earlier than start date.');
      return;
    }
    exportIncomeExpenseStatementCSV(ieStatement, profile);
    showFeedback('Income & Expense Statement CSV successfully generated and downloaded.');
  };

  const handlePrintIePDF = () => {
    if (!isPremium && onUpgradeTrigger) {
      onUpgradeTrigger('Printing official PDF Income & Expense Statements is a Pro capability.');
      return;
    }
    const start = ieMode === 'monthly' ? ieStatement.startDate : ieStartDate;
    const end = ieMode === 'monthly' ? ieStatement.endDate : ieEndDate;
    if (end < start) {
      setIeValidationError('Cannot print: End date is earlier than start date.');
      return;
    }
    printStatementToPDF('income_expense', ieStatement, profile);
    showFeedback('Opened printable PDF dialog.');
  };

  const fmt = (val: number) => formatCurrency(val, profile.currency || 'INR', profile.numberFormatPreference || 'en-IN');

  const monthsList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Accounting Statements
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Financial Statements & Export
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
            Generate verified Account Statements and Income & Expense Reports with opening balances, running balances, and Excel/PDF export.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl select-none self-start md:self-center shrink-0">
          <button
            onClick={() => setStatementTab('account')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statementTab === 'account'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Account Statement</span>
          </button>
          <button
            onClick={() => setStatementTab('income_expense')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statementTab === 'income_expense'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Income & Expense Statement</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* OPTION 1: ACCOUNT STATEMENT */}
      {/* ========================================================================= */}
      {statementTab === 'account' && (
        <div className="space-y-6">
          {/* Filter Configuration Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Account Statement Parameters
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadAccountCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-colors pointer-events-auto shadow-sm"
                  title="Download Excel-compatible CSV statement"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={handlePrintAccountPDF}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors pointer-events-auto shadow-sm"
                  title="Print or Save official PDF statement"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download / Print PDF</span>
                  {!isPremium && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-700 text-emerald-100 border border-emerald-500/40">
                      <Sparkles className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Validation Banner */}
            {accountValidationError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{accountValidationError}</span>
              </div>
            )}

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Select Account */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Select Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                >
                  <option value="All Accounts">All Accounts Consolidated</option>
                  {availableAccounts.map((acct) => (
                    <option key={acct} value={acct}>
                      {acct}
                    </option>
                  ))}
                </select>
              </div>

              {/* Predefined Period */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Statement Period</label>
                <select
                  value={accountPeriodPreset}
                  onChange={(e) => handleAccountPeriodChange(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                >
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="financial_year">This Financial Year ({profile.financialYearStart || 'April'}–March)</option>
                  <option value="last_financial_year">Last Financial Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={accountStartDate}
                  onChange={(e) => {
                    setAccountStartDate(e.target.value);
                    setAccountPeriodPreset('custom');
                    if (e.target.value > accountEndDate) {
                      setAccountValidationError('Start date cannot be after end date.');
                    } else {
                      setAccountValidationError(null);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={accountEndDate}
                  onChange={(e) => {
                    setAccountEndDate(e.target.value);
                    setAccountPeriodPreset('custom');
                    if (e.target.value < accountStartDate) {
                      setAccountValidationError('End date cannot be earlier than start date.');
                    } else {
                      setAccountValidationError(null);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                />
              </div>
            </div>

            {/* Type Filter Sub-Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Type:</span>
              {(['all', 'income', 'expense', 'transfer'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAccountTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    accountTypeFilter === t
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All Transactions' : t === 'income' ? 'Deposits (Income)' : t === 'expense' ? 'Withdrawals (Expenses)' : 'Transfers'}
                </button>
              ))}
            </div>
          </div>

          {/* Statement On-Screen Preview Chassis */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            {/* Report Header Metadata Banner */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Official Statement Preview
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Account Statement: {accountStatement.accountName}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span><strong>Business:</strong> {profile.businessName}</span>
                  <span>•</span>
                  <span><strong>Period:</strong> {accountStatement.periodLabel}</span>
                  <span>•</span>
                  <span><strong>Dates:</strong> {accountStatement.startDate} to {accountStatement.endDate}</span>
                  <span>•</span>
                  <span><strong>Currency:</strong> {profile.currency || 'INR'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={handleDownloadAccountCSV}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 pointer-events-auto"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handlePrintAccountPDF}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 pointer-events-auto shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Opening Balance */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Opening Balance
                </span>
                <div className="text-base font-black font-mono text-slate-800 dark:text-slate-100">
                  {fmt(accountStatement.openingBalance)}
                </div>
                <span className="text-[10px] text-slate-400 block">As of {accountStatement.startDate}</span>
              </div>

              {/* Inflows */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Total Deposits / Inflows
                </span>
                <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                  +{fmt(accountStatement.totalInflows)}
                </div>
                <span className="text-[10px] text-emerald-600/80 block">
                  Income: {fmt(accountStatement.totalIncome)} {accountStatement.totalTransfersIn > 0 ? `• Transfers In: ${fmt(accountStatement.totalTransfersIn)}` : ''}
                </span>
              </div>

              {/* Outflows */}
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  Total Outflows
                </span>
                <div className="text-base font-black font-mono text-rose-700 dark:text-rose-300">
                  -{fmt(accountStatement.totalOutflows)}
                </div>
                <span className="text-[10px] text-rose-600/80 block">
                  Expenses: {fmt(accountStatement.totalExpenses)} {accountStatement.totalTransfersOut > 0 ? `• Transfers Out: ${fmt(accountStatement.totalTransfersOut)}` : ''}
                </span>
              </div>

              {/* Closing Balance */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Closing Balance
                </span>
                <div className="text-base font-black font-mono text-blue-800 dark:text-blue-200">
                  {fmt(accountStatement.closingBalance)}
                </div>
                <span className="text-[10px] text-blue-600/80 block">As of {accountStatement.endDate}</span>
              </div>

              {/* Net Movement */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Net Period Change
                </span>
                <div className={`text-base font-black font-mono ${accountStatement.netChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {accountStatement.netChange >= 0 ? '+' : ''}{fmt(accountStatement.netChange)}
                </div>
                <span className="text-[10px] text-slate-400 block">{accountStatement.transactions.length} transactions</span>
              </div>
            </div>

            {/* Historical Disclosure */}
            {!accountStatement.hasHistoricalRecords && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>
                  No transaction records precede {accountStatement.startDate}. Opening balance is calculated starting from 0.00.
                </span>
              </div>
            )}

            {/* Detailed Ledger Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Detailed Statement Ledger
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{accountStatement.transactions.length} entries</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Movement Type</th>
                      <th className="py-2.5 px-3 text-right">Inflow (+)</th>
                      <th className="py-2.5 px-3 text-right">Outflow (-)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {accountStatement.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <p className="font-semibold text-sm">No transactions logged for this account during this period.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Opening and closing balance remain identical.</p>
                        </td>
                      </tr>
                    ) : (
                      accountStatement.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            <div>{tx.description}</div>
                            {tx.project && <span className="text-[10px] text-indigo-500">Tag: {tx.project}</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{tx.category}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                tx.txType === 'income'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : tx.txType === 'expense'
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              }`}
                            >
                              {tx.txType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {tx.inflow > 0 ? `+${fmt(tx.inflow)}` : '–'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {tx.outflow > 0 ? `-${fmt(tx.outflow)}` : '–'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                            {fmt(tx.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTION 2: INCOME & EXPENSE STATEMENT */}
      {/* ========================================================================= */}
      {statementTab === 'income_expense' && (
        <div className="space-y-6">
          {/* Filter Configuration Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Income & Expense Statement Parameters
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadIeCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-colors pointer-events-auto shadow-sm"
                  title="Download Excel-compatible CSV statement"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>

                <button
                  onClick={handlePrintIePDF}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors pointer-events-auto shadow-sm"
                  title="Print or Save official PDF statement"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download / Print PDF</span>
                  {!isPremium && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-700 text-emerald-100 border border-emerald-500/40">
                      <Sparkles className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Validation Banner */}
            {ieValidationError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ieValidationError}</span>
              </div>
            )}

            {/* Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statement Mode:</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => {
                      setIeMode('monthly');
                      setIeValidationError(null);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      ieMode === 'monthly'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Monthly Statement
                  </button>
                  <button
                    onClick={() => {
                      setIeMode('custom');
                      setIeValidationError(null);
                    }}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      ieMode === 'custom'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Custom Period / Date Range
                  </button>
                </div>
              </div>

              {/* Quick Presets for Custom Range */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                <button
                  onClick={() => handleIePresetChange('this_month')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px]"
                >
                  This Month
                </button>
                <button
                  onClick={() => handleIePresetChange('last_month')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px]"
                >
                  Last Month
                </button>
                <button
                  onClick={() => handleIePresetChange('financial_year')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px]"
                >
                  This FY
                </button>
                <button
                  onClick={() => handleIePresetChange('last_financial_year')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px]"
                >
                  Last FY
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
              {ieMode === 'monthly' ? (
                <>
                  {/* Month */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Month</label>
                    <select
                      value={ieSelectedMonth}
                      onChange={(e) => setIeSelectedMonth(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                    >
                      {monthsList.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Year</label>
                    <select
                      value={ieSelectedYear}
                      onChange={(e) => setIeSelectedYear(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                    >
                      {yearsList.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Custom Start Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={ieStartDate}
                      onChange={(e) => {
                        setIeStartDate(e.target.value);
                        if (e.target.value > ieEndDate) {
                          setIeValidationError('Start date cannot be after end date.');
                        } else {
                          setIeValidationError(null);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                    />
                  </div>

                  {/* Custom End Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={ieEndDate}
                      onChange={(e) => {
                        setIeEndDate(e.target.value);
                        if (e.target.value < ieStartDate) {
                          setIeValidationError('End date cannot be earlier than start date.');
                        } else {
                          setIeValidationError(null);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                    />
                  </div>
                </>
              )}

              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Category Filter</label>
                <select
                  value={ieCategoryFilter}
                  onChange={(e) => setIeCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Project / Client Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Project / Client Tag</label>
                <select
                  value={ieProjectFilter}
                  onChange={(e) => setIeProjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium outline-none"
                >
                  <option value="All">All Projects / Clients</option>
                  {projectsList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type Filter Sub-Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Transaction Type:</span>
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setIeTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    ieTypeFilter === t
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All (Income & Expenses)' : t === 'income' ? 'Income Only' : 'Expenses Only'}
                </button>
              ))}
            </div>
          </div>

          {/* Statement Preview Chassis */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            {/* Header Metadata */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Income & Expense Statement Preview
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {ieStatement.statementTitle}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span><strong>Business:</strong> {profile.businessName}</span>
                  <span>•</span>
                  <span><strong>Period:</strong> {ieStatement.periodLabel}</span>
                  <span>•</span>
                  <span><strong>Range:</strong> {ieStatement.startDate} to {ieStatement.endDate}</span>
                  <span>•</span>
                  <span><strong>Currency:</strong> {profile.currency || 'INR'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={handleDownloadIeCSV}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 pointer-events-auto"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handlePrintIePDF}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 pointer-events-auto shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Total Income
                </span>
                <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                  +{fmt(ieStatement.totalIncome)}
                </div>
                <span className="text-[10px] text-emerald-600/80 block">{ieStatement.incomeCount} income records</span>
              </div>

              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  Total Expenses
                </span>
                <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-300">
                  -{fmt(ieStatement.totalExpenses)}
                </div>
                <span className="text-[10px] text-rose-600/80 block">{ieStatement.expenseCount} expense records</span>
              </div>

              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Net Cash Flow
                </span>
                <div className={`text-xl font-black font-mono ${ieStatement.netCashFlow >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-600'}`}>
                  {ieStatement.netCashFlow >= 0 ? '+' : ''}{fmt(ieStatement.netCashFlow)}
                </div>
                <span className="text-[10px] text-blue-600/80 block">Total Income − Total Expenses</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Net Operating Margin
                </span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {ieStatement.totalIncome > 0 ? ((ieStatement.netCashFlow / ieStatement.totalIncome) * 100).toFixed(1) : 0}%
                </div>
                <span className="text-[10px] text-slate-400 block">{ieStatement.transactions.length} total entries</span>
              </div>
            </div>

            {/* Category Allocations Cards (Income vs Expenses) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expense Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Expenses by Category</span>
                  <span className="font-mono text-rose-600 font-bold">{fmt(ieStatement.totalExpenses)}</span>
                </h4>
                {ieStatement.expenseCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded for this period.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {ieStatement.expenseCategories.slice(0, 5).map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.category} ({cat.count})</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(cat.amount)} ({cat.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, cat.percentage)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Income Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Income by Category</span>
                  <span className="font-mono text-emerald-600 font-bold">{fmt(ieStatement.totalIncome)}</span>
                </h4>
                {ieStatement.incomeCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No income recorded for this period.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {ieStatement.incomeCategories.slice(0, 5).map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.category} ({cat.count})</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(cat.amount)} ({cat.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, cat.percentage)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Transaction Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Statement Transaction Details
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{ieStatement.transactions.length} entries</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Project / Client</th>
                      <th className="py-2.5 px-3">Account / Method</th>
                      <th className="py-2.5 px-3 text-right">Income (+)</th>
                      <th className="py-2.5 px-3 text-right">Expense (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ieStatement.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <p className="font-semibold text-sm">No transactions logged for this period matching your filters.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Try widening the period or clearing filter criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      ieStatement.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{tx.description}</td>
                          <td className="py-2 px-3 text-slate-500">{tx.category}</td>
                          <td className="py-2 px-3 text-slate-400">{tx.project || '–'}</td>
                          <td className="py-2 px-3 text-slate-400">{tx.account || tx.paymentMethod || '–'}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {tx.income > 0 ? `+${fmt(tx.income)}` : '–'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {tx.expense > 0 ? `-${fmt(tx.expense)}` : '–'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
