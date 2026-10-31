import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  X, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Lock,
  Globe,
  Sparkles,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  SubscriptionPlanCode, 
  getPlanPricing, 
  createCheckoutSession, 
  verifyPaymentOnServer, 
  VerifyPaymentResult,
  CheckoutSessionResponse 
} from '../utils/subscriptionService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planCode: 'pro_monthly' | 'pro_yearly';
  billingCountry: string;
  profile: UserProfile;
  onSubscriptionSuccess: (result: VerifyPaymentResult) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  planCode,
  billingCountry,
  profile,
  onSubscriptionSuccess,
}) => {
  const [step, setStep] = useState<'review' | 'processing' | 'paypal_approval' | 'success' | 'error'>('review');
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<any>(null);

  const pricing = getPlanPricing(planCode, billingCountry);
  const isIndia = billingCountry === 'IN' || billingCountry.toUpperCase() === 'INDIA';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen || !pricing) return null;

  const handleStartCheckout = async () => {
    try {
      setStep('processing');
      setErrorMessage('');
      setErrorCode('');

      // 1. Create server-validated session
      const sessionData = await createCheckoutSession({
        planCode,
        billingCountry,
        customerEmail: profile.email,
        customerName: profile.ownerName,
      });

      setSession(sessionData);

      // 2. Handle Razorpay (India)
      if (sessionData.provider === 'razorpay') {
        if (!sessionData.keyId) {
          throw new Error('Razorpay Key ID is not configured on the server.');
        }

        // Load Razorpay Checkout dynamically
        if (typeof window !== 'undefined' && !(window as any).Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        const options = {
          key: sessionData.keyId,
          subscription_id: sessionData.subscriptionId,
          name: 'Business Expense Tracker Pro',
          description: `${planCode === 'pro_monthly' ? 'Pro Monthly (₹199/mo)' : 'Pro Yearly (₹1,999/yr)'} Subscription`,
          handler: async (response: any) => {
            try {
              setIsVerifying(true);
              const verifyRes = await verifyPaymentOnServer({
                sessionId: sessionData.sessionId,
                planCode,
                billingCountry,
                provider: 'razorpay',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });
              onSubscriptionSuccess(verifyRes);
              setStep('success');
            } catch (err: any) {
              setErrorMessage(err.message || 'Payment verification failed on server.');
              setStep('error');
            } finally {
              setIsVerifying(false);
            }
          },
          modal: {
            ondismiss: () => {
              setErrorMessage('Payment cancelled by user.');
              setStep('error');
            },
          },
          prefill: {
            name: profile.ownerName,
            email: profile.email,
          },
          theme: { color: '#2563eb' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // 3. Handle PayPal (International)
      if (sessionData.provider === 'paypal') {
        setStep('paypal_approval');
        // Auto-open PayPal approval window if popup allowed, or let user click button
        if (sessionData.checkoutUrl) {
          const popup = window.open(
            sessionData.checkoutUrl, 
            'PayPalCheckout', 
            'width=520,height=720,menubar=no,toolbar=no,location=no,status=no'
          );

          // Start polling server every 4 seconds to see if PayPal subscription transitioned to ACTIVE
          if (sessionData.subscriptionId) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            let checksRemaining = 25; // 100 seconds max poll
            pollIntervalRef.current = setInterval(async () => {
              checksRemaining--;
              if (checksRemaining <= 0) {
                clearInterval(pollIntervalRef.current);
                return;
              }
              try {
                const verifyRes = await verifyPaymentOnServer({
                  sessionId: sessionData.sessionId,
                  planCode,
                  billingCountry,
                  provider: 'paypal',
                  paypal_subscription_id: sessionData.subscriptionId,
                });
                if (verifyRes.success && verifyRes.subscription) {
                  clearInterval(pollIntervalRef.current);
                  if (popup && !popup.closed) popup.close();
                  onSubscriptionSuccess(verifyRes);
                  setStep('success');
                }
              } catch (e: any) {
                // Subscription may still be APPROVAL_PENDING while buyer enters card or logs into PayPal
                // Only stop if error is fatal
                if (e.message && !e.message.includes('pending approval') && !e.message.includes('APPROVAL_PENDING')) {
                  // Wait for user to interact
                }
              }
            }, 4000);
          }
        }
        return;
      }

      throw new Error('Unsupported payment provider configured.');
    } catch (err: any) {
      console.warn('Checkout session notice:', err.message);
      setErrorMessage(err.message || 'Could not connect to payment gateway.');
      setErrorCode(err.code || '');
      setStep('error');
    }
  };

  // Handler for separated development testing mode
  const handleCompleteDevTestPayment = async () => {
    if (!session || !session.subscriptionId) return;
    try {
      setIsVerifying(true);
      setErrorMessage('');
      const verifyRes = await verifyPaymentOnServer({
        sessionId: session.sessionId,
        planCode,
        billingCountry,
        provider: 'paypal',
        paypal_subscription_id: session.subscriptionId,
        token: session.token,
      });

      if (verifyRes.success && verifyRes.subscription) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        onSubscriptionSuccess(verifyRes);
        setStep('success');
      } else {
        throw new Error(verifyRes.error || 'Failed to complete development test subscription.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed on server.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Manual check button when user finishes approval on PayPal
  const handleCheckPayPalStatus = async () => {
    if (!session || !session.subscriptionId) return;
    try {
      setIsVerifying(true);
      setErrorMessage('');
      const verifyRes = await verifyPaymentOnServer({
        sessionId: session.sessionId,
        planCode,
        billingCountry,
        provider: 'paypal',
        paypal_subscription_id: session.subscriptionId,
      });

      if (verifyRes.success && verifyRes.subscription) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        onSubscriptionSuccess(verifyRes);
        setStep('success');
      } else {
        throw new Error(verifyRes.error || 'Subscription has not been approved on PayPal yet.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'PayPal subscription could not be confirmed as active.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>

          {/* STEP 1: REVIEW ORDER */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Complete Your Subscription</h3>
                  <p className="text-xs text-slate-500">Official gateway checkout with verified server authorization</p>
                </div>
              </div>

              {/* Order summary box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {isIndia ? 'Razorpay India Subscriptions' : 'PayPal Subscriptions (International)'}
                    </span>
                    <h4 className="font-black text-slate-900 dark:text-white text-lg">
                      {planCode === 'pro_monthly' ? 'Pro Monthly Plan' : 'Pro Yearly Plan'}
                    </h4>
                    <p className="text-xs text-slate-500">Billed {pricing.intervalLabel}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-2xl text-slate-900 dark:text-white">{pricing.formatted}</span>
                    <span className="text-xs text-slate-400 block">/{pricing.interval}</span>
                  </div>
                </div>

                {pricing.equivalentMonthlyFormatted && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Yearly commitment savings:</span>
                    <span>{pricing.equivalentMonthlyFormatted} (Save ~{pricing.savingsPercent}%)</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs text-slate-500">
                  <span>Billing Country & Gateway:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isIndia ? '🇮🇳 India — Razorpay (INR)' : '🌐 International — PayPal (USD)'}
                  </span>
                </div>
              </div>

              {/* Security disclosures */}
              <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>256-bit SSL encrypted. Payment credentials never touch our app server.</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Recurring subscription. Manage or cancel anytime without losing your financial history.</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors pointer-events-auto"
                >
                  Return to App
                </button>
                <button
                  type="button"
                  onClick={handleStartCheckout}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 pointer-events-auto"
                >
                  <span>{isIndia ? 'Proceed to Razorpay' : 'Proceed to PayPal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Connecting to Gateway...</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Initializing verified session with {isIndia ? 'Razorpay Subscriptions' : 'PayPal Subscriptions API'}
              </p>
            </div>
          )}

          {/* STEP 3: GENUINE PAYPAL APPROVAL STAGE */}
          {step === 'paypal_approval' && session && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  session.isSandbox 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400' 
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Approve on PayPal</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {session.isSandbox ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60">
                        PayPal Sandbox Mode (developer.paypal.com)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        PayPal Live Production (Official Gateway)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subscription Plan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {planCode === 'pro_monthly' ? 'Pro Monthly ($2.99/mo)' : 'Pro Yearly ($29.99/yr)'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Recurring Price:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {pricing.formatted} USD
                  </span>
                </div>
                {session.subscriptionId && (
                  <div className="flex justify-between text-slate-500">
                    <span>PayPal Subscription ID:</span>
                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                      {session.subscriptionId}
                    </span>
                  </div>
                )}
              </div>

              {session.isDevTestMode ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1.5">
                    <p className="font-bold flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Development Environment Notice</span>
                    </p>
                    <p className="text-[10.5px] leading-relaxed opacity-90">
                      {session.diagnostic || 'PayPal credentials in server environment require configuration.'}
                    </p>
                    <p className="text-[10.5px] leading-relaxed opacity-90">
                      To verify the application's full Pro feature suite (PDF statements, client profitability, advanced analytics), you can activate a test license below:
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleCompleteDevTestPayment}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Development Session...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Activate Pro License (Development Test Mode)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {session.isSandbox && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>PayPal Sandbox Testing Instructions</span>
                      </p>
                      <p className="text-[10.5px] leading-relaxed opacity-90">
                        Log in using any PayPal Sandbox Personal/Buyer account created in your PayPal Developer Dashboard (<code className="font-mono">sb-buyer...</code>). No real funds will be charged.
                      </p>
                    </div>
                  )}

                  {!session.isSandbox && (
                    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Official PayPal Authorization</span>
                      </p>
                      <p className="text-[10.5px] leading-relaxed opacity-90">
                        Click below to securely authenticate with PayPal. You can use your PayPal account balance, connected bank, or debit/credit card.
                      </p>
                    </div>
                  )}

                  {session.checkoutUrl && (
                    <a
                      href={session.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 pointer-events-auto"
                    >
                      <Lock className="w-4 h-4 text-white/90" />
                      <span>Continue to PayPal Checkout Page</span>
                      <ExternalLink className="w-4 h-4 ml-0.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleCheckPayPalStatus}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Subscription Status with PayPal...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>I have Approved on PayPal — Verify Status</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10.5px] text-center text-slate-400 leading-snug">
                    Polling PayPal servers automatically every 4 seconds. Once approved, Pro features unlock immediately.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-xl text-slate-900 dark:text-white">Pro Subscription Activated!</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Payment verified cryptographically with gateway servers. All Pro capabilities have been unlocked on your workspace.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all pointer-events-auto"
              >
                Access Pro Features
              </button>
            </div>
          )}

          {/* STEP 5: ERROR & DIAGNOSTIC CARD */}
          {step === 'error' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Payment Gateway Notice</h3>
              
              <div className="text-left text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 max-w-md mx-auto space-y-2">
                <p className="font-semibold">{errorMessage || 'Payment could not be confirmed.'}</p>
                {errorCode === 'PAYPAL_AUTH_FAILED' && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-rose-200/50 dark:border-rose-900/40 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">How to configure PayPal Developer credentials:</span>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Log in at <a href="https://developer.paypal.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-600">developer.paypal.com</a></li>
                      <li>Go to <strong>Apps & Credentials</strong> &gt; Sandbox</li>
                      <li>Copy your Sandbox <strong>Client ID</strong> &amp; <strong>Secret</strong> (do not copy the same value for both)</li>
                      <li>Set <code className="font-mono bg-rose-100 dark:bg-rose-900/40 px-1 py-0.5 rounded">PAYPAL_CLIENT_ID</code> and <code className="font-mono bg-rose-100 dark:bg-rose-900/40 px-1 py-0.5 rounded">PAYPAL_CLIENT_SECRET</code></li>
                    </ol>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 pointer-events-auto hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs pointer-events-auto transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
