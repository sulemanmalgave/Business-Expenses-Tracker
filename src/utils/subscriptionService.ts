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
      'Income & expense tracking (up to 50 transactions)',
      'Basic dashboard & financial summaries',
      'Client management (up to 5 clients)',
      'Standard invoices (up to 3 invoices)',
      '1 recurring obligation to test',
      'Standard transaction categories',
      'Basic reports & P&L summaries',
      'Full CSV export (always free)',
      'Manual backup and restore (always free)',
      '100% private offline storage',
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

export type CanonicalPlanCode = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY';

/**
 * Exact, enforceable Free plan usage quotas:
 * - 50 Active Transactions (Pro: Unlimited)
 * - 3 Client Profiles (Pro: Unlimited)
 * - 3 Invoices (Pro: Unlimited)
 * - 1 Recurring Bill (Pro: Unlimited)
 * - 1 Workspace / Entity (Pro: Multiple)
 */
export const FREE_LIMITS = {
  transactions: 50,
  clients: 5,
  invoices: 3,
  recurringBills: 1,
  businesses: 1,
} as const;

/**
 * Returns canonical plan code ('FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY')
 * evaluated strictly from verified subscription status.
 */
export function getEntitlementPlan(profile?: UserProfile | null): CanonicalPlanCode {
  if (!profile) return 'FREE';
  if (!isSubscriptionActive(profile)) return 'FREE';

  const plan = (profile.subscriptionPlan || '').toUpperCase();
  if (plan.includes('YEARLY')) {
    return 'PRO_YEARLY';
  }
  return 'PRO_MONTHLY';
}

/**
 * Checks if user's subscription is actively entitled to Pro capabilities.
 * Strictly verifies status against server/provider states:
 * - Active: Valid Pro (must have non-expired date)
 * - Cancelled with future expiry date: Valid Pro until expiry date (grace period)
 * - Free, Expired, suspended, pending, failed, or unverified: Returns false (reverts to Free)
 */
export function isSubscriptionActive(profile?: UserProfile | null): boolean {
  if (!profile) return false;

  const rawPlan = (profile.subscriptionPlan || 'free').toLowerCase();
  if (rawPlan === 'free' || !rawPlan) return false;

  // Must be recognized Pro plan
  if (rawPlan !== 'pro_monthly' && rawPlan !== 'pro_yearly') {
    return false;
  }

  const status = (profile.subscriptionStatus || 'expired').toLowerCase();

  // Expired, pending, failed, unverified statuses are NEVER active
  if (!status || status === 'expired' || status === 'pending' || status === 'failed' || status === 'unverified') {
    return false;
  }

  // If subscription was cancelled (or marked cancelAtPeriodEnd), remain Pro until expiry date
  if (status === 'cancelled' || profile.cancelAtPeriodEnd) {
    if (profile.subscriptionExpiry) {
      const expiryTime = new Date(profile.subscriptionExpiry).getTime();
      return !isNaN(expiryTime) && expiryTime > Date.now();
    }
    return false;
  }

  // Active status is required
  if (status !== 'active') return false;

  // Verify expiry date if specified
  if (profile.subscriptionExpiry) {
    const expiryTime = new Date(profile.subscriptionExpiry).getTime();
    if (!isNaN(expiryTime) && expiryTime <= Date.now()) {
      return false; // Expired
    }
  }

  return true;
}

/**
 * Development test mechanism to toggle between Free Plan and Verified Pro states
 * for testing and QA verification without requiring live payment transactions.
 */
export async function setDevTestPlan(
  plan: 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY',
  country: 'IN' | 'INTL' = 'INTL'
): Promise<{ success: boolean; profileUpdates: Partial<UserProfile>; message: string }> {
  try {
    const res = await fetch('/api/billing/dev-set-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, country }),
    });
    if (!res.ok) {
      throw new Error(`Failed to set test plan (${res.status})`);
    }
    const data = await res.json();
    if (plan === 'FREE') {
      return {
        success: true,
        profileUpdates: {
          subscriptionPlan: 'free',
          subscriptionStatus: 'expired',
          subscriptionExpiry: undefined,
          subscriptionId: undefined,
          cancelAtPeriodEnd: false,
        },
        message: data.message || 'Switched to Free Plan (Test Mode)',
      };
    } else {
      return {
        success: true,
        profileUpdates: {
          subscriptionPlan: data.plan,
          subscriptionStatus: 'active',
          subscriptionExpiry: data.subscription.expiryDate,
          subscriptionId: data.subscription.subscriptionId,
          cancelAtPeriodEnd: false,
        },
        message: data.message || `Switched to ${data.plan} (Test Mode)`,
      };
    }
  } catch (err: any) {
    // Local offline test fallback
    if (plan === 'FREE') {
      return {
        success: true,
        profileUpdates: {
          subscriptionPlan: 'free',
          subscriptionStatus: 'expired',
          subscriptionExpiry: undefined,
          subscriptionId: undefined,
          cancelAtPeriodEnd: false,
        },
        message: 'Switched to Free Plan (Offline Test Mode)',
      };
    } else {
      const isYearly = plan === 'PRO_YEARLY';
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (isYearly ? 365 : 30));
      return {
        success: true,
        profileUpdates: {
          subscriptionPlan: isYearly ? 'pro_yearly' : 'pro_monthly',
          subscriptionStatus: 'active',
          subscriptionExpiry: expiryDate.toISOString().split('T')[0],
          subscriptionId: `sub_offline_test_${Date.now()}`,
          cancelAtPeriodEnd: false,
        },
        message: `Switched to ${plan} (Offline Test Mode)`,
      };
    }
  }
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
  | 'multiple_businesses'
  | 'unlimited_clients'
  | 'unlimited_invoices';

export interface FeatureEntitlementResult {
  allowed: boolean;
  plan: CanonicalPlanCode;
  requiresUpgrade: boolean;
  message?: string;
  limit?: number;
  current?: number;
}

/**
 * Reusable permission and quota check for every feature in the application.
 */
export function checkFeatureEntitlement(
  profile?: UserProfile | null,
  feature?: AppFeature,
  usageCounts?: {
    transactions?: number;
    clients?: number;
    invoices?: number;
    recurringBills?: number;
    businesses?: number;
  }
): FeatureEntitlementResult {
  const plan = getEntitlementPlan(profile);
  const isPro = plan !== 'FREE';

  if (!feature) {
    return { allowed: true, plan, requiresUpgrade: false };
  }

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
    return { allowed: true, plan, requiresUpgrade: false };
  }

  // 2. Transaction Quota Check
  if (feature === 'unlimited_transactions') {
    if (isPro) return { allowed: true, plan, requiresUpgrade: false };
    const count = usageCounts?.transactions ?? 0;
    const allowed = count < FREE_LIMITS.transactions;
    return {
      allowed,
      plan,
      limit: FREE_LIMITS.transactions,
      current: count,
      requiresUpgrade: !allowed,
      message: !allowed
        ? `Free plan quota of ${FREE_LIMITS.transactions} transactions reached. Upgrade to Pro for unlimited records.`
        : undefined,
    };
  }

  // 3. Client Quota Check
  if (feature === 'unlimited_clients') {
    if (isPro) return { allowed: true, plan, requiresUpgrade: false };
    const count = usageCounts?.clients ?? 0;
    const allowed = count < FREE_LIMITS.clients;
    return {
      allowed,
      plan,
      limit: FREE_LIMITS.clients,
      current: count,
      requiresUpgrade: !allowed,
      message: !allowed
        ? `Free plan is limited to ${FREE_LIMITS.clients} clients. Upgrade to Pro for unlimited client directory and profitability analytics.`
        : undefined,
    };
  }

  // 4. Invoice Quota Check
  if (feature === 'unlimited_invoices') {
    if (isPro) return { allowed: true, plan, requiresUpgrade: false };
    const count = usageCounts?.invoices ?? 0;
    const allowed = count < FREE_LIMITS.invoices;
    return {
      allowed,
      plan,
      limit: FREE_LIMITS.invoices,
      current: count,
      requiresUpgrade: !allowed,
      message: !allowed
        ? `Free plan is limited to ${FREE_LIMITS.invoices} invoices. Upgrade to Pro for unlimited invoices and custom PDF formatting.`
        : undefined,
    };
  }

  // 5. Recurring Bills Quota Check
  if (feature === 'recurring_bills') {
    if (isPro) return { allowed: true, plan, requiresUpgrade: false };
    const count = usageCounts?.recurringBills ?? 0;
    const allowed = count < FREE_LIMITS.recurringBills;
    return {
      allowed,
      plan,
      limit: FREE_LIMITS.recurringBills,
      current: count,
      requiresUpgrade: !allowed,
      message: !allowed
        ? `Free plan allows up to ${FREE_LIMITS.recurringBills} recurring bill to test. Upgrade to Pro for unlimited recurring obligations and cash-flow forecasting.`
        : undefined,
    };
  }

  // 6. Multiple Businesses Quota Check
  if (feature === 'multiple_businesses') {
    if (isPro) return { allowed: true, plan, requiresUpgrade: false };
    const count = usageCounts?.businesses ?? 1;
    const allowed = count < FREE_LIMITS.businesses;
    return {
      allowed,
      plan,
      limit: FREE_LIMITS.businesses,
      current: count,
      requiresUpgrade: !allowed,
      message: !allowed
        ? 'Managing separate corporate entities is a Pro capability.'
        : undefined,
    };
  }

  // 7. Pro Gated Features
  if (!isPro) {
    const featureLabels: Partial<Record<AppFeature, string>> = {
      advanced_reports: 'Advanced financial reports and comprehensive P&L analytics are a Pro feature.',
      pdf_account_statements: 'Generating bank-grade printable PDF account statements is a Pro feature.',
      custom_date_statements: 'Generating custom-period and custom date range statements is a Pro feature.',
      custom_period_statements: 'Monthly and custom-period income and expense statements are a Pro feature.',
      client_project_profitability: 'Client and project profitability analytics are a Pro feature.',
      project_profitability: 'Deep project & client profitability breakdown is a Pro feature.',
      batch_receipt_ocr: 'Batch receipt OCR and automated expense extraction is a Pro feature.',
      receipt_attachments: 'Receipt attachment & batch image ingest is a Pro feature.',
      recurring_income: 'Automated recurring income scheduling is a Pro feature.',
      recurring_expenses: 'Automated recurring bill obligations are a Pro feature.',
      advanced_analytics: 'Advanced analytics, predictive trends, and report filters are a Pro feature.',
      advanced_invoices: 'Advanced invoice customization, payment tracking, and tax summaries are a Pro feature.',
    };

    return {
      allowed: false,
      plan,
      requiresUpgrade: true,
      message: featureLabels[feature] || 'This advanced feature requires an active Pro subscription.',
    };
  }

  return { allowed: true, plan, requiresUpgrade: false };
}

/**
 * Backward-compatible helper for existing code and tests.
 */
export function isFeatureAllowed(
  profile: UserProfile,
  feature: AppFeature,
  currentCount: number = 0
): { allowed: boolean; message?: string } {
  const result = checkFeatureEntitlement(profile, feature, {
    transactions: currentCount,
    clients: currentCount,
    invoices: currentCount,
    recurringBills: currentCount,
  });
  return { allowed: result.allowed, message: result.message };
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
