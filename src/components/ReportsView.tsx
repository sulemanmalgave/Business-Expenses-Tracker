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
  Tag,
  Building,
  Info,
  FileSpreadsheet,
  ArrowRight,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency, exportToCSV, exportToExcelCSV } from '../utils/financeUtils';
import { calculateFinancials, getFinancialYearDates } from '../utils/financeCalculations';

interface ReportsViewProps {
  transactions: Transaction[];
  profile: UserProfile;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
  onNavigateTab?: (tab: string) => void;
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
        <div className="absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl border border-slate-700/80 text-xs pointer-events-auto animate-fadeIn select-text">
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

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  transactions, 
  profile,
  isPremium = false,
  onUpgradeTrigger,
  onNavigateTab
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<string>('All');
  const [selectedAccount, setSelectedAccount] = useState<string>('All');

  const fyInfo = getFinancialYearDates(new Date(), profile.financialYearStart || 'April');

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
        .map((tx) => (tx.date ? tx.date.split('-')[0] : ''))
        .filter((y) => y !== '')
    )
  ).sort((a, b) => b.localeCompare(a));

  // Extract unique project and account tags
  const projectsList = Array.from(
    new Set<string>(
      transactions
        .map((tx) => (tx.project && tx.project.trim() ? tx.project.trim() : ''))
        .filter((p) => p !== '')
    )
  );

  const accountsList = Array.from(
    new Set<string>(
      transactions
        .map((tx) => (tx.account && tx.account.trim() ? tx.account.trim() : ''))
        .filter((a) => a !== '')
    )
  );

  // Filtering transactions
  const filteredTxs = transactions.filter((tx) => {
    if (!tx.date) return false;
    const [year, month] = tx.date.split('-');
    
    const matchesYear = 
      selectedYear === 'All' 
        ? true 
        : selectedYear === 'FY' 
        ? (tx.date >= fyInfo.startDate && tx.date <= fyInfo.endDate) 
        : year === selectedYear;

    const matchesMonth = selectedMonth === 'All' || month === selectedMonth;
    const matchesProject = selectedProject === 'All' || (tx.project || 'Unassigned') === selectedProject;
    const matchesAccount = selectedAccount === 'All' || (tx.account || 'General Account') === selectedAccount;
    
    return matchesYear && matchesMonth && matchesProject && matchesAccount;
  });

  // Calculate using single calculation layer
  const financials = calculateFinancials(filteredTxs, profile.taxRate);

  const handleExportCSV = () => {
    const filename = `financial_ledger_${selectedYear}_${selectedMonth}.csv`;
    exportToCSV(filteredTxs, filename);
  };

  const handleExportExcel = () => {
    const filename = `financial_ledger_${selectedYear}_${selectedMonth}_excel.csv`;
    exportToExcelCSV(filteredTxs, filename);
  };

  const handleDownloadPDF = () => {
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
            Financial Reports & P&L Statement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
            Review detailed Profit and Loss statements, project-level profitability, and export accounting records.
          </p>
        </div>

        {/* Filters and Export Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 select-none">
          {/* Year select */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto shadow-sm"
          >
            <option value="All">All Years</option>
            <option value="FY">{fyInfo.yearTag} ({profile.financialYearStart || 'April'}–March)</option>
            {yearsList.map((yr) => (
              <option key={yr} value={yr}>Year {yr}</option>
            ))}
          </select>

          {/* Month select */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto shadow-sm"
          >
            <option value="All">All Months</option>
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Project select */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto shadow-sm"
          >
            <option value="All">All Projects</option>
            {projectsList.map((p) => (
              <option key={p} value={p}>Project: {p}</option>
            ))}
          </select>

          {/* Export CSV - Free */}
          <button
            onClick={handleExportCSV}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-semibold pointer-events-auto transition-colors shadow-sm"
            title="Export standard CSV bookkeeping ledger"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV Ledger</span>
          </button>

          {/* Export Excel - Free */}
          <button
            onClick={handleExportExcel}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 disabled:opacity-40 rounded-xl text-xs font-bold pointer-events-auto transition-colors shadow-sm"
            title="Export Excel formatted ledger spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Excel</span>
          </button>

          {/* Export / Print PDF - Free */}
          <button
            onClick={handleDownloadPDF}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 disabled:opacity-40 rounded-xl text-xs font-bold pointer-events-auto transition-colors shadow-sm"
            title="Print or Save PDF financial statement"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Print PDF</span>
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('statements')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold pointer-events-auto transition-colors shadow-sm"
              title="Generate and download official Account and Monthly Statements"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Statements Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Statements Center Shortcut Banner */}
      {onNavigateTab && (
        <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-transparent border border-blue-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Official Account & Monthly Income & Expense Statements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate bank-grade statements with opening balances, running balances, and printable A4 PDF / Excel CSV downloads.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('statements')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 pointer-events-auto"
          >
            <span>Open Statements</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Income
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100 block">
              {formatCurrency(financials.totalIncome, profile.currency, profile.numberFormatPreference)}
            </span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-500">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Expenses
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100 block">
              {formatCurrency(financials.totalExpenses, profile.currency, profile.numberFormatPreference)}
            </span>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-500">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        {/* Net Cash Movement / Operating Profit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Net Profit (Before Tax)
            </span>
            <span className={`text-lg font-bold font-mono block ${
              financials.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
            }`}>
              {formatCurrency(financials.netProfit, profile.currency, profile.numberFormatPreference)}
            </span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl text-blue-500">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Estimated Tax Reserve */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Est. Tax Reserve ({profile.taxRate}%)
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100 block">
              {formatCurrency(financials.estimatedTaxReserve, profile.currency, profile.numberFormatPreference)}
            </span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl text-amber-500">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Accounting Compliance Transparency Notice */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 shrink-0 text-slate-400" />
        <span>
          <strong>Accounting Note:</strong> Cash-basis net cash movement. Estimated tax reserve is calculated using your user-defined parameter of {profile.taxRate}% on positive operating margin for budgeting guidance; this report is not a statutory or certified tax return.
        </span>
      </div>

      {/* P&L Breakdown & Project Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Profit & Loss Statement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <Layers3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Profit & Loss Statement (P&L)</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Period: {selectedMonth !== 'All' ? `Month ${selectedMonth}` : 'All Months'}{' '}
              {selectedYear !== 'All' ? `(${selectedYear})` : ''}
            </p>
          </div>

          {/* Income Categories */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              Income Streams
            </span>
            <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/30">
              {financials.incomeCategories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{cat.category}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {formatCurrency(cat.amount, profile.currency, profile.numberFormatPreference)}
                  </span>
                </div>
              ))}
              {financials.incomeCategories.length === 0 && (
                <span className="text-[11px] text-slate-400 block py-1">No income records in selection.</span>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <span>Total Income</span>
                <span className="font-mono text-emerald-600">
                  {formatCurrency(financials.totalIncome, profile.currency, profile.numberFormatPreference)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
              Operating Expenses
            </span>
            <div className="space-y-1.5 pl-2 border-l-2 border-rose-500/30">
              {financials.expenseCategories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{cat.category}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {formatCurrency(cat.amount, profile.currency, profile.numberFormatPreference)}
                  </span>
                </div>
              ))}
              {financials.expenseCategories.length === 0 && (
                <span className="text-[11px] text-slate-400 block py-1">No expense records in selection.</span>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <span>Total Expenses</span>
                <span className="font-mono text-rose-500">
                  {formatCurrency(financials.totalExpenses, profile.currency, profile.numberFormatPreference)}
                </span>
              </div>
            </div>
          </div>

          {/* Net Margin Totals */}
          <div className="pt-3 border-t border-slate-150 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
              <span>Net Operating Profit</span>
              <span className={`font-mono ${financials.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {formatCurrency(financials.netProfit, profile.currency, profile.numberFormatPreference)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>Estimated Tax Reserve ({profile.taxRate}%)</span>
              <span className="font-mono">
                {formatCurrency(financials.estimatedTaxReserve, profile.currency, profile.numberFormatPreference)}
              </span>
            </div>

            <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
              <span>Net Retained Earnings</span>
              <span className="font-mono">
                {formatCurrency(financials.netIncomeAfterTaxEstimate, profile.currency, profile.numberFormatPreference)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Project-level Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-6 space-y-4 relative overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Project & Client Profitability
                </h3>
                <GrowthTooltip
                  title="Client & Project Yields"
                  description="Isolates net profitability per account by balancing billable revenues directly against allocated operational costs and subcontractor fees."
                  growthImpact="Highlights high-margin accounts so you can prioritize sales efforts, eliminate hidden loss-making contracts, and negotiate data-backed retainers."
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Net contributions tracked by individual project/client tags without double-counting.
              </p>
            </div>
            {!isPremium && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                <Sparkles className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
          </div>

          {!isPremium ? (
            <div className="p-6 text-center space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 mx-auto rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Tag className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Client & Project Profitability Analysis</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Track individual client margins, project expenses, and net yields in real-time.
                </p>
              </div>

              {/* Growth Impact Callout */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1.5 max-w-sm mx-auto shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>How This Drives Business Growth</span>
                </span>
                <ul className="text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-3.5 leading-snug">
                  <li>Identify the 20% of clients producing 80% of your real profit.</li>
                  <li>Eliminate unprofitable deliverables before scope creep compounds.</li>
                  <li>Quote future customer proposals with verified margin data.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onUpgradeTrigger?.('Unlock deep Project & Client Profitability reports with Pro.')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs pointer-events-auto transition-colors shadow-sm"
              >
                Upgrade to Pro (₹199/mo or $2.99/mo)
              </button>
            </div>
          ) : financials.projectBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No transactions with project tags.</p>
          ) : (
            <div className="space-y-3">
              {financials.projectBreakdown.map((proj) => (
                <div key={proj.project} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{proj.project}</span>
                    <span className={`font-mono font-bold ${proj.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      Net: {formatCurrency(proj.net, profile.currency, profile.numberFormatPreference)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500">
                    <div>Income: +{formatCurrency(proj.income, profile.currency, profile.numberFormatPreference)}</div>
                    <div>Expense: -{formatCurrency(proj.expense, profile.currency, profile.numberFormatPreference)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Consolidated Ledger ({filteredTxs.length} records)
          </h3>
          <span className="text-xs text-slate-400">Chronological transaction record</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Project</th>
                <th className="py-2.5 px-4">Payment</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTxs.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">{t.date}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{t.description}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">{t.project || '–'}</td>
                  <td className="py-2.5 px-4 text-slate-400">{t.paymentMethod || 'Standard'}</td>
                  <td className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                    t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatCurrency(t.amount, profile.currency, profile.numberFormatPreference)}
                  </td>
                </tr>
              ))}
              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No transactions match the selected report filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
