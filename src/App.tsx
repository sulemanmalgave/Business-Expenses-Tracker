import { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Calendar
} from 'lucide-react';

import { Transaction, Category, UserProfile, RecurringBill } from './types';
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_PROFILE, 
  STORAGE_KEYS, 
  getStarterTransactions,
  formatCurrency 
} from './utils/financeUtils';
import { 
  loadDurableData, 
  persistTransactions, 
  persistCategories, 
  persistProfile, 
  persistRecurringBills 
} from './utils/indexedDbStorage';
import { processBillPayment } from './utils/recurringService';
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
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { TermsOfServiceView } from './components/TermsOfServiceView';
import { AboutView } from './components/AboutView';
import { HelpSupportView } from './components/HelpSupportView';
import { BatchReceiptModal } from './components/BatchReceiptModal';
import { RecurringBillsModal } from './components/RecurringBillsModal';
import { InvoiceModal } from './components/InvoiceModal';

export default function App() {
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Core database values
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Corporate Multiple-business Entities state
  const [businessesList, setBusinessesList] = useState<{ id: string; name: string }[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>('default');

  // Modals state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [batchReceiptsOpen, setBatchReceiptsOpen] = useState(false);
  const [recurringBillsOpen, setRecurringBillsOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Undo delete notification state
  const [undoToast, setUndoToast] = useState<{ message: string; tx: Transaction } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flag to automatically trigger Add transaction dialog on page transition
  const [autoOpenFormType, setAutoOpenFormType] = useState<'none' | 'income' | 'expense'>('none');

  // Profile Dropdown state
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Time tracker for header
  const [systemTime, setSystemTime] = useState(new Date());

  // 1. Initial Durable Database Hydration (IndexedDB + localStorage migration)
  useEffect(() => {
    const initData = async () => {
      try {
        const data = await loadDurableData();
        setTransactions(data.transactions);
        setCategories(data.categories);
        setProfile(data.profile);
        setRecurringBills(data.recurringBills || []);

        // Multiple businesses list
        const storedBusinesses = localStorage.getItem('finance_app_businesses_list');
        if (storedBusinesses) {
          setBusinessesList(JSON.parse(storedBusinesses));
        } else {
          const defaultCompanyList = [{ id: 'default', name: data.profile.businessName || 'Business Expense Tracker' }];
          setBusinessesList(defaultCompanyList);
          localStorage.setItem('finance_app_businesses_list', JSON.stringify(defaultCompanyList));
        }
      } catch (err) {
        console.warn('Initialization error, falling back:', err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    initData();

    // Theme settings
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(storedTheme ? storedTheme === 'dark' : prefersDark);

    const timer = setInterval(() => setSystemTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync Dark Mode to root HTML element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDark]);

  // Synchronize state updates to Durable Storage
  const updateTransactionsState = (updatedList: Transaction[]) => {
    setTransactions(updatedList);
    persistTransactions(updatedList);
  };

  const updateCategoriesState = (updatedCats: Category[]) => {
    setCategories(updatedCats);
    persistCategories(updatedCats);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    persistProfile(updatedProfile);

    // Keep name in entities list updated
    setBusinessesList((prev) => {
      const updated = prev.map((b) => (b.id === activeBusinessId ? { ...b, name: updatedProfile.businessName } : b));
      localStorage.setItem('finance_app_businesses_list', JSON.stringify(updated));
      return updated;
    });
  };

  const updateRecurringBillsState = (updatedBills: RecurringBill[]) => {
    setRecurringBills(updatedBills);
    persistRecurringBills(updatedBills);
  };

  const isPremium = isSubscriptionActive(profile);
  const isLifetime = profile.subscriptionPlan === 'lifetime';

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
        businessName: businessesList.find((b) => b.id === newBizId)?.name || 'New Entity LLC',
        onboarded: true,
      };
      setProfile(clonedProf);
      localStorage.setItem(profKey, JSON.stringify(clonedProf));
    }
  };

  const handleCreateBusiness = (name: string) => {
    if (!isPremium && businessesList.length >= 1) {
      handleUpgradeTrigger('Managing separate corporate entities is a Pro capability.');
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
    const updatedList = businessesList.filter((b) => b.id !== targetId);
    setBusinessesList(updatedList);
    localStorage.setItem('finance_app_businesses_list', JSON.stringify(updatedList));

    localStorage.removeItem(`finance_app_transactions_${targetId}`);
    localStorage.removeItem(`finance_app_categories_${targetId}`);
    localStorage.removeItem(`finance_app_profile_${targetId}`);

    handleSwitchBusiness('default');
  };

  // Transactions CRUD Action Operators
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const freshPayload: Transaction = {
      ...newTx,
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: newTx.createdAt || new Date().toISOString(),
    };
    const updatedList = [freshPayload, ...transactions];
    updateTransactionsState(updatedList);
  };

  const handleEditTransaction = (id: string, updatedPayload: Partial<Transaction>) => {
    const updatedList = transactions.map((t) => (t.id === id ? { ...t, ...updatedPayload, updatedAt: new Date().toISOString() } : t));
    updateTransactionsState(updatedList);
  };

  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    const updatedList = transactions.filter((t) => t.id !== id);
    updateTransactionsState(updatedList);

    // Provide safe Undo capability
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast({
      message: `Deleted "${target.description}" (${formatCurrency(target.amount, profile.currency)})`,
      tx: target,
    });

    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 6000);
  };

  const handleUndoDelete = () => {
    if (!undoToast) return;
    const restored = [undoToast.tx, ...transactions];
    updateTransactionsState(restored);
    setUndoToast(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  // Custom Category Operators
  const handleAddCustomCategory = (name: string, type: 'income' | 'expense') => {
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

  // Recurring Bills operators
  const handleSaveRecurringBill = (bill: RecurringBill) => {
    const exists = recurringBills.some((b) => b.id === bill.id);
    let updated: RecurringBill[];
    if (exists) {
      updated = recurringBills.map((b) => (b.id === bill.id ? bill : b));
    } else {
      updated = [bill, ...recurringBills];
    }
    updateRecurringBillsState(updated);
  };

  const handleDeleteRecurringBill = (id: string) => {
    const updated = recurringBills.filter((b) => b.id !== id);
    updateRecurringBillsState(updated);
  };

  const handleMarkBillPaid = (bill: RecurringBill) => {
    const { updatedBill, newTransaction } = processBillPayment(bill);
    handleAddTransaction(newTransaction);
    handleSaveRecurringBill(updatedBill);
  };

  // Restore entire backup
  const handleRestoreData = (
    restoredTxs: Transaction[], 
    restoredCats?: Category[], 
    restoredProf?: UserProfile,
    restoredBills?: RecurringBill[]
  ) => {
    if (restoredTxs) updateTransactionsState(restoredTxs);
    if (restoredCats && restoredCats.length > 0) updateCategoriesState(restoredCats);
    if (restoredProf) handleUpdateProfile(restoredProf);
    if (restoredBills) updateRecurringBillsState(restoredBills);
  };

  // CSV ingest
  const handleImportTransactions = (imported: Omit<Transaction, 'id'>[]) => {
    const freshRows: Transaction[] = imported.map((r, i) => ({
      ...r,
      id: `tx_imported_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
    }));
    updateTransactionsState([...freshRows, ...transactions]);
  };

  const handleResetToDemo = () => {
    const demo = getStarterTransactions();
    const demoProfile = { ...DEFAULT_PROFILE, onboarded: true };

    updateTransactionsState(demo);
    updateCategoriesState(DEFAULT_CATEGORIES);
    handleUpdateProfile(demoProfile);
    setActiveTab('dashboard');
  };

  const handleClearAll = () => {
    updateTransactionsState([]);
    updateCategoriesState(DEFAULT_CATEGORIES.filter((c) => !c.isCustom));
    handleUpdateProfile({ ...DEFAULT_PROFILE, onboarded: true });
    setActiveTab('dashboard');
  };

  const handleResetApplication = () => {
    updateTransactionsState([]);
    updateCategoriesState(DEFAULT_CATEGORIES);
    updateRecurringBillsState([]);
    const initialProfile = { ...DEFAULT_PROFILE, onboarded: false };
    handleUpdateProfile(initialProfile);
    setActiveTab('dashboard');
  };

  // Quick Add action
  const handleQuickAdd = (type: 'income' | 'expense') => {
    setAutoOpenFormType(type);
    if (type === 'income') {
      setActiveTab('income');
    } else {
      setActiveTab('expenses');
    }
  };

  // Simplified, business-standard Navigation Items (Phase 2 compliance)
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'settings', label: 'Settings & Categories', icon: Settings },
  ];

  const ActiveIcon = NAV_ITEMS.find((n) => n.id === activeTab)?.icon || Layers;

  if (profile && profile.onboarded === false && isDataLoaded) {
    return (
      <OnboardingWizard
        onComplete={(newProfile) => {
          handleUpdateProfile(newProfile);
          const defaultCompanyList = [{ id: 'default', name: newProfile.businessName || 'Business Expense Tracker' }];
          setBusinessesList(defaultCompanyList);
          localStorage.setItem('finance_app_businesses_list', JSON.stringify(defaultCompanyList));
          updateTransactionsState([]);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* SIDEBAR NAVIGATION - DESKTOP RAIL */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0F172A] border-r border-slate-800 shrink-0 select-none">
        
        {/* Sidebar Upper Logo */}
        <div className="p-6 flex flex-col bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">B</div>
            <span className="text-lg font-bold text-white tracking-tight">Business Expense Tracker</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1.5 font-semibold">Financial Management</p>
        </div>

        {/* Sidebar Nav Links */}
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
          
          {/* Pro License / Expiry Notice */}
          {(() => {
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
            const showSidebarBilling = !isLifetime && (isExpiringSoon || isExpired);

            if (!showSidebarBilling) return null;

            return (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <button
                  onClick={() => handleUpgradeTrigger(isExpired ? 'Subscription expired.' : 'Renew subscription.')}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors pointer-events-auto"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Renew Subscription</span>
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
          {isLifetime ? (
            <div className="flex items-center space-x-1 font-mono text-[9px] text-emerald-400 font-bold">
              <span>💎 Lifetime License</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 font-mono text-[9px] text-emerald-500 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Offline Database Synced</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Chassis */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Rail */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg pointer-events-auto"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <ActiveIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 uppercase">
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Offline-Ready Local Storage Indicator */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60" title="100% Offline-First. Financial records saved safely on your device in IndexedDB.">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Offline-First (IndexedDB)</span>
            </div>

            {/* Clock */}
            <div className="hidden xl:flex items-center space-x-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {systemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => handleQuickAdd('income')}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold pointer-events-auto shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>

            <button
              onClick={() => handleQuickAdd('expense')}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold pointer-events-auto shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>

            <button
              onClick={() => setInvoiceModalOpen(true)}
              className="hidden lg:flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold pointer-events-auto shadow-sm transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors pointer-events-auto text-left"
              >
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block leading-tight">
                    {profile.businessName}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {profile.ownerName.split(' ')[0]} {isLifetime && '💎'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                  {profile.ownerName.charAt(0).toUpperCase()}
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{profile.businessName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{profile.ownerName}</p>
                    <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isLifetime 
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' 
                        : isPremium 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                        : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {isLifetime ? '💎 Lifetime' : isPremium ? (profile.subscriptionPlan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly') : 'Free Plan'}
                    </span>
                  </div>
                  {[
                    { label: 'Profile & Settings', id: 'settings' },
                    { label: 'Subscription & Plans', id: 'subscription' },
                    { label: 'Backup & Restore', id: 'backup' },
                    { label: 'Privacy & Data Ownership', id: 'privacy' },
                    { label: 'Terms of Service', id: 'terms' },
                    { label: 'About App', id: 'about' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setActiveTab(item.id);
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 pointer-events-auto transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Router Body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto relative">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  recurringBills={recurringBills}
                  profile={profile}
                  onNavigate={setActiveTab}
                  onQuickAdd={handleQuickAdd}
                  onOpenBatchReceipts={() => setBatchReceiptsOpen(true)}
                  onOpenRecurringBills={() => setRecurringBillsOpen(true)}
                  onMarkBillPaid={handleMarkBillPaid}
                  onOpenInvoices={() => setInvoiceModalOpen(true)}
                  onResetToDemo={handleResetToDemo}
                  onClearAll={handleClearAll}
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
                  onUpgradeTrigger={handleUpgradeTrigger}
                />
              )}

              {activeTab === 'backup' && (
                <BackupRestoreView
                  transactions={transactions}
                  categories={categories}
                  profile={profile}
                  recurringBills={recurringBills}
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
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'subscription' && (
                <SubscriptionView
                  profile={profile}
                  transactionsCount={transactions.length}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}

              {activeTab === 'privacy' && (
                <PrivacyPolicyView onBack={() => setActiveTab('settings')} />
              )}

              {activeTab === 'terms' && (
                <TermsOfServiceView onBack={() => setActiveTab('settings')} />
              )}

              {activeTab === 'about' && (
                <AboutView onBack={() => setActiveTab('settings')} onNavigate={setActiveTab} />
              )}

              {activeTab === 'help' && (
                <HelpSupportView onBack={() => setActiveTab('settings')} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Legal Disclosures & Help Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-4" id="pwa-store-footer">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-500 dark:text-slate-400">Business Expense Tracker</span>
              <span>• Version 1.2.0 (Offline-First)</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <button onClick={() => setActiveTab('help')} className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors pointer-events-auto">Help & Support</button>
              <span>•</span>
              <button onClick={() => setActiveTab('privacy')} className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors pointer-events-auto">Privacy Policy</button>
              <span>•</span>
              <button onClick={() => setActiveTab('terms')} className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors pointer-events-auto">Terms of Service</button>
              <span>•</span>
              <button onClick={() => setActiveTab('about')} className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors pointer-events-auto">About App</button>
            </div>
          </footer>
        </main>
      </div>

      {/* Undo Notification Toast */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{undoToast.message}</span>
          <button
            onClick={handleUndoDelete}
            className="px-2.5 py-1 bg-white text-slate-900 font-bold text-xs rounded-lg hover:bg-slate-100 flex items-center gap-1 pointer-events-auto transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Batch Receipt Ingest Modal */}
      <BatchReceiptModal
        isOpen={batchReceiptsOpen}
        onClose={() => setBatchReceiptsOpen(false)}
        categories={categories}
        profile={profile}
        existingTransactions={transactions}
        onCommitTransactions={(newTxs) => {
          newTxs.forEach((tx) => handleAddTransaction(tx));
        }}
      />

      {/* Recurring Bills Modal */}
      <RecurringBillsModal
        isOpen={recurringBillsOpen}
        onClose={() => setRecurringBillsOpen(false)}
        recurringBills={recurringBills}
        categories={categories}
        profile={profile}
        onSaveBill={handleSaveRecurringBill}
        onDeleteBill={handleDeleteRecurringBill}
        onMarkAsPaid={handleMarkBillPaid}
      />

      {/* Client Invoice & Estimate Generator Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        profile={profile}
        onRecordIncome={(tx) => handleAddTransaction(tx)}
      />

      {/* Upgrade Pro Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        profile={profile}
        onNavigateToSubscription={() => {
          setUpgradeModalOpen(false);
          setActiveTab('subscription');
        }}
        reasonMessage={upgradeReason}
      />
    </div>
  );
}
