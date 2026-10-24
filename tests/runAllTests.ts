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
import { isFeatureAllowed, isSubscriptionActive } from '../src/utils/subscriptionService';
import { Transaction, RecurringBill, UserProfile } from '../src/types';

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

const freeUnder500 = isFeatureAllowed(freeProfile, 'unlimited_transactions', 350);
assert(freeUnder500.allowed === true, 'Free users can log up to 500 transactions (350 allowed)');

const freeOver500 = isFeatureAllowed(freeProfile, 'unlimited_transactions', 505);
assert(freeOver500.allowed === false, 'Free quota warns gracefully when exceeding 500 transactions');

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

// SUMMARY
console.log('\n========================================');
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
