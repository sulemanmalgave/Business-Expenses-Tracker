import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  CreditCard, 
  Globe, 
  AlertCircle, 
  X, 
  ArrowRight,
  RotateCcw,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  Database,
  Lock,
  Layers
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  isSubscriptionActive, 
  getPlanPricing, 
  detectLikelyBillingCountry, 
  cancelSubscriptionOnServer,
  recoverSubscriptionOnServer,
  checkSubscriptionStatusOnServer
} from '../utils/subscriptionService';
import { CheckoutModal } from './CheckoutModal';

interface SubscriptionViewProps {
  profile: UserProfile;
  transactionsCount: number;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ 
  profile, 
  transactionsCount,
  onUpdateProfile,
  onNavigateTab,
}) => {
  const isPro = isSubscriptionActive(profile);
  
  // Billing country selection: defaults to saved country or auto-detection
  const [selectedCountry, setSelectedCountry] = useState<'IN' | 'INTL'>(() => 
    detectLikelyBillingCountry(profile.billingCountry, profile.currency)
  );

  // Checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<'pro_monthly' | 'pro_yearly' | null>(null);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Feedback notifications
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Handle live status check directly with PayPal or Razorpay
  const handleSyncStatus = async () => {
    if (!profile.subscriptionId) return;
    try {
      setIsSyncing(true);
      const res = await checkSubscriptionStatusOnServer(profile.subscriptionId);
      if (res.success && res.subscription) {
        onUpdateProfile({
          ...profile,
          subscriptionStatus: res.subscription.status,
          subscriptionExpiry: res.subscription.expiryDate,
          cancelAtPeriodEnd: res.subscription.cancelAtPeriodEnd || false,
        });
        setBannerMessage({
          type: 'success',
          text: `Status synchronized directly with gateway: ${res.providerStatus || res.subscription.status}. Expiry: ${res.subscription.expiryDate}.`,
        });
      } else {
        throw new Error(res.error || 'Failed to sync status.');
      }
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.message || 'Could not verify status with gateway.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate days until expiration
  const daysUntilExpiry = profile.subscriptionExpiry 
    ? Math.ceil((new Date(profile.subscriptionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const currentPlanTitle = !isPro
    ? 'Free Starter Plan'
    : profile.subscriptionPlan === 'pro_yearly'
    ? 'Pro Yearly Plan'
    : 'Pro Monthly Plan';

  const monthlyPricing = getPlanPricing('pro_monthly', selectedCountry)!;
  const yearlyPricing = getPlanPricing('pro_yearly', selectedCountry)!;

  // Handle cancellation at period end
  const handleConfirmCancellation = async () => {
    try {
      setIsCancelling(true);
      if (profile.subscriptionId) {
        await cancelSubscriptionOnServer(profile.subscriptionId);
      }
      onUpdateProfile({
        ...profile,
        cancelAtPeriodEnd: true,
      });
      setShowCancelModal(false);
      setBannerMessage({
        type: 'info',
        text: `Your renewal has been cancelled. Your Pro capabilities remain active until ${profile.subscriptionExpiry || 'end of period'}.`,
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.message || 'Failed to cancel subscription renewal.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle recovery
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) return;

    try {
      setIsRecovering(true);
      setRecoveryStatus(null);
      const res = await recoverSubscriptionOnServer(recoveryIdentifier.trim());
      if (res.success && res.subscription) {
        onUpdateProfile({
          ...profile,
          subscriptionPlan: res.subscription.planCode,
          subscriptionStatus: 'active',
          subscriptionExpiry: res.subscription.expiryDate,
          subscriptionId: res.subscription.subscriptionId,
          subscriptionProvider: res.subscription.provider,
          subscriptionInterval: res.subscription.interval,
          subscriptionCurrency: res.subscription.currency,
          subscriptionAmount: res.subscription.amount,
          cancelAtPeriodEnd: false,
          subscriptionSignature: res.subscription.signature,
          subscriptionLastVerified: new Date().toISOString(),
        });
        setShowRecoveryModal(false);
        setBannerMessage({
          type: 'success',
          text: `Successfully recovered ${res.subscription.planCode === 'pro_monthly' ? 'Pro Monthly' : 'Pro Yearly'} subscription!`,
        });
      }
    } catch (err: any) {
      setRecoveryStatus(err.message || 'Could not find active subscription.');
    } finally {
      setIsRecovering(false);
    }
  };

  const usagePercent = Math.min(100, Math.round((transactionsCount / 500) * 100));

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 px-2 sm:px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('dashboard')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors pointer-events-auto"
                title="Return to Dashboard"
              >
                <span>←</span>
                <span>Return to Dashboard</span>
              </button>
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Workspace Commerce & Licensing
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Subscription Plans & Entitlements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare plans, manage recurring billing, and activate Pro accounting features.
          </p>
        </div>

        {/* Regional Billing Country Selector */}
        <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Region:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCountry('IN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all pointer-events-auto ${
              selectedCountry === 'IN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🇮🇳 India (INR ₹)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCountry('INTL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all pointer-events-auto ${
              selectedCountry === 'INTL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🌐 International (USD $)
          </button>
        </div>
      </div>

      {/* Banner message */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : bannerMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : bannerMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <Clock className="w-4 h-4 text-blue-500" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CURRENT STATUS HERO CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPro
                    ? profile.cancelAtPeriodEnd
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isPro ? (profile.cancelAtPeriodEnd ? 'Active (Cancels at period end)' : 'Active Pro Subscription') : 'Free Tier'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {currentPlanTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isPro
                ? `Subscription active via ${profile.subscriptionProvider === 'razorpay' ? 'Razorpay India' : 'PayPal Global'}. Recurring renewal managed securely.`
                : 'You are on the Free Starter Plan. Complete income & expense tracking, client directory, and 100% offline-first storage.'}
            </p>
            {profile.subscriptionId && (
              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block mt-1">
                Subscription ID: {profile.subscriptionId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPro && profile.subscriptionId && (
              <button
                type="button"
                onClick={handleSyncStatus}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs transition-colors pointer-events-auto flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                title="Query gateway directly for real-time status"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync with {profile.subscriptionProvider === 'paypal' ? 'PayPal' : 'Gateway'}</span>
              </button>
            )}
            {isPro && !profile.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs transition-colors pointer-events-auto"
              >
                Cancel Renewal
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowRecoveryModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors pointer-events-auto flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore License</span>
            </button>
          </div>
        </div>

        {/* Quota / Expiry Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transaction Ledger Usage */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">Transaction Ledger Usage</span>
              <span className="font-mono text-slate-500">
                {isPro ? `${transactionsCount} (Unlimited Pro)` : `${transactionsCount} / 500 records`}
              </span>
            </div>
            {!isPro && (
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              {isPro
                ? 'Your Pro account includes unlimited transactions across all financial periods.'
                : 'Free tier permits up to 500 records. Upgrading to Pro unlocks unlimited records.'}
            </p>
          </div>

          {/* Period Expiry / Next Renewal */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {isPro ? (profile.cancelAtPeriodEnd ? 'Access Valid Until' : 'Next Billing Date') : 'Renewal Status'}
              </span>
              <span className="font-mono text-slate-500 font-semibold">
                {isPro && profile.subscriptionExpiry ? profile.subscriptionExpiry : 'No Renewal Required'}
              </span>
            </div>
            {isPro && daysUntilExpiry !== null && (
              <p className="text-[11px] text-slate-500">
                {daysUntilExpiry > 0
                  ? `${daysUntilExpiry} day(s) remaining in the current billing period.`
                  : 'Subscription cycle expired. Renew to re-activate Pro tools.'}
              </p>
            )}
            {!isPro && (
              <p className="text-[11px] text-slate-400">
                Free plan does not expire. Your recorded data is permanently stored offline.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PRICING CARDS: 3 PLANS (FREE, PRO MONTHLY, PRO YEARLY) */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Options</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choose Your Accounting Tier</h2>
          <p className="text-xs text-slate-500">
            {selectedCountry === 'IN'
              ? 'Transparent Indian business pricing in INR (₹) via Razorpay. Billed monthly or annually.'
              : 'Global business pricing in USD ($) via PayPal. Billed monthly or annually.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. FREE PLAN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Forever Free</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Free Plan</h3>
                  <p className="text-xs text-slate-500">Core small business bookkeeping</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {selectedCountry === 'IN' ? '₹0' : '$0'}
                  </span>
                  <span className="text-xs text-slate-400 block">/ forever</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] text-slate-500 font-medium">
                100% free offline bookkeeping with permanent device storage.
              </div>

              {/* Feature highlights: Exactly the 8 free items */}
              <ul className="space-y-2 text-xs text-slate-650 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Income & expense tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Basic financial dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Basic financial summaries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Basic categories management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Centralized client management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Basic transaction history (up to 500)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Full CSV export (Always Free)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Manual backup & restore (Always Free)</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
              {!isPro ? (
                <div className="w-full py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs text-center border border-emerald-200/60 dark:border-emerald-800/60">
                  Current Active Plan
                </div>
              ) : (
                <div className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs text-center">
                  Base Included
                </div>
              )}
            </div>
          </div>

          {/* 2. PRO MONTHLY */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-blue-500/50 transition-all">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flexible Monthly</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Pro Monthly</h3>
                  <p className="text-xs text-slate-500">Cancel renewal anytime</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{monthlyPricing.formatted}</span>
                  <span className="text-xs text-slate-400 block">/ month</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] text-slate-500 font-medium">
                Recurring charge of {monthlyPricing.formatted} billed every month. Cancel anytime with zero data loss.
              </div>

              {/* Feature highlights: Exactly the Pro items */}
              <ul className="space-y-2 text-xs text-slate-650 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold">All Free Plan features included</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Advanced financial reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Detailed printable PDF account statements</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Monthly & custom-period income statements</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Client & project profitability reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Batch receipt OCR & instant scanning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Recurring bills & cash-flow forecasting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Advanced analytics & report filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Advanced invoice & estimate features</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
              {profile.subscriptionPlan === 'pro_monthly' && isPro ? (
                <div className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs text-center">
                  Current Active Plan
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCheckoutPlan('pro_monthly')}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 pointer-events-auto"
                >
                  <span>Subscribe Monthly ({monthlyPricing.formatted}/mo)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 3. PRO YEARLY */}
          <div className="bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 rounded-3xl p-6 shadow-md flex flex-col justify-between relative">
            <span className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-3 py-1 rounded-full shadow-xs">
              Best Value • Save ~16%
            </span>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Annual Commitment
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Pro Yearly</h3>
                  <p className="text-xs text-slate-500">12-month lock-in & best rate</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{yearlyPricing.formatted}</span>
                  <span className="text-xs text-slate-400 block">/ year</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                Recurring charge of {yearlyPricing.formatted} billed every year (equivalent to {yearlyPricing.equivalentMonthlyFormatted}).
              </div>

              {/* Feature highlights */}
              <ul className="space-y-2 text-xs text-slate-650 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-bold">Everything included in Pro Monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Save ~16% compared to monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full year of uninterrupted ledger activation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Protected against future subscription price changes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Priority processing for batch receipts & OCR</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Ideal for established businesses and consultants</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
              {profile.subscriptionPlan === 'pro_yearly' && isPro ? (
                <div className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs text-center">
                  Current Active Plan
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCheckoutPlan('pro_yearly')}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 pointer-events-auto"
                >
                  <span>Subscribe Yearly ({yearlyPricing.formatted}/yr)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE COMPARISON TABLE (FREE VS PRO) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Feature Entitlement Matrix</h3>
          <p className="text-xs text-slate-500">Transparent comparison of Free Starter vs Pro subscription capabilities.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Feature / Capability</th>
                <th className="py-3 px-4">Free Plan</th>
                <th className="py-3 px-4 text-blue-600 dark:text-blue-400">Pro (Monthly & Yearly)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 px-4 font-semibold">Income & Expense Tracking</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included (Full offline)</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Included (Unlimited)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Basic Financial Dashboard & Metrics</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Included + Advanced Charts</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Client Management System</td>
                <td className="py-3 px-4 text-emerald-600 font-semibold">Included (Full Directory)</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Included + Profitability Tracking</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Full CSV Export (Data Portability)</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Always Free (Never Paywalled)</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Always Free (Never Paywalled)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Manual JSON Backup & Restore</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Always Free (Never Paywalled)</td>
                <td className="py-3 px-4 text-emerald-600 font-bold">Always Free (Never Paywalled)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Transaction Ledger Entries</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Up to 500 records</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Advanced Financial Reports</td>
                <td className="py-3 px-4 text-slate-400">Basic Summaries</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Full Advanced Reports</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Printable PDF Account Statements</td>
                <td className="py-3 px-4 text-slate-400">On-screen View Only</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">High-Resolution PDF Download</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Monthly & Custom-Period Statements</td>
                <td className="py-3 px-4 text-slate-400">Current Month Only</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Custom Date Range & Full FY</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Client & Project Profitability</td>
                <td className="py-3 px-4 text-slate-400">Not Included</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Full Profitability Breakdown</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Batch Receipt OCR & Scanning</td>
                <td className="py-3 px-4 text-slate-400">Manual Entry</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Multi-File Smart OCR</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Recurring Bills & Forecasting</td>
                <td className="py-3 px-4 text-slate-400">Manual Entry</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Automated Scheduling</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Advanced Analytics & Deep Filters</td>
                <td className="py-3 px-4 text-slate-400">Basic Category Totals</td>
                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">Trend Lines & Multi-Filter</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Return to Dashboard and Safety Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>
            <strong className="text-slate-800 dark:text-slate-200">Data Preservation Guarantee:</strong> All financial entries, clients, invoices, and backups are permanently stored on your device and will never be deleted or held hostage.
          </span>
        </div>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('dashboard')}
            className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl transition-colors pointer-events-auto"
          >
            ← Return to Dashboard
          </button>
        )}
      </div>

      {/* MODAL: CHECKOUT */}
      {checkoutPlan && (
        <CheckoutModal
          isOpen={true}
          onClose={() => setCheckoutPlan(null)}
          planCode={checkoutPlan}
          billingCountry={selectedCountry}
          profile={profile}
          onSubscriptionSuccess={(result) => {
            if (result.success && result.subscription) {
              onUpdateProfile({
                ...profile,
                billingCountry: selectedCountry,
                subscriptionPlan: result.subscription.planCode,
                subscriptionStatus: 'active',
                subscriptionExpiry: result.subscription.expiryDate,
                subscriptionId: result.subscription.subscriptionId,
                subscriptionProvider: result.subscription.provider,
                subscriptionInterval: result.subscription.interval,
                subscriptionCurrency: result.subscription.currency,
                subscriptionAmount: result.subscription.amount,
                cancelAtPeriodEnd: false,
                subscriptionSignature: result.subscription.signature,
                subscriptionLastVerified: new Date().toISOString(),
              });
              setBannerMessage({
                type: 'success',
                text: `Welcome to Pro! Your ${result.subscription.planCode === 'pro_monthly' ? 'monthly' : 'yearly'} subscription is now active.`,
              });
            }
            setCheckoutPlan(null);
          }}
        />
      )}

      {/* MODAL: CANCEL RENEWAL CONFIRMATION */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Cancel Subscription Renewal?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your Pro capabilities will remain completely active until your current billing period ends on{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.subscriptionExpiry}</span>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Zero Data Loss Guarantee</span>
              </div>
              <p>
                All your recorded transactions, clients, categories, invoices, and backups are permanently safe. You will never lose access to your financial history.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors pointer-events-auto"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancellation}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors pointer-events-auto"
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESTORE / RECOVER SUBSCRIPTION */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <RotateCcw className="w-6 h-6" />
              </div>
              <button onClick={() => setShowRecoveryModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Restore Previous Subscription</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your subscription ID or billing email address to retrieve your active license.
              </p>
            </div>

            <form onSubmit={handleRecover} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Subscription ID or Billing Email
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sub_123456 or user@business.com"
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              {recoveryStatus && (
                <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  {recoveryStatus}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 pointer-events-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs pointer-events-auto"
                >
                  {isRecovering ? 'Locating...' : 'Restore License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
