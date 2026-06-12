import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { isSubscriptionActive } from '../utils/subscriptionService';

interface SubscriptionViewProps {
  profile: UserProfile;
  transactionsCount: number;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ 
  profile, 
  transactionsCount 
}) => {
  const isPremium = isSubscriptionActive(profile);
  const currentPlan = profile.subscriptionPlan === 'pro_yearly' 
    ? 'Pro Yearly' 
    : profile.subscriptionPlan === 'pro_monthly' 
    ? 'Pro Monthly' 
    : 'Free Plan';

  const usagePercent = Math.min(100, Math.round((transactionsCount / 500) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Subscription & Billing</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Current Plan</h3>
            <p className="text-xl font-black text-slate-900 dark:text-white">{currentPlan}</p>
            
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Usage</h3>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {transactionsCount} / 500 Transactions Used
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Available Plans</h3>
            <div className="space-y-3">
              {['Pro Monthly', 'Pro Yearly (Best Value)', 'Lifetime'].map((plan) => (
                <div key={plan} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{plan}</span>
                </div>
              ))}
            </div>
            
            {!isPremium && (
              <button className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                Upgrade Now
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Plan Benefits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            'Unlimited Transactions',
            'Excel & PDF Export',
            'Receipt Attachments',
            'Multiple Businesses',
            'Advanced Analytics'
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
