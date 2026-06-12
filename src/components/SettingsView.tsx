import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building, 
  User, 
  Mail, 
  Coins, 
  Layers, 
  Plus, 
  Trash2, 
  Sun, 
  Moon, 
  Percent, 
  Sparkles,
  CheckCircle2,
  FolderLock
} from 'lucide-react';
import { Category, UserProfile } from '../types';
import { DEFAULT_CURRENCIES } from '../utils/financeUtils';

interface SettingsViewProps {
  profile: UserProfile;
  categories: Category[];
  isDark: boolean;
  onUpdateProfile: (updated: UserProfile) => void;
  onAddCustomCategory: (name: string, type: 'income' | 'expense') => void;
  onDeleteCustomCategory: (id: string) => void;
  onToggleTheme: () => void;
  isPremium?: boolean;
  onUpgradeTrigger?: (reasonMessage?: string) => void;
  businessesList?: any[];
  activeBusinessId?: string;
  onSwitchBusiness?: (id: string) => void;
  onCreateBusiness?: (name: string) => void;
  onDeleteBusiness?: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  categories,
  isDark,
  onUpdateProfile,
  onAddCustomCategory,
  onDeleteCustomCategory,
  onToggleTheme,
  isPremium = false,
  onUpgradeTrigger,
  businessesList = [],
  activeBusinessId = 'default',
  onSwitchBusiness,
  onCreateBusiness,
  onDeleteBusiness,
}) => {
  // Form parameters
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [email, setEmail] = useState(profile.email);
  const [currency, setCurrency] = useState(profile.currency);
  const [taxRate, setTaxRate] = useState(profile.taxRate.toString());
  const [businessType, setBusinessType] = useState(profile.businessType || 'Freelancer');
  const [financialYearStart, setFinancialYearStart] = useState(profile.financialYearStart || 'January');
  const [dateFormatPreference, setDateFormatPreference] = useState(profile.dateFormatPreference || 'YYYY-MM-DD');
  const [numberFormatPreference, setNumberFormatPreference] = useState(profile.numberFormatPreference || 'en-US');

  // Custom visual feedback states
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Category Builder
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

  const customCategories = categories.filter((c) => c.isCustom);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      businessName: businessName.trim() || 'Apex Workspace',
      ownerName: ownerName.trim() || 'sarah',
      email: email.trim() || 'sarah@work.com',
      currency,
      taxRate: parseFloat(taxRate) || 0,
      businessType,
      financialYearStart,
      dateFormatPreference,
      numberFormatPreference,
      onboarded: true,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCustomCategory(newCatName.trim(), newCatType);
    setNewCatName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
          Executive Workspace
        </span>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          System Settings & Taxonomy
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sync enterprise currency tokens, structure custom corporate classifications, and toggle dark frames.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Business Profile Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm lg:col-span-7">
          <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
              Corporate Ledger Settings
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Customize company headers, set base tax provisions, and select active currencies
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Business Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Company Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Apex advisory LLC"
                  className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Owner Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  CFO / Manager Owner
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Jen sarah"
                    className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Reporting Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@corp.com"
                    className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Currency Select & tax rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Reporting Currency Token
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-855 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
                  >
                    {DEFAULT_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Standard Tax Provisions (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="15"
                    className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Business Type & Financial Year Start Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Business Entity Type
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto font-sans"
                >
                  <option value="Retail Store">Retail Store</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Agency">Agency</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Fiscal Year Starting Month
                </label>
                <select
                  value={financialYearStart}
                  onChange={(e) => setFinancialYearStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto font-sans"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Format Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Date Format Preference
                </label>
                <select
                  value={dateFormatPreference}
                  onChange={(e) => setDateFormatPreference(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto font-sans"
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
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 pointer-events-auto font-sans"
                >
                  <option value="en-US">1,234.56 – Standard (en-US)</option>
                  <option value="de-DE">1.234,56 – European Dot (de-DE)</option>
                  <option value="fr-FR">1 234,56 – European Space (fr-FR)</option>
                </select>
              </div>
            </div>

            {/* Save trigger */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {saveSuccess && (
                <span className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile updated safely!</span>
                </span>
              )}
              <div className="flex-1 text-right">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold pointer-events-auto transition-colors shadow-sm shadow-indigo-600/10"
                >
                  Save Workspace Headers
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Taxonomy / Custom Categories Builder & Theme Selector */}
        <div className="space-y-5 lg:col-span-5">
          {/* Box 1: Theme Switch */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
                  Theme Appearance
                </h3>
                <p className="text-[10px] text-slate-400">Set layout brightness level</p>
              </div>
              
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 pointer-events-auto transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Active workspace layout</span>
              <span className="font-semibold text-indigo-500 uppercase font-mono">
                {isDark ? 'Twilight Dark' : 'Modern Light'}
              </span>
            </div>
          </div>

          {/* Box 2: Custom Category taxonomy additions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
                Taxonomy Definitions
              </h3>
              <p className="text-[10px] text-slate-400">
                Create new business classifications for refined Profit & Loss rows
              </p>
            </div>

            {/* Custom Category Input builder */}
            <form onSubmit={handleAddCategory} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  required
                  placeholder="E.g. Affidavits, Outstation"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="sm:col-span-6 px-3 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-850 dark:text-slate-100"
                />

                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as 'income' | 'expense')}
                  className="sm:col-span-4 px-2 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl text-xs outline-none text-slate-705 dark:text-slate-200 pointer-events-auto"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>

                <button
                  type="submit"
                  className="sm:col-span-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center pointer-events-auto"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Custom Categories Active list */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/65">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Custom Taxonomies ({customCategories.length})
              </span>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {customCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-100 dark:border-slate-800/60"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {c.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1 py-[0.1rem] rounded-md ${
                        c.type === 'income' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' 
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                      }`}>
                        {c.type === 'income' ? 'Inflows' : 'Costs'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteCustomCategory(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 pointer-events-auto"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {customCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <FolderLock className="w-5 h-5 text-slate-350 dark:text-slate-600 mb-1" />
                    <span className="text-[10px]">No custom user taxonomies logged in sandbox.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Multi-Entity Manager */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm mt-5">
        <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-500 text-slate-500" />
              <span>Multi-Entity Corporate Profiles</span>
              {!isPremium && <span className="text-[8px] font-bold text-indigo-500 bg-indigo-500/10 px-1 py-0.2 rounded-full uppercase">🔒 Pro</span>}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Create and manage separate independent business ledgers with individual sandbox reporting.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              if (!isPremium) {
                onUpgradeTrigger?.('Managing multiple separate company ledgers is a Premium/Pro feature.');
                return;
              }
              const name = prompt('Enter corporate identity name:');
              if (name && name.trim()) {
                onCreateBusiness?.(name.trim());
              }
            }}
            className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 self-start sm:self-center transition-colors pointer-events-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entity</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {businessesList.map((biz) => {
            const isActive = biz.id === activeBusinessId;
            return (
              <div
                key={biz.id}
                onClick={() => onSwitchBusiness?.(biz.id)}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-24 ${
                  isActive
                    ? 'bg-indigo-650 border-indigo-700 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-50 dark:bg-slate-800/20 border-slate-150 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black truncate max-w-[140px]">{biz.name}</span>
                    {isActive ? (
                      <span className="text-[8px] uppercase tracking-wider font-extrabold bg-white/20 border border-white/20 px-1.5 py-0.5 rounded-md">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        SANDBOX
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 block ${isActive ? 'text-indigo-100' : 'text-slate-450'}`}>
                    ID: {biz.id}
                  </span>
                </div>

                {!isActive && businessesList.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to permanently delete entity "${biz.name}" and erase all associated transactions?`)) {
                        onDeleteBusiness?.(biz.id);
                      }
                    }}
                    className={`text-[10px] hover:text-rose-500 font-bold self-end flex items-center gap-1 mt-2 text-slate-550`}
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
