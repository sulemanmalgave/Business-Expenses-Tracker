export type TransactionType = 'income' | 'expense';

export type RecurrencePeriod = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;      // New field
  exchangeRate: number;  // New field, exchange rate to base currency
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  receipt?: string; // Base64 data URL
  receiptName?: string;
  isRecurring: boolean;
  recurrencePeriod: RecurrencePeriod;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string; // Hex code or tailwind class name
  icon: string; // Lucide icon name
  isCustom?: boolean;
}

export interface UserProfile {
  businessName: string;
  ownerName: string;
  currency: string;
  email: string;
  taxRate: number; // Percentage
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
  netProfit: number;
  margin: number;
}
