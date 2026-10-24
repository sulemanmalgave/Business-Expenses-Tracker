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
  subscriptionPlan?: 'free' | 'pro_monthly' | 'pro_yearly' | 'lifetime';
  subscriptionStatus?: 'active' | 'expired';
  subscriptionExpiry?: string | null;
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
