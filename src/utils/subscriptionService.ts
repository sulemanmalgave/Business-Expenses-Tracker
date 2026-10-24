import { UserProfile, Transaction } from '../types';

export type SubscriptionPlanCode = 'free' | 'pro_monthly' | 'pro_yearly' | 'lifetime';

export interface PlanDetails {
  code: SubscriptionPlanCode;
  name: string;
  priceUSD: number;
  priceINR: number;
  periodLabel: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, PlanDetails> = {
  free: {
    code: 'free',
    name: 'Free Starter Plan',
    priceUSD: 0,
    priceINR: 0,
    periodLabel: 'forever',
    features: [
      'Up to 500 total transactions (income + expenses combined)',
      'Interactive dashboard & Profit/Loss reports',
      'Complete accounting ledger CSV & Excel export',
      'Full JSON backup & restore without paywalls',
      'Client invoice & estimate builder with print/PDF',
      'Manage 1 business workspace',
    ],
  },
  pro_monthly: {
    code: 'pro_monthly',
    name: 'Pro Monthly Business',
    priceUSD: 1.99,
    priceINR: 99,
    periodLabel: 'month',
    features: [
      'Unlimited transaction ledger entries',
      'Multiple independent business profiles',
      'Batch receipt attachment ingest',
      'Automated recurring bills & obligations',
      'Advanced Business Intelligence analytics',
      'Priority software updates',
    ],
  },
  pro_yearly: {
    code: 'pro_yearly',
    name: 'Pro Yearly Enterprise',
    priceUSD: 9.99,
    priceINR: 499,
    periodLabel: 'year',
    features: [
      'Everything in Pro Monthly',
      'Save over 55% compared to Monthly',
      'Priority server-side processing modules',
      'Best value for small businesses & freelancers',
    ],
  },
  lifetime: {
    code: 'lifetime',
    name: 'Lifetime Sovereign',
    priceUSD: 19.99,
    priceINR: 999,
    periodLabel: 'one-time',
    features: [
      'Everything in Pro Yearly',
      'Pay once, enjoy premium modules forever',
      'Zero recurring charge loops',
      'Lifetime updates & feature increments',
    ],
  },
};

// Pricing display generator based on selected currency
export interface DisplayPrice {
  amount: number;
  symbol: string;
  formatted: string;
}

export function getDisplayPrice(plan: SubscriptionPlanCode, currencyCode: string = 'USD'): DisplayPrice {
  const details = SUBSCRIPTION_PLANS[plan];
  if (plan === 'free') {
    return { amount: 0, symbol: '', formatted: 'Free' };
  }

  // Exact requested prices for USD and INR
  if (currencyCode === 'INR') {
    const amt = details.priceINR;
    return { amount: amt, symbol: '₹', formatted: `₹${amt}` };
  }
  if (currencyCode === 'GBP') {
    const amt = details.priceUSD; // 1:1 or typical pricing
    return { amount: amt, symbol: '£', formatted: `£${amt}` };
  }
  if (currencyCode === 'EUR') {
    const amt = details.priceUSD;
    return { amount: amt, symbol: '€', formatted: `€${amt}` };
  }
  if (currencyCode === 'CAD') {
    const amt = Math.round(details.priceUSD * 1.35 * 100) / 100;
    return { amount: amt, symbol: 'C$', formatted: `C$${amt}` };
  }
  if (currencyCode === 'AUD') {
    const amt = Math.round(details.priceUSD * 1.5 * 100) / 100;
    return { amount: amt, symbol: 'A$', formatted: `A$${amt}` };
  }
  if (currencyCode === 'AED') {
    const amt = Math.round(details.priceUSD * 3.67 * 10) / 10;
    return { amount: amt, symbol: 'د.إ', formatted: `${amt} د.إ` };
  }

  // Fallback to USD with appropriate exchanges/formatting
  const amt = details.priceUSD;
  return { amount: amt, symbol: '$', formatted: `$${amt}` };
}

// Check subscription active state
export function isSubscriptionActive(profile: UserProfile): boolean {
  const plan = profile.subscriptionPlan || 'free';
  if (plan === 'lifetime') return true;
  if (plan === 'free') return false;

  const status = profile.subscriptionStatus || 'expired';
  if (status !== 'active') return false;

  // Verify expiration date
  if (profile.subscriptionExpiry) {
    const expiryDate = new Date(profile.subscriptionExpiry);
    const currentDate = new Date();
    return expiryDate.getTime() > currentDate.getTime();
  }

  return true;
}

// Core permission checker: returns true if action or premium feature is allowed
export function isFeatureAllowed(
  profile: UserProfile,
  feature: 
    | 'unlimited_transactions'
    | 'excel_export'
    | 'pdf_reports'
    | 'receipt_attachments'
    | 'recurring_income'
    | 'recurring_expenses'
    | 'multiple_businesses'
    | 'advanced_analytics'
    | 'backup_restore',
  currentTransactionsCount: number = 0
): { allowed: boolean; message?: string } {
  const hasPremium = isSubscriptionActive(profile);

  if (feature === 'unlimited_transactions') {
    if (hasPremium) return { allowed: true };
    return {
      allowed: currentTransactionsCount < 500,
      message: currentTransactionsCount >= 505 
        ? 'Transaction count limit reached! Upgrade to Pro for unlimited transactions.'
        : undefined
    };
  }

  // Core user ownership features: CSV/Excel export, PDF reports, and JSON backup are always allowed
  if (feature === 'excel_export' || feature === 'backup_restore' || feature === 'pdf_reports') {
    return { allowed: true };
  }

  // All other listed features require an active license tier
  if (!hasPremium) {
    const labels: Record<string, string> = {
      receipt_attachments: 'Batch Receipt Ingest is a Pro feature.',
      recurring_income: 'Recurring Income automation is a Pro feature.',
      recurring_expenses: 'Recurring Expense scheduling is a Pro feature.',
      multiple_businesses: 'Managing Multiple Business Workspaces is a Pro feature.',
      advanced_analytics: 'Advanced BI charts and Business Insights are Pro features.',
    };
    return { 
      allowed: false, 
      message: labels[feature] || 'This capability requires a Pro license.' 
    };
  }

  return { allowed: true };
}

// Swappable Provider Interface (Stripe, Play Billing, Microsoft Store, etc.)
export interface IPaymentProvider {
  name: string;
  checkout(plan: SubscriptionPlanCode, currency: string): Promise<{ success: boolean; expiryDate?: string }>;
  restorePurchases(): Promise<{ success: boolean; plan?: SubscriptionPlanCode; expiryDate?: string }>;
}

// Stripe Payment Gateway implementation
export class StripeProvider implements IPaymentProvider {
  name = 'Stripe Secure Checkout';
  async checkout(plan: SubscriptionPlanCode, currency: string): Promise<{ success: boolean; expiryDate?: string }> {
    console.log(`Connecting to Stripe for plan: ${plan}, currency: ${currency}`);
    // Simulate real network request validation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Set expiry
    const expiry = new Date();
    if (plan === 'pro_monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (plan === 'pro_yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      return { success: true }; // Lifetime has no expiry
    }
    
    return { 
      success: true, 
      expiryDate: expiry.toISOString().split('T')[0] 
    };
  }

  async restorePurchases(): Promise<{ success: boolean; plan?: SubscriptionPlanCode; expiryDate?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    // Simulate recovery of valid token
    return { success: false }; // No prior active purchases to restore on first load
  }
}

// Google Play Billing Provider implementation
export class GooglePlayProvider implements IPaymentProvider {
  name = 'Google Play Billing API';
  async checkout(plan: SubscriptionPlanCode, currency: string): Promise<{ success: boolean; expiryDate?: string }> {
    console.log(`Connecting to Google Play Core for plan: ${plan}`);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    
    const expiry = new Date();
    if (plan === 'pro_monthly') expiry.setMonth(expiry.getMonth() + 1);
    else if (plan === 'pro_yearly') expiry.setFullYear(expiry.getFullYear() + 1);

    return { success: true, expiryDate: expiry.toISOString().split('T')[0] };
  }

  async restorePurchases(): Promise<{ success: boolean; plan?: SubscriptionPlanCode; expiryDate?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: false };
  }
}

// Microsoft Store purchase provider
export class MicrosoftStoreProvider implements IPaymentProvider {
  name = 'Microsoft Store In-App Purchases';
  async checkout(plan: SubscriptionPlanCode, currency: string): Promise<{ success: boolean; expiryDate?: string }> {
    console.log(`Contacting Microsoft Windows Store API to purchase ${plan}`);
    await new Promise((resolve) => setTimeout(resolve, 1600));

    const expiry = new Date();
    if (plan === 'pro_monthly') expiry.setMonth(expiry.getMonth() + 1);
    else if (plan === 'pro_yearly') expiry.setFullYear(expiry.getFullYear() + 1);

    return { success: true, expiryDate: expiry.toISOString().split('T')[0] };
  }

  async restorePurchases(): Promise<{ success: boolean; plan?: SubscriptionPlanCode; expiryDate?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: false };
  }
}

// Registry to allow dynamic swapping
export const PAYMENT_PROVIDERS: Record<string, IPaymentProvider> = {
  stripe: new StripeProvider(),
  google_play: new GooglePlayProvider(),
  microsoft_store: new MicrosoftStoreProvider(),
};
