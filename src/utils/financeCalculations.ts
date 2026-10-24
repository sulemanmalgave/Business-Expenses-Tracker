import { Transaction, Category, UserProfile, FinancialSummary } from '../types';

/**
 * Decimal-safe money rounding to 2 decimal places to prevent floating-point discrepancies.
 * E.g., 0.1 + 0.2 => 0.3 instead of 0.30000000000000004
 */
export const roundMoney = (val: number): number => {
  if (!isFinite(val) || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Validates a transaction payload.
 * Rejects invalid dates, non-finite numbers, negative amounts, and missing essentials.
 */
export const validateTransaction = (
  tx: Partial<Transaction>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!tx.type || (tx.type !== 'income' && tx.type !== 'expense')) {
    errors.push('Transaction type must be either income or expense.');
  }

  if (typeof tx.amount !== 'number' || isNaN(tx.amount) || !isFinite(tx.amount)) {
    errors.push('Amount must be a valid finite number.');
  } else if (tx.amount <= 0) {
    errors.push('Amount must be strictly greater than 0.');
  }

  if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
    errors.push('Date must be in valid YYYY-MM-DD format.');
  } else {
    const parsed = new Date(tx.date);
    if (isNaN(parsed.getTime())) {
      errors.push('Date is not a valid calendar day.');
    }
  }

  if (!tx.category || !tx.category.trim()) {
    errors.push('Category is required.');
  }

  if (!tx.description || !tx.description.trim()) {
    errors.push('Description is required.');
  }

  if (tx.exchangeRate !== undefined) {
    if (typeof tx.exchangeRate !== 'number' || isNaN(tx.exchangeRate) || tx.exchangeRate <= 0) {
      errors.push('Exchange rate must be a positive number.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Core Financial Calculation Result interface.
 */
export interface CalculatedFinancials {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  netProfit: number;
  profitMargin: number;
  estimatedTaxReserve: number;
  netIncomeAfterTaxEstimate: number;
  incomeCount: number;
  expenseCount: number;
  totalTransactions: number;
  expenseCategories: { category: string; amount: number; percentage: number }[];
  incomeCategories: { category: string; amount: number; percentage: number }[];
  projectBreakdown: { project: string; income: number; expense: number; net: number }[];
  accountBreakdown: { account: string; totalInflow: number; totalOutflow: number; net: number }[];
  paymentMethodBreakdown: { method: string; amount: number; count: number }[];
}

/**
 * Single, unified financial calculation layer used by all views and reports.
 * Respects exchange rates to base currency and ensures mathematical precision.
 */
export const calculateFinancials = (
  transactions: Transaction[],
  taxRate: number = 0
): CalculatedFinancials => {
  let incomeCents = 0;
  let expenseCents = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const expCatMap = new Map<string, number>();
  const incCatMap = new Map<string, number>();
  const projMap = new Map<string, { income: number; expense: number }>();
  const acctMap = new Map<string, { inflow: number; outflow: number }>();
  const methodMap = new Map<string, { amount: number; count: number }>();

  for (const t of transactions) {
    // Convert to base currency via exchange rate if given, default 1
    const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
    const baseAmount = roundMoney(t.amount * rate);
    const cents = Math.round(baseAmount * 100);

    const projectTag = (t.project && t.project.trim()) || 'Unassigned Project';
    const accountTag = (t.account && t.account.trim()) || 'General Account';
    const methodTag = (t.paymentMethod && t.paymentMethod.trim()) || 'Standard Method';

    // Update project metrics
    if (!projMap.has(projectTag)) {
      projMap.set(projectTag, { income: 0, expense: 0 });
    }
    const projEntry = projMap.get(projectTag)!;

    // Update account metrics
    if (!acctMap.has(accountTag)) {
      acctMap.set(accountTag, { inflow: 0, outflow: 0 });
    }
    const acctEntry = acctMap.get(accountTag)!;

    // Update payment method metrics
    if (!methodMap.has(methodTag)) {
      methodMap.set(methodTag, { amount: 0, count: 0 });
    }
    const methEntry = methodMap.get(methodTag)!;
    methEntry.amount = roundMoney(methEntry.amount + baseAmount);
    methEntry.count += 1;

    // Check if transaction is an internal account transfer
    const isTransfer = 
      t.isTransfer === true || 
      (t.category && (t.category.toLowerCase() === 'transfer' || t.category.toLowerCase() === 'account transfer'));

    if (isTransfer) {
      // Internal transfers reallocate funds between accounts; NOT business revenue or operating expense
      acctEntry.outflow = roundMoney(acctEntry.outflow + baseAmount);
      const destAccount = (t.transferToAccount && t.transferToAccount.trim()) || 'Transferred Funds';
      if (!acctMap.has(destAccount)) {
        acctMap.set(destAccount, { inflow: 0, outflow: 0 });
      }
      const destEntry = acctMap.get(destAccount)!;
      destEntry.inflow = roundMoney(destEntry.inflow + baseAmount);
      continue;
    }

    if (t.type === 'income') {
      incomeCents += cents;
      incomeCount++;
      const curCat = incCatMap.get(t.category) || 0;
      incCatMap.set(t.category, curCat + cents);
      projEntry.income = roundMoney(projEntry.income + baseAmount);
      acctEntry.inflow = roundMoney(acctEntry.inflow + baseAmount);
    } else {
      expenseCents += cents;
      expenseCount++;
      const curCat = expCatMap.get(t.category) || 0;
      expCatMap.set(t.category, curCat + cents);
      projEntry.expense = roundMoney(projEntry.expense + baseAmount);
      acctEntry.outflow = roundMoney(acctEntry.outflow + baseAmount);
    }
  }

  const totalIncome = incomeCents / 100;
  const totalExpenses = expenseCents / 100;
  const netCashFlow = roundMoney(totalIncome - totalExpenses);
  const netProfit = netCashFlow; // Cash-basis net profit
  const profitMargin = totalIncome > 0 ? roundMoney((netProfit / totalIncome) * 100) : 0;

  // Tax calculation: Clearly an estimate based on user-provided reserve rate
  const safeTaxRate = Math.max(0, Math.min(100, taxRate));
  const estimatedTaxReserve = netProfit > 0 ? roundMoney(netProfit * (safeTaxRate / 100)) : 0;
  const netIncomeAfterTaxEstimate = roundMoney(netProfit - estimatedTaxReserve);

  // Category breakdown with exact percentages
  const expenseCategories = Array.from(expCatMap.entries())
    .map(([category, cents]) => {
      const amount = cents / 100;
      const percentage = totalExpenses > 0 ? roundMoney((amount / totalExpenses) * 100) : 0;
      return { category, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  const incomeCategories = Array.from(incCatMap.entries())
    .map(([category, cents]) => {
      const amount = cents / 100;
      const percentage = totalIncome > 0 ? roundMoney((amount / totalIncome) * 100) : 0;
      return { category, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  const projectBreakdown = Array.from(projMap.entries()).map(([project, stats]) => ({
    project,
    income: stats.income,
    expense: stats.expense,
    net: roundMoney(stats.income - stats.expense),
  }));

  const accountBreakdown = Array.from(acctMap.entries()).map(([account, stats]) => ({
    account,
    totalInflow: stats.inflow,
    totalOutflow: stats.outflow,
    net: roundMoney(stats.inflow - stats.outflow),
  }));

  const paymentMethodBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    amount: data.amount,
    count: data.count,
  }));

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    netProfit,
    profitMargin,
    estimatedTaxReserve,
    netIncomeAfterTaxEstimate,
    incomeCount,
    expenseCount,
    totalTransactions: transactions.length,
    expenseCategories,
    incomeCategories,
    projectBreakdown,
    accountBreakdown,
    paymentMethodBreakdown,
  };
};

/**
 * Honest Month-over-Month comparison.
 * Never fabricates percentage changes or trends when historical data is absent.
 */
export interface MonthOverMonthResult {
  hasComparableHistoricalData: boolean;
  currentMonthIncome: number;
  currentMonthExpense: number;
  previousMonthIncome: number;
  previousMonthExpense: number;
  incomeChangePercentage: number | null;
  expenseChangePercentage: number | null;
  netChangePercentage: number | null;
  statusMessage: string;
}

export const calculateMonthOverMonth = (
  transactions: Transaction[],
  referenceDate: Date = new Date()
): MonthOverMonthResult => {
  const curYear = referenceDate.getFullYear();
  const curMonth = referenceDate.getMonth() + 1;
  const currentMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

  const prevDate = new Date(curYear, referenceDate.getMonth() - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const curTxs = transactions.filter((t) => t.date && t.date.startsWith(currentMonthStr));
  const prevTxs = transactions.filter((t) => t.date && t.date.startsWith(prevMonthStr));

  const curInc = curTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const curExp = curTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const prevInc = prevTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExp = prevTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // If previous month has zero records, we do NOT have comparable historical data!
  const hasComparable = prevTxs.length > 0;

  if (!hasComparable) {
    return {
      hasComparableHistoricalData: false,
      currentMonthIncome: roundMoney(curInc),
      currentMonthExpense: roundMoney(curExp),
      previousMonthIncome: 0,
      previousMonthExpense: 0,
      incomeChangePercentage: null,
      expenseChangePercentage: null,
      netChangePercentage: null,
      statusMessage: 'Baseline period: Prior month contains no records for comparison.',
    };
  }

  const incChange = prevInc > 0 ? roundMoney(((curInc - prevInc) / prevInc) * 100) : null;
  const expChange = prevExp > 0 ? roundMoney(((curExp - prevExp) / prevExp) * 100) : null;

  const curNet = curInc - curExp;
  const prevNet = prevInc - prevExp;
  const netChange = prevNet !== 0 ? roundMoney(((curNet - prevNet) / Math.abs(prevNet)) * 100) : null;

  return {
    hasComparableHistoricalData: true,
    currentMonthIncome: roundMoney(curInc),
    currentMonthExpense: roundMoney(curExp),
    previousMonthIncome: roundMoney(prevInc),
    previousMonthExpense: roundMoney(prevExp),
    incomeChangePercentage: incChange,
    expenseChangePercentage: expChange,
    netChangePercentage: netChange,
    statusMessage: 'Comparison based on verified previous month transactions.',
  };
};

/**
 * Filter transactions by inclusive date boundaries, category, project, account, and payment method.
 */
export const filterTransactions = (
  transactions: Transaction[],
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    project?: string;
    account?: string;
    paymentMethod?: string;
    type?: 'income' | 'expense' | 'all';
    search?: string;
  }
): Transaction[] => {
  return transactions.filter((t) => {
    // Type filter
    if (filters.type && filters.type !== 'all' && t.type !== filters.type) {
      return false;
    }

    // Date inclusive boundaries
    if (filters.startDate && t.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && t.date > filters.endDate) {
      return false;
    }

    // Category
    if (filters.category && filters.category !== 'All' && t.category !== filters.category) {
      return false;
    }

    // Project
    if (filters.project && filters.project !== 'All') {
      const p = t.project || 'Unassigned Project';
      if (p !== filters.project) return false;
    }

    // Account
    if (filters.account && filters.account !== 'All') {
      const a = t.account || 'General Account';
      if (a !== filters.account) return false;
    }

    // Payment method
    if (filters.paymentMethod && filters.paymentMethod !== 'All') {
      const m = t.paymentMethod || 'Standard Method';
      if (m !== filters.paymentMethod) return false;
    }

    // Search query
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchProj = (t.project || '').toLowerCase().includes(q);
      const matchAcct = (t.account || '').toLowerCase().includes(q);
      const matchAmt = t.amount.toString().includes(q);
      if (!matchDesc && !matchCat && !matchProj && !matchAcct && !matchAmt) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Calculates financial year start and end dates based on configured starting month (default: April for India).
 * E.g., for April in Oct 2026: FY 2026-27 runs from 2026-04-01 to 2027-03-31.
 * For January: runs from 2026-01-01 to 2026-12-31.
 */
export const getFinancialYearDates = (
  referenceDate: Date = new Date(),
  financialYearStart: string = 'April'
): { startDate: string; endDate: string; label: string; yearTag: string } => {
  const monthMap: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };
  const startMonthIndex = monthMap[financialYearStart] !== undefined ? monthMap[financialYearStart] : 3;
  
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  
  let fyStartYear: number;
  if (currentMonth >= startMonthIndex) {
    fyStartYear = currentYear;
  } else {
    fyStartYear = currentYear - 1;
  }

  const startDateObj = new Date(fyStartYear, startMonthIndex, 1);
  const endDateObj = new Date(fyStartYear + 1, startMonthIndex, 0);

  const startMonthStr = String(startDateObj.getMonth() + 1).padStart(2, '0');
  const startDayStr = String(startDateObj.getDate()).padStart(2, '0');
  const endMonthStr = String(endDateObj.getMonth() + 1).padStart(2, '0');
  const endDayStr = String(endDateObj.getDate()).padStart(2, '0');

  const startDate = `${startDateObj.getFullYear()}-${startMonthStr}-${startDayStr}`;
  const endDate = `${endDateObj.getFullYear()}-${endMonthStr}-${endDayStr}`;
  const yearTag = startMonthIndex === 0 ? `${fyStartYear}` : `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  const label = startMonthIndex === 0 
    ? `Calendar Year ${fyStartYear}` 
    : `Financial Year (${financialYearStart} ${fyStartYear} – ${endDateObj.toLocaleString('en', { month: 'short' })} ${fyStartYear + 1})`;

  return { startDate, endDate, label, yearTag };
};

/**
 * Returns date boundary strings for a selected period token.
 */
export const getDateRangeForPeriod = (
  period: 'this_month' | 'last_month' | 'this_quarter' | 'financial_year' | 'calendar_year' | 'all' | 'custom',
  referenceDate: Date = new Date(),
  financialYearStart: string = 'April'
): { startDate?: string; endDate?: string; label: string } => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (period === 'this_month') {
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const monthName = referenceDate.toLocaleString('en', { month: 'long' });
    return { startDate: startStr, endDate: endStr, label: `This Month (${monthName} ${year})` };
  }

  if (period === 'last_month') {
    const prevDate = new Date(year, month - 1, 1);
    const pYear = prevDate.getFullYear();
    const pMonth = prevDate.getMonth();
    const startStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(pYear, pMonth + 1, 0).getDate();
    const endStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const monthName = prevDate.toLocaleString('en', { month: 'long' });
    return { startDate: startStr, endDate: endStr, label: `Last Month (${monthName} ${pYear})` };
  }

  if (period === 'this_quarter') {
    const q = Math.floor(month / 3);
    const qStartMonth = q * 3;
    const startStr = `${year}-${String(qStartMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, qStartMonth + 3, 0).getDate();
    const endStr = `${year}-${String(qStartMonth + 3).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate: startStr, endDate: endStr, label: `Q${q + 1} (${year})` };
  }

  if (period === 'financial_year') {
    const fy = getFinancialYearDates(referenceDate, financialYearStart);
    return { startDate: fy.startDate, endDate: fy.endDate, label: fy.label };
  }

  if (period === 'calendar_year') {
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, label: `Calendar Year ${year}` };
  }

  if (period === 'all') {
    return { startDate: undefined, endDate: undefined, label: 'All Time' };
  }

  return { startDate: undefined, endDate: undefined, label: 'Custom Range' };
};

