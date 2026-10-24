import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  FolderLock,
  ShieldCheck,
  HardDrive,
  Download,
  AlertTriangle,
  ArrowRight
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
  onNavigateTab?: (tab: string) => void;
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
  onNavigateTab,
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
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [entityToDelete, setEntityToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('finance_app_last_backup');
    if (raw) {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          setLastBackupTime(d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }));
        }
      } catch {
        setLastBackupTime(raw);
      }
    }
  }, []);

  // Category Builder
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

  const customCategories = categories.filter((c) => c.isCustom);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      businessName: businessName.trim() || 'Business Workspace',
      ownerName: ownerName.trim() || 'Finance Manager',
      email: email.trim() || 'finance@business.local',
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
          Preferences & Taxonomy
        </span>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Settings & Categories
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure business identity, reporting currency, categories, financial year, and application settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Business Profile Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm lg:col-span-7">
          <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
              Business Profile & Preferences
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Customize company name, owner info, base currency, and financial year start
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Business Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Business / Company Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="My Small Business / Freelance Studio"
                  className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Owner Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Owner / Manager Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Contact / Reporting Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="finance@mybusiness.com"
                    className="w-full pl-10 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Currency Select & tax rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Base Currency
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
                  Estimated Tax Reserve (%)
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
                        {c.type === 'income' ? 'Income' : 'Expense'}
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
                    <span className="text-[10px]">No custom categories added yet.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Ownership, Privacy & Local Storage Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm mt-5 space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Data Ownership & Local Storage</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  100% Offline-First
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Transparent disclosure of local storage mechanisms, privacy guarantees, and backup status.
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('backup')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center transition-colors pointer-events-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backups & Export</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>Device-Only Storage</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your ledger, receipts, invoices, and settings are saved securely on your device using IndexedDB with persistent storage.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Zero Silent Cloud Uploads</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              No financial data, invoices, or customer details are ever uploaded to external cloud servers. You retain full ownership.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Download className="w-4 h-4 text-blue-500" />
              <span>Last Saved Backup</span>
            </div>
            <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {lastBackupTime ? lastBackupTime : 'No backup exported yet'}
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              Export regular JSON backups to protect against browser cache clearing or device changes.
            </p>
          </div>
        </div>
      </div>

      {/* Multiple Business Profiles (Pro) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm mt-5">
        <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-500" />
              <span>Multiple Business Profiles</span>
              {!isPremium && <span className="text-[8px] font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full uppercase">🔒 Pro</span>}
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Manage separate independent business workspaces with distinct ledger reporting and categories.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              if (!isPremium) {
                onUpgradeTrigger?.('Managing multiple separate company ledgers is a Pro feature.');
                return;
              }
              const name = prompt('Enter new business workspace name:');
              if (name && name.trim()) {
                onCreateBusiness?.(name.trim());
              }
            }}
            className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 self-start sm:self-center transition-colors pointer-events-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Business</span>
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
                        SWITCH
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
                      setEntityToDelete({ id: biz.id, name: biz.name });
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

      {/* In-App Confirmation Modal for deleting business workspace */}
      <AnimatePresence>
        {entityToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Business Profile?</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{entityToDelete.name}"</span>?
                This workspace will be removed from your profile list.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEntityToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (entityToDelete) {
                      onDeleteBusiness?.(entityToDelete.id);
                      setEntityToDelete(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
                >
                  Delete Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
