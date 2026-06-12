import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Database,
  Settings, 
  Layers, 
  Plus, 
  Menu, 
  X, 
  Layers3,
  LogOut,
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';

import { Transaction, Category, UserProfile } from './types';
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_PROFILE, 
  STORAGE_KEYS, 
  getStarterTransactions,
  formatCurrency 
} from './utils/financeUtils';
import { isSubscriptionActive } from './utils/subscriptionService';

// Modular Views
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { IncomeView } from './components/IncomeView';
import { ReportsView } from './components/ReportsView';
import { AnalyticsView } from './components/AnalyticsView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { SettingsView } from './components/SettingsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { SubscriptionView } from './components/SubscriptionView';
import { UpgradeModal } from './components/UpgradeModal';

export default function App() {
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Core sandboxed database values
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Corporate Multiple-business Entities state
  const [businessesList, setBusinessesList] = useState<{ id: string; name: string }[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>('default');

  // Upgrade Modal triggers state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  // Flag to automatically trigger Add transaction dialog on page transition
  const [autoOpenFormType, setAutoOpenFormType] = useState<'none' | 'income' | 'expense'>('none');

  // Profile Dropdown state
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Time tracker for modern upper rail header
  const [systemTime, setSystemTime] = useState(new Date());

  // 1. Initial Database Hydration (runs on first mount)
  useEffect(() => {
    // A. Profile Settings first to determine onboarding status
    const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    let isUserOnboarded = false;
    let initialProfile: UserProfile = DEFAULT_PROFILE;

    if (storedProfile) {
      initialProfile = JSON.parse(storedProfile);
      isUserOnboarded = initialProfile.onboarded === true;
      setProfile(initialProfile);
    } else {
      // First-time user! Starts as not onboarded.
      initialProfile = { ...DEFAULT_PROFILE, onboarded: false };
      setProfile(initialProfile);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(initialProfile));
    }

    // B. Corporate Profiles Setup immediately
    const storedBusinesses = localStorage.getItem('finance_app_businesses_list');
    const storedActiveId = localStorage.getItem('finance_app_active_business_id') || 'default';
    setActiveBusinessId(storedActiveId);

    if (storedBusinesses) {
      setBusinessesList(JSON.parse(storedBusinesses));
    } else {
      const defaultCompanyList = [{ id: 'default', name: initialProfile.businessName || 'Apex Cashflow' }];
      setBusinessesList(defaultCompanyList);
      localStorage.setItem('finance_app_businesses_list', JSON.stringify(defaultCompanyList));
    }

    // C. Transactions
    const txKey = storedActiveId === 'default' ? STORAGE_KEYS.TRANSACTIONS : `finance_app_transactions_${storedActiveId}`;
    const storedTxs = localStorage.getItem(txKey);
    if (storedTxs) {
      setTransactions(JSON.parse(storedTxs));
    } else {
      setTransactions([]);
      localStorage.setItem(txKey, JSON.stringify([]));
    }

    // D. Categories
    const catKey = storedActiveId === 'default' ? STORAGE_KEYS.CATEGORIES : `finance_app_categories_${storedActiveId}`;
    const storedCats = localStorage.getItem(catKey);
    if (storedCats) {
      setCategories(JSON.parse(storedCats));
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem(catKey, JSON.stringify(DEFAULT_CATEGORIES));
    }

    // E. Theme settings
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialThemeDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDark(initialThemeDark);

    // Dynamic Upper standard time updater loop
    const timer = setInterval(() => setSystemTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. Sync Dark Mode rules to root window HTML element on state change
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDark]);

  // Save utility updates
  const updateTransactionsState = (updatedList: Transaction[], bizId = activeBusinessId) => {
    setTransactions(updatedList);
    const key = bizId === 'default' ? STORAGE_KEYS.TRANSACTIONS : `finance_app_transactions_${bizId}`;
    localStorage.setItem(key, JSON.stringify(updatedList));
  };

  const updateCategoriesState = (updatedCats: Category[], bizId = activeBusinessId) => {
    setCategories(updatedCats);
    const key = bizId === 'default' ? STORAGE_KEYS.CATEGORIES : `finance_app_categories_${bizId}`;
    localStorage.setItem(key, JSON.stringify(updatedCats));
  };

  const handleUpdateProfile = (updatedProfile: UserProfile, bizId = activeBusinessId) => {
    setProfile(updatedProfile);
    const key = bizId === 'default' ? STORAGE_KEYS.PROFILE : `finance_app_profile_${bizId}`;
    localStorage.setItem(key, JSON.stringify(updatedProfile));

    // Keep name in entities list updated
    setBusinessesList(prev => {
      const updated = prev.map(b => b.id === bizId ? { ...b, name: updatedProfile.businessName } : b);
      localStorage.setItem('finance_app_businesses_list', JSON.stringify(updated));
      return updated;
    });
  };

  const isPremium = isSubscriptionActive(profile);
  const isLifetime = profile.subscriptionPlan === 'lifetime';

  // Days until expiry
  const daysUntilExpiry = profile.subscriptionExpiry 
    ? Math.ceil((new Date(profile.subscriptionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Upgrade prompt handler
  const handleUpgradeTrigger = (reason?: string) => {
    setUpgradeReason(reason || '');
    setUpgradeModalOpen(true);
  };

  // Multiple Business Switcher actions
  const handleSwitchBusiness = (newBizId: string) => {
    setActiveBusinessId(newBizId);
    localStorage.setItem('finance_app_active_business_id', newBizId);

    const txKey = newBizId === 'default' ? STORAGE_KEYS.TRANSACTIONS : `finance_app_transactions_${newBizId}`;
    const catKey = newBizId === 'default' ? STORAGE_KEYS.CATEGORIES : `finance_app_categories_${newBizId}`;
    const profKey = newBizId === 'default' ? STORAGE_KEYS.PROFILE : `finance_app_profile_${newBizId}`;

    const storedTxs = localStorage.getItem(txKey);
    setTransactions(storedTxs ? JSON.parse(storedTxs) : []);

    const storedCats = localStorage.getItem(catKey);
    setCategories(storedCats ? JSON.parse(storedCats) : DEFAULT_CATEGORIES);

    const storedProf = localStorage.getItem(profKey);
    if (storedProf) {
      setProfile(JSON.parse(storedProf));
    } else {
      const clonedProf: UserProfile = {
        ...profile,
        businessName: businessesList.find(b => b.id === newBizId)?.name || 'New Entity LLC',
        onboarded: true,
      };
      setProfile(clonedProf);
      localStorage.setItem(profKey, JSON.stringify(clonedProf));
    }
  };

  const handleCreateBusiness = (name: string) => {
    if (!isPremium && businessesList.length >= 1) {
      handleUpgradeTrigger('Managing separate independent corporate profiles is a Premium/Pro level capability.');
      return;
    }
    const newId = `biz_${Date.now()}`;
    const updatedList = [...businessesList, { id: newId, name }];
    setBusinessesList(updatedList);
    localStorage.setItem('finance_app_businesses_list', JSON.stringify(updatedList));
    handleSwitchBusiness(newId);
  };

  const handleDeleteBusiness = (targetId: string) => {
    if (targetId === 'default') return;
    const updatedList = businessesList.filter(b => b.id !== targetId);
    setBusinessesList(updatedList);
    localStorage.setItem('finance_app_businesses_list', JSON.stringify(updatedList));

    localStorage.removeItem(`finance_app_transactions_${targetId}`);
    localStorage.removeItem(`finance_app_categories_${targetId}`);
    localStorage.removeItem(`finance_app_profile_${targetId}`);

    handleSwitchBusiness('default');
  };

  // 3. Transactions CRUD Action Operators
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    if (!isPremium && transactions.length >= 500) {
      handleUpgradeTrigger('You have hit your 500 total transaction storage limit for the Free Tier. Upgrade to Pro for unlimited tracking.');
      return;
    }
    const freshPayload: Transaction = {
      ...newTx,
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    const updatedList = [freshPayload, ...transactions];
    updateTransactionsState(updatedList);
  };

  const handleEditTransaction = (id: string, updatedPayload: Partial<Transaction>) => {
    const updatedList = transactions.map((t) => (t.id === id ? { ...t, ...updatedPayload } : t));
    updateTransactionsState(updatedList);
  };

  const handleDeleteTransaction = (id: string) => {
    const updatedList = transactions.filter((t) => t.id !== id);
    updateTransactionsState(updatedList);
  };

  // 4. Custom Category Classification Operators
  const handleAddCustomCategory = (name: string, type: 'income' | 'expense') => {
    // Prevent duplicate entries
    const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
    if (exists) return;

    const newCategory: Category = {
      id: `cat_custom_${Date.now()}`,
      name,
      type,
      color: type === 'income' ? '#059669' : '#e11d48',
      icon: type === 'income' ? 'Coins' : 'Tag',
      isCustom: true,
    };
    const updatedCats = [...categories, newCategory];
    updateCategoriesState(updatedCats);
  };

  const handleDeleteCustomCategory = (id: string) => {
    const targetCat = categories.find((c) => c.id === id);
    if (!targetCat) return;

    // Remove category definition, and map transactions under that category back to safety fallbacks
    const updatedCats = categories.filter((c) => c.id !== id);
    const fallbackName = targetCat.type === 'income' ? 'Miscellaneous Income' : 'Other Expenses';

    const updatedTxs = transactions.map((t) => {
      if (t.type === targetCat.type && t.category === targetCat.name) {
        return { ...t, category: fallbackName };
      }
      return t;
    });

    updateCategoriesState(updatedCats);
    updateTransactionsState(updatedTxs);
  };

  // Restores entire backup file
  const handleRestoreData = (restoredTxs: Transaction[], restoredCats?: Category[], restoredProf?: UserProfile) => {
    if (restoredTxs) updateTransactionsState(restoredTxs);
    if (restoredCats && restoredCats.length > 0) updateCategoriesState(restoredCats);
    if (restoredProf) handleUpdateProfile(restoredProf);
  };

  // Safe ingest of external csv rows
  const handleImportTransactions = (imported: Omit<Transaction, 'id'>[]) => {
    const freshRows: Transaction[] = imported.map((r, i) => ({
      ...r,
      id: `tx_imported_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
    }));
    updateTransactionsState([...freshRows, ...transactions]);
  };

  const handleResetToDemo = () => {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    
    // Repopulate starter
    const demo = getStarterTransactions();
    setTransactions(demo);
    setCategories(DEFAULT_CATEGORIES);
    
    const demoProfile = { ...DEFAULT_PROFILE, onboarded: true };
    setProfile(demoProfile);

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(demo));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(demoProfile));
    
    setActiveTab('dashboard');
  };

  const handleClearAll = () => {
    updateTransactionsState([]);
    updateCategoriesState(DEFAULT_CATEGORIES.filter((c) => !c.isCustom));
    handleUpdateProfile({ ...DEFAULT_PROFILE, onboarded: true });
    setActiveTab('dashboard');
  };

  const handleResetApplication = () => {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    const initialProfile = { ...DEFAULT_PROFILE, onboarded: false };
    setProfile(initialProfile);

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(initialProfile));
    
    setActiveTab('dashboard');
  };

  // Tab routing redirect triggers
  const handleQuickAdd = (type: 'income' | 'expense') => {
    setAutoOpenFormType(type);
    if (type === 'income') {
      setActiveTab('income');
    } else {
      setActiveTab('expenses');
    }
  };

  // 6. Navigation list configuration with mapping icons
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'reports', label: 'Ledger Reports', icon: FileText },
    { id: 'analytics', label: 'BI Analytics', icon: BarChart3 },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const ActiveIcon = NAV_ITEMS.find((n) => n.id === activeTab)?.icon || Layers;

  if (profile && profile.onboarded === false) {
    return (
      <OnboardingWizard
        onComplete={(newProfile) => {
          setProfile(newProfile);
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
          
          // Seed initial business entities list
          const defaultCompanyList = [{ id: 'default', name: newProfile.businessName || 'Apex Cashflow' }];
          setBusinessesList(defaultCompanyList);
          localStorage.setItem('finance_app_businesses_list', JSON.stringify(defaultCompanyList));

          updateTransactionsState([]);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* SIDEBAR NAVIGATION - DESKTOP RAIL CHASSIS */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0F172A] border-r border-slate-800 shrink-0 select-none">
        {/* Sidebar Upper Logo */}
        <div className="p-6 flex flex-col bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">A</div>
            <span className="text-xl font-bold text-white tracking-tight">Apex Cashflow</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1.5 font-semibold">Business Manager</p>
        </div>

        {/* Sidebar Nav Links list */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all pointer-events-auto ${
                  isSelected
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0 text-current" />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          {/* Conditional Premium Sidebar Section */}
          {(() => {
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
            const limitReached = transactions.length >= 500;
            const showSidebarBilling = !isLifetime && (limitReached || isExpiringSoon || isExpired);

            if (!showSidebarBilling) return null;

            return (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <button
                  onClick={() => handleUpgradeTrigger(limitReached ? 'Free limit reached.' : 'Renew your subscription.')}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors pointer-events-auto"
                >
                  {isExpiringSoon || isExpired ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
                  <span>{limitReached ? 'Upgrade to Pro' : 'Renew Subscription'}</span>
                </button>
              </div>
            );
          })()}
        </nav>

        {/* Business summary label footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0c1222] text-[10px] text-slate-400 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="truncate max-w-[120px]">{profile.businessName}</span>
            <span className="font-mono text-[9px] uppercase bg-slate-800 px-1 py-0.2 rounded font-bold text-slate-300">
              {profile.currency}
            </span>
          </div>
          <span className="text-[9.5px] text-slate-500">Owner: {profile.ownerName}</span>
          <div className="flex items-center space-x-1 font-mono text-[9px] text-emerald-500 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Secure Database Synced</span>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER DRAWER CONTAINER BAR */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop opacity tap release */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50"
            />

            {/* Sidebar drawer sheet */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-64 bg-[#0F172A] border-r border-slate-800 h-full flex flex-col z-50 select-none pb-6"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0F172A]">
                <div className="flex items-center space-x-2.5">
                  <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                    <Layers3 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider text-white">APEX</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 px-1.5 bg-slate-800 text-slate-350 rounded-lg pointer-events-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const IconComponent = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all pointer-events-auto ${
                        isSelected
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="px-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-300 truncate">{profile.businessName}</p>
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono">Local Data Layer Active</span>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER CONTENT VIEW chassis */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STATUS NAVIGATION BAR RAIL */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center space-x-3">
            {/* Mobile Sidebar Humburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 lg:hidden pointer-events-auto"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop breadcrumb indicator */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <span className="text-slate-600 dark:text-slate-450 font-bold uppercase tracking-wider text-[10px]">Apex Workspace</span>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold tracking-tight">{NAV_ITEMS.find((n) => n.id === activeTab)?.label}</span>
            </div>
          </div>

          {/* Right Header System time clock & profile shortcut pill */}
          <div className="flex items-center space-x-4">
            {/* System clock */}
            <div className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{systemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} UTC</span>
            </div>

            {/* CFO Account pill details - Updated to clickable dropdown menu */}
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-4"
              >
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block truncate max-w-[130px]">
                    {profile.businessName}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {profile.ownerName.split(' ')[0]}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                  {profile.ownerName ? profile.ownerName.charAt(0).toUpperCase() : 'S'}
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-850 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{profile.businessName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{profile.ownerName}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                      {isPremium ? (profile.subscriptionPlan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly') : 'Free Plan'}
                    </span>
                  </div>
                  {[
                    { label: 'Profile', id: 'settings' },
                    { label: 'Workspace Settings', id: 'settings' },
                    { label: 'Subscription & Billing', id: 'subscription' },
                    { label: 'Restore Purchase', id: 'backup' },
                    { label: 'Help & Support', id: 'settings' },
                    { label: 'Sign Out', id: 'dashboard' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setActiveTab(item.id);
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* WORKSPACE MIDDLE STAGE CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-12">
          
          {/* Workspace storage limit warning banner */}
          {!isPremium && transactions.length >= 400 && (
            <div className={`mb-4 p-3.5 rounded-2xl border flex items-center justify-between shadow-sm animate-fade-in ${
              transactions.length >= 500
                ? 'bg-rose-50/90 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-350'
                : transactions.length >= 450
                ? 'bg-amber-50/90 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-350'
                : 'bg-indigo-50/90 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 text-indigo-800 dark:text-indigo-350'
            }`}>
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">
                  {transactions.length >= 500
                    ? `Quota Locked: You have consumed ${transactions.length} of 500 free ledger slots.`
                    : transactions.length >= 450
                    ? `Tier Warning: You have used ${transactions.length} of 500 free transactions. Upgrade to Pro for unlimited tracking.`
                    : `Tier Info: You have used ${transactions.length} of 500 free transactions.`
                  }
                </span>
              </div>
              <button
                onClick={() => handleUpgradeTrigger('Unlock unlimited transaction slots, auto-recurrence, and deeper BI reporting controls.')}
                className="px-2.5 py-1 bg-[#1e293b] text-white text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition-all hover:scale-[1.03] pointer-events-auto shadow-sm"
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
            >
              {/* Conditional viewport render mapping */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  profile={profile}
                  onNavigate={setActiveTab}
                  onQuickAdd={handleQuickAdd}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpensesView
                  transactions={transactions}
                  categories={categories}
                  profile={profile}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onAddCustomCategory={handleAddCustomCategory}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                />
              )}

              {activeTab === 'income' && (
                <IncomeView
                  transactions={transactions}
                  categories={categories}
                  profile={profile}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onAddCustomCategory={handleAddCustomCategory}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  profile={profile}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  transactions={transactions}
                  profile={profile}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                />
              )}

              {activeTab === 'backup' && (
                <BackupRestoreView
                  transactions={transactions}
                  categories={categories}
                  profile={profile}
                  onRestoreData={handleRestoreData}
                  onImportTransactions={handleImportTransactions}
                  onResetToDemo={handleResetToDemo}
                  onClearAll={handleClearAll}
                  onResetApplication={handleResetApplication}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  profile={profile}
                  categories={categories}
                  isDark={isDark}
                  onUpdateProfile={handleUpdateProfile}
                  onAddCustomCategory={handleAddCustomCategory}
                  onDeleteCustomCategory={handleDeleteCustomCategory}
                  onToggleTheme={() => setIsDark(!isDark)}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                  businessesList={businessesList}
                  activeBusinessId={activeBusinessId}
                  onSwitchBusiness={handleSwitchBusiness}
                  onCreateBusiness={handleCreateBusiness}
                  onDeleteBusiness={handleDeleteBusiness}
                />
              )}

              {activeTab === 'subscription' && (
                <SubscriptionView
                  profile={profile}
                  transactionsCount={transactions.length}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        reason={upgradeReason}
      />
    </div>
  );
}
