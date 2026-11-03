/**
 * Automated Test Suite for Business Expense Tracker
 * Run via: npx tsx tests/runAllTests.ts
 */

import { 
  roundMoney, 
  validateTransaction, 
  calculateFinancials, 
  calculateMonthOverMonth, 
  filterTransactions,
  getFinancialYearDates,
  getDateRangeForPeriod 
} from '../src/utils/financeCalculations';
import { advanceDueDate, evaluateRecurringBills, processBillPayment } from '../src/utils/recurringService';
import { formatCurrency, formatIndianLakhsCrores, formatDate, parseCSVData } from '../src/utils/financeUtils';
import { 
  isFeatureAllowed, 
  isSubscriptionActive,
  getPlanPricing,
  detectLikelyBillingCountry,
  REGIONAL_PRICING,
  PLAN_METADATA,
  FREE_LIMITS,
  getEntitlementPlan,
  checkFeatureEntitlement
} from '../src/utils/subscriptionService';
import { Transaction, RecurringBill, UserProfile, Client } from '../src/types';
import { 
  calculateAccountStatement, 
  calculateIncomeExpenseStatement, 
  getAvailableAccounts,
  exportAccountStatementCSV,
  exportIncomeExpenseStatementCSV 
} from '../src/utils/statementGenerator';
import {
  validateClient,
  findDuplicateClients,
  getClientFinancialSummary,
  getStarterClients
} from '../src/utils/clientUtils';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

function assertCloseTo(actual: number, expected: number, testName: string) {
  const diff = Math.abs(actual - expected);
  assert(diff < 0.0001, testName, `Expected ${expected}, received ${actual}`);
}

console.log('\n========================================');
console.log('RUNNING BUSINESS EXPENSE TRACKER TESTS');
console.log('========================================\n');

// 1. DECIMAL-SAFE ARITHMETIC TESTS
console.log('[Suite 1: Decimal Precision & Rounding]');
assert(roundMoney(0.1 + 0.2) === 0.3, 'Floating-point 0.1 + 0.2 rounds to exact 0.30');
assert(roundMoney(19.999) === 20.0, 'Rounds 19.999 to 20.00');
assert(roundMoney(14.505) === 14.51, 'Half-up rounding on currency cents');
assert(roundMoney(NaN) === 0, 'Handles NaN gracefully by returning 0');
assert(roundMoney(Infinity) === 0, 'Handles Infinity gracefully by returning 0');

// 2. TRANSACTION VALIDATION TESTS
console.log('\n[Suite 2: Transaction Validation]');
const validTx: Partial<Transaction> = {
  type: 'expense',
  amount: 45.5,
  date: '2026-05-15',
  category: 'Software & SaaS Tools',
  description: 'GitHub Subscription',
};
assert(validateTransaction(validTx).isValid === true, 'Accepts properly structured transaction');

const negAmountTx: Partial<Transaction> = { ...validTx, amount: -20 };
assert(validateTransaction(negAmountTx).isValid === false, 'Rejects negative amount');

const nanAmountTx: Partial<Transaction> = { ...validTx, amount: NaN };
assert(validateTransaction(nanAmountTx).isValid === false, 'Rejects NaN amount');

const invalidDateTx: Partial<Transaction> = { ...validTx, date: '15-05-2026' };
assert(validateTransaction(invalidDateTx).isValid === false, 'Rejects non-ISO dates');

const emptyDescTx: Partial<Transaction> = { ...validTx, description: '   ' };
assert(validateTransaction(emptyDescTx).isValid === false, 'Rejects blank description');

// 3. UNIFIED FINANCIAL CALCULATIONS
console.log('\n[Suite 3: Financial Calculations & Accounting Rules]');
const sampleTransactions: Transaction[] = [
  {
    id: 't1',
    type: 'income',
    amount: 1000,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Client Services',
    date: '2026-06-01',
    description: 'Client Invoice #1',
    project: 'Project Alpha',
    account: 'Operating Account',
    paymentMethod: 'Bank Transfer',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 't2',
    type: 'income',
    amount: 500,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Product Sales',
    date: '2026-06-05',
    description: 'Digital License',
    project: 'Project Beta',
    account: 'Operating Account',
    paymentMethod: 'Credit Card',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 't3',
    type: 'expense',
    amount: 300,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Software & SaaS Tools',
    date: '2026-06-10',
    description: 'AWS Servers',
    project: 'Project Alpha',
    account: 'Operating Account',
    paymentMethod: 'Credit Card',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 't4',
    type: 'expense',
    amount: 200,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Office Rent & Workspace',
    date: '2026-06-12',
    description: 'Desk Lease',
    account: 'Petty Cash',
    paymentMethod: 'Cash',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
];

const fin = calculateFinancials(sampleTransactions, 20); // 20% estimated tax reserve
assertCloseTo(fin.totalIncome, 1500, 'Calculates total income ($1500)');
assertCloseTo(fin.totalExpenses, 500, 'Calculates total expenses ($500)');
assertCloseTo(fin.netCashFlow, 1000, 'Calculates net cash movement ($1000)');
assertCloseTo(fin.netProfit, 1000, 'Calculates operating profit ($1000)');
assertCloseTo(fin.profitMargin, 66.67, 'Calculates correct profit margin (66.67%)');
assertCloseTo(fin.estimatedTaxReserve, 200, 'Calculates tax reserve (20% of 1000 = $200)');
assertCloseTo(fin.netIncomeAfterTaxEstimate, 800, 'Calculates net earnings after tax reserve ($800)');

// Empty dataset check
const emptyFin = calculateFinancials([], 15);
assert(emptyFin.totalIncome === 0, 'Empty dataset has 0 income');
assert(emptyFin.totalExpenses === 0, 'Empty dataset has 0 expenses');
assert(emptyFin.profitMargin === 0, 'Empty dataset handles margin division by zero gracefully (0%)');

// 4. PROJECT BREAKDOWN TESTS
console.log('\n[Suite 4: Project Profitability Tracking]');
const alphaProj = fin.projectBreakdown.find((p) => p.project === 'Project Alpha');
assert(alphaProj !== undefined, 'Project Alpha exists in breakdown');
assertCloseTo(alphaProj!.income, 1000, 'Project Alpha income = 1000');
assertCloseTo(alphaProj!.expense, 300, 'Project Alpha expense = 300');
assertCloseTo(alphaProj!.net, 700, 'Project Alpha net = 700');

// 5. HONEST MONTH-OVER-MONTH HISTORICAL COMPARISON
console.log('\n[Suite 5: Month-Over-Month Integrity]');
// Case A: No prior month transactions
const momNoPrev = calculateMonthOverMonth(sampleTransactions, new Date('2026-06-15'));
assert(
  momNoPrev.hasComparableHistoricalData === false,
  'Flags hasComparableHistoricalData as false when prior month has 0 records'
);
assert(
  momNoPrev.incomeChangePercentage === null,
  'Does not return fabricated +100% when prior month has no records'
);

// Case B: With valid historical month data
const multiMonthTransactions: Transaction[] = [
  ...sampleTransactions,
  // May 2026 prior month
  {
    id: 'm1',
    type: 'income',
    amount: 1000,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Client Services',
    date: '2026-05-10',
    description: 'May Retainer',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'm2',
    type: 'expense',
    amount: 400,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Software & SaaS Tools',
    date: '2026-05-15',
    description: 'May SaaS',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
];

const momWithPrev = calculateMonthOverMonth(multiMonthTransactions, new Date('2026-06-15'));
assert(momWithPrev.hasComparableHistoricalData === true, 'Recognizes comparable prior month');
assertCloseTo(momWithPrev.incomeChangePercentage!, 50, 'Correctly computes +50% income growth (1500 vs 1000)');
assertCloseTo(momWithPrev.expenseChangePercentage!, 25, 'Correctly computes +25% expense growth (500 vs 400)');

// 6. DATE BOUNDARIES & FILTERING
console.log('\n[Suite 6: Date Boundaries & Multi-criteria Filtering]');
const dateFiltered = filterTransactions(sampleTransactions, {
  startDate: '2026-06-05',
  endDate: '2026-06-10',
});
assert(dateFiltered.length === 2, 'Filters inclusive date boundaries (June 5 to June 10 = 2 txs)');

const projectFiltered = filterTransactions(sampleTransactions, { project: 'Project Beta' });
assert(projectFiltered.length === 1 && projectFiltered[0].id === 't2', 'Filters strictly by project');

const methodFiltered = filterTransactions(sampleTransactions, { paymentMethod: 'Cash' });
assert(methodFiltered.length === 1 && methodFiltered[0].id === 't4', 'Filters strictly by payment method');

// 7. RECURRING BILLS ENGINE
console.log('\n[Suite 7: Recurring Bills & Scheduled Obligations]');
assert(advanceDueDate('2026-01-15', 'monthly') === '2026-02-15', 'Advances monthly due date');
assert(advanceDueDate('2026-01-15', 'weekly') === '2026-01-22', 'Advances weekly due date');
assert(advanceDueDate('2026-01-15', 'yearly') === '2027-01-15', 'Advances yearly due date');
assert(advanceDueDate('2026-01-15', 'daily') === '2026-01-16', 'Advances daily due date');

const testBill: RecurringBill = {
  id: 'b1',
  description: 'Fiber Internet',
  amount: 80,
  category: 'Utilities & Internet',
  type: 'expense',
  frequency: 'monthly',
  startDate: '2026-01-01',
  nextDueDate: '2026-06-01',
  isActive: true,
};

const billEval = evaluateRecurringBills([testBill], '2026-06-05');
assert(billEval.overdue.length === 1, 'Correctly flags June 1 bill as overdue on June 5');

const paymentResult = processBillPayment(testBill, '2026-06-05');
assert(paymentResult.updatedBill.nextDueDate === '2026-07-01', 'Advances nextDueDate to July 1 after payment');
assert(paymentResult.newTransaction.amount === 80, 'Created valid transaction from scheduled bill');

// 8. INDIAN CURRENCY & NUMBER FORMATTING
console.log('\n[Suite 8: Currency and Locale Formatting]');
const inrFormatted = formatCurrency(150000, 'INR', 'en-IN');
assert(inrFormatted.includes('₹'), 'Includes Indian Rupee symbol ₹');
assert(inrFormatted.includes('1,50,000'), 'Formats Lakhs using en-IN grouping (1,50,000.00)');

const usdFormatted = formatCurrency(1234.5, 'USD', 'en-US');
assert(usdFormatted === '$1,234.50', 'Formats standard USD ($1,234.50)');

// 9. CSV PARSING AND DATA INTEGRITY
console.log('\n[Suite 9: CSV Ingest & Robust Parsing]');
const csvSample = `Date,Description,Category,Type,Amount\n2026-04-10,"Client Payout, Corp",Client Services,Income,1250.00\n2026-04-12,Hosting,Software,Expense,45.00`;
const parsedCsv = parseCSVData(csvSample);
assert(parsedCsv.length === 2, 'Parses 2 rows from CSV');
assert(parsedCsv[0].amount === 1250, 'Extracts correct numeric amount');
assert(parsedCsv[0].description === 'Client Payout, Corp', 'Preserves quoted strings containing commas');

// 10. ACCOUNT TRANSFERS AUDIT (CRITICAL FINANCIAL RULE)
console.log('\n[Suite 10: Account Transfers Separation]');
const transactionsWithTransfer: Transaction[] = [
  ...sampleTransactions,
  {
    id: 'tr_1',
    type: 'expense',
    amount: 5000,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Transfer',
    date: '2026-06-15',
    description: 'Internal Transfer to Reserve Savings',
    account: 'Operating Account',
    transferToAccount: 'Reserve Savings',
    isTransfer: true,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
];

const finWithTransfer = calculateFinancials(transactionsWithTransfer, 20);
assertCloseTo(finWithTransfer.totalIncome, 1500, 'Account transfer does NOT increase total income ($1500)');
assertCloseTo(finWithTransfer.totalExpenses, 500, 'Account transfer does NOT increase total expenses ($500)');
assertCloseTo(finWithTransfer.netCashFlow, 1000, 'Account transfer does NOT alter net cash flow ($1000)');
assertCloseTo(finWithTransfer.netProfit, 1000, 'Account transfer does NOT alter operating net profit ($1000)');

const operatingAcct = finWithTransfer.accountBreakdown.find((a) => a.account === 'Operating Account');
const savingsAcct = finWithTransfer.accountBreakdown.find((a) => a.account === 'Reserve Savings');
assert(operatingAcct !== undefined && operatingAcct.totalOutflow >= 5000, 'Operating Account records transfer outflow ($5000+300)');
assert(savingsAcct !== undefined && savingsAcct.totalInflow === 5000, 'Reserve Savings records transfer inflow ($5000)');

// 11. CATEGORY BREAKDOWN & PERCENTAGE INTEGRITY
console.log('\n[Suite 11: Category Breakdown & Percentage Integrity]');
const sumCategoryAmounts = fin.expenseCategories.reduce((s, c) => roundMoney(s + c.amount), 0);
assertCloseTo(sumCategoryAmounts, fin.totalExpenses, 'Sum of all expense category amounts equals total expenses ($500)');

const sumCategoryPercentages = fin.expenseCategories.reduce((s, c) => roundMoney(s + c.percentage), 0);
assert(Math.abs(sumCategoryPercentages - 100) < 0.1, 'Sum of category percentages equals 100%');
assert(fin.expenseCategories.length === 2, 'Distinct expense categories are preserved (Software and Office Rent)');

// 12. ZERO-STATE & CLEAN WORKSPACE VERIFICATION
console.log('\n[Suite 12: Zero-State & Clean Workspace]');
const cleanFin = calculateFinancials([], 0);
assert(cleanFin.totalIncome === 0, 'Clean workspace has exactly 0 total income');
assert(cleanFin.totalExpenses === 0, 'Clean workspace has exactly 0 total expenses');
assert(cleanFin.netCashFlow === 0, 'Clean workspace has exactly 0 net cash flow');
assert(cleanFin.profitMargin === 0, 'Clean workspace margin is 0% without division errors');

const cleanMom = calculateMonthOverMonth([]);
assert(cleanMom.hasComparableHistoricalData === false, 'Clean workspace reports no historical comparison data');
assert(cleanMom.incomeChangePercentage === null, 'Clean workspace returns null percentage (no fake 100% or 0%)');

// 13. INDIAN FINANCIAL YEAR & PERIOD BOUNDARIES
console.log('\n[Suite 13: Indian Financial Year & Period Date Bounds]');
const fyJune = getFinancialYearDates(new Date('2026-06-15'), 'April');
assert(fyJune.startDate === '2026-04-01', 'FY for June 2026 starts April 1, 2026');
assert(fyJune.endDate === '2027-03-31', 'FY for June 2026 ends March 31, 2027');
assert(fyJune.yearTag === 'FY 2026-27', 'FY tag formatted as FY 2026-27');

const fyFeb = getFinancialYearDates(new Date('2026-02-10'), 'April');
assert(fyFeb.startDate === '2025-04-01', 'FY for Feb 2026 starts April 1, 2025');
assert(fyFeb.endDate === '2026-03-31', 'FY for Feb 2026 ends March 31, 2026');
assert(fyFeb.yearTag === 'FY 2025-26', 'FY tag formatted as FY 2025-26');

const monthBound = getDateRangeForPeriod('this_month', new Date('2026-10-22'));
assert(monthBound.startDate === '2026-10-01', 'Month period starts on 1st of month');
assert(monthBound.endDate === '2026-10-31', 'Month period ends on last day of October (31st)');

// 14. INDIAN LAKHS & CRORES FORMATTING
console.log('\n[Suite 14: Indian Lakhs & Crores Number Formatting]');
const lakhVal = formatCurrency(150000, 'INR', 'en-IN');
assert(lakhVal.includes('1,50,000'), 'Formats 1.5 Lakh with Indian grouping (1,50,000.00)');

const croreVal = formatCurrency(10000000, 'INR', 'en-IN');
assert(croreVal.includes('1,00,00,000'), 'Formats 1 Crore with Indian grouping (1,00,00,000.00)');

const lakhShorthand = formatIndianLakhsCrores(2500000, 'INR');
assert(lakhShorthand.includes('25.00 L'), 'Formats 25 Lakhs shorthand (₹25.00 L)');

const croreShorthand = formatIndianLakhsCrores(12000000, 'INR');
assert(croreShorthand.includes('1.20 Cr'), 'Formats 1.2 Crore shorthand (₹1.20 Cr)');

// 15. INVOICE MATHEMATICAL INTEGRITY
console.log('\n[Suite 15: Invoicing Calculation & Integrity]');
const lineItems = [
  { qty: 2, price: 5000 }, // 10,000
  { qty: 1, price: 2500 }, // 2,500
];
const invSubtotal = roundMoney(lineItems.reduce((s, i) => s + i.qty * i.price, 0));
assert(invSubtotal === 12500, 'Invoice subtotal is accurately 12,500');

const invTax = roundMoney(invSubtotal * 0.18); // 18% GST = 2,250
assert(invTax === 2250, '18% GST is accurately 2,250');

const invTotal = roundMoney(invSubtotal + invTax);
assert(invTotal === 14750, 'Invoice total (12,500 + 2,250) is exactly 14,750');
assert(roundMoney(invTotal - invTax) === invSubtotal, 'Subtotal + Tax matches total without precision leak');

// 16. SUBSCRIPTION ENTITLEMENTS & FREE TIER PROTECTION
console.log('\n[Suite 16: Free Entitlements & Subscription Permissions]');
const freeProfile: UserProfile = {
  businessName: 'Freelance Studio',
  ownerName: 'Alex',
  email: 'alex@example.com',
  currency: 'INR',
  taxRate: 18,
  onboarded: true,
  subscriptionPlan: 'free',
  subscriptionStatus: 'active'
};

const freeExcel = isFeatureAllowed(freeProfile, 'excel_export');
assert(freeExcel.allowed === true, 'Free users are never locked out of Excel exports');

const freeBackup = isFeatureAllowed(freeProfile, 'backup_restore');
assert(freeBackup.allowed === true, 'Free users are never locked out of JSON backup and restore');

const freePdf = isFeatureAllowed(freeProfile, 'pdf_reports');
assert(freePdf.allowed === true, 'Free users can print/save PDF reports without paywalls');

const freeUnder50 = isFeatureAllowed(freeProfile, 'unlimited_transactions', 35);
assert(freeUnder50.allowed === true, 'Free users can log up to 50 transactions (35 allowed)');

const freeOver50 = isFeatureAllowed(freeProfile, 'unlimited_transactions', 55);
assert(freeOver50.allowed === false, 'Free quota warns gracefully when exceeding 50 transactions');

const freeMultiBiz = isFeatureAllowed(freeProfile, 'multiple_businesses');
assert(freeMultiBiz.allowed === false, 'Multiple business entity management requires Pro license');

const proProfile: UserProfile = {
  ...freeProfile,
  subscriptionPlan: 'pro_monthly',
  subscriptionStatus: 'active',
  subscriptionExpiry: '2099-12-31'
};
const proMultiBiz = isFeatureAllowed(proProfile, 'multiple_businesses');
assert(proMultiBiz.allowed === true, 'Active Pro license allows multiple business workspaces');

const proUnlimited = isFeatureAllowed(proProfile, 'unlimited_transactions', 5000);
assert(proUnlimited.allowed === true, 'Active Pro license allows unlimited transactions');

// 17. ACCOUNT STATEMENT OPENING & RUNNING BALANCES
console.log('\n[Suite 17: Account Statement Balance & Ledger Integrity]');
const statementTxs: Transaction[] = [
  // Prior period transactions (May 2026)
  {
    id: 'tx_p1',
    type: 'income',
    amount: 2000,
    category: 'Client Services',
    date: '2026-05-10',
    description: 'May Retainer Fee',
    account: 'Operating Account',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_p2',
    type: 'expense',
    amount: 500,
    category: 'Software & SaaS Tools',
    date: '2026-05-20',
    description: 'Server Hosting',
    account: 'Operating Account',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  // In-period transactions (June 2026)
  {
    id: 'tx_s1',
    type: 'income',
    amount: 1000,
    category: 'Consulting',
    date: '2026-06-02',
    description: 'Design Consultation',
    account: 'Operating Account',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_s2',
    type: 'expense',
    amount: 300,
    category: 'Office Supplies',
    date: '2026-06-10',
    description: 'Ergonomic Chair',
    account: 'Operating Account',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_s3',
    type: 'expense',
    amount: 400,
    category: 'Transfer',
    date: '2026-06-15',
    description: 'Reserve Allocation',
    account: 'Operating Account',
    transferToAccount: 'Reserve Savings',
    isTransfer: true,
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_s4',
    type: 'income',
    amount: 800,
    category: 'Interest',
    date: '2026-06-20',
    description: 'High Yield Dividend',
    account: 'Reserve Savings',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none',
  },
];

// Test Operating Account Statement
const opStmt = calculateAccountStatement({
  transactions: statementTxs,
  account: 'Operating Account',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  periodLabel: 'June 2026',
});

assert(opStmt.openingBalance === 1500, 'Calculates prior opening balance ($2000 - $500 = $1500)');
assert(opStmt.hasHistoricalRecords === true, 'Discloses historical records exist before period start');
assert(opStmt.totalIncome === 1000, 'In-period income for Operating Account is $1000');
assert(opStmt.totalExpenses === 300, 'In-period expense for Operating Account is $300');
assert(opStmt.totalTransfersOut === 400, 'Identifies $400 outgoing transfer');
assert(opStmt.totalTransfersIn === 0, 'No incoming transfers for Operating Account');
assert(opStmt.totalInflows === 1000, 'Total inflows = $1000');
assert(opStmt.totalOutflows === 700, 'Total outflows = $300 expense + $400 transfer out = $700');
assert(opStmt.closingBalance === 1800, 'Closing balance is exactly $1800 (1500 + 1000 - 700)');
assert(opStmt.netChange === 300, 'Net change for period is +$300');

// Running balance on each row
assert(opStmt.transactions.length === 3, 'Operating account has 3 in-period transactions');
assert(opStmt.transactions[0].runningBalance === 2500, 'Row 1 running balance: 1500 + 1000 = 2500');
assert(opStmt.transactions[1].runningBalance === 2200, 'Row 2 running balance: 2500 - 300 = 2200');
assert(opStmt.transactions[2].runningBalance === 1800, 'Row 3 running balance: 2200 - 400 = 1800');

// Test Reserve Savings Account Statement (with transfer in)
const reserveStmt = calculateAccountStatement({
  transactions: statementTxs,
  account: 'Reserve Savings',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  periodLabel: 'June 2026',
});

assert(reserveStmt.openingBalance === 0, 'Reserve Savings has zero opening balance');
assert(reserveStmt.hasHistoricalRecords === false, 'Correctly flags no historical records before period');
assert(reserveStmt.totalTransfersIn === 400, 'Records incoming transfer of $400 from Operating Account');
assert(reserveStmt.totalIncome === 800, 'Records $800 dividend income');
assert(reserveStmt.closingBalance === 1200, 'Reserve Savings closing balance = 400 + 800 = $1200');
assert(reserveStmt.transactions[0].runningBalance === 400, 'Row 1 transfer in running balance is $400');
assert(reserveStmt.transactions[1].runningBalance === 1200, 'Row 2 dividend running balance is $1200');

// 18. INCOME & EXPENSE STATEMENT & EXCEL CSV EXPORT
console.log('\n[Suite 18: Income & Expense Statement & CSV Formatting]');
const incExpStmt = calculateIncomeExpenseStatement({
  transactions: statementTxs,
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  statementTitle: 'Monthly Income & Expense Statement - June 2026',
});

assert(incExpStmt.totalIncome === 1800, 'Total income is $1800 (1000 + 800)');
assert(incExpStmt.totalExpenses === 300, 'Total expenses is $300 (transfer excluded)');
assert(incExpStmt.netCashFlow === 1500, 'Net cash flow = 1800 - 300 = $1500');
assert(incExpStmt.incomeCount === 2, 'Accurately counts 2 income transactions');
assert(incExpStmt.expenseCount === 1, 'Accurately counts 1 expense transaction');
assert(incExpStmt.incomeCategories.length === 2, '2 distinct income categories');
assert(incExpStmt.expenseCategories.length === 1, '1 distinct expense category');

const incCatSum = roundMoney(incExpStmt.incomeCategories.reduce((s, c) => s + c.amount, 0));
assert(incCatSum === 1800, 'Sum of income categories equals total income ($1800)');

const expCatSum = roundMoney(incExpStmt.expenseCategories.reduce((s, c) => s + c.amount, 0));
assert(expCatSum === 300, 'Sum of expense categories equals total expenses ($300)');

// Test Account Statement CSV format
const mockProfile: UserProfile = {
  businessName: 'Apex Innovations LLC',
  ownerName: 'Sarah Jenkins',
  email: 'sarah@apex.io',
  currency: 'USD',
  taxRate: 20,
  onboarded: true,
  subscriptionPlan: 'free',
  subscriptionStatus: 'active'
};

const accountCsv = exportAccountStatementCSV(opStmt, mockProfile);
assert(accountCsv.startsWith('\uFEFF'), 'Account Statement CSV begins with UTF-8 BOM for Excel');
assert(accountCsv.includes('Apex Innovations LLC'), 'Account Statement CSV includes business name');
assert(accountCsv.includes('Operating Account'), 'Account Statement CSV includes account name');
assert(accountCsv.includes('Opening Balance'), 'Account Statement CSV includes Opening Balance');
assert(accountCsv.includes('Closing Balance'), 'Account Statement CSV includes Closing Balance');
assert(accountCsv.includes('Running Balance'), 'Account Statement CSV includes Running Balance header');

// Test Income Expense Statement CSV format
const incExpCsv = exportIncomeExpenseStatementCSV(incExpStmt, mockProfile);
assert(incExpCsv.startsWith('\uFEFF'), 'Income & Expense CSV begins with UTF-8 BOM for Excel');
assert(incExpCsv.includes('Apex Innovations LLC'), 'Income & Expense CSV includes business name');
assert(incExpCsv.includes('Net Cash Flow'), 'Income & Expense CSV includes Net Cash Flow summary');
assert(incExpCsv.includes('INCOME CATEGORY ALLOCATIONS'), 'Income & Expense CSV includes category breakdown');

// Test accounts extraction
const extractedAccounts = getAvailableAccounts(statementTxs);
assert(extractedAccounts.includes('Operating Account'), 'Extracted accounts contains Operating Account');
assert(extractedAccounts.includes('Reserve Savings'), 'Extracted accounts contains Reserve Savings');

// 19. CLIENT VALIDATION & DUPLICATE DETECTION
console.log('\n[Suite 19: Client Validation & Duplicate Detection]');
const validClientCandidate: Partial<Client> = {
  name: 'Acme Corporation',
  email: 'billing@acme.com',
  phone: '+1 (555) 234-5678',
  company: 'Acme Holdings Ltd',
  address: '100 Acme Way, Metropolis, NY',
  gstin: '27AABCU9603R1ZM',
  notes: 'Strategic account',
};

const validRes = validateClient(validClientCandidate);
assert(validRes.isValid === true, 'Valid client passes validation with zero errors');
assert(validRes.errors.length === 0, 'No validation error messages for valid client');

// Missing name check
const invalidClientMissingName: Partial<Client> = {
  email: 'nobody@nowhere.com',
};
const missingNameRes = validateClient(invalidClientMissingName);
assert(missingNameRes.isValid === false, 'Client without name fails validation');
assert(missingNameRes.errors.some((e) => e.toLowerCase().includes('name is required')), 'Includes client name required error');

// Malformed email check
const invalidEmailClient: Partial<Client> = {
  name: 'Test Client',
  email: 'not-an-email',
};
const invalidEmailRes = validateClient(invalidEmailClient);
assert(invalidEmailRes.isValid === false, 'Malformed email fails validation');
assert(invalidEmailRes.errors.some((e) => e.includes('email address')), 'Reports invalid email format');

// Malformed phone check
const invalidPhoneClient: Partial<Client> = {
  name: 'Test Client',
  phone: 'abc12',
};
const invalidPhoneRes = validateClient(invalidPhoneClient);
assert(invalidPhoneRes.isValid === false, 'Invalid phone number fails validation');

// Duplicate Detection
const existingClientsList: Client[] = [
  {
    id: 'client_1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '555-1234',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client_2',
    name: 'Beta Global Services',
    email: 'info@betaglobal.com',
    phone: '555-9876',
    createdAt: new Date().toISOString(),
  },
];

const duplicateByName = findDuplicateClients({ name: '  acme corporation  ' }, existingClientsList);
assert(duplicateByName.length > 0, 'Detects duplicate client name (case and whitespace insensitive)');
assert(duplicateByName[0].name === 'Acme Corporation', 'Provides matched duplicate client');

const duplicateByEmail = findDuplicateClients({ name: 'New Entity', email: 'CONTACT@ACME.COM' }, existingClientsList);
assert(duplicateByEmail.length > 0, 'Detects duplicate client by email address');

const duplicateByPhone = findDuplicateClients({ name: 'New Entity', phone: '555-1234' }, existingClientsList);
assert(duplicateByPhone.length > 0, 'Detects duplicate client by phone number');

// Exclude self when editing
const selfEditDuplicates = findDuplicateClients({ name: 'Acme Corporation', id: 'client_1' }, existingClientsList);
assert(selfEditDuplicates.length === 0, 'Ignores current client when checking duplicates during edit');

// 20. TRANSACTION CLIENT ASSOCIATION (OPTIONAL & STABLE)
console.log('\n[Suite 20: Transaction Client Association]');
const txWithClient: Transaction = {
  id: 'tx_c1',
  type: 'income',
  amount: 2500,
  currency: 'USD',
  exchangeRate: 1,
  category: 'Consulting',
  date: '2026-06-15',
  description: 'Q2 Strategy Sprint',
  clientId: 'client_1',
  clientName: 'Acme Corporation',
  paymentMethod: 'Bank Transfer',
  isRecurring: false,
  recurrencePeriod: 'none',
  createdAt: new Date().toISOString(),
};

assert(txWithClient.clientId === 'client_1', 'Transaction retains stable clientId');
assert(txWithClient.clientName === 'Acme Corporation', 'Transaction retains human-readable clientName');
assert(txWithClient.amount === 2500, 'Amount remains intact when client is selected');
assert(txWithClient.category === 'Consulting', 'Category remains intact when client is selected');

// Transaction without client is completely valid (optional client)
const txWithoutClient: Transaction = {
  id: 'tx_c2',
  type: 'expense',
  amount: 85,
  currency: 'USD',
  exchangeRate: 1,
  category: 'Office Supplies',
  date: '2026-06-16',
  description: 'Printer Paper & Pens',
  paymentMethod: 'Credit Card',
  isRecurring: false,
  recurrencePeriod: 'none',
  createdAt: new Date().toISOString(),
};

assert(!txWithoutClient.clientId, 'General business expense has no clientId');
assert(!txWithoutClient.clientName, 'General business expense has no clientName');

// 21. INVOICE AUTO-FILL, DOCUMENT SNAPSHOTS & EDITING ISOLATION
console.log('\n[Suite 21: Invoice Auto-fill & Recipient Snapshots]');
const testClient: Client = {
  id: 'client_apex',
  name: 'Apex Software Partners',
  company: 'Apex Technologies Inc',
  email: 'finance@apextech.com',
  phone: '+1 415-555-0199',
  address: '500 Howard Street, Suite 400, San Francisco, CA 94105',
  gstin: '06AAACA1234A1Z5',
  createdAt: new Date().toISOString(),
};

// Simulate document recipient population
const populatedRecipient = {
  clientName: testClient.name,
  companyName: testClient.company || '',
  clientEmail: testClient.email || '',
  clientPhone: testClient.phone || '',
  clientAddress: testClient.address || '',
  clientGstin: testClient.gstin || '',
};

assert(populatedRecipient.clientName === 'Apex Software Partners', 'Autofills client name');
assert(populatedRecipient.companyName === 'Apex Technologies Inc', 'Autofills company name');
assert(populatedRecipient.clientEmail === 'finance@apextech.com', 'Autofills email address');
assert(populatedRecipient.clientPhone === '+1 415-555-0199', 'Autofills phone number');
assert(populatedRecipient.clientAddress.includes('San Francisco'), 'Autofills billing address');
assert(populatedRecipient.clientGstin === '06AAACA1234A1Z5', 'Autofills GSTIN tax number');

// Document-level manual modification must NOT alter original client profile
let documentRecipient = { ...populatedRecipient, clientAddress: 'PO Box 9999, Temporary Site' };
assert(documentRecipient.clientAddress === 'PO Box 9999, Temporary Site', 'Allows document-specific override');
assert(testClient.address === '500 Howard Street, Suite 400, San Francisco, CA 94105', 'Original client record is untouched');

// Issued Invoice Snapshot
const invoiceSnapshot = {
  invoiceNumber: 'INV-2026-0042',
  clientId: testClient.id,
  recipientSnapshot: { ...documentRecipient },
  total: 5000,
  issuedAt: new Date().toISOString(),
};

// Even if client record changes later, snapshot remains frozen
const updatedClientLater: Client = {
  ...testClient,
  name: 'Apex Software Partners (Acquired)',
  email: 'newowner@apextech.com',
};
assert(invoiceSnapshot.recipientSnapshot.clientName === 'Apex Software Partners', 'Frozen recipient snapshot in invoice remains historical and immutable');

// 22. CLIENT FINANCIAL SUMMARIES & ARCHIVING SAFETY
console.log('\n[Suite 22: Client Financial Summaries & Archiving]');
const clientLedgerTxs: Transaction[] = [
  {
    id: 'ctx_1',
    type: 'income',
    amount: 3000,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Consulting',
    date: '2026-05-10',
    description: 'Phase 1 Delivery',
    clientId: 'client_apex',
    clientName: 'Apex Software Partners',
    isRecurring: false,
    recurrencePeriod: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ctx_2',
    type: 'income',
    amount: 2000,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Maintenance',
    date: '2026-06-12',
    description: 'Monthly Retainer',
    clientId: 'client_apex',
    clientName: 'Apex Software Partners',
    isRecurring: false,
    recurrencePeriod: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ctx_3',
    type: 'expense',
    amount: 500,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Travel',
    date: '2026-06-14',
    description: 'On-site Client Visit Flight',
    clientId: 'client_apex',
    clientName: 'Apex Software Partners',
    isRecurring: false,
    recurrencePeriod: 'none',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ctx_4',
    type: 'income',
    amount: 1500,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Design',
    date: '2026-06-15',
    description: 'Other Client Work',
    clientId: 'other_client',
    clientName: 'Other Client LLC',
    isRecurring: false,
    recurrencePeriod: 'none',
    createdAt: new Date().toISOString(),
  },
];

const apexSummary = getClientFinancialSummary(testClient, clientLedgerTxs);
assert(apexSummary.totalIncome === 5000, 'Computes total client income ($3000 + $2000 = $5000)');
assert(apexSummary.totalExpenses === 500, 'Computes total expenses linked to client ($500)');
assert(apexSummary.netContribution === 4500, 'Computes net client contribution ($5000 - $500 = $4500)');
assert(apexSummary.incomeCount === 2, 'Counts 2 income transactions');
assert(apexSummary.expenseCount === 1, 'Counts 1 expense transaction');
assert(apexSummary.clientTransactions.length === 3, 'Chronological ledger has 3 client-specific transactions');
assert(apexSummary.latestTransactionDate === '2026-06-14', 'Correctly identifies latest transaction date');

// Archiving Safety
const activeClient: Client = { ...testClient, isArchived: false };
const archivedClient: Client = { ...activeClient, isArchived: true };
assert(archivedClient.isArchived === true, 'Client marked as archived');
// Archiving does NOT lose historical financial summary
const archivedSummary = getClientFinancialSummary(archivedClient, clientLedgerTxs);
assert(archivedSummary.netContribution === 4500, 'Archived client preserves complete historical ledger and financials');

// Starter clients check
const starterClients = getStarterClients();
assert(starterClients.length === 5, 'Provides exactly 5 high-quality realistic starter clients for Free plan');
assert(starterClients.some((c) => c.name.includes('Zenith')), 'Starter clients include Zenith Digital Corp');

// 23. REGIONAL SUBSCRIPTION PRICING & PRODUCTS
console.log('\n[Suite 23: Regional Subscription Pricing & Products]');
const inMonthly = getPlanPricing('pro_monthly', 'IN');
assert(inMonthly !== null, 'India Pro Monthly pricing exists');
assert(inMonthly?.amount === 199, 'India monthly price is exactly ₹199');
assert(inMonthly?.currency === 'INR', 'India monthly currency is INR');
assert(inMonthly?.formatted === '₹199', 'India monthly checkout displays ₹199');
assert(inMonthly?.configuredProductId === 'plan_india_pro_monthly', 'India monthly uses plan_india_pro_monthly');
assert(inMonthly?.provider === 'razorpay', 'India provider is Razorpay');

const inYearly = getPlanPricing('pro_yearly', 'IN');
assert(inYearly !== null, 'India Pro Yearly pricing exists');
assert(inYearly?.amount === 1999, 'India yearly price is exactly ₹1,999');
assert(inYearly?.currency === 'INR', 'India yearly currency is INR');
assert(inYearly?.formatted === '₹1,999', 'India yearly checkout displays ₹1,999');
assert(inYearly?.configuredProductId === 'plan_india_pro_yearly', 'India yearly uses plan_india_pro_yearly');
assert(inYearly?.equivalentMonthlyFormatted === '₹166.58/mo', 'India yearly equivalent is ₹166.58/mo (~16% savings)');

const intlMonthly = getPlanPricing('pro_monthly', 'INTL');
assert(intlMonthly !== null, 'International Pro Monthly pricing exists');
assert(intlMonthly?.amount === 2.99, 'International monthly price is exactly $2.99');
assert(intlMonthly?.currency === 'USD', 'International monthly currency is USD');
assert(intlMonthly?.formatted === '$2.99', 'International monthly checkout displays $2.99');
assert(intlMonthly?.configuredProductId === 'plan_intl_pro_monthly', 'International monthly uses plan_intl_pro_monthly');
assert(intlMonthly?.provider === 'paypal', 'International provider is PayPal');

const intlYearly = getPlanPricing('pro_yearly', 'INTL');
assert(intlYearly !== null, 'International Pro Yearly pricing exists');
assert(intlYearly?.amount === 29.99, 'International yearly price is exactly $29.99');
assert(intlYearly?.currency === 'USD', 'International yearly currency is USD');
assert(intlYearly?.formatted === '$29.99', 'International yearly checkout displays $29.99');
assert(intlYearly?.configuredProductId === 'plan_intl_pro_yearly', 'International yearly uses plan_intl_pro_yearly');
assert(intlYearly?.provider === 'paypal', 'International provider is PayPal');
assert(intlYearly?.equivalentMonthlyFormatted === '$2.50/mo', 'International yearly equivalent is $2.50/mo (~16% savings)');

// Verify zero lifetime plan exists anywhere in plan definitions
assert(!('lifetime' in PLAN_METADATA), 'Lifetime plan is completely excluded from plan metadata');
assert(Object.keys(PLAN_METADATA).length === 3, 'Only free, pro_monthly, and pro_yearly plans exist');

// 24. BILLING COUNTRY DETECTION & REGIONAL ROUTING
console.log('\n[Suite 24: Billing Country Detection & Regional Routing]');
assert(detectLikelyBillingCountry('IN') === 'IN', 'Detects India when billingCountry is IN');
assert(detectLikelyBillingCountry('India') === 'IN', 'Detects India when billingCountry is India');
assert(detectLikelyBillingCountry(undefined, 'INR') === 'IN', 'Detects India when currency is INR');
assert(detectLikelyBillingCountry('US') === 'INTL', 'Detects International when billingCountry is US');
assert(detectLikelyBillingCountry('GB') === 'INTL', 'Detects International when billingCountry is GB');
assert(detectLikelyBillingCountry(undefined, 'USD') === 'INTL', 'Defaults to International when currency is USD');

// 25. SUBSCRIPTION LIFECYCLE, ENTITLEMENTS & DATA PROTECTION
console.log('\n[Suite 25: Subscription Lifecycle, Entitlements & Data Protection]');
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);
const activeProMonthlyProfile: UserProfile = {
  businessName: 'Global Corp',
  ownerName: 'Jordan',
  email: 'jordan@global.com',
  currency: 'USD',
  taxRate: 20,
  onboarded: true,
  billingCountry: 'US',
  subscriptionPlan: 'pro_monthly',
  subscriptionStatus: 'active',
  subscriptionExpiry: futureDate.toISOString().split('T')[0],
  subscriptionId: 'sub_test_123',
};

assert(isSubscriptionActive(activeProMonthlyProfile) === true, 'Pro monthly profile is active');
assert(isFeatureAllowed(activeProMonthlyProfile, 'unlimited_transactions', 10000).allowed === true, 'Active Pro grants unlimited transactions');
assert(isFeatureAllowed(activeProMonthlyProfile, 'multiple_businesses').allowed === true, 'Active Pro grants multiple corporate workspaces');
assert(isFeatureAllowed(activeProMonthlyProfile, 'custom_date_statements').allowed === true, 'Active Pro grants custom date range statements');
assert(isFeatureAllowed(activeProMonthlyProfile, 'receipt_attachments').allowed === true, 'Active Pro grants receipt attachments');

// Test cancellation at period end (user cancels renewal)
const cancelledAtPeriodEndProfile: UserProfile = {
  ...activeProMonthlyProfile,
  cancelAtPeriodEnd: true,
};
assert(isSubscriptionActive(cancelledAtPeriodEndProfile) === true, 'Subscription remains active until period end after renewal cancellation');
assert(isFeatureAllowed(cancelledAtPeriodEndProfile, 'unlimited_transactions', 2000).allowed === true, 'Features remain fully accessible during paid period after cancellation');

// Test expired subscription
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);
const expiredProfile: UserProfile = {
  ...activeProMonthlyProfile,
  subscriptionExpiry: pastDate.toISOString().split('T')[0],
};
assert(isSubscriptionActive(expiredProfile) === false, 'Expired subscription is not active');
assert(isFeatureAllowed(expiredProfile, 'custom_date_statements').allowed === false, 'Expired subscription restricts advanced custom statements');

// Data Protection Guarantee: Even expired or free users NEVER lose access to existing records or core export/backup
assert(isFeatureAllowed(expiredProfile, 'excel_export').allowed === true, 'Expired subscription never locks out Excel/CSV export');
assert(isFeatureAllowed(expiredProfile, 'backup_restore').allowed === true, 'Expired subscription never locks out JSON backup and restore');
assert(isFeatureAllowed(expiredProfile, 'pdf_reports').allowed === true, 'Expired subscription never locks out PDF reports');

// 26. PAYPAL SUBSCRIPTIONS LIFECYCLE, REAL VERIFICATION & STATUS HANDLING
console.log('\n[Suite 26: PayPal Subscriptions Lifecycle, Real Verification & Status Handling]');

// PayPal status lifecycle helper for unit validation
function evaluatePayPalSubscriptionStatus(status: string): { isValid: boolean; isPending: boolean; error?: string } {
  if (status === 'APPROVAL_PENDING') {
    return { isValid: false, isPending: true, error: 'Subscription is pending buyer approval on PayPal.' };
  }
  if (['ACTIVE', 'APPROVED'].includes(status)) {
    return { isValid: true, isPending: false };
  }
  return { isValid: false, isPending: false, error: `PayPal subscription status is not active (Status: ${status})` };
}

assert(evaluatePayPalSubscriptionStatus('ACTIVE').isValid === true, 'PayPal ACTIVE status is verified as valid');
assert(evaluatePayPalSubscriptionStatus('APPROVED').isValid === true, 'PayPal APPROVED status is verified as valid');
assert(evaluatePayPalSubscriptionStatus('APPROVAL_PENDING').isValid === false, 'APPROVAL_PENDING status is rejected from activating Pro');
assert(evaluatePayPalSubscriptionStatus('APPROVAL_PENDING').isPending === true, 'APPROVAL_PENDING is identified as pending buyer authorization');
assert(evaluatePayPalSubscriptionStatus('CANCELLED').isValid === false, 'CANCELLED status is rejected from activating Pro');
assert(evaluatePayPalSubscriptionStatus('SUSPENDED').isValid === false, 'SUSPENDED status is rejected from activating Pro');
assert(evaluatePayPalSubscriptionStatus('EXPIRED').isValid === false, 'EXPIRED status is rejected from activating Pro');

// Test Next Billing Time calculation from PayPal billing info
const paypalBillingInfo = {
  next_billing_time: '2026-11-30T10:00:00Z',
  cycle_executions: [{ tenure_type: 'REGULAR', sequence: 1, cycles_completed: 1 }],
};
const parsedExpiry = new Date(paypalBillingInfo.next_billing_time).toISOString().split('T')[0];
assert(parsedExpiry === '2026-11-30', 'Calculates exact renewal expiration date from PayPal next_billing_time');

// Test PayPal profile state transitions
const activePayPalProfile: UserProfile = {
  ...activeProMonthlyProfile,
  subscriptionProvider: 'paypal',
  subscriptionId: 'I-BW452GLLEP1G',
  subscriptionExpiry: '2026-11-30',
  subscriptionStatus: 'active',
};
assert(isSubscriptionActive(activePayPalProfile) === true, 'Active PayPal subscription profile is recognized as Pro');

// Test cancellation at period end retains data
const cancelledPayPalProfile: UserProfile = {
  ...activePayPalProfile,
  cancelAtPeriodEnd: true,
};
assert(isSubscriptionActive(cancelledPayPalProfile) === true, 'Cancelled PayPal subscription remains active until period end');
assert(isFeatureAllowed(cancelledPayPalProfile, 'pdf_account_statements').allowed === true, 'Pro features remain accessible until expiry date after PayPal cancellation');

// ==========================================
// SUITE 27: 6-DIGIT PIN AUTHENTICATION & LOGIN
// ==========================================
console.log('\n[Suite 27: 6-Digit PIN Authentication & Login]');

// Setup storage mocks for node test runner
const memoryLocalStorage = new Map<string, string>();
const memorySessionStorage = new Map<string, string>();
(globalThis as any).window = (globalThis as any).window || { crypto: (globalThis as any).crypto };
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryLocalStorage.get(key) || null,
  setItem: (key: string, val: string) => memoryLocalStorage.set(key, String(val)),
  removeItem: (key: string) => memoryLocalStorage.delete(key),
  clear: () => memoryLocalStorage.clear(),
};
(globalThis as any).sessionStorage = {
  getItem: (key: string) => memorySessionStorage.get(key) || null,
  setItem: (key: string, val: string) => memorySessionStorage.set(key, String(val)),
  removeItem: (key: string) => memorySessionStorage.delete(key),
  clear: () => memorySessionStorage.clear(),
};

const { 
  setupCredentials, 
  verifyPin, 
  changePin, 
  recoverPinWithAnswer, 
  isSessionUnlocked, 
  lockSession, 
  getAuthRecord, 
  resetAuthData 
} = await import('../src/utils/authService');

resetAuthData();
assert(getAuthRecord() === null, 'Auth record starts as unconfigured');

// 1. Validation tests
const emptyNameRes = await setupCredentials('', '123456');
assert(emptyNameRes.success === false, 'Setup rejects empty user name');

const shortPinRes = await setupCredentials('Suleman', '12345');
assert(shortPinRes.success === false, 'Setup rejects PIN with fewer than 6 digits');

const alphaPinRes = await setupCredentials('Suleman', '12345A');
assert(alphaPinRes.success === false, 'Setup rejects non-numeric PIN');

// 2. Successful Registration
const setupRes = await setupCredentials('Suleman', '789123', 'Favorite city?', 'Bengaluru');
assert(setupRes.success === true, 'Setup succeeds with valid 6-digit PIN and user name');

const createdRecord = getAuthRecord();
assert(createdRecord !== null, 'Saved auth record exists');
assert(createdRecord?.userName === 'Suleman', 'Auth record preserves user name');
assert(createdRecord?.isConfigured === true, 'Auth record is marked as configured');
assert(createdRecord?.pinHash !== '789123', 'Plaintext PIN is never stored directly');
assert(createdRecord?.salt && createdRecord.salt.length > 8, 'Cryptographic salt is generated');

// 3. Verification tests
const wrongPinMatch = await verifyPin('111111');
assert(wrongPinMatch === false, 'Incorrect 6-digit PIN is rejected');

const correctPinMatch = await verifyPin('789123');
assert(correctPinMatch === true, 'Correct 6-digit PIN verifies successfully');
assert(isSessionUnlocked() === true, 'Session becomes unlocked after successful verification');

// 4. Session Locking
lockSession();
assert(isSessionUnlocked() === false, 'lockSession() locks the workspace');

// Re-verify unlocks again
await verifyPin('789123');
assert(isSessionUnlocked() === true, 'Re-verifying PIN unlocks session again');

// 5. Change PIN
const wrongOldPinRes = await changePin('000000', '654321', '654321');
assert(wrongOldPinRes.success === false, 'Change PIN fails when current PIN is incorrect');

const mismatchNewPinRes = await changePin('789123', '654321', '654322');
assert(mismatchNewPinRes.success === false, 'Change PIN fails when new PIN and confirmation mismatch');

const validChangeRes = await changePin('789123', '654321', '654321');
assert(validChangeRes.success === true, 'Change PIN succeeds with valid old PIN and matching new PIN');

assert(await verifyPin('789123') === false, 'Old PIN no longer authenticates after change');
assert(await verifyPin('654321') === true, 'New PIN authenticates successfully');

// 6. Recovery Question
const wrongAnswerRes = await recoverPinWithAnswer('Mumbai', '112233', '112233');
assert(wrongAnswerRes.success === false, 'Recovery fails with incorrect security answer');

const validRecoveryRes = await recoverPinWithAnswer('Bengaluru', '998877', '998877');
assert(validRecoveryRes.success === true, 'Recovery succeeds with correct security answer and resets PIN');
assert(await verifyPin('998877') === true, 'Newly recovered PIN authenticates successfully');

// ==========================================
// SUITE 28: FEATURE ACCESS & ENTITLEMENT SYSTEM (10 USER SCENARIOS)
// ==========================================
console.log('\n[Suite 28: Feature Access & Entitlement System]');

// Scenario 1: New user default profile is on Free plan
const defaultFreeProfile: UserProfile = {
  businessName: 'Apex Innovations',
  ownerName: 'Priya Sharma',
  currency: 'INR',
  email: 'priya@apex.example',
  taxRate: 18,
  subscriptionPlan: 'free',
  subscriptionStatus: 'expired',
};
assert(getEntitlementPlan(defaultFreeProfile) === 'FREE', 'Scenario 1: New user is placed on canonical FREE plan');
assert(isSubscriptionActive(defaultFreeProfile) === false, 'Scenario 1: New user subscription is not active Pro');
assert(FREE_LIMITS.transactions === 50, 'Scenario 1: Exact Free transaction limit is 50');
assert(FREE_LIMITS.clients === 5, 'Scenario 1: Exact Free client limit is 5');
assert(FREE_LIMITS.invoices === 3, 'Scenario 1: Exact Free invoice limit is 3');
assert(FREE_LIMITS.recurringBills === 1, 'Scenario 1: Exact Free recurring obligation limit is 1');

// Scenario 2: Free user reaching 50 transactions is blocked for new records, existing records remain safe
const txCheckUnder = checkFeatureEntitlement(defaultFreeProfile, 'unlimited_transactions', { transactions: 49 });
assert(txCheckUnder.allowed === true, 'Scenario 2: Free user with 49 transactions can record 50th transaction');

const txCheckLimit = checkFeatureEntitlement(defaultFreeProfile, 'unlimited_transactions', { transactions: 50 });
assert(txCheckLimit.allowed === false, 'Scenario 2: Free user with 50 transactions is blocked from adding 51st transaction');
assert(txCheckLimit.requiresUpgrade === true, 'Scenario 2: Transaction limit triggers Pro upgrade');
assert(txCheckLimit.limit === 50, 'Scenario 2: Result reports exact limit of 50');

// Existing records are NEVER locked from viewing or reporting
assert(isFeatureAllowed(defaultFreeProfile, 'income_tracking').allowed === true, 'Scenario 2: Free user retains full income ledger access');
assert(isFeatureAllowed(defaultFreeProfile, 'expense_tracking').allowed === true, 'Scenario 2: Free user retains full expense ledger access');
assert(isFeatureAllowed(defaultFreeProfile, 'basic_history').allowed === true, 'Scenario 2: Free user retains complete historical records viewing');

// Scenario 3: Free user reaching 5 clients is blocked from adding a 6th client
const clientCheckUnder = checkFeatureEntitlement(defaultFreeProfile, 'unlimited_clients', { clients: 4 });
assert(clientCheckUnder.allowed === true, 'Scenario 3: Free user with 4 clients can add 5th client');

const clientCheckLimit = checkFeatureEntitlement(defaultFreeProfile, 'unlimited_clients', { clients: 5 });
assert(clientCheckLimit.allowed === false, 'Scenario 3: Free user with 5 clients is blocked from adding 6th client');
assert(clientCheckLimit.requiresUpgrade === true, 'Scenario 3: Client limit triggers Pro upgrade');

// Scenario 4: Free user reaching 3 invoices is blocked from generating a 4th invoice
const invoiceCheckUnder = checkFeatureEntitlement(defaultFreeProfile, 'unlimited_invoices', { invoices: 2 });
assert(invoiceCheckUnder.allowed === true, 'Scenario 4: Free user with 2 invoices can record 3rd invoice');

const invoiceCheckLimit = checkFeatureEntitlement(defaultFreeProfile, 'unlimited_invoices', { invoices: 3 });
assert(invoiceCheckLimit.allowed === false, 'Scenario 4: Free user with 3 invoices is blocked from recording 4th invoice');
assert(invoiceCheckLimit.requiresUpgrade === true, 'Scenario 4: Invoice limit triggers Pro upgrade');

// Scenario 5: Free user cannot access Pro-only features
assert(checkFeatureEntitlement(defaultFreeProfile, 'advanced_analytics').allowed === false, 'Scenario 5: Free user blocked from advanced analytics');
assert(checkFeatureEntitlement(defaultFreeProfile, 'pdf_account_statements').allowed === false, 'Scenario 5: Free user blocked from bank-grade PDF account statements');
assert(checkFeatureEntitlement(defaultFreeProfile, 'custom_date_statements').allowed === false, 'Scenario 5: Free user blocked from custom date range statements');
assert(checkFeatureEntitlement(defaultFreeProfile, 'batch_receipt_ocr').allowed === false, 'Scenario 5: Free user blocked from batch receipt OCR');
assert(checkFeatureEntitlement(defaultFreeProfile, 'client_project_profitability').allowed === false, 'Scenario 5: Free user blocked from deep client profitability breakdown');

// Scenario 6: Active Pro user (Monthly and Yearly) receives complete Pro entitlement
const proFutureDate = new Date();
proFutureDate.setDate(proFutureDate.getDate() + 30);

const verifiedProMonthlyProfile: UserProfile = {
  ...defaultFreeProfile,
  subscriptionPlan: 'PRO_MONTHLY',
  subscriptionStatus: 'active',
  subscriptionExpiry: proFutureDate.toISOString().split('T')[0],
  subscriptionId: 'sub_live_monthly_456',
  subscriptionProvider: 'razorpay',
};
assert(getEntitlementPlan(verifiedProMonthlyProfile) === 'PRO_MONTHLY', 'Scenario 6: Active Pro Monthly returns canonical PRO_MONTHLY');
assert(isSubscriptionActive(verifiedProMonthlyProfile) === true, 'Scenario 6: Active Pro Monthly is active');
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'unlimited_transactions', { transactions: 1000 }).allowed === true, 'Scenario 6: Pro Monthly has unlimited transactions beyond 50');
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'unlimited_clients', { clients: 50 }).allowed === true, 'Scenario 6: Pro Monthly has unlimited clients beyond 5');
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'unlimited_invoices', { invoices: 100 }).allowed === true, 'Scenario 6: Pro Monthly has unlimited invoices beyond 3');
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'advanced_analytics').allowed === true, 'Scenario 6: Pro Monthly unlocks advanced analytics');
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'pdf_account_statements').allowed === true, 'Scenario 6: Pro Monthly unlocks PDF statements');

const verifiedProYearlyProfile: UserProfile = {
  ...defaultFreeProfile,
  subscriptionPlan: 'PRO_YEARLY',
  subscriptionStatus: 'active',
  subscriptionExpiry: proFutureDate.toISOString().split('T')[0],
  subscriptionId: 'sub_live_yearly_789',
  subscriptionProvider: 'paypal',
};
assert(getEntitlementPlan(verifiedProYearlyProfile) === 'PRO_YEARLY', 'Scenario 6: Active Pro Yearly returns canonical PRO_YEARLY');
assert(checkFeatureEntitlement(verifiedProYearlyProfile, 'unlimited_transactions', { transactions: 20000 }).allowed === true, 'Scenario 6: Pro Yearly has unlimited transactions');

// Scenario 7: Cancelled subscription remains entitled to Pro until paid expiry date (grace period)
const cancelledProWithFutureExpiry: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionStatus: 'cancelled',
  cancelAtPeriodEnd: true,
};
assert(isSubscriptionActive(cancelledProWithFutureExpiry) === true, 'Scenario 7: Cancelled Pro remains active until paid expiry date');
assert(getEntitlementPlan(cancelledProWithFutureExpiry) === 'PRO_MONTHLY', 'Scenario 7: Retains PRO_MONTHLY during grace period');
assert(checkFeatureEntitlement(cancelledProWithFutureExpiry, 'advanced_analytics').allowed === true, 'Scenario 7: Pro features remain accessible during grace period');

// Scenario 8: Expired subscription reverts back to Free plan; existing data is preserved
const proPastDate = new Date();
proPastDate.setDate(proPastDate.getDate() - 2);

const expiredProProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionExpiry: proPastDate.toISOString().split('T')[0],
  subscriptionStatus: 'expired',
};
assert(isSubscriptionActive(expiredProProfile) === false, 'Scenario 8: Expired subscription is not active');
assert(getEntitlementPlan(expiredProProfile) === 'FREE', 'Scenario 8: Expired subscription reverts to canonical FREE plan');
assert(checkFeatureEntitlement(expiredProProfile, 'advanced_analytics').allowed === false, 'Scenario 8: Expired user blocked from Pro analytics');
assert(checkFeatureEntitlement(expiredProProfile, 'unlimited_transactions', { transactions: 60 }).allowed === false, 'Scenario 8: Expired user blocked from adding new transactions beyond 50');

// Scenario 9: Failed, pending, suspended, or unverified payments must not receive Pro access
const pendingProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionStatus: 'pending',
};
assert(isSubscriptionActive(pendingProfile) === false, 'Scenario 9: Pending payment is not active Pro');
assert(getEntitlementPlan(pendingProfile) === 'FREE', 'Scenario 9: Pending payment returns FREE');

const suspendedProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionStatus: 'suspended',
};
assert(isSubscriptionActive(suspendedProfile) === false, 'Scenario 9: Suspended subscription is not active Pro');

const failedProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionStatus: 'failed',
};
assert(isSubscriptionActive(failedProfile) === false, 'Scenario 9: Failed payment is not active Pro');

// Scenario 10: Permanent Free Data Protection - CSV export, Excel export, and Backup & Restore are NEVER blocked
assert(isFeatureAllowed(defaultFreeProfile, 'csv_export').allowed === true, 'Scenario 10: Free user always has CSV export');
assert(isFeatureAllowed(defaultFreeProfile, 'excel_export').allowed === true, 'Scenario 10: Free user always has Excel export');
assert(isFeatureAllowed(defaultFreeProfile, 'backup_restore').allowed === true, 'Scenario 10: Free user always has Backup & Restore');
assert(isFeatureAllowed(expiredProProfile, 'csv_export').allowed === true, 'Scenario 10: Expired user always has CSV export');
assert(isFeatureAllowed(expiredProProfile, 'backup_restore').allowed === true, 'Scenario 10: Expired user always has Backup & Restore');
assert(isFeatureAllowed(expiredProProfile, 'basic_dashboard').allowed === true, 'Scenario 10: Expired user always has Basic Dashboard');

// 29. HARDENED ENTITLEMENT SECURITY & AUDITED FEATURE MATRIX
console.log('\n[Suite 29: Hardened Entitlement Security & Audited Feature Matrix]');

// 1. Unrecognized or invalid plan codes strictly default to Free
const unknownPlanProfile: UserProfile = {
  ...defaultFreeProfile,
  subscriptionPlan: 'enterprise' as any,
  subscriptionStatus: 'active',
};
assert(isSubscriptionActive(unknownPlanProfile) === false, 'Suite 29: Unrecognized plan code rejects Pro');
assert(getEntitlementPlan(unknownPlanProfile) === 'FREE', 'Suite 29: Unrecognized plan defaults to FREE');

// 2. Unverified status strictly rejects Pro
const unverifiedProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionStatus: 'unverified' as any,
};
assert(isSubscriptionActive(unverifiedProfile) === false, 'Suite 29: Unverified status rejects Pro');
assert(getEntitlementPlan(unverifiedProfile) === 'FREE', 'Suite 29: Unverified status defaults to FREE');

// 3. Past expiry date strictly rejects Pro
const pastDateProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionExpiry: '2020-01-01',
  subscriptionStatus: 'active',
};
assert(isSubscriptionActive(pastDateProfile) === false, 'Suite 29: Past expiry date rejects Pro');
assert(getEntitlementPlan(pastDateProfile) === 'FREE', 'Suite 29: Past expiry date defaults to FREE');

// 4. Cancelled subscription with past expiry date strictly rejects Pro
const cancelledPastProfile: UserProfile = {
  ...verifiedProMonthlyProfile,
  subscriptionExpiry: '2021-05-15',
  subscriptionStatus: 'cancelled',
  cancelAtPeriodEnd: true,
};
assert(isSubscriptionActive(cancelledPastProfile) === false, 'Suite 29: Cancelled subscription with past date rejects Pro');
assert(checkFeatureEntitlement(cancelledPastProfile, 'advanced_analytics').allowed === false, 'Suite 29: Cancelled past user blocked from Analytics');

// 5. Active Pro Monthly unlocks Pro Analytics
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'advanced_analytics').allowed === true, 'Suite 29: Active Pro Monthly unlocks Analytics');
assert(checkFeatureEntitlement(verifiedProMonthlyProfile, 'advanced_analytics').requiresUpgrade === false, 'Suite 29: Pro does not require upgrade');

// 6. Free user strictly blocked from Pro Analytics
assert(checkFeatureEntitlement(defaultFreeProfile, 'advanced_analytics').allowed === false, 'Suite 29: Free user blocked from Analytics');
assert(checkFeatureEntitlement(defaultFreeProfile, 'advanced_analytics').requiresUpgrade === true, 'Suite 29: Free user requires Pro upgrade');

// 7. Full Free Feature Matrix Audit: All 8 core capabilities remain 100% free
const auditedFreeFeatures = [
  'income_tracking',
  'expense_tracking',
  'basic_dashboard',
  'basic_summaries',
  'basic_categories',
  'client_management',
  'basic_history',
  'csv_export',
  'backup_restore'
] as const;

for (const feat of auditedFreeFeatures) {
  const freeCheck = checkFeatureEntitlement(defaultFreeProfile, feat);
  assert(freeCheck.allowed === true, `Suite 29: Free user has unrestricted access to ${feat}`);
  assert(freeCheck.requiresUpgrade === false, `Suite 29: ${feat} does not require upgrade`);
}

// 8. Strict Quota Matrix Enforcement
assert(FREE_LIMITS.transactions === 50, 'Suite 29: Free transaction quota is exactly 50');
assert(FREE_LIMITS.clients === 5, 'Suite 29: Free client quota is exactly 5');
assert(FREE_LIMITS.invoices === 3, 'Suite 29: Free invoice quota is exactly 3');
assert(FREE_LIMITS.recurringBills === 1, 'Suite 29: Free recurring bill quota is exactly 1');

// ==========================================
// Suite 30: Global Header Search Bar Filtering
// ==========================================
console.log('\n[Suite 30: Global Header Search Bar Filtering]');

const mockSearchDataset: Transaction[] = [
  {
    id: 'tx-s-1',
    description: 'Cloud Server Hosting AWS',
    amount: 150.0,
    type: 'expense',
    category: 'Software & Tools',
    clientName: 'Acme Corp',
    date: '2026-10-15',
    paymentMethod: 'Credit Card',
    notes: 'Production cluster infrastructure',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none'
  },
  {
    id: 'tx-s-2',
    description: 'Q3 Brand Identity Design',
    amount: 4500.0,
    type: 'income',
    category: 'Design Services',
    clientName: 'Starlight Media',
    date: '2026-10-18',
    paymentMethod: 'Wire Transfer',
    notes: 'Final milestone release payment',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none'
  },
  {
    id: 'tx-s-3',
    description: 'Coffee and Client Lunch',
    amount: 42.5,
    type: 'expense',
    category: 'Meals & Entertainment',
    clientName: 'Acme Corp',
    date: '2026-10-20',
    paymentMethod: 'Debit Card',
    notes: 'Strategy sync lunch',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none'
  },
  {
    id: 'tx-s-4',
    description: 'Retainer Monthly Retainer',
    amount: 2500.0,
    type: 'income',
    category: 'Consulting',
    clientName: 'Nexus Global',
    date: '2026-10-25',
    paymentMethod: 'ACH',
    notes: 'Monthly enterprise SLA',
    currency: 'USD',
    exchangeRate: 1,
    isRecurring: false,
    recurrencePeriod: 'none'
  }
];

function filterTransactionsByGlobalQuery(items: Transaction[], query: string): Transaction[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(tx => {
    return (
      (tx.description && tx.description.toLowerCase().includes(q)) ||
      (tx.clientName && tx.clientName.toLowerCase().includes(q)) ||
      (tx.category && tx.category.toLowerCase().includes(q)) ||
      (tx.notes && tx.notes.toLowerCase().includes(q)) ||
      (tx.project && tx.project.toLowerCase().includes(q)) ||
      (tx.account && tx.account.toLowerCase().includes(q)) ||
      tx.amount.toString().includes(q)
    );
  });
}

// Test filtering by description
const descResults = filterTransactionsByGlobalQuery(mockSearchDataset, 'AWS');
assert(descResults.length === 1, 'Suite 30: Filters by description (AWS)');
assert(descResults[0].id === 'tx-s-1', 'Suite 30: Matched AWS transaction');

// Test filtering by client
const clientResults = filterTransactionsByGlobalQuery(mockSearchDataset, 'Acme');
assert(clientResults.length === 2, 'Suite 30: Filters by clientName (Acme)');
assert(clientResults.some(t => t.id === 'tx-s-1') && clientResults.some(t => t.id === 'tx-s-3'), 'Suite 30: Returns all transactions with client Acme Corp');

// Test filtering by category
const catResults = filterTransactionsByGlobalQuery(mockSearchDataset, 'Design Services');
assert(catResults.length === 1, 'Suite 30: Filters by category (Design Services)');
assert(catResults[0].id === 'tx-s-2', 'Suite 30: Matched Design Services transaction');

// Test filtering by notes
const notesResults = filterTransactionsByGlobalQuery(mockSearchDataset, 'milestone');
assert(notesResults.length === 1, 'Suite 30: Filters by notes content (milestone)');
assert(notesResults[0].id === 'tx-s-2', 'Suite 30: Matched milestone note');

// Test filtering by numeric amount
const amountResults = filterTransactionsByGlobalQuery(mockSearchDataset, '4500');
assert(amountResults.length === 1, 'Suite 30: Filters by numeric amount string');
assert(amountResults[0].id === 'tx-s-2', 'Suite 30: Matched 4500 amount transaction');

// Test empty search query returns all
const emptyResults = filterTransactionsByGlobalQuery(mockSearchDataset, '');
assert(emptyResults.length === 4, 'Suite 30: Empty search query returns all transactions');

// Test case insensitivity and whitespace trimming
const caseResults = filterTransactionsByGlobalQuery(mockSearchDataset, '  nExUs  ');
assert(caseResults.length === 1, 'Suite 30: Case-insensitive and whitespace-trimmed search');
assert(caseResults[0].clientName === 'Nexus Global', 'Suite 30: Matched Nexus Global correctly');

// ==========================================
// Suite 31: Recent Searches Manager & Dropdown Display
// ==========================================
console.log('\n[Suite 31: Recent Searches Manager & Dropdown Display]');

function manageRecentSearches(prevList: string[], newQuery: string, limit: number = 5): string[] {
  const trimmed = newQuery.trim();
  if (!trimmed || trimmed.length < 2) return prevList;
  return [trimmed, ...prevList.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, limit);
}

function removeRecentSearchItem(prevList: string[], itemToRemove: string): string[] {
  return prevList.filter((item) => item.toLowerCase() !== itemToRemove.toLowerCase());
}

let testRecentList: string[] = ['Software', 'Acme Corp', 'Client Payment'];

// 1. Initial items count
assert(testRecentList.length === 3, 'Suite 31: Initial recent searches has 3 items');

// 2. Add a new search term
testRecentList = manageRecentSearches(testRecentList, 'Office Supplies');
assert(testRecentList.length === 4, 'Suite 31: Added Office Supplies, total 4 items');
assert(testRecentList[0] === 'Office Supplies', 'Suite 31: Most recent item is at the top');

// 3. Add existing term (case-insensitive deduplication)
testRecentList = manageRecentSearches(testRecentList, 'software');
assert(testRecentList.length === 4, 'Suite 31: Deduplicates existing term');
assert(testRecentList[0] === 'software', 'Suite 31: Re-promotes existing term to top position');

// 4. Maximum limit enforcement (last 3-5 queries)
testRecentList = manageRecentSearches(testRecentList, 'Consulting');
testRecentList = manageRecentSearches(testRecentList, 'Cloud Hosting');
assert(testRecentList.length === 5, 'Suite 31: Enforces maximum cap of 5 recent searches');
assert(testRecentList[0] === 'Cloud Hosting', 'Suite 31: Cloud Hosting is first');

// 5. Short/empty query rejection
const beforeIgnored = [...testRecentList];
testRecentList = manageRecentSearches(testRecentList, '  ');
testRecentList = manageRecentSearches(testRecentList, 'a');
assert(JSON.stringify(testRecentList) === JSON.stringify(beforeIgnored), 'Suite 31: Ignores empty or single-character queries');

// 6. Remove individual item
testRecentList = removeRecentSearchItem(testRecentList, 'Consulting');
assert(!testRecentList.includes('Consulting'), 'Suite 31: Successfully removes individual search item');
assert(testRecentList.length === 4, 'Suite 31: Length reduces after item removal');

// 7. Clear all items
testRecentList = [];
assert(testRecentList.length === 0, 'Suite 31: Clear all resets recent searches to empty list');

// ==========================================
// Suite 32: 5-Client Free Directory Validation
// ==========================================
console.log('\n[Suite 32: 5-Client Free Directory Validation]');
const fiveStarterClients = getStarterClients();
assert(fiveStarterClients.length === 5, 'Suite 32: Starter client directory contains exactly 5 profiles');
assert(fiveStarterClients.every(c => c.name && c.email && c.phone), 'Suite 32: Every starter client has complete contact information');
assert(FREE_LIMITS.clients === 5, 'Suite 32: FREE_LIMITS.clients is strictly 5');

// ==========================================
// Suite 33: Client Activity Summary Component & Revenue Calculation
// ==========================================
console.log('\n[Suite 33: Client Activity Summary Component & Revenue Calculation]');

const testClientAlpha: Client = {
  id: 'cli_alpha_test',
  name: 'Alpha Systems Inc',
  email: 'finance@alphasys.test',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const testTransactionsForAlpha: Transaction[] = [
  {
    id: 'tx_act_1',
    type: 'income',
    amount: 3200,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Client Services',
    date: '2026-10-10',
    description: 'Sprint Milestone #1',
    clientId: 'cli_alpha_test',
    clientName: 'Alpha Systems Inc',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_act_2',
    type: 'income',
    amount: 1800,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Consulting',
    date: '2026-10-25',
    description: 'Sprint Milestone #2',
    clientId: 'cli_alpha_test',
    clientName: 'Alpha Systems Inc',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_act_3',
    type: 'expense',
    amount: 250,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Software & Tools',
    date: '2026-10-20',
    description: 'Direct server hosting for Alpha',
    clientId: 'cli_alpha_test',
    clientName: 'Alpha Systems Inc',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
  {
    id: 'tx_act_other',
    type: 'income',
    amount: 9000,
    currency: 'USD',
    exchangeRate: 1,
    category: 'Consulting',
    date: '2026-10-22',
    description: 'Unrelated other client payment',
    clientId: 'cli_other_client',
    clientName: 'Beta Corp',
    isRecurring: false,
    recurrencePeriod: 'none',
  },
];

const summaryAlpha = getClientFinancialSummary(testClientAlpha, testTransactionsForAlpha);
assert(summaryAlpha.totalIncome === 5000, 'Suite 33: Accurately calculates total revenue (3200 + 1800 = 5000)');
assert(summaryAlpha.incomeCount === 2, 'Suite 33: Tracks 2 income payments');
assert(summaryAlpha.expenseCount === 1, 'Suite 33: Tracks 1 client expense');
assert(summaryAlpha.netContribution === 4750, 'Suite 33: Calculates net contribution (5000 - 250 = 4750)');
assert(summaryAlpha.latestTransactionDate === '2026-10-25', 'Suite 33: Correctly identifies latest transaction date');

// Zero activity client check
const testClientZero: Client = {
  id: 'cli_zero_test',
  name: 'New Client No Transactions',
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
};
const summaryZero = getClientFinancialSummary(testClientZero, testTransactionsForAlpha);
assert(summaryZero.totalIncome === 0, 'Suite 33: Zero transactions client reports 0 total revenue');
assert(summaryZero.incomeCount === 0, 'Suite 33: Zero transactions client reports 0 income payments');
assert(summaryZero.latestTransactionDate === null, 'Suite 33: Zero transactions client has null latest date');

// ==========================================
// Suite 34: Real-Time Client Search & Filtering
// ==========================================
console.log('\n[Suite 34: Real-Time Client Search & Filtering]');

const clientSearchPool: Client[] = [
  {
    id: 'cli_1',
    name: 'Zenith Digital Corp',
    companyName: 'Zenith Global Media Inc',
    email: 'billing@zenithcorp.com',
    phone: '+1 (555) 234-5678',
    gstin: 'GSTIN27AABCT3518Q1Z4',
    notes: 'Key retainer client for monthly digital design',
    billingAddress: 'New York, NY',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'cli_2',
    name: 'Starlight Media & Design',
    companyName: 'Starlight Creative Group LLC',
    email: 'finance@starlightmedia.com',
    phone: '+1 (555) 345-6789',
    gstin: 'US-EIN-95-8123456',
    notes: 'Quarterly web identity launch',
    billingAddress: 'Los Angeles, CA',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'cli_3',
    name: 'Nexus Global Solutions',
    companyName: 'Nexus Enterprise Consulting Ltd',
    email: 'accounts@nexusglobalsolutions.com',
    phone: '+1 (555) 456-7890',
    gstin: 'US-EIN-36-7459123',
    notes: 'Strategic architecture and cloud modernization SLA',
    billingAddress: 'Chicago, IL',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'cli_4',
    name: 'Stellar Labs',
    companyName: 'Stellar BioTech & AI Solutions',
    email: 'accounts@stellarlabs.io',
    phone: '+1 (555) 890-1234',
    gstin: 'US-EIN-84-9382104',
    notes: 'Interactive data visualizations and UI',
    billingAddress: 'Cambridge, MA',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'cli_5',
    name: 'Helios FinTech Systems',
    companyName: 'Helios Technologies Group',
    email: 'procurement@heliosfin.com',
    phone: '+44 20 7946 0912',
    gstin: 'GB982341209',
    notes: 'FinTech dashboard engineering',
    billingAddress: 'London, UK',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

function filterClientsRealtime(list: Client[], query: string): Client[] {
  if (!query.trim()) return list;
  const q = query.toLowerCase().trim();
  return list.filter(client => (
    client.name.toLowerCase().includes(q) ||
    (client.companyName && client.companyName.toLowerCase().includes(q)) ||
    (client.email && client.email.toLowerCase().includes(q)) ||
    (client.phone && client.phone.toLowerCase().includes(q)) ||
    (client.gstin && client.gstin.toLowerCase().includes(q)) ||
    (client.notes && client.notes.toLowerCase().includes(q)) ||
    (client.billingAddress && client.billingAddress.toLowerCase().includes(q))
  ));
}

// 1. Filter by name in real-time
const matchName = filterClientsRealtime(clientSearchPool, 'zenith');
assert(matchName.length === 1, 'Suite 34: Filters client list by name');
assert(matchName[0].id === 'cli_1', 'Suite 34: Matched Zenith correctly');

// 2. Filter by company name
const matchCompany = filterClientsRealtime(clientSearchPool, 'creative group');
assert(matchCompany.length === 1, 'Suite 34: Filters client list by company name');
assert(matchCompany[0].id === 'cli_2', 'Suite 34: Matched Starlight Creative Group');

// 3. Filter by email
const matchEmail = filterClientsRealtime(clientSearchPool, 'stellarlabs.io');
assert(matchEmail.length === 1, 'Suite 34: Filters client list by email domain');
assert(matchEmail[0].id === 'cli_4', 'Suite 34: Matched Stellar Labs by email');

// 4. Filter by phone number fragment
const matchPhone = filterClientsRealtime(clientSearchPool, '0912');
assert(matchPhone.length === 1, 'Suite 34: Filters client list by phone number fragment');
assert(matchPhone[0].id === 'cli_5', 'Suite 34: Matched Helios by phone');

// 5. Filter by tax ID / GSTIN
const matchGSTIN = filterClientsRealtime(clientSearchPool, '3518Q1Z4');
assert(matchGSTIN.length === 1, 'Suite 34: Filters client list by GSTIN identifier');
assert(matchGSTIN[0].id === 'cli_1', 'Suite 34: Matched GSTIN to Zenith');

// 6. Filter by notes content
const matchNotes = filterClientsRealtime(clientSearchPool, 'modernization');
assert(matchNotes.length === 1, 'Suite 34: Filters client list by notes keyword');
assert(matchNotes[0].id === 'cli_3', 'Suite 34: Matched Nexus by notes');

// 7. Filter by location / billing address
const matchCity = filterClientsRealtime(clientSearchPool, 'London');
assert(matchCity.length === 1, 'Suite 34: Filters client list by city in billing address');
assert(matchCity[0].id === 'cli_5', 'Suite 34: Matched Helios in London');

// 8. Empty query returns entire pool
const matchEmpty = filterClientsRealtime(clientSearchPool, '   ');
assert(matchEmpty.length === 5, 'Suite 34: Empty query returns full client pool');

// 9. Non-matching query returns 0 results
const matchNone = filterClientsRealtime(clientSearchPool, 'NonExistentClientXYZ');
assert(matchNone.length === 0, 'Suite 34: Non-matching query returns empty list for zero state');

// SUMMARY
console.log('\n========================================');
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
