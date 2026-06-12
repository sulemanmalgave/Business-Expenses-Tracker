import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Shield, Check, Heart, HelpCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { getDisplayPrice } from '../utils/subscriptionService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSubscription: () => void;
  profile: UserProfile;
  title?: string;
  reasonMessage?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSubscription,
  profile,
  title = 'Upgrade to Pro Account',
  reasonMessage = 'Unlock ultimate financial ledger control and remove all transaction tracking boundaries.'
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm pointer-events-auto select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
        >
          {/* Close Trigger Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Premium Logo Design */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-1.5 mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-150 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {reasonMessage}
            </p>
          </div>

          {/* Premium inclusions checklist */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] mb-6 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850">
            <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Unlimited Transactions</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>PDF-Formatted Reports</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Excel-Compatible Export</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Receipt Image Uploads</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Recurring Money Streams</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-650 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Multiple Business Profiles</span>
            </div>
          </div>

          {/* Core Plans Highlight Grid */}
          <div className="space-y-2.5 mb-6">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Premium Plan Packages</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Monthly */}
              <div 
                onClick={onNavigateToSubscription}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center hover:border-blue-500/50 cursor-pointer bg-white dark:bg-slate-950 transition-all pointer-events-auto"
              >
                <div className="text-[10px] text-slate-400 font-bold uppercase">Monthly</div>
                <div className="text-base font-black text-slate-800 dark:text-white mt-1">
                  {getDisplayPrice('pro_monthly', profile.currency).formatted}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">/ month</div>
              </div>

              {/* Yearly */}
              <div 
                onClick={onNavigateToSubscription}
                className="p-3 rounded-xl border border-blue-500 dark:border-blue-600 bg-blue-50/10 dark:bg-blue-950/10 relative text-center hover:border-blue-500 cursor-pointer transition-all pointer-events-auto"
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.2 rounded-full whitespace-nowrap">
                  BEST VAL
                </span>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mt-1">Yearly</div>
                <div className="text-base font-black text-slate-800 dark:text-white">
                  {getDisplayPrice('pro_yearly', profile.currency).formatted}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">/ year</div>
              </div>

              {/* Lifetime */}
              <div 
                onClick={onNavigateToSubscription}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center hover:border-emerald-500/50 cursor-pointer bg-white dark:bg-slate-950 transition-all pointer-events-auto"
              >
                <div className="text-[10px] text-slate-400 font-bold uppercase">Lifetime</div>
                <div className="text-base font-black text-slate-800 dark:text-white mt-1">
                  {getDisplayPrice('lifetime', profile.currency).formatted}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold text-emerald-500">Pay Once</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors pointer-events-auto"
            >
              Access Stored Ledger
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateToSubscription();
              }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition-colors pointer-events-auto flex items-center justify-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Review Plans Complete Selection</span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>AES-256 secure network connection</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
