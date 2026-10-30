# Simplified Payment Gateway Integration Guide
## Business Expense Tracker – Small Business

This guide explains the minimal, production-ready payment configuration using only **four environment credentials** across **Razorpay** (India) and **PayPal** (Outside India).

No manual plan IDs or webhook endpoints are required.

---

### 1. Minimal Credentials Required

You only need to define four variables in your deployment environment or `.env` file:

```bash
# Internal security key for signing session tokens (anti-tamper)
SERVER_INTEGRITY_SECRET="your-secure-internal-secret-min-32-chars"

# --- 1. Razorpay (India: INR ₹) ---
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# --- 2. PayPal (Outside India: USD $) ---
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
```

---

### 2. Supported Regional Pricing & Gateways

| Customer Region | Payment Gateway | Currency | Pro Monthly | Pro Yearly |
| :--- | :--- | :--- | :--- | :--- |
| **India** | **Razorpay Subscriptions** | **INR (₹)** | **₹199** / month | **₹1,999** / year |
| **Outside India** | **PayPal Subscriptions** | **USD ($)** | **$2.99** / month | **$29.99** / year |

- **No Lifetime Plan**: Subscriptions are strictly recurring (monthly or yearly).
- **Zero Currency Conversion**: USD amounts are never converted into INR; INR amounts are never converted into USD.

---

### 3. Automated Plan Management (No Manual Plan IDs)

The application automatically resolves or creates the required subscription plans through provider REST APIs on first use:

1. **Razorpay Plans**:
   - The backend checks existing plans in your Razorpay account (`GET /v1/plans`) for ₹199 monthly or ₹1,999 yearly.
   - If not found, the backend creates the plan via `POST /v1/plans` with the exact pricing and interval.
   - The resulting plan IDs are cached in server memory.

2. **PayPal Products & Plans**:
   - The backend verifies or registers the catalog product (`POST /v1/catalogs/products`).
   - The backend searches your active billing plans (`GET /v1/billing/plans`) for $2.99 monthly or $29.99 yearly.
   - If not found, it creates the plan via `POST /v1/billing/plans`.
   - The resulting plan IDs are cached in server memory.

You never have to copy or paste plan IDs into environment variables.

---

### 4. Direct Server-Side Verification (Zero Webhooks)

Webhooks are completely unnecessary:

1. **Creation & Approval Verification**:
   - **Razorpay**: The backend cryptographically validates the HMAC-SHA256 signature (`razorpay_payment_id|razorpay_subscription_id`) using `RAZORPAY_KEY_SECRET` and queries `GET /v1/subscriptions/{id}` to verify active standing.
   - **PayPal**: The backend calls PayPal's trusted REST API (`GET /v1/billing/subscriptions/{id}`) using OAuth2 Bearer authentication to verify `ACTIVE` or `APPROVED` status before issuing entitlement.
2. **On-Demand Status Polling**:
   - The endpoint `POST /api/billing/check-subscription-status` allows checking real-time subscription status against provider APIs directly when a user restores a license or loads workspace billing.
3. **Replay Protection**:
   - Every transaction identifier is tracked to prevent replay attacks.
4. **Data Protection Guarantee**:
   - If a subscription is cancelled or expires, free ledger features (CSV export, offline JSON backup/restore, PDF reports) remain 100% accessible with zero data loss.

---

### 5. Obtaining the Credentials

#### A. Razorpay (India)
1. Sign in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** -> **API Keys**.
3. Generate or copy your `Key Id` (`RAZORPAY_KEY_ID`) and `Key Secret` (`RAZORPAY_KEY_SECRET`).

#### B. PayPal (International)
1. Sign in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Under **Apps & Credentials**, create or select your REST API application.
3. Copy the `Client ID` (`PAYPAL_CLIENT_ID`) and `Secret` (`PAYPAL_CLIENT_SECRET`).
