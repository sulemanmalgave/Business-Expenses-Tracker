import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Shield, Calendar, CreditCard, Award, Zap, HelpCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { isSubscriptionActive } from '../utils/subscriptionService';

interface SubscriptionViewProps {
  profile: UserProfile;
  transactionsCount: number;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ 
  profile, 
  transactionsCount,
  onUpdateProfile
}) => {
  const isPremium = isSubscriptionActive(profile);
  const isLifetime = profile.subscriptionPlan === 'lifetime';
  
  // Calculate expiry info
  const daysUntilExpiry = profile.subscriptionExpiry 
    ? Math.ceil((new Date(profile.subscriptionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const currentPlanLabel = isLifetime 
    ? 'Pro Lifetime Plan' 
    : profile.subscriptionPlan === 'pro_yearly' 
    ? 'Pro Yearly' 
    : profile.subscriptionPlan === 'pro_monthly' 
    ? 'Pro Monthly' 
    : 'Free Plan';

  // State for success feedback message
  const [successMsg, setSuccessMsg] = useState('');

  // Handle plan simulation/purchase
  const handlePurchasePlan = (plan: 'free' | 'pro_monthly' | 'pro_yearly' | 'lifetime') => {
    let expiryDateString = '';
    
    if (plan === 'pro_monthly') {
      const d = new Date();
      d.setDate(d.getDate() + 30); // 30 days
      expiryDateString = d.toISOString().split('T')[0];
    } else if (plan === 'pro_yearly') {
      const d = new Date();
      d.setDate(d.getDate() + 365); // 365 days
      expiryDateString = d.toISOString().split('T')[0];
    }

    onUpdateProfile({
      ...profile,
      subscriptionPlan: plan,
      subscriptionExpiry: expiryDateString || undefined,
    });

    setSuccessMsg(`Congratulations! Safely updated ledger profile to ${plan === 'lifetime' ? 'Lifetime' : plan === 'pro_monthly' ? 'Pro Monthly' : plan === 'pro_yearly' ? 'Pro Yearly' : 'Free'} plan.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Expire days simulation modifier
  const setSimulatedExpiryDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    onUpdateProfile({
      ...profile,
      subscriptionPlan: profile.subscriptionPlan === 'free' || isLifetime ? 'pro_monthly' : profile.subscriptionPlan,
      subscriptionExpiry: d.toISOString().split('T')[0]
    });
    setSuccessMsg(`Simulating subscription expiry: Expiry date set to exactly ${days} day(s) from now.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const usagePercent = Math.min(100, Math.round((transactionsCount / 500) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <header className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Workspace Billing</span>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Subscription & Billing Portal</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Manage transaction quotas, license credentials, and checkout plan states.</p>
      </header>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-2xl flex gap-2.5 items-center text-xs animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Grid: Plan overview & metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: Account Quota & Expiry */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-6 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Current License Summary</h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-black text-slate-900 dark:text-white">{currentPlanLabel}</span>
              {isLifetime && (
                <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3 fill-indigo-500" />
                  <span>Lifetime Badge</span>
                </span>
              )}
            </div>
            
            {/* Expiry subtitle indicator */}
            {!isLifetime && profile.subscriptionExpiry && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Expires: {profile.subscriptionExpiry} {daysUntilExpiry !== null && (
                    <span>({daysUntilExpiry >= 0 ? `${daysUntilExpiry} days remaining` : `Expired ${Math.abs(daysUntilExpiry)} days ago`})</span>
                  )}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Free Transaction Quota Usage</h3>
              <div className="flex justify-between items-baseline mt-1.5">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {transactionsCount} / 500 slots
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">{usagePercent}% used</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    transactionsCount >= 500 
                      ? 'bg-rose-500' 
                      : transactionsCount >= 400 
                      ? 'bg-amber-500' 
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Expiring Reminders alerts simulation display */}
            {!isLifetime && profile.subscriptionPlan !== 'free' && daysUntilExpiry !== null && (
              <div className={`p-4 rounded-2xl border text-xs gap-2.5 flex items-start ${
                daysUntilExpiry <= 0
                  ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400'
                  : daysUntilExpiry <= 3
                  ? 'bg-rose-50/50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                  : daysUntilExpiry <= 7
                  ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400'
                  : 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-400'
              }`}>
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {daysUntilExpiry <= 0 
                      ? 'Access Quota Locked' 
                      : daysUntilExpiry <= 3 
                      ? 'Critical Renewal Warning!' 
                      : daysUntilExpiry <= 7 
                      ? 'Action Required: Renew Soon' 
                      : 'Subscription is Active & Secure'}
                  </p>
                  <p className="opacity-90 font-sans leading-relaxed text-[11px]">
                    {daysUntilExpiry <= 0 
                      ? 'Your subscription expired. Renew immediately to restore standard corporate sidebar views and prevent lockouts.'
                      : daysUntilExpiry <= 3 
                      ? `Your subscription expires in exactly ${daysUntilExpiry} days. An urgent reminder banner is active.`
                      : daysUntilExpiry <= 7 
                      ? `Your subscription expires in ${daysUntilExpiry} days. Sidebar and notification alerts are now active.`
                      : `Your subscription is active and in good standing. ${daysUntilExpiry} remaining days left before renewal.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Simulator Controls for Sandbox */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
              <span>Premium Simulation sandbox</span>
            </h2>
            <p className="text-[10px] text-slate-450 mt-0.5">Test real-time sidebar visibility, crown indicators, and expiry alerts.</p>
          </div>

          <div className="space-y-4">
            {/* Simulator Action Row 1 */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Switch License Plan State</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePurchasePlan('free')}
                  className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-center text-xs pointer-events-auto transition-colors"
                >
                  Free License
                </button>
                <button
                  onClick={() => handlePurchasePlan('pro_monthly')}
                  className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-center text-xs pointer-events-auto transition-colors"
                >
                  Pro Monthly
                </button>
                <button
                  onClick={() => handlePurchasePlan('pro_yearly')}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center text-xs pointer-events-auto transition-colors"
                >
                  Pro Yearly (365d)
                </button>
                <button
                  onClick={() => handlePurchasePlan('lifetime')}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center text-xs pointer-events-auto transition-colors"
                >
                  Pro Lifetime 💎
                </button>
              </div>
            </div>

            {/* Simulator Action Row 2 - Expiry remaining days slider/inputs */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Simulate Days Until Expiry</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '14 Days', days: 14 },
                  { label: '7 Days', days: 7 },
                  { label: '3 Days', days: 3 },
                  { label: 'Expired', days: -1 }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setSimulatedExpiryDays(item.days)}
                    className="py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-850 dark:text-slate-200 text-[10px] font-bold rounded-xl pointer-events-auto transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main interactive plans checkout grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Premium Plan Matrix Choices</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Plan 1: Pro Monthly */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 relative flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 px-2.5 py-1 rounded-full uppercase">Basic Rollover</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Pro Monthly</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perfect for freelancers and short contracts.</p>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">$4.99</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handlePurchasePlan('pro_monthly')}
                className="w-full py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-xs pointer-events-auto transition-all"
              >
                Access Monthly
              </button>
            </div>
          </div>

          {/* Plan 2: Pro Yearly */}
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 shadow-md shadow-indigo-500/5 space-y-4 relative flex flex-col justify-between">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest bg-indigo-600 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
              Highly Recommended (Save 20%)
            </span>
            
            <div className="space-y-2">
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase">Standard Annual</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Pro Yearly</h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-sans">Ideal for small businesses and serious managers.</p>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">$49.00</span>
                <span className="text-xs text-slate-400">/ year</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handlePurchasePlan('pro_yearly')}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs pointer-events-auto transition-all shadow-sm"
              >
                Access Yearly
              </button>
            </div>
          </div>

          {/* Plan 3: Lifetime */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 relative flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full uppercase">Supreme Sovereign</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Lifetime Deal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pay once, own forever. Never see any renewal reminder block.</p>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">$99.00</span>
                <span className="text-xs text-slate-400">one-time payment</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handlePurchasePlan('lifetime')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs pointer-events-auto transition-all shadow-sm"
              >
                Buy Lifetime License
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Benefits specifications checklist */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Pro Feature Inclusions Specifications</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Offline-First Storage Cap Lifted',
              desc: 'Store millions of financial transaction logs locally without boundary blocks.',
            },
            {
              title: 'Multi-Corporate Entities Sandbox',
              desc: 'Toggle independent balance books with unique currency tokens directly under Settings.',
            },
            {
              title: 'Executive PDF/CSV Formatting',
              desc: 'Generate complete Income Statements, Overhead Logs, or P&L tables ready for CPA inspection.',
            },
            {
              title: 'Local Receipt Metadata Archive',
              desc: 'Upload/attach static image file attachments directly to individual ledger ledger entries.',
            }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="w-5 h-5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
