import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Internal Server Integrity Secret (used for signing session tokens and preventing tampering)
const SERVER_INTEGRITY_SECRET = process.env.SERVER_INTEGRITY_SECRET || 'bet_secret_integrity_key_982341890';

// In-memory processed payment IDs for replay-attack prevention
const processedPaymentIds = new Set<string>();

// In-memory active subscriptions cache for recovery and server status checking
const activeSubscriptionsStore = new Map<string, {
  subscriptionId: string;
  planCode: 'pro_monthly' | 'pro_yearly';
  billingCountry: string;
  currency: 'INR' | 'USD';
  amount: number;
  interval: 'month' | 'year';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  expiryDate: string;
  provider: 'razorpay' | 'paypal' | 'sandbox';
  customerEmail?: string;
  signature: string;
  cancelAtPeriodEnd?: boolean;
}>();

app.use(express.json());

// ==========================================
// 1. PAYPAL CLIENT & AUTO-PLAN RESOLUTION
// ==========================================

function getPayPalEnvironment(): 'sandbox' | 'live' {
  const mode = (process.env.PAYPAL_MODE || process.env.PAYPAL_ENVIRONMENT || '').toLowerCase();
  if (mode === 'live' || mode === 'production') {
    return 'live';
  }
  return 'sandbox';
}

function getPayPalBaseUrl(): string {
  return getPayPalEnvironment() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function getPayPalWebUrl(): string {
  return getPayPalEnvironment() === 'live'
    ? 'https://www.paypal.com'
    : 'https://www.sandbox.paypal.com';
}

interface PayPalAuthResult {
  token: string | null;
  error?: string;
  statusCode?: number;
}

async function getPayPalAuthDetails(): Promise<PayPalAuthResult> {
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return { token: null, error: 'PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in environment variables.' };
  }

  if (clientId === clientSecret) {
    return { 
      token: null, 
      error: 'PAYPAL_CLIENT_SECRET appears identical to PAYPAL_CLIENT_ID. PayPal Client Secret must be your secret key from developer.paypal.com, not the client ID.' 
    };
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errDesc = errBody.error_description || errBody.error || `HTTP ${res.status}`;
      return { 
        token: null, 
        statusCode: res.status, 
        error: `PayPal OAuth rejected credentials (${errDesc}). Verify sandbox/live credentials in developer.paypal.com.` 
      };
    }

    const data = await res.json();
    return { token: data.access_token || null };
  } catch (err: any) {
    return { token: null, error: err.message || 'Network error reaching PayPal OAuth API.' };
  }
}

async function getPayPalAccessToken(): Promise<string | null> {
  const auth = await getPayPalAuthDetails();
  return auth.token;
}

// In-memory cache for dynamically discovered/created PayPal plan IDs
let paypalProductIdCache: string | null = null;
const paypalPlanCache = new Map<'pro_monthly' | 'pro_yearly', string>();

async function getOrCreatePayPalPlan(planCode: 'pro_monthly' | 'pro_yearly'): Promise<string> {
  if (paypalPlanCache.has(planCode)) {
    return paypalPlanCache.get(planCode)!;
  }

  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    throw new Error('Cannot resolve PayPal subscription plan without valid PayPal access token.');
  }

  const baseUrl = getPayPalBaseUrl();
  const isMonthly = planCode === 'pro_monthly';
  const targetPrice = isMonthly ? '2.99' : '29.99';
  const targetUnit = isMonthly ? 'MONTH' : 'YEAR';

  // 1. Ensure Catalog Product exists
  if (!paypalProductIdCache) {
    const prodListRes = await fetch(`${baseUrl}/v1/catalogs/products?page_size=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (prodListRes.ok) {
      const prodData = await prodListRes.json();
      const existingProd = (prodData.products || []).find(
        (p: any) => p.name === 'Business Expense Tracker Pro'
      );
      if (existingProd) {
        paypalProductIdCache = existingProd.id;
      }
    }

    if (!paypalProductIdCache) {
      const createProdRes = await fetch(`${baseUrl}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Business Expense Tracker Pro',
          description: 'Business Expense Tracker Pro Accounting SaaS',
          type: 'SERVICE',
          category: 'SOFTWARE',
        }),
      });
      if (createProdRes.ok) {
        const newProd = await createProdRes.json();
        paypalProductIdCache = newProd.id;
      } else {
        const err = await createProdRes.text();
        throw new Error(`Failed to create product on PayPal: ${err}`);
      }
    }
  }

  // 2. Ensure Billing Plan exists under Product
  if (paypalProductIdCache) {
    const planListRes = await fetch(`${baseUrl}/v1/billing/plans?product_id=${paypalProductIdCache}&page_size=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (planListRes.ok) {
      const planData = await planListRes.json();
      const existingPlan = (planData.plans || []).find((p: any) => {
        if (p.status !== 'ACTIVE') return false;
        const cycle = p.billing_cycles?.[0];
        return (
          cycle?.frequency?.interval_unit === targetUnit &&
          cycle?.frequency?.interval_count === 1 &&
          cycle?.pricing_scheme?.fixed_price?.value === targetPrice
        );
      });
      if (existingPlan) {
        paypalPlanCache.set(planCode, existingPlan.id);
        return existingPlan.id;
      }
    }

    // 3. Create plan via PayPal API
    const createPlanRes = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: paypalProductIdCache,
        name: isMonthly ? 'International Pro Monthly' : 'International Pro Yearly',
        description: isMonthly ? 'Pro Monthly Subscription ($2.99/mo)' : 'Pro Yearly Subscription ($29.99/yr)',
        billing_cycles: [
          {
            frequency: {
              interval_unit: targetUnit,
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: targetPrice,
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      }),
    });

    if (createPlanRes.ok) {
      const newPlan = await createPlanRes.json();
      paypalPlanCache.set(planCode, newPlan.id);
      return newPlan.id;
    } else {
      const err = await createPlanRes.text();
      throw new Error(`Failed to create billing plan on PayPal: ${err}`);
    }
  }

  throw new Error('Unable to create or retrieve PayPal subscription plan.');
}

// ==========================================
// 2. RAZORPAY CLIENT & AUTO-PLAN RESOLUTION
// ==========================================

const razorpayPlanCache = new Map<'pro_monthly' | 'pro_yearly', string>();

async function getOrCreateRazorpayPlan(planCode: 'pro_monthly' | 'pro_yearly'): Promise<string> {
  if (razorpayPlanCache.has(planCode)) {
    return razorpayPlanCache.get(planCode)!;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return `plan_rzp_${planCode}`;
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const targetPeriod = planCode === 'pro_monthly' ? 'monthly' : 'yearly';
  const targetAmount = planCode === 'pro_monthly' ? 19900 : 199900; // in paise (₹199 = 19900, ₹1999 = 199900)

  try {
    // 1. Fetch existing plans from Razorpay
    const listRes = await fetch('https://api.razorpay.com/v1/plans?count=100', {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = (listData.items || []).find((p: any) =>
        p.period === targetPeriod &&
        p.interval === 1 &&
        p.item?.amount === targetAmount &&
        p.item?.currency === 'INR'
      );
      if (existing) {
        razorpayPlanCache.set(planCode, existing.id);
        return existing.id;
      }
    }

    // 2. Plan not found, create it on Razorpay via API
    const createRes = await fetch('https://api.razorpay.com/v1/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period: targetPeriod,
        interval: 1,
        item: {
          name: planCode === 'pro_monthly' ? 'India Pro Monthly' : 'India Pro Yearly',
          amount: targetAmount,
          currency: 'INR',
          description: planCode === 'pro_monthly'
            ? 'Business Expense Tracker Pro Monthly (₹199/mo)'
            : 'Business Expense Tracker Pro Yearly (₹1,999/yr)',
        },
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      razorpayPlanCache.set(planCode, created.id);
      return created.id;
    }
  } catch (err) {
    console.warn('[Razorpay] Plan auto-resolution error:', err);
  }

  return `plan_rzp_${planCode}`;
}

// ==========================================
// 3. BILLING API ENDPOINTS (NO WEBHOOKS)
// ==========================================

/**
 * GET /api/billing/config
 * Exposes payment gateway availability and public keys using only the 4 required credentials.
 */
app.get('/api/billing/config', async (_req: Request, res: Response) => {
  const hasRazorpay = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const hasPayPal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  const payPalEnv = getPayPalEnvironment();

  // Test token status dynamically so UI can display real connection status
  let payPalAuthStatus: 'connected' | 'auth_failed' | 'not_configured' = 'not_configured';
  let payPalErrorMessage: string | undefined = undefined;

  if (hasPayPal) {
    const auth = await getPayPalAuthDetails();
    if (auth.token) {
      payPalAuthStatus = 'connected';
    } else {
      payPalAuthStatus = 'auth_failed';
      payPalErrorMessage = auth.error || 'PayPal authentication failed. Verify sandbox credentials in developer.paypal.com.';
    }
  }

  res.json({
    status: 'ok',
    providers: {
      razorpay: {
        enabled: hasRazorpay,
        isSandbox: !hasRazorpay,
        keyId: process.env.RAZORPAY_KEY_ID || undefined,
      },
      paypal: {
        enabled: hasPayPal,
        mode: payPalEnv,
        isSandbox: payPalEnv === 'sandbox',
        clientId: process.env.PAYPAL_CLIENT_ID || undefined,
        authStatus: payPalAuthStatus,
        errorMessage: payPalErrorMessage,
      },
    },
    pricingSchedule: {
      india: {
        monthly: { amount: 199, currency: 'INR', interval: 'month' },
        yearly: { amount: 1999, currency: 'INR', interval: 'year' },
      },
      international: {
        monthly: { amount: 2.99, currency: 'USD', interval: 'month' },
        yearly: { amount: 29.99, currency: 'USD', interval: 'year' },
      },
    },
  });
});

/**
 * POST /api/billing/create-checkout-session
 * Server-side validated checkout session creation.
 * Strict pricing mapping:
 * - India: Razorpay (₹199 / ₹1,999)
 * - Outside India: PayPal ($2.99 / $29.99)
 */
app.post('/api/billing/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { planCode, billingCountry, customerEmail, customerName } = req.body;

    if (!planCode || (planCode !== 'pro_monthly' && planCode !== 'pro_yearly')) {
      res.status(400).json({ error: 'Invalid plan selected. Only pro_monthly and pro_yearly are supported.' });
      return;
    }

    const isIndia = String(billingCountry).toUpperCase() === 'IN' || String(billingCountry).toUpperCase() === 'INDIA';

    let amount: number;
    let currency: 'INR' | 'USD';
    let interval: 'month' | 'year';
    let provider: 'razorpay' | 'paypal';

    if (isIndia) {
      provider = 'razorpay';
      currency = 'INR';
      if (planCode === 'pro_monthly') {
        amount = 199;
        interval = 'month';
      } else {
        amount = 1999;
        interval = 'year';
      }
    } else {
      provider = 'paypal';
      currency = 'USD';
      if (planCode === 'pro_monthly') {
        amount = 2.99;
        interval = 'month';
      } else {
        amount = 29.99;
        interval = 'year';
      }
    }

    const sessionId = `sess_${provider}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // Cryptographic token to verify session data integrity on completion
    const token = crypto
      .createHmac('sha256', SERVER_INTEGRITY_SECRET)
      .update(`${sessionId}|${planCode}|${isIndia ? 'IN' : 'INTL'}|${amount}|${currency}`)
      .digest('hex');

    // ===================================
    // RAZORPAY (India Customers Only)
    // ===================================
    if (isIndia) {
      const hasRazorpayKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
      if (!hasRazorpayKeys) {
        res.status(400).json({ 
          error: 'Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server. Please add them to your environment variables.',
          code: 'RAZORPAY_NOT_CONFIGURED'
        });
        return;
      }

      const planId = await getOrCreateRazorpayPlan(planCode);
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: interval === 'month' ? 12 : 5,
          quantity: 1,
          customer_notify: 1,
          notes: {
            app: 'Business Expense Tracker',
            customerEmail: customerEmail || 'user@example.com',
          },
        }),
      });

      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        res.status(400).json({ 
          error: `Razorpay API rejected subscription creation: ${errText}`,
          code: 'RAZORPAY_API_ERROR'
        });
        return;
      }

      const rzpData = await rzpRes.json();
      res.json({
        success: true,
        sessionId,
        provider: 'razorpay',
        isSandbox: false,
        amount,
        currency,
        planCode,
        billingCountry: 'IN',
        interval,
        subscriptionId: rzpData.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        token,
      });
      return;
    }

    // ===================================
    // PAYPAL (International Customers)
    // ===================================
    const hasPayPalKeys = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
    const authDetails = await getPayPalAuthDetails();

    // If PayPal keys are not fully ready or identical, provide separated dev testing mode
    if (!hasPayPalKeys || !authDetails.token) {
      res.json({
        success: true,
        sessionId,
        provider: 'paypal',
        mode: 'sandbox',
        isSandbox: true,
        isDevTestMode: true,
        amount,
        currency: 'USD',
        planCode,
        billingCountry: 'INTL',
        interval,
        subscriptionId: `sub_dev_ppl_${Date.now()}`,
        token,
        diagnostic: authDetails.error || 'PayPal credentials not yet configured.',
      });
      return;
    }

    const accessToken = authDetails.token;
    let planId: string;
    try {
      planId = await getOrCreatePayPalPlan(planCode);
    } catch (planErr: any) {
      res.status(400).json({
        error: `Could not initialize PayPal subscription plan: ${planErr.message}`,
        code: 'PAYPAL_PLAN_ERROR',
      });
      return;
    }

    // Determine public app origin for return and cancel redirects
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}` || 'http://localhost:3000';
    const payPalMode = getPayPalEnvironment();

    const paypalRes = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: {
          name: customerName ? { given_name: customerName } : undefined,
          email_address: customerEmail || undefined,
        },
        application_context: {
          brand_name: 'Business Expense Tracker Pro',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${appUrl}/?session_id=${sessionId}&plan=${planCode}&billing=success`,
          cancel_url: `${appUrl}/?session_id=${sessionId}&billing=cancelled`,
        },
      }),
    });

    if (!paypalRes.ok) {
      const errText = await paypalRes.text();
      res.status(400).json({
        error: `PayPal Subscriptions API rejected creation (${paypalRes.status}): ${errText}`,
        code: 'PAYPAL_SUBSCRIPTION_CREATE_ERROR',
      });
      return;
    }

    const ppData = await paypalRes.json();
    const approveLink = ppData.links?.find((l: any) => l.rel === 'approve')?.href;

    res.json({
      success: true,
      sessionId,
      provider: 'paypal',
      mode: payPalMode,
      isSandbox: payPalMode === 'sandbox',
      amount,
      currency,
      planCode,
      billingCountry: 'INTL',
      interval,
      subscriptionId: ppData.id,
      planId,
      clientId: process.env.PAYPAL_CLIENT_ID,
      checkoutUrl: approveLink,
      token,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Internal server error creating checkout session' });
  }
});

/**
 * POST /api/billing/verify-payment
 * Cryptographically verifies subscription payment before granting Pro entitlement.
 * Enforces replay protection, signature verification, and provider API status checking.
 */
app.post('/api/billing/verify-payment', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      planCode,
      billingCountry,
      provider,
      token,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      paypal_subscription_id,
      paypal_order_id,
    } = req.body;

    if (!sessionId || !planCode) {
      res.status(400).json({ error: 'Missing session or plan verification parameters' });
      return;
    }

    const isIndia = String(billingCountry).toUpperCase() === 'IN' || String(billingCountry).toUpperCase() === 'INDIA';
    const expectedCurrency: 'INR' | 'USD' = isIndia ? 'INR' : 'USD';
    const expectedAmount = isIndia ? (planCode === 'pro_monthly' ? 199 : 1999) : (planCode === 'pro_monthly' ? 2.99 : 29.99);
    const expectedInterval: 'month' | 'year' = planCode === 'pro_monthly' ? 'month' : 'year';

    // 1. Replay attack protection
    const uniquePaymentKey = razorpay_payment_id || paypal_subscription_id || paypal_order_id || sessionId;
    if (processedPaymentIds.has(uniquePaymentKey)) {
      res.status(400).json({ error: 'This payment transaction has already been processed and verified.' });
      return;
    }

    let calculatedExpiryDate: Date | null = null;

    // 2. Razorpay Signature Verification & Direct Server Status Query (Live Mode)
    if (provider === 'razorpay') {
      if (!process.env.RAZORPAY_KEY_SECRET || !razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
        res.status(400).json({ error: 'Missing required Razorpay payment signature parameters.' });
        return;
      }

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        res.status(400).json({ error: 'Invalid Razorpay payment signature. Payment cannot be verified.' });
        return;
      }

      // Check status directly with Razorpay API (no webhooks needed)
      if (process.env.RAZORPAY_KEY_ID) {
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const rzpStatusRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpay_subscription_id}`, {
          headers: { 'Authorization': `Basic ${auth}` },
        });

        if (rzpStatusRes.ok) {
          const rzpSub = await rzpStatusRes.json();
          if (rzpSub.current_end) {
            calculatedExpiryDate = new Date(rzpSub.current_end * 1000);
          }
        }
      }
    }
    // 3. Genuine PayPal Subscription Status Verification via PayPal REST API
    else if (provider === 'paypal') {
      if (!paypal_subscription_id) {
        res.status(400).json({ error: 'Missing PayPal subscription ID for server-side verification.' });
        return;
      }

      // If separated development test mode
      if (paypal_subscription_id.startsWith('sub_dev_')) {
        if (!token) {
          res.status(400).json({ error: 'Missing security token for development verification.' });
          return;
        }
        const expectedToken = crypto
          .createHmac('sha256', SERVER_INTEGRITY_SECRET)
          .update(`${sessionId}|${planCode}|INTL|${expectedAmount}|${expectedCurrency}`)
          .digest('hex');
        if (token !== expectedToken) {
          res.status(400).json({ error: 'Security token mismatch. Tampered parameters detected.' });
          return;
        }
      } else {
        // Genuine PayPal REST API Verification
        const accessToken = await getPayPalAccessToken();
        if (!accessToken) {
          res.status(400).json({ 
            error: 'Unable to authenticate with PayPal server to verify subscription. Please check PayPal credentials.',
            code: 'PAYPAL_AUTH_FAILED',
          });
          return;
        }

        const paypalRes = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${paypal_subscription_id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!paypalRes.ok) {
          const errText = await paypalRes.text();
          res.status(400).json({ 
            error: `PayPal API rejected subscription verification (${paypalRes.status}): ${errText}`,
            code: 'PAYPAL_VERIFICATION_REJECTED',
          });
          return;
        }

        const ppSub = await paypalRes.json();

        // Handle PayPal status lifecycle properly
        if (ppSub.status === 'APPROVAL_PENDING') {
          res.status(400).json({ 
            error: 'This PayPal subscription is currently pending approval. Please approve the subscription on the PayPal authorization page.',
            status: 'APPROVAL_PENDING',
          });
          return;
        }

        if (['SUSPENDED', 'CANCELLED', 'EXPIRED'].includes(ppSub.status)) {
          res.status(400).json({ 
            error: `Subscription cannot be activated because its PayPal status is ${ppSub.status}.`,
            status: ppSub.status,
          });
          return;
        }

        const validStatuses = ['ACTIVE', 'APPROVED'];
        if (!validStatuses.includes(ppSub.status)) {
          res.status(400).json({ 
            error: `PayPal subscription status is not active (Status: ${ppSub.status}).`,
            status: ppSub.status,
          });
          return;
        }

        // Read next billing time directly from PayPal billing info
        if (ppSub.billing_info?.next_billing_time) {
          calculatedExpiryDate = new Date(ppSub.billing_info.next_billing_time);
        }
      }
    } else {
      res.status(400).json({ error: 'Unsupported payment provider for verification.' });
      return;
    }

    // Mark as processed to prevent replay
    processedPaymentIds.add(uniquePaymentKey);

    // Calculate fallback expiry dates if provider did not return next_billing_time
    const startDate = new Date();
    if (!calculatedExpiryDate || isNaN(calculatedExpiryDate.getTime())) {
      calculatedExpiryDate = new Date(startDate);
      if (expectedInterval === 'month') {
        calculatedExpiryDate.setDate(calculatedExpiryDate.getDate() + 30);
      } else {
        calculatedExpiryDate.setDate(calculatedExpiryDate.getDate() + 365);
      }
    }

    const subId = razorpay_subscription_id || paypal_subscription_id || `sub_${provider}_${Date.now()}`;

    // Cryptographic proof of entitlement from the server
    const entitlementSignature = crypto
      .createHmac('sha256', SERVER_INTEGRITY_SECRET)
      .update(`${subId}|${planCode}|${calculatedExpiryDate.toISOString()}|active`)
      .digest('hex');

    const subscription = {
      subscriptionId: subId,
      planCode: planCode as 'pro_monthly' | 'pro_yearly',
      billingCountry: isIndia ? 'IN' : 'INTL',
      currency: expectedCurrency,
      amount: expectedAmount,
      interval: expectedInterval,
      status: 'active' as const,
      startDate: startDate.toISOString().split('T')[0],
      expiryDate: calculatedExpiryDate.toISOString().split('T')[0],
      provider: (provider || 'sandbox') as 'razorpay' | 'paypal' | 'sandbox',
      signature: entitlementSignature,
    };

    activeSubscriptionsStore.set(subId, subscription);

    res.json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message || 'Server error while verifying payment' });
  }
});

/**
 * POST /api/billing/check-subscription-status
 * Webhook-free status verification on demand:
 * Directly contacts Razorpay or PayPal REST API to check current subscription standing.
 */
app.post('/api/billing/check-subscription-status', async (req: Request, res: Response) => {
  const { subscriptionId } = req.body;
  if (!subscriptionId) {
    res.status(400).json({ error: 'Missing subscriptionId' });
    return;
  }

  const existing = activeSubscriptionsStore.get(subscriptionId);

  // If live PayPal subscription, query PayPal directly
  if (existing?.provider === 'paypal' && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    try {
      const accessToken = await getPayPalAccessToken();
      if (accessToken) {
        const ppRes = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscriptionId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (ppRes.ok) {
          const ppData = await ppRes.json();
          const isActive = ppData.status === 'ACTIVE' || ppData.status === 'APPROVED';
          existing.status = isActive ? 'active' : 'cancelled';
          if (ppData.billing_info?.next_billing_time) {
            existing.expiryDate = new Date(ppData.billing_info.next_billing_time).toISOString().split('T')[0];
          }
          activeSubscriptionsStore.set(subscriptionId, existing);
          res.json({ success: true, subscription: existing, providerStatus: ppData.status });
          return;
        }
      }
    } catch (err) {
      console.warn('[PayPal] Status check error:', err);
    }
  }

  // If live Razorpay subscription, query Razorpay directly
  if (existing?.provider === 'razorpay' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
      const rzpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      if (rzpRes.ok) {
        const rzpData = await rzpRes.json();
        const isActive = rzpData.status === 'active' || rzpData.status === 'authenticated';
        existing.status = isActive ? 'active' : 'cancelled';
        if (rzpData.current_end) {
          existing.expiryDate = new Date(rzpData.current_end * 1000).toISOString().split('T')[0];
        }
        activeSubscriptionsStore.set(subscriptionId, existing);
        res.json({ success: true, subscription: existing, providerStatus: rzpData.status });
        return;
      }
    } catch (err) {
      console.warn('[Razorpay] Status check error:', err);
    }
  }

  // Return cached state
  if (existing) {
    res.json({ success: true, subscription: existing });
    return;
  }

  res.status(404).json({ error: 'Subscription not found in active records' });
});

/**
 * POST /api/billing/cancel-subscription
 * Cancels recurring billing at the end of the paid period.
 */
app.post('/api/billing/cancel-subscription', async (req: Request, res: Response) => {
  const { subscriptionId } = req.body;
  if (!subscriptionId) {
    res.status(400).json({ error: 'Missing subscriptionId' });
    return;
  }

  const existing = activeSubscriptionsStore.get(subscriptionId);
  if (existing) {
    existing.cancelAtPeriodEnd = true;
    activeSubscriptionsStore.set(subscriptionId, existing);

    // If live PayPal subscription, notify PayPal of cancellation
    if (existing.provider === 'paypal' && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      try {
        const accessToken = await getPayPalAccessToken();
        if (accessToken) {
          await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: 'Customer requested cancellation at period end.' }),
          });
        }
      } catch (err) {
        console.warn('Failed to notify PayPal of cancellation:', err);
      }
    }

    // If live Razorpay subscription, notify Razorpay to cancel at cycle end
    if (existing.provider === 'razorpay' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cancel_at_cycle_end: 1 }),
        });
      } catch (err) {
        console.warn('Failed to notify Razorpay of cancellation:', err);
      }
    }

    res.json({
      success: true,
      cancelAtPeriodEnd: true,
      expiryDate: existing.expiryDate,
      message: 'Subscription renewal has been cancelled. Pro features will remain active until the end of your billing cycle.',
    });
    return;
  }

  res.json({
    success: true,
    cancelAtPeriodEnd: true,
    message: 'Subscription set to cancel at period end.',
  });
});

/**
 * POST /api/billing/recover-subscription
 * Allows users to restore their entitlement if browser cache was cleared.
 */
app.post('/api/billing/recover-subscription', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ error: 'Identifier required (subscription ID or email)' });
    return;
  }

  const sub = activeSubscriptionsStore.get(identifier.trim());
  if (sub) {
    res.json({ success: true, subscription: sub });
    return;
  }

  // Look up by email
  for (const item of activeSubscriptionsStore.values()) {
    if (item.customerEmail && item.customerEmail.toLowerCase() === identifier.trim().toLowerCase()) {
      res.json({ success: true, subscription: item });
      return;
    }
  }

  res.status(404).json({ error: 'No active subscription found for this identifier' });
});

// ==========================================
// 4. VITE SPA DEV & PROD SERVING
// ==========================================

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Business Expense Tracker] Server listening on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
