import { Transaction, UserProfile } from '../types';
import { roundMoney } from './financeCalculations';
import { formatCurrency, formatIndianLakhsCrores } from './financeUtils';

export interface AccountStatementTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  txType: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  inflow: number;
  outflow: number;
  runningBalance: number;
  account: string;
  transferToAccount?: string;
  project?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface AccountStatementData {
  accountName: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
  totalInflows: number;
  totalOutflows: number;
  closingBalance: number;
  netChange: number;
  transactions: AccountStatementTransaction[];
  hasHistoricalRecords: boolean;
  generatedAt: string;
}

export interface IncomeExpenseStatementTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  project?: string;
  account?: string;
  paymentMethod?: string;
  income: number;
  expense: number;
  notes?: string;
}

export interface IncomeExpenseStatementData {
  statementTitle: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  incomeCount: number;
  expenseCount: number;
  incomeCategories: { category: string; amount: number; percentage: number; count: number }[];
  expenseCategories: { category: string; amount: number; percentage: number; count: number }[];
  transactions: IncomeExpenseStatementTransaction[];
  generatedAt: string;
}

/**
 * Extracts all distinct account names found across transactions.
 */
export const getAvailableAccounts = (transactions: Transaction[]): string[] => {
  const accountSet = new Set<string>();
  transactions.forEach((t) => {
    if (t.account && t.account.trim()) accountSet.add(t.account.trim());
    if (t.transferToAccount && t.transferToAccount.trim()) accountSet.add(t.transferToAccount.trim());
  });

  const accounts = Array.from(accountSet).sort();
  if (accounts.length === 0) {
    return ['Operating Account', 'Reserve Savings', 'Cash in Hand'];
  }
  return accounts;
};

/**
 * Helper to check if a transaction represents an internal account transfer
 */
const isAccountTransfer = (t: Transaction): boolean => {
  return (
    t.isTransfer === true ||
    (t.category && (t.category.toLowerCase() === 'transfer' || t.category.toLowerCase() === 'account transfer')) ||
    Boolean(t.transferToAccount && t.transferToAccount.trim())
  );
};

/**
 * Calculates a complete, verified Account Statement with Opening Balance,
 * running balance for each transaction, and Closing Balance.
 */
export const calculateAccountStatement = (params: {
  transactions: Transaction[];
  account: string; // 'All' or specific account name
  startDate: string;
  endDate: string;
  periodLabel?: string;
  typeFilter?: 'all' | 'income' | 'expense' | 'transfer';
}): AccountStatementData => {
  const { transactions, account, startDate, endDate, periodLabel, typeFilter = 'all' } = params;
  const isAllAccounts = account === 'All' || account === 'All Accounts';

  // 1. Calculate Opening Balance from all transactions prior to startDate
  let openingBalance = 0;
  let hasPriorRecords = false;

  transactions.forEach((t) => {
    if (!t.date || t.date >= startDate) return;

    const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
    const amount = roundMoney(t.amount * rate);
    const transfer = isAccountTransfer(t);

    if (isAllAccounts) {
      hasPriorRecords = true;
      // For all accounts combined, internal transfers cancel each other out
      if (!transfer) {
        if (t.type === 'income') openingBalance += amount;
        else openingBalance -= amount;
      }
    } else {
      if (transfer) {
        if (t.account === account) {
          hasPriorRecords = true;
          openingBalance -= amount; // transfer out
        }
        if (t.transferToAccount === account) {
          hasPriorRecords = true;
          openingBalance += amount; // transfer in
        }
      } else if (t.account === account) {
        hasPriorRecords = true;
        if (t.type === 'income') openingBalance += amount;
        else openingBalance -= amount;
      }
    }
  });

  openingBalance = roundMoney(openingBalance);

  // 2. Filter and sort transactions inside the statement period chronologically
  const periodTxs = transactions.filter((t) => t.date && t.date >= startDate && t.date <= endDate);
  periodTxs.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  let currentRunningBalance = openingBalance;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransfersIn = 0;
  let totalTransfersOut = 0;

  const statementItems: AccountStatementTransaction[] = [];

  for (const t of periodTxs) {
    const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
    const amount = roundMoney(t.amount * rate);
    const transfer = isAccountTransfer(t);

    let applicable = false;
    let txType: 'income' | 'expense' | 'transfer_in' | 'transfer_out' = 'expense';
    let inflow = 0;
    let outflow = 0;

    if (isAllAccounts) {
      applicable = true;
      if (transfer) {
        txType = 'transfer_out';
        // When viewing all accounts, display the transfer movement
        outflow = amount;
        inflow = amount;
        // Inflow and outflow cancel on balance for All Accounts
      } else if (t.type === 'income') {
        txType = 'income';
        inflow = amount;
        outflow = 0;
        totalIncome = roundMoney(totalIncome + amount);
        currentRunningBalance = roundMoney(currentRunningBalance + inflow);
      } else {
        txType = 'expense';
        inflow = 0;
        outflow = amount;
        totalExpenses = roundMoney(totalExpenses + amount);
        currentRunningBalance = roundMoney(currentRunningBalance - outflow);
      }
    } else {
      if (transfer) {
        if (t.account === account && t.transferToAccount === account) {
          // Self-transfer noop
          applicable = true;
          txType = 'transfer_out';
        } else if (t.account === account) {
          applicable = true;
          txType = 'transfer_out';
          inflow = 0;
          outflow = amount;
          totalTransfersOut = roundMoney(totalTransfersOut + amount);
          currentRunningBalance = roundMoney(currentRunningBalance - outflow);
        } else if (t.transferToAccount === account) {
          applicable = true;
          txType = 'transfer_in';
          inflow = amount;
          outflow = 0;
          totalTransfersIn = roundMoney(totalTransfersIn + amount);
          currentRunningBalance = roundMoney(currentRunningBalance + inflow);
        }
      } else if (t.account === account) {
        applicable = true;
        if (t.type === 'income') {
          txType = 'income';
          inflow = amount;
          outflow = 0;
          totalIncome = roundMoney(totalIncome + amount);
          currentRunningBalance = roundMoney(currentRunningBalance + inflow);
        } else {
          txType = 'expense';
          inflow = 0;
          outflow = amount;
          totalExpenses = roundMoney(totalExpenses + amount);
          currentRunningBalance = roundMoney(currentRunningBalance - outflow);
        }
      }
    }

    if (!applicable) continue;

    // Apply type filter if requested
    let passesType = true;
    if (typeFilter === 'income') passesType = txType === 'income';
    else if (typeFilter === 'expense') passesType = txType === 'expense';
    else if (typeFilter === 'transfer') passesType = txType === 'transfer_in' || txType === 'transfer_out';

    if (passesType) {
      statementItems.push({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        type: t.type,
        txType,
        inflow,
        outflow,
        runningBalance: currentRunningBalance,
        account: t.account || 'Operating Account',
        transferToAccount: t.transferToAccount,
        project: t.project,
        paymentMethod: t.paymentMethod,
        notes: t.notes,
      });
    }
  }

  const totalInflows = roundMoney(totalIncome + totalTransfersIn);
  const totalOutflows = roundMoney(totalExpenses + totalTransfersOut);
  const closingBalance = roundMoney(openingBalance + totalInflows - totalOutflows);
  const netChange = roundMoney(closingBalance - openingBalance);

  return {
    accountName: isAllAccounts ? 'All Accounts Consolidated' : account,
    startDate,
    endDate,
    periodLabel: periodLabel || `${startDate} to ${endDate}`,
    openingBalance,
    totalIncome,
    totalExpenses,
    totalTransfersIn,
    totalTransfersOut,
    totalInflows,
    totalOutflows,
    closingBalance,
    netChange,
    transactions: statementItems,
    hasHistoricalRecords: hasPriorRecords,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Calculates a verified Income & Expense Statement for monthly or custom date ranges.
 */
export const calculateIncomeExpenseStatement = (params: {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  periodLabel?: string;
  statementTitle?: string;
  categoryFilter?: string;
  projectFilter?: string;
  accountFilter?: string;
  typeFilter?: 'all' | 'income' | 'expense';
}): IncomeExpenseStatementData => {
  const {
    transactions,
    startDate,
    endDate,
    periodLabel,
    statementTitle,
    categoryFilter = 'All',
    projectFilter = 'All',
    accountFilter = 'All',
    typeFilter = 'all',
  } = params;

  // Filter transactions inside the period, excluding internal account transfers
  const filtered = transactions.filter((t) => {
    if (!t.date || t.date < startDate || t.date > endDate) return false;
    if (isAccountTransfer(t)) return false; // Transfers are not revenue or operating expense

    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (projectFilter !== 'All' && (t.project || 'Unassigned') !== projectFilter) return false;
    if (accountFilter !== 'All' && (t.account || 'Operating Account') !== accountFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;

    return true;
  });

  filtered.sort((a, b) => {
    const comp = a.date.localeCompare(b.date);
    if (comp !== 0) return comp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const incMap = new Map<string, { amount: number; count: number }>();
  const expMap = new Map<string, { amount: number; count: number }>();
  const items: IncomeExpenseStatementTransaction[] = [];

  for (const t of filtered) {
    const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
    const amount = roundMoney(t.amount * rate);

    if (t.type === 'income') {
      totalIncome = roundMoney(totalIncome + amount);
      incomeCount++;
      const current = incMap.get(t.category) || { amount: 0, count: 0 };
      incMap.set(t.category, {
        amount: roundMoney(current.amount + amount),
        count: current.count + 1,
      });

      items.push({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        type: 'income',
        project: t.project,
        account: t.account,
        paymentMethod: t.paymentMethod,
        income: amount,
        expense: 0,
        notes: t.notes,
      });
    } else {
      totalExpenses = roundMoney(totalExpenses + amount);
      expenseCount++;
      const current = expMap.get(t.category) || { amount: 0, count: 0 };
      expMap.set(t.category, {
        amount: roundMoney(current.amount + amount),
        count: current.count + 1,
      });

      items.push({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        type: 'expense',
        project: t.project,
        account: t.account,
        paymentMethod: t.paymentMethod,
        income: 0,
        expense: amount,
        notes: t.notes,
      });
    }
  }

  const incomeCategories = Array.from(incMap.entries())
    .map(([category, stats]) => ({
      category,
      amount: stats.amount,
      count: stats.count,
      percentage: totalIncome > 0 ? roundMoney((stats.amount / totalIncome) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenseCategories = Array.from(expMap.entries())
    .map(([category, stats]) => ({
      category,
      amount: stats.amount,
      count: stats.count,
      percentage: totalExpenses > 0 ? roundMoney((stats.amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    statementTitle: statementTitle || 'Income & Expense Statement',
    periodLabel: periodLabel || `${startDate} to ${endDate}`,
    startDate,
    endDate,
    totalIncome,
    totalExpenses,
    netCashFlow: roundMoney(totalIncome - totalExpenses),
    incomeCount,
    expenseCount,
    incomeCategories,
    expenseCategories,
    transactions: items,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Escapes values for Excel-compatible CSV exports.
 */
const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Generates and downloads an Excel-compatible CSV file for an Account Statement.
 */
export const exportAccountStatementCSV = (
  statement: AccountStatementData,
  profile: UserProfile,
  customFilename?: string
) => {
  const sanitizedAccount = statement.accountName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
  const filename =
    customFilename ||
    `Account-Statement-${sanitizedAccount}-${statement.startDate}-to-${statement.endDate}.csv`;

  const rows: string[] = [];

  // Metadata Header Block
  rows.push(['BUSINESS EXPENSE TRACKER', 'OFFICIAL ACCOUNT STATEMENT'].map(escapeCsv).join(','));
  rows.push(['Business Name:', profile.businessName || 'Business Workspace'].map(escapeCsv).join(','));
  rows.push(['Owner / Manager:', profile.ownerName || 'Finance Manager'].map(escapeCsv).join(','));
  rows.push(['Selected Account:', statement.accountName].map(escapeCsv).join(','));
  rows.push(['Statement Period:', `${statement.startDate} to ${statement.endDate} (${statement.periodLabel})`].map(escapeCsv).join(','));
  rows.push(['Base Currency:', profile.currency || 'INR'].map(escapeCsv).join(','));
  rows.push(['Generated On:', new Date().toLocaleString()].map(escapeCsv).join(','));
  rows.push(''); // Blank separator

  // Summary Metrics Block
  rows.push(['STATEMENT SUMMARY METRICS', ''].map(escapeCsv).join(','));
  rows.push(['Opening Balance (Start of Period):', statement.openingBalance].map(escapeCsv).join(','));
  rows.push(['Total Income / Deposits:', statement.totalIncome].map(escapeCsv).join(','));
  rows.push(['Total Expenses / Withdrawals:', statement.totalExpenses].map(escapeCsv).join(','));
  rows.push(['Total Transfers In:', statement.totalTransfersIn].map(escapeCsv).join(','));
  rows.push(['Total Transfers Out:', statement.totalTransfersOut].map(escapeCsv).join(','));
  rows.push(['Total Inflows:', statement.totalInflows].map(escapeCsv).join(','));
  rows.push(['Total Outflows:', statement.totalOutflows].map(escapeCsv).join(','));
  rows.push(['Closing Balance (End of Period):', statement.closingBalance].map(escapeCsv).join(','));
  rows.push(['Net Cash Movement:', statement.netChange].map(escapeCsv).join(','));
  rows.push(''); // Blank separator

  // Detailed Ledger Table
  const headers = [
    'Date',
    'Transaction ID',
    'Description',
    'Category',
    'Type',
    'Account',
    'Counterparty / Transfer Account',
    'Project / Client',
    'Payment Method',
    'Inflow (+)',
    'Outflow (-)',
    'Running Balance',
    'Notes',
  ];
  rows.push(headers.map(escapeCsv).join(','));

  statement.transactions.forEach((tx) => {
    const row = [
      tx.date,
      tx.id,
      tx.description,
      tx.category,
      tx.txType.toUpperCase(),
      tx.account,
      tx.transferToAccount || '',
      tx.project || '',
      tx.paymentMethod || '',
      tx.inflow > 0 ? tx.inflow : '',
      tx.outflow > 0 ? tx.outflow : '',
      tx.runningBalance,
      tx.notes || '',
    ];
    rows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
};

/**
 * Generates and downloads an Excel-compatible CSV file for an Income & Expense Statement.
 */
export const exportIncomeExpenseStatementCSV = (
  statement: IncomeExpenseStatementData,
  profile: UserProfile,
  customFilename?: string
) => {
  const filename =
    customFilename ||
    `Income-Expense-Statement-${statement.startDate}-to-${statement.endDate}.csv`;

  const rows: string[] = [];

  // Metadata Header Block
  rows.push(['BUSINESS EXPENSE TRACKER', 'OFFICIAL INCOME & EXPENSE STATEMENT'].map(escapeCsv).join(','));
  rows.push(['Business Name:', profile.businessName || 'Business Workspace'].map(escapeCsv).join(','));
  rows.push(['Owner / Manager:', profile.ownerName || 'Finance Manager'].map(escapeCsv).join(','));
  rows.push(['Statement Title:', statement.statementTitle].map(escapeCsv).join(','));
  rows.push(['Statement Period:', `${statement.startDate} to ${statement.endDate} (${statement.periodLabel})`].map(escapeCsv).join(','));
  rows.push(['Base Currency:', profile.currency || 'INR'].map(escapeCsv).join(','));
  rows.push(['Generated On:', new Date().toLocaleString()].map(escapeCsv).join(','));
  rows.push('');

  // Summary Metrics Block
  rows.push(['FINANCIAL SUMMARY', ''].map(escapeCsv).join(','));
  rows.push(['Total Income:', statement.totalIncome].map(escapeCsv).join(','));
  rows.push(['Total Expenses:', statement.totalExpenses].map(escapeCsv).join(','));
  rows.push(['Net Cash Flow (Operating Profit):', statement.netCashFlow].map(escapeCsv).join(','));
  rows.push(['Income Transaction Count:', statement.incomeCount].map(escapeCsv).join(','));
  rows.push(['Expense Transaction Count:', statement.expenseCount].map(escapeCsv).join(','));
  rows.push(['Total Records:', statement.transactions.length].map(escapeCsv).join(','));
  rows.push('');

  // Category Breakdown Block
  rows.push(['EXPENSE CATEGORY ALLOCATIONS', '', ''].map(escapeCsv).join(','));
  rows.push(['Category', 'Amount', 'Percentage (%)'].map(escapeCsv).join(','));
  statement.expenseCategories.forEach((cat) => {
    rows.push([cat.category, cat.amount, `${cat.percentage}%`].map(escapeCsv).join(','));
  });
  rows.push('');

  rows.push(['INCOME CATEGORY ALLOCATIONS', '', ''].map(escapeCsv).join(','));
  rows.push(['Category', 'Amount', 'Percentage (%)'].map(escapeCsv).join(','));
  statement.incomeCategories.forEach((cat) => {
    rows.push([cat.category, cat.amount, `${cat.percentage}%`].map(escapeCsv).join(','));
  });
  rows.push('');

  // Detailed Ledger Table
  const headers = [
    'Date',
    'Transaction ID',
    'Description',
    'Category',
    'Type',
    'Project / Client',
    'Account',
    'Payment Method',
    'Income (+)',
    'Expense (-)',
    'Notes',
  ];
  rows.push(headers.map(escapeCsv).join(','));

  statement.transactions.forEach((tx) => {
    const row = [
      tx.date,
      tx.id,
      tx.description,
      tx.category,
      tx.type.toUpperCase(),
      tx.project || '',
      tx.account || '',
      tx.paymentMethod || '',
      tx.income > 0 ? tx.income : '',
      tx.expense > 0 ? tx.expense : '',
      tx.notes || '',
    ];
    rows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
};

/**
 * Generates an executive, print-to-PDF ready standalone HTML document and opens it
 * in a dedicated printable iframe/window for 1-click PDF download or printing.
 */
export const printStatementToPDF = (
  type: 'account' | 'income_expense',
  data: AccountStatementData | IncomeExpenseStatementData,
  profile: UserProfile
) => {
  const isAccount = type === 'account';
  const accountData = data as AccountStatementData;
  const ieData = data as IncomeExpenseStatementData;

  const currency = profile.currency || 'INR';
  const numPref = profile.numberFormatPreference || 'en-IN';

  const fmt = (val: number) => formatCurrency(val, currency, numPref);

  const title = isAccount
    ? `Account Statement – ${accountData.accountName}`
    : ieData.statementTitle;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // If popup blocked, trigger standard window print on current view
    window.print();
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} (${data.periodLabel})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 16px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .doc-meta {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 4px;
    }
    .kpi-grid {
      display: table;
      width: 100%;
      margin-bottom: 16px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .kpi-card {
      display: table-cell;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      width: 25%;
      vertical-align: top;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 3px;
    }
    .kpi-value {
      font-size: 13px;
      font-weight: 800;
      font-family: "SF Mono", Monaco, Consolas, monospace;
      color: #0f172a;
    }
    .kpi-green { color: #166534; }
    .kpi-rose { color: #991b1b; }
    .kpi-blue { color: #1e40af; }

    .category-section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 10px;
    }
    table.data-table thead {
      display: table-header-group;
    }
    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      text-align: left;
    }
    table.data-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    table.data-table tr {
      page-break-inside: avoid;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: "SF Mono", Monaco, Consolas, monospace; }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-income { background: #dcfce7; color: #15803d; }
    .badge-expense { background: #fee2e2; color: #b91c1c; }
    .badge-transfer { background: #e0e7ff; color: #4338ca; }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #2563eb; color: #ffffff; padding: 10px 16px; margin: -16px -16px 16px -16px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <strong>Print / Save as PDF Preview:</strong> Click "Print / Save PDF" below to save this verified statement.
    </div>
    <button onclick="window.print()" style="background: #ffffff; color: #2563eb; font-weight: bold; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">
      🖨️ Print / Save PDF
    </button>
  </div>

  <table class="header-table">
    <tr>
      <td style="vertical-align: top;">
        <div class="brand-title">${profile.businessName || 'Business Expense Tracker'}</div>
        <div class="brand-sub">${profile.ownerName || 'Finance Manager'} • ${profile.email || 'finance@business.local'}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
          Business Type: ${profile.businessType || 'Small Business'} • Tax ID / GST Rate: ${profile.taxRate}%
        </div>
      </td>
      <td class="doc-meta" style="vertical-align: top;">
        <div class="doc-title">${title}</div>
        <div><strong>Period:</strong> ${data.periodLabel}</div>
        <div><strong>Date Range:</strong> ${data.startDate} to ${data.endDate}</div>
        <div><strong>Currency:</strong> ${currency} • <strong>Generated:</strong> ${new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</div>
      </td>
    </tr>
  </table>

  ${
    isAccount
      ? `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Opening Balance</div>
        <div class="kpi-value">${fmt(accountData.openingBalance)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Deposits / Inflow</div>
        <div class="kpi-value kpi-green">+${fmt(accountData.totalInflows)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Withdrawals / Outflow</div>
        <div class="kpi-value kpi-rose">-${fmt(accountData.totalOutflows)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Closing Balance</div>
        <div class="kpi-value ${accountData.closingBalance >= 0 ? 'kpi-blue' : 'kpi-rose'}">${fmt(accountData.closingBalance)}</div>
      </div>
    </div>
  `
      : `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Income</div>
        <div class="kpi-value kpi-green">+${fmt(ieData.totalIncome)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value kpi-rose">-${fmt(ieData.totalExpenses)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Net Cash Flow (Profit)</div>
        <div class="kpi-value ${ieData.netCashFlow >= 0 ? 'kpi-blue' : 'kpi-rose'}">${fmt(ieData.netCashFlow)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Transactions Count</div>
        <div class="kpi-value">${ieData.transactions.length} (${ieData.incomeCount} in / ${ieData.expenseCount} out)</div>
      </div>
    </div>
  `
  }

  ${
    !isAccount && ieData.expenseCategories.length > 0
      ? `
    <div class="category-section">
      <div class="section-title">Expense Allocation Breakdown</div>
      <table class="data-table" style="margin-bottom: 10px;">
        <thead>
          <tr>
            <th>Expense Category</th>
            <th class="text-center">Count</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Share (%)</th>
          </tr>
        </thead>
        <tbody>
          ${ieData.expenseCategories
            .slice(0, 6)
            .map(
              (cat) => `
            <tr>
              <td><strong>${cat.category}</strong></td>
              <td class="text-center font-mono">${cat.count}</td>
              <td class="text-right font-mono font-bold">${fmt(cat.amount)}</td>
              <td class="text-right font-mono">${cat.percentage}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
      : ''
  }

  <div class="section-title">Detailed Transaction Record (${data.transactions.length} entries)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 75px;">Date</th>
        <th>Description</th>
        <th>Category</th>
        ${isAccount ? '<th>Type</th>' : '<th>Project / Client</th>'}
        ${isAccount ? '<th class="text-right">Inflow (+)</th><th class="text-right">Outflow (-)</th><th class="text-right">Balance</th>' : '<th class="text-right">Income (+)</th><th class="text-right">Expense (-)</th>'}
      </tr>
    </thead>
    <tbody>
      ${
        data.transactions.length === 0
          ? `
        <tr>
          <td colspan="${isAccount ? 7 : 6}" class="text-center" style="padding: 24px; color: #94a3b8;">
            No transactions recorded in this statement period.
          </td>
        </tr>
      `
          : isAccount
          ? accountData.transactions
              .map(
                (tx) => `
        <tr>
          <td class="font-mono">${tx.date}</td>
          <td>
            <strong>${tx.description}</strong>
            ${tx.project ? `<span style="color: #64748b; font-size: 8px;"> (${tx.project})</span>` : ''}
          </td>
          <td>${tx.category}</td>
          <td>
            <span class="badge ${
              tx.txType === 'income' ? 'badge-income' : tx.txType === 'expense' ? 'badge-expense' : 'badge-transfer'
            }">${tx.txType.replace('_', ' ')}</span>
          </td>
          <td class="text-right font-mono" style="color: #166534;">${tx.inflow > 0 ? '+' + fmt(tx.inflow) : '–'}</td>
          <td class="text-right font-mono" style="color: #991b1b;">${tx.outflow > 0 ? '-' + fmt(tx.outflow) : '–'}</td>
          <td class="text-right font-mono font-bold">${fmt(tx.runningBalance)}</td>
        </tr>
      `
              )
              .join('')
          : ieData.transactions
              .map(
                (tx) => `
        <tr>
          <td class="font-mono">${tx.date}</td>
          <td>
            <strong>${tx.description}</strong>
            ${tx.account ? `<span style="color: #64748b; font-size: 8px;"> [${tx.account}]</span>` : ''}
          </td>
          <td>${tx.category}</td>
          <td>${tx.project || '–'}</td>
          <td class="text-right font-mono" style="color: #166534;">${tx.income > 0 ? '+' + fmt(tx.income) : '–'}</td>
          <td class="text-right font-mono" style="color: #991b1b;">${tx.expense > 0 ? '-' + fmt(tx.expense) : '–'}</td>
        </tr>
      `
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    <div>Official Statement generated by <strong>Business Expense Tracker – Small Business</strong>. Verified offline on-device ledger.</div>
    <div>Page 1 of 1 • ${data.startDate} to ${data.endDate}</div>
  </div>

  <script>
    // Auto-focus print dialog on window load if requested
    window.addEventListener('load', () => {
      // Allow slight delay for rendering fonts
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
