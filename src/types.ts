export type TransactionType = 'income' | 'expense';

export type RecurrencePeriod = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PaymentMethod = 
  | 'Bank Transfer'
  | 'Credit Card'
  | 'Debit Card'
  | 'Cash'
  | 'UPI / Digital Payment'
  | 'Cheque'
  | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  exchangeRate: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod?: string;
  account?: string;
  project?: string;
  clientId?: string;
  clientName?: string;
  notes?: string;
  receipt?: string; // Base64 or IndexedDB object key
  receiptName?: string;
  isRecurring: boolean;
  recurrencePeriod: RecurrencePeriod;
  isTransfer?: boolean;
  transferToAccount?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string; // Required: Client or business name
  companyName?: string;
  company?: string; // Convenient alias
  email?: string;
  phone?: string;
  billingAddress?: string;
  address?: string; // Convenient alias
  gstin?: string; // GSTIN or tax registration number
  notes?: string;
  defaultCurrency?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientFinancialSummary {
  clientId: string;
  clientName: string;
  totalIncome: number;
  totalExpenses: number;
  netContribution: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  latestTransactionDate: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  isCustom?: boolean;
}

export interface RecurringBill {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  project?: string;
  account?: string;
  paymentMethod?: string;
  lastPaidDate?: string;
  isActive: boolean;
}

export interface AccountTransfer {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  notes?: string;
}

export interface UserProfile {
  businessName: string;
  ownerName: string;
  currency: string;
  email: string;
  taxRate: number; // Estimated tax reserve percentage
  businessType?: string;
  financialYearStart?: string;
  dateFormatPreference?: string;
  numberFormatPreference?: string;
  onboarded?: boolean;
  billingCountry?: string;
  subscriptionPlan?: 'free' | 'pro_monthly' | 'pro_yearly';
  subscriptionStatus?: 'active' | 'expired';
  subscriptionExpiry?: string | null;
  subscriptionId?: string;
  subscriptionProvider?: 'razorpay' | 'paypal' | 'sandbox';
  subscriptionInterval?: 'month' | 'year';
  subscriptionCurrency?: string;
  subscriptionAmount?: number;
  cancelAtPeriodEnd?: boolean;
  subscriptionSignature?: string;
  subscriptionLastVerified?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  netProfit: number;
  margin: number;
  estimatedTaxReserve?: number;
  netIncomeAfterTaxEstimate?: number;
}
