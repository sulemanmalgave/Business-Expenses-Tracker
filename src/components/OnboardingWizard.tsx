import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, 
  User, 
  Coins, 
  Calendar, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Info 
} from 'lucide-react';
import { UserProfile } from '../types';
import { DEFAULT_CURRENCIES } from '../utils/financeUtils';

interface OnboardingWizardProps {
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessType, setBusinessType] = useState('Freelancer');
  const [currency, setCurrency] = useState('USD');
  const [financialYearStart, setFinancialYearStart] = useState('January');
  const [dateFormatPreference, setDateFormatPreference] = useState('YYYY-MM-DD');
  const [numberFormatPreference, setNumberFormatPreference] = useState('en-US');

  const [errors, setErrors] = useState<string>('');

  const nextStep = () => {
    if (step === 2) {
      if (!businessName.trim()) {
        setErrors('Business Name is required.');
        return;
      }
      if (!ownerName.trim()) {
        setErrors('Owner/Manager Name is required.');
        return;
      }
    }
    setErrors('');
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setErrors('');
    setStep(prev => prev - 1);
  };

  const handleFinish = () => {
    const defaultProfile: UserProfile = {
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      currency,
      email: `${ownerName.trim().toLowerCase().replace(/\s+/g, '')}@${businessName.trim().toLowerCase().replace(/\s+/g, '') || 'company'}.com`,
      taxRate: 0,
      businessType,
      financialYearStart,
      dateFormatPreference,
      numberFormatPreference,
      onboarded: true
    };
    onComplete(defaultProfile);
  };

  // Currencies list with symbols
  const currencyOptions = [
    ...DEFAULT_CURRENCIES,
    { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
    { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
    { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
    { code: 'CAD', symbol: '$', label: 'Canadian Dollar (C$)' },
    { code: 'AUD', symbol: '$', label: 'Australian Dollar (A$)' }
  ].filter((value, index, self) => self.findIndex(t => t.code === value.code) === index); // unique

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300"
      >
        {/* Top visual stepper header */}
        <div className="bg-[#0f172a] p-6 text-white relative">
          <div className="absolute top-4 right-4 bg-blue-600/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Step {step} of 5
          </div>
          <h2 className="text-xl font-bold tracking-tight">Setup Corporate Ledger</h2>
          <p className="text-[11px] text-slate-400 mt-1">Configure your workspace defaults to activate financial intelligence modules.</p>
          
          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-5 overflow-hidden">
            <motion.div 
              className="bg-blue-500 h-full"
              initial={{ width: '20%' }}
              animate={{ width: `${step * 20}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Dynamic Frame Inner Body */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[60vh]">
          {errors && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs text-rose-600 dark:text-rose-450 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errors}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-3xl mx-auto mb-4 shadow-xl shadow-blue-500/20">
                    A
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Welcome to Business Expense Tracker – Income & Expense Manager
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    Set up your business parameters to gain deep operational insights, tracking revenues, multiple currency costs, automated Profit & Loss statements, and runtimes runway.
                  </p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-600 dark:text-slate-450">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>100% Confidential Ledger:</strong> All transaction records are retained in your sandboxed browser space safely.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Multi-Currency Smart Tracker:</strong> Complete currency conversion calculations using adjustable exchange ratios.</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Business Profiles Definitions
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Business Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="E.g. Zenith Consulting LLC"
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Owner / Manager Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="E.g. Sarah Jenkins"
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Business Type (optional)
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
                    >
                      <option value="Retail Store">Retail Store</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Agency">Agency</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Consultant">Consultant</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Primary reporting currency
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your primary reference currency for overall aggregates, reports, and balance values. You will still be able to input transactions in any currency code with custom conversion exchange rates.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 max-h-48 overflow-y-auto p-1">
                  {currencyOptions.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.code)}
                      className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                        currency === c.code 
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                          : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/45 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                        currency === c.code ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800'
                      }`}>
                        {c.symbol}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold font-mono">{c.code}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.label.split(' (')[0]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Financial Year & Display settings
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Financial Year Start Month
                    </label>
                    <select
                      value={financialYearStart}
                      onChange={(e) => setFinancialYearStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
                    >
                      {months.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Date Format Preference
                    </label>
                    <select
                      value={dateFormatPreference}
                      onChange={(e) => setDateFormatPreference(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-10)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 10-06-2026)</option>
                      <option value="MM-DD-YYYY">MM-DD-YYYY (e.g. 06-10-2026)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Number Format Preference
                    </label>
                    <select
                      value={numberFormatPreference}
                      onChange={(e) => setNumberFormatPreference(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
                    >
                      <option value="en-US">1,234.56 – Standard (en-US)</option>
                      <option value="de-DE">1.234,56 – European Dot (de-DE)</option>
                      <option value="fr-FR">1 234,56 – European Space (fr-FR)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-center"
              >
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-905 dark:text-white">
                  Corporate Ledger Ready!
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Verify your default operational values. These metrics synchronize automatically and are editable in System Settings.
                </p>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 text-left text-xs space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Company Name:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Workspace Owner:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Business Type:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-mono">{businessType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reporting Currency:</span>
                    <span className="font-bold text-blue-500 font-mono">{currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fiscal Year Start:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-mono">{financialYearStart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Display Layouts:</span>
                    <span className="text-slate-500 font-mono text-[10px]">{dateFormatPreference} | {numberFormatPreference}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer controls */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center space-x-1.5 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold pointer-events-auto transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div>
            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold pointer-events-auto transition-all shadow-md shadow-blue-600/10"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center space-x-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold pointer-events-auto transition-all shadow-md shadow-emerald-600/10"
              >
                <span>Complete Setup</span>
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
