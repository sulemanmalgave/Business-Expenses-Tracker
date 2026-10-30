import { UserProfile } from '../types';

export type SubscriptionPlanCode = 'free' | 'pro_monthly' | 'pro_yearly';

export type BillingCountryCode = 'IN' | 'US' | 'GB' | 'EU' | 'CA' | 'AU' | 'GLOBAL';

export interface PlanPricing {
  amount: number;
  currency: 'INR' | 'USD';
  symbol: string;
  interval: 'month' | 'year';
  intervalLabel: string;
  formatted: string;
  equivalentMonthly?: number;
  equivalentMonthlyFormatted?: string;
  savingsPercent?: number;
  provider: 'razorpay' | 'paypal';
  configuredProductId: string;
}

export interface PlanMetadata {
  code: SubscriptionPlanCode;
  name: string;
  tagline: string;
  features: string[];
}

export const PLAN_METADATA: Record<SubscriptionPlanCode, PlanMetadata> = {
  free: {
    code: 'free',
    name: 'Free Plan',
    tagline: 'Essential day-to-day income and expense ledger for small businesses',
    features: [
      'Income and expense tracking',
      'Basic dashboard',
      'Basic financial summaries',
      'Basic categories',
      'Client management',
      'Basic transaction history',
      'CSV export (always free)',
      'Manual backup and restore (always free)',
    ],
  },
  pro_monthly: {
    code: 'pro_monthly',
    name: 'Pro Monthly',
    tagline: 'Comprehensive financial reporting, automated statements & workflows',
    features: [
      'Everything in Free included',
      'Advanced financial reports',
      'Detailed PDF account statements',
      'Monthly and custom-period income and expense statements',
      'Client and project profitability reports',
      'Batch receipt OCR',
      'Recurring bills and cash-flow forecasting',
      'Advanced analytics and report filters',
      'Advanced invoice features',
    ],
  },
  pro_yearly: {
    code: 'pro_yearly',
    name: 'Pro Yearly',
    tagline: 'Annual commitment with ~16% discount for established businesses',
    features: [
      'Everything in Pro Monthly included',
      'Save ~16% compared to monthly billing',
      '12-month lock-in against subscription price changes',
      'Priority offline backup synchronization & support',
    ],
  },
};

/**
 * Supported regional pricing matrix strictly enforcing prompt requirements:
 * India: ₹199 / month, ₹1,999 / year
 * Outside India: $2.99 / month, $29.99 / year
 */
export const REGIONAL_PRICING: Record<'IN' | 'INTL', Record<'pro_monthly' | 'pro_yearly', PlanPricing>> = {
  IN: {
    pro_monthly: {
      amount: 199,
      currency: 'INR',
      symbol: '₹',
      interval: 'month',
      intervalLabel: 'every month',
      formatted: '₹199',
      provider: 'razorpay',
      configuredProductId: 'plan_india_pro_monthly',
    },
    pro_yearly: {
      amount: 1999,
      currency: 'INR',
      symbol: '₹',
      interval: 'year',
      intervalLabel: 'every year',
      formatted: '₹1,999',
      equivalentMonthly: 166.58,
      equivalentMonthlyFormatted: '₹166.58/mo',
      savingsPercent: 16,
      provider: 'razorpay',
      configuredProductId: 'plan_india_pro_yearly',
    },
  },
  INTL: {
    pro_monthly: {
      amount: 2.99,
      currency: 'USD',
      symbol: '$',
      interval: 'month',
      intervalLabel: 'every month',
      formatted: '$2.99',
      provider: 'paypal',
      configuredProductId: 'plan_intl_pro_monthly',
    },
    pro_yearly: {
      amount: 29.99,
      currency: 'USD',
      symbol: '$',
      interval: 'year',
      intervalLabel: 'every year',
      formatted: '$29.99',
      equivalentMonthly: 2.50,
      equivalentMonthlyFormatted: '$2.50/mo',
      savingsPercent: 16,
      provider: 'paypal',
      configuredProductId: 'plan_intl_pro_yearly',
    },
  },
};

/**
 * Reliably detects likely billing country without relying only on IP geolocation.
 * Checks system timezone (Asia/Kolkata), language locale (en-IN), or profile preference.
 */
export function detectLikelyBillingCountry(savedCountry?: string, currency?: string): 'IN' | 'INTL' {
  if (savedCountry) {
    return savedCountry.toUpperCase() === 'IN' || savedCountry.toUpperCase() === 'INDIA' ? 'IN' : 'INTL';
  }

  if (currency === 'INR') {
    return 'IN';
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && (tz.includes('Kolkata') || tz.includes('Calcutta') || tz === 'Asia/Kolkata')) {
      return 'IN';
    }

    if (typeof navigator !== 'undefined') {
      const languages = navigator.languages || [navigator.language];
      if (languages.some((l) => l && l.toLowerCase().includes('-in'))) {
        return 'IN';
      }
    }
  } catch (_) {
    // Ignore detection error and fallback to INTL
  }

  return 'INTL';
}

/**
 * Returns exact pricing details for the plan and billing country.
 * Never converts USD to INR or vice versa.
 */
export function getPlanPricing(
  plan: SubscriptionPlanCode,
  country: string = 'INTL'
): PlanPricing | null {
  if (plan === 'free') return null;

  const regionKey: 'IN' | 'INTL' = country === 'IN' || country.toUpperCase() === 'INDIA' ? 'IN' : 'INTL';
  return REGIONAL_PRICING[regionKey][plan];
}

/**
 * Checks if user's subscription is actively entitled to Pro capabilities.
 */
export function isSubscriptionActive(profile: UserProfile): boolean {
  const plan = profile.subscriptionPlan || 'free';
  if (plan === 'free') return false;

  const status = profile.subscriptionStatus || 'expired';
  if (status !== 'active') return false;

  if (profile.subscriptionExpiry) {
    const expiryDate = new Date(profile.subscriptionExpiry);
    const currentDate = new Date();
    return expiryDate.getTime() > currentDate.getTime();
  }

  return true;
}

/**
 * Consistent entitlement system across all application features.
 * Free plan keeps core capabilities unrestricted. Pro plan unlocks advanced features.
 */
export type AppFeature =
  | 'income_tracking'
  | 'expense_tracking'
  | 'basic_dashboard'
  | 'basic_summaries'
  | 'basic_categories'
  | 'client_management'
  | 'basic_history'
  | 'csv_export'
  | 'excel_export'
  | 'backup_restore'
  | 'pdf_reports'
  | 'unlimited_transactions'
  | 'advanced_reports'
  | 'pdf_account_statements'
  | 'custom_date_statements'
  | 'custom_period_statements'
  | 'project_profitability'
  | 'client_project_profitability'
  | 'batch_receipt_ocr'
  | 'recurring_bills'
  | 'recurring_income'
  | 'recurring_expenses'
  | 'advanced_analytics'
  | 'advanced_invoices'
  | 'receipt_attachments'
  | 'multiple_businesses';

export function isFeatureAllowed(
  profile: UserProfile,
  feature: AppFeature,
  currentTransactionsCount: number = 0
): { allowed: boolean; message?: string } {
  const hasPro = isSubscriptionActive(profile);

  // 1. Core Free Features (Always 100% free and never blocked)
  const alwaysFreeFeatures: AppFeature[] = [
    'income_tracking',
    'expense_tracking',
    'basic_dashboard',
    'basic_summaries',
    'basic_categories',
    'client_management',
    'basic_history',
    'csv_export',
    'excel_export',
    'backup_restore',
    'pdf_reports',
  ];

  if (alwaysFreeFeatures.includes(feature)) {
    return { allowed: true };
  }

  // 2. Transaction Quota Check
  if (feature === 'unlimited_transactions') {
    if (hasPro) return { allowed: true };
    return {
      allowed: currentTransactionsCount < 500,
      message:
        currentTransactionsCount >= 500
          ? 'Free plan quota of 500 transactions reached. Upgrade to Pro for unlimited transactions.'
          : undefined,
    };
  }

  // 3. Pro Gated Features
  if (!hasPro) {
    const featureLabels: Partial<Record<AppFeature, string>> = {
      advanced_reports: 'Advanced financial reports and comprehensive P&L analytics are a Pro feature.',
      pdf_account_statements: 'Generating bank-grade printable PDF account statements is a Pro feature.',
      custom_date_statements: 'Generating custom-period and custom date range statements is a Pro feature.',
      custom_period_statements: 'Monthly and custom-period income and expense statements are a Pro feature.',
      client_project_profitability: 'Client and project profitability analytics are a Pro feature.',
      project_profitability: 'Deep project & client profitability breakdown is a Pro feature.',
      batch_receipt_ocr: 'Batch receipt OCR and automated expense extraction is a Pro feature.',
      receipt_attachments: 'Receipt attachment & batch image ingest is a Pro feature.',
      recurring_bills: 'Recurring bills, scheduled obligations, and cash-flow forecasting are a Pro feature.',
      recurring_income: 'Automated recurring income scheduling is a Pro feature.',
      recurring_expenses: 'Automated recurring bill obligations are a Pro feature.',
      advanced_analytics: 'Advanced analytics, predictive trends, and report filters are a Pro feature.',
      advanced_invoices: 'Advanced invoice customization, payment tracking, and tax summaries are a Pro feature.',
      multiple_businesses: 'Managing multiple corporate entities and workspaces is a Pro feature.',
    };

    return {
      allowed: false,
      message: featureLabels[feature] || 'This advanced feature requires an active Pro subscription.',
    };
  }

  return { allowed: true };
}

// ==========================================
// SERVER-SIDE VERIFIED CHECKOUT CLIENT FLOWS
// ==========================================

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  provider: 'razorpay' | 'paypal' | 'sandbox';
  isSandbox: boolean;
  amount: number;
  currency: 'INR' | 'USD';
  planCode: 'pro_monthly' | 'pro_yearly';
  billingCountry: string;
  interval: 'month' | 'year';
  keyId?: string;
  clientId?: string;
  subscriptionId?: string;
  orderId?: string;
  checkoutUrl?: string;
  token?: string;
  isDevTestMode?: boolean;
  diagnostic?: string;
  error?: string;
}

export interface VerifyPaymentPayload {
  sessionId: string;
  planCode: 'pro_monthly' | 'pro_yearly';
  billingCountry: string;
  provider: 'razorpay' | 'paypal' | 'sandbox';
  token?: string;
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  paypal_subscription_id?: string;
  paypal_order_id?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  subscription?: {
    subscriptionId: string;
    planCode: 'pro_monthly' | 'pro_yearly';
    billingCountry: string;
    currency: 'INR' | 'USD';
    amount: number;
    interval: 'month' | 'year';
    status: 'active';
    startDate: string;
    expiryDate: string;
    provider: 'razorpay' | 'paypal' | 'sandbox';
    signature: string;
  };
  error?: string;
}

/**
 * Initiates a server-validated checkout session.
 * The server strictly determines the price and currency; client cannot tamper with amounts.
 */
export async function createCheckoutSession(params: {
  planCode: 'pro_monthly' | 'pro_yearly';
  billingCountry: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<CheckoutSessionResponse> {
  const response = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const err: any = new Error(errData.error || `Failed to create checkout session (${response.status})`);
    err.code = errData.code;
    throw err;
  }

  return response.json();
}

/**
 * Verifies the payment or subscription proof on the server.
 * Never grants Pro unless the backend cryptographically verifies the provider signature.
 */
export async function verifyPaymentOnServer(payload: VerifyPaymentPayload): Promise<VerifyPaymentResult> {
  const response = await fetch('/api/billing/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Payment verification failed (${response.status})`);
  }

  return response.json();
}

/**
 * Cancels a subscription at period end via server.
 */
export async function cancelSubscriptionOnServer(subscriptionId: string): Promise<{ success: boolean; expiryDate?: string; error?: string }> {
  const response = await fetch('/api/billing/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to cancel subscription');
  }

  return response.json();
}

/**
 * Recovers an existing subscription using email or subscription ID.
 */
export async function recoverSubscriptionOnServer(identifier: string): Promise<VerifyPaymentResult> {
  const response = await fetch('/api/billing/recover-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'No active subscription found for this identifier');
  }

  return response.json();
}

/**
 * Checks subscription standing directly against provider APIs without webhooks.
 */
export async function checkSubscriptionStatusOnServer(subscriptionId: string): Promise<{ success: boolean; subscription?: any; providerStatus?: string; error?: string }> {
  const response = await fetch('/api/billing/check-subscription-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to check subscription status');
  }

  return response.json();
}
