import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Layers3,
  CalendarDays
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency, exportToCSV, exportToExcelCSV } from '../utils/financeUtils';

interface ReportsViewProps {
  transactions: Transaction[];
  profile: UserProfile;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  transactions, 
  profile,
  isPremium = false,
  onUpgradeTrigger
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

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

  // Dynamically extract unique years present in data
  const yearsList = Array.from(
    new Set<string>(
      transactions
        .map((tx) => {
          if (!tx.date) return '';
          return tx.date.split('-')[0];
        })
        .filter((y) => y !== '')
    )
  ).sort((a, b) => b.localeCompare(a));

  // Filtering transactions based on year and month dropdown selections
  const filteredTxs = transactions.filter((tx) => {
    if (!tx.date) return false;
    const [year, month] = tx.date.split('-');
    
    const matchesYear = selectedYear === 'All' || year === selectedYear;
    const matchesMonth = selectedMonth === 'All' || month === selectedMonth;
    return matchesYear && matchesMonth;
  });

  // Calculate totals
  const incomeTxs = filteredTxs.filter((t) => t.type === 'income');
  const expenseTxs = filteredTxs.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const grossProfit = totalIncome - totalExpense;

  // Professional Tax Reserve
  const estimatedTax = Math.max(0, grossProfit * (profile.taxRate / 100));
  const netEarnings = grossProfit - estimatedTax;

  // Category aggregations for P&L presentation
  const incomeGrouped: Record<string, number> = {};
  const expenseGrouped: Record<string, number> = {};

  incomeTxs.forEach((t) => {
    incomeGrouped[t.category] = (incomeGrouped[t.category] || 0) + t.amount;
  });
  expenseTxs.forEach((t) => {
    expenseGrouped[t.category] = (expenseGrouped[t.category] || 0) + t.amount;
  });

  const handleExportCSV = () => {
    const filename = `financial_ledger_${selectedYear}_${selectedMonth}.csv`;
    exportToCSV(filteredTxs, filename);
  };

  const handleExportExcel = () => {
    if (!isPremium) {
      onUpgradeTrigger?.('Excel-compatible spreadsheet export is a Premium module.');
      return;
    }
    const filename = `financial_ledger_${selectedYear}_${selectedMonth}_excel.csv`;
    exportToExcelCSV(filteredTxs, filename);
  };

  const handleDownloadPDF = () => {
    if (!isPremium) {
      onUpgradeTrigger?.('Printable PDF financial reports are a Premium module.');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Accounting Ledger
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Financial Ledger & P&L Statement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
            Review detailed Profit and Loss statements, apply tax margins, and download spreadsheet logs.
          </p>
        </div>

        {/* Calendar Range Dropdowns and Export pipeline */}
        <div className="flex items-center space-x-2.5 shrink-0 select-none">
          {/* Year select */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-350 pointer-events-auto shadow-sm"
          >
            <option value="All">All Years</option>
            {yearsList.map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>

          {/* Month select */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-350 pointer-events-auto shadow-sm"
          >
            <option value="All">All Months</option>
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Export CSV - Free */}
          <button
            onClick={handleExportCSV}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-40 rounded-xl text-xs font-semibold pointer-events-auto transition-colors shadow-sm"
            title="Export standard CSV bookkeeping ledger"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Basic CSV</span>
          </button>

          {/* Export Excel - Pro */}
          <button
            onClick={handleExportExcel}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-650 dark:text-blue-400 border border-blue-500/15 disabled:opacity-40 rounded-xl text-xs font-bold pointer-events-auto transition-colors shadow-sm"
            title="Export Excel formatted ledger spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Excel Export</span>
            {!isPremium && <span className="text-[9px] ml-0.5">🔒</span>}
          </button>

          {/* Export PDF - Pro */}
          <button
            onClick={handleDownloadPDF}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-605/10 hover:bg-emerald-650/20 text-emerald-650 dark:text-emerald-400 border border-emerald-500/15 disabled:opacity-40 rounded-xl text-xs font-bold pointer-events-auto transition-colors shadow-sm"
            title="Print PDF standard financial reports"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">PDF Report</span>
            {!isPremium && <span className="text-[9px] ml-0.5">🔒</span>}
          </button>
        </div>
      </div>

      {/* Overview stats for selected range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Inflow Pool
            </span>
            <span className="text-lg font-bold font-mono text-slate-850 dark:text-slate-100 block">
              {formatCurrency(totalIncome, profile.currency)}
            </span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-500">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Outflow Pool
            </span>
            <span className="text-lg font-bold font-mono text-slate-850 dark:text-slate-100 block">
              {formatCurrency(totalExpense, profile.currency)}
            </span>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-500">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Operating Income (P/L)
            </span>
            <span className={`text-lg font-bold font-mono block ${
              grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600'
            }`}>
              {formatCurrency(grossProfit, profile.currency)}
            </span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/45 p-2 rounded-xl text-blue-500">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Net Cash Pool */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Post-Tax Retainer reserves ({profile.taxRate}%)
            </span>
            <span className="text-lg font-bold font-mono text-slate-850 dark:text-slate-100 block">
              {formatCurrency(netEarnings, profile.currency)}
            </span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl text-amber-500">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Double Column Grid: Left P&L statement, Right Consolidated Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Profit and Loss Statement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-5">
          <div className="border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Layers3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Profit & Loss Statement (P&L)</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Refined performance report: {selectedMonth !== 'All' ? `Month: ${selectedMonth}` : 'Full year limits'}{' '}
              {selectedYear !== 'All' ? `(${selectedYear})` : ''}
            </p>
          </div>

          <div className="space-y-4">
            {/* INCOMING STREAMS */}
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider mb-2">
                Revenue streams
              </span>
              <div className="space-y-1.5 pl-2 border-l border-emerald-500/30">
                {Object.entries(incomeGrouped).map(([catName, amt]) => (
                  <div key={catName} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{catName}</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                      {formatCurrency(amt, profile.currency)}
                    </span>
                  </div>
                ))}
                {Object.keys(incomeGrouped).length === 0 && (
                  <span className="text-[11px] text-slate-400 block py-1">No revenue logged for selection.</span>
                )}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>Gross Operating Income</span>
                  <span className="font-mono text-emerald-600">
                    {formatCurrency(totalIncome, profile.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* OPERATING COST BREAKDOWNS */}
            <div>
              <span className="text-[10px] font-bold text-rose-500 block uppercase tracking-wider mb-2">
                Operational Expenses
              </span>
              <div className="space-y-1.5 pl-2 border-l border-rose-500/30">
                {Object.entries(expenseGrouped).map(([catName, amt]) => (
                  <div key={catName} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{catName}</span>
                    <span className="font-mono text-slate-850 dark:text-slate-250 font-semibold">
                      {formatCurrency(amt, profile.currency)}
                    </span>
                  </div>
                ))}
                {Object.keys(expenseGrouped).length === 0 && (
                  <span className="text-[11px] text-slate-400 block py-1">No expenses logged for selection.</span>
                )}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <span>Total Operating Cost</span>
                  <span className="font-mono text-rose-500">
                    {formatCurrency(totalExpense, profile.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* MARGIN CALCULATIONS OVERVIEW */}
            <div className="pt-3 border-t border-slate-150 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-850 dark:text-slate-100">
                <span>Net Operating Profit</span>
                <span className={`font-mono ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formatCurrency(grossProfit, profile.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Estimated Tax Allocated ({profile.taxRate}%)</span>
                <span className="font-mono">{formatCurrency(estimatedTax, profile.currency)}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-850">
                <span>Retained Business Earnings</span>
                <span className="font-mono">{formatCurrency(netEarnings, profile.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Consolidated transaction list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-7 overflow-hidden">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800/50 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Unified Cashflow Logs ({filteredTxs.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Combined journals of all active operations
              </p>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[380px] pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/50 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-2">Date</th>
                  <th className="py-2">Memo Description</th>
                  <th className="py-2 text-center">Type</th>
                  <th className="py-2 text-right">Credit / Debit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/30 text-[11px]">
                {filteredTxs.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-2 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-2">
                      <div className="min-w-[100px] max-w-[200px]">
                        <p className="text-slate-850 dark:text-slate-300 font-medium truncate">{t.description}</p>
                        <p className="text-[9px] text-slate-400">{t.category}</p>
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wide ${
                        t.type === 'income' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' 
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                      }`}>
                        {t.type === 'income' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className={`py-2 text-right font-bold font-mono whitespace-nowrap ${
                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}
                      {formatCurrency(t.amount, profile.currency)}
                    </td>
                  </tr>
                ))}

                {filteredTxs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      No matching logs recorded for the selected timeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
