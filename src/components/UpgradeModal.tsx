import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Shield, Check, Globe, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { 
  getPlanPricing, 
  detectLikelyBillingCountry, 
  isSubscriptionActive 
} from '../utils/subscriptionService';
import { CheckoutModal } from './CheckoutModal';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSubscription: () => void;
  profile: UserProfile;
  title?: string;
  reasonMessage?: string;
  onSubscriptionUpdated?: (updated: UserProfile) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSubscription,
  profile,
  title = 'Upgrade to Pro Account',
  reasonMessage = 'Unlock advanced financial statements, automated obligations, and unlimited ledger entries.',
  onSubscriptionUpdated,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<'IN' | 'INTL'>(() => 
    detectLikelyBillingCountry(profile.billingCountry, profile.currency)
  );
  const [checkoutPlan, setCheckoutPlan] = useState<'pro_monthly' | 'pro_yearly' | null>(null);

  if (!isOpen) return null;

  const isPro = isSubscriptionActive(profile);
  const monthlyPricing = getPlanPricing('pro_monthly', selectedCountry)!;
  const yearlyPricing = getPlanPricing('pro_yearly', selectedCountry)!;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Premium Badge */}
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="text-center space-y-1 mb-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                {reasonMessage}
              </p>
            </div>

            {/* Country Selector */}
            <div className="mb-4 flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>Billing Region:</span>
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCountry('IN')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all pointer-events-auto ${
                    selectedCountry === 'IN'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🇮🇳 India (INR)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCountry('INTL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all pointer-events-auto ${
                    selectedCountry === 'INTL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🌐 Outside India (USD)
                </button>
              </div>
            </div>

            {/* Pro inclusions checklist */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] mb-5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/50">
              <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Unlimited Transactions</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Account Statements PDF</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Project Profitability Analytics</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Automated Recurring Bills</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Receipt Uploads & Attachments</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Multiple Corporate Profiles</span>
              </div>
            </div>

            {/* Plan Cards Grid: ONLY Pro Monthly and Pro Yearly */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Pro Monthly */}
              <div
                onClick={() => setCheckoutPlan('pro_monthly')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:border-blue-500 cursor-pointer bg-white dark:bg-slate-800/80 transition-all pointer-events-auto flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pro Monthly</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {monthlyPricing.formatted}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Billed every month</div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-white text-xs font-bold transition-colors"
                >
                  Subscribe
                </button>
              </div>

              {/* Pro Yearly */}
              <div
                onClick={() => setCheckoutPlan('pro_yearly')}
                className="p-4 rounded-2xl border-2 border-blue-600 dark:border-blue-500 bg-blue-50/10 dark:bg-blue-950/20 text-left hover:border-blue-700 cursor-pointer transition-all pointer-events-auto relative flex flex-col justify-between"
              >
                <span className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                  Save ~16%
                </span>
                <div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Pro Yearly</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {yearlyPricing.formatted}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Billed every year ({yearlyPricing.equivalentMonthlyFormatted})
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors pointer-events-auto"
              >
                Continue Free
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToSubscription();
                }}
                className="flex-1 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs transition-colors pointer-events-auto flex items-center justify-center gap-1.5"
              >
                <span>Full Billing Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Razorpay (India) & PayPal (International) 256-bit secure gateway</span>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Embedded Checkout Modal */}
      {checkoutPlan && (
        <CheckoutModal
          isOpen={true}
          onClose={() => setCheckoutPlan(null)}
          planCode={checkoutPlan}
          billingCountry={selectedCountry}
          profile={profile}
          onSubscriptionSuccess={(result) => {
            if (result.success && result.subscription && onSubscriptionUpdated) {
              onSubscriptionUpdated({
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
            }
            setCheckoutPlan(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
