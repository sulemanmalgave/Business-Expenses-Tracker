import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Calendar,
  FileSpreadsheet,
  Users,
  Lock,
  Search,
  History
} from 'lucide-react';

import { Transaction, Category, UserProfile, RecurringBill, Client } from './types';
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
  persistRecurringBills,
  persistClients 
} from './utils/indexedDbStorage';
import { processBillPayment } from './utils/recurringService';
import { isSubscriptionActive, verifyPaymentOnServer, checkSubscriptionStatusOnServer } from './utils/subscriptionService';
import { isSessionUnlocked, lockSession, getAuthRecord } from './utils/authService';

// Modular Views
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { IncomeView } from './components/IncomeView';
import { ClientsView } from './components/ClientsView';
import { ReportsView } from './components/ReportsView';
import { StatementsView } from './components/StatementsView';
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
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Core database values
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoiceInitialClient, setInvoiceInitialClient] = useState<Client | null>(null);
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
  const [billingNotification, setBillingNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // 6-digit PIN Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return isSessionUnlocked();
  });

  const handleAuthenticated = (userName: string) => {
    setIsAuthenticated(true);
    if (!profile.ownerName || profile.ownerName === 'Business Owner') {
      handleUpdateProfile({
        ...profile,
        ownerName: userName,
        onboarded: true,
      });
    }
  };

  const handleLockApp = () => {
    lockSession();
    setIsAuthenticated(false);
    setProfileMenuOpen(false);
  };

  // Global Header Real-Time Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Recent Searches state (persisted in localStorage, tracking the last 3-5 queries)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('bet_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 5);
        }
      }
    } catch (e) {
      // fallback
    }
    return ['Acme Corp', 'Software', 'Client Payment'];
  });

  const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('bet_recent_searches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleRemoveRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem('bet_recent_searches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('bet_recent_searches');
    } catch (e) {}
  };

  // Global real-time search filtering across description, client, and category
  const searchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase().trim();
    return transactions.filter((t) => {
      const descMatch = (t.description || '').toLowerCase().includes(q);
      const catMatch = (t.category || '').toLowerCase().includes(q);
      const clientMatch = (t.clientName || '').toLowerCase().includes(q);
      const projectMatch = (t.project || '').toLowerCase().includes(q);
      const notesMatch = (t.notes || '').toLowerCase().includes(q);
      const accountMatch = (t.account || '').toLowerCase().includes(q);
      const amountMatch = String(t.amount).includes(q);
      return descMatch || catMatch || clientMatch || projectMatch || notesMatch || accountMatch || amountMatch;
    });
  }, [transactions, globalSearchQuery]);

  const searchExpenseMatches = useMemo(() => searchResults.filter((t) => t.type === 'expense'), [searchResults]);
  const searchIncomeMatches = useMemo(() => searchResults.filter((t) => t.type === 'income'), [searchResults]);

  // Global Keyboard Shortcuts (⌘K / Ctrl+K and Escape) & Click Outside Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Time tracker for header
  const [systemTime, setSystemTime] = useState(new Date());

  // Check for PayPal return or cancel query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const billingStatus = urlParams.get('billing');
    const sessionId = urlParams.get('session_id');
    const planCode = (urlParams.get('plan') || 'pro_monthly') as 'pro_monthly' | 'pro_yearly';
    const subId = urlParams.get('subscription_id') || urlParams.get('token');

    if (billingStatus === 'success' && subId) {
      const verifyReturn = async () => {
        try {
          setBillingNotification({
            type: 'info',
            message: 'Verifying your PayPal subscription status with PayPal servers...',
          });
          const result = await verifyPaymentOnServer({
            sessionId: sessionId || `sess_return_${Date.now()}`,
            planCode,
            billingCountry: 'INTL',
            provider: 'paypal',
            paypal_subscription_id: subId,
          });

          if (result.success && result.subscription) {
            handleUpdateProfile({
              ...profile,
              subscriptionPlan: result.subscription.planCode,
              subscriptionStatus: 'active',
              subscriptionExpiry: result.subscription.expiryDate,
              subscriptionId: result.subscription.subscriptionId,
              cancelAtPeriodEnd: false,
            });
            setBillingNotification({
              type: 'success',
              message: '🎉 Your PayPal subscription has been verified and Pro features are fully activated!',
            });
          } else {
            setBillingNotification({
              type: 'error',
              message: result.error || 'PayPal payment could not be verified on the server.',
            });
          }
        } catch (err: any) {
          setBillingNotification({
            type: 'error',
            message: err.message || 'PayPal payment verification failed.',
          });
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      verifyReturn();
    } else if (billingStatus === 'cancelled') {
      setBillingNotification({
        type: 'info',
        message: 'PayPal subscription checkout was cancelled.',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 1. Initial Durable Database Hydration (IndexedDB + localStorage migration)
  useEffect(() => {
    const initData = async () => {
      try {
        const data = await loadDurableData();
        setTransactions(data.transactions);
        setCategories(data.categories);
        const loadedProf = data.profile;
        setProfile(loadedProf);
        setRecurringBills(data.recurringBills || []);
        setClients(data.clients || []);

        // Centralized Entitlement Integrity: Verify stored Pro subscription with server
        const plan = (loadedProf.subscriptionPlan || 'free').toLowerCase();
        if (plan !== 'free') {
          if (loadedProf.subscriptionId) {
            checkSubscriptionStatusOnServer(loadedProf.subscriptionId).then((res) => {
              if (res.success && res.subscription) {
                const isActive = res.subscription.status === 'active' || 
                  (res.subscription.status === 'cancelled' && new Date(res.subscription.expiryDate).getTime() > Date.now());
                if (isActive) {
                  const updated: UserProfile = {
                    ...loadedProf,
                    subscriptionStatus: res.subscription.status,
                    subscriptionExpiry: res.subscription.expiryDate,
                    cancelAtPeriodEnd: res.subscription.cancelAtPeriodEnd || false,
                  };
                  setProfile(updated);
                  persistProfile(updated);
                } else {
                  const updated: UserProfile = {
                    ...loadedProf,
                    subscriptionPlan: 'free',
                    subscriptionStatus: 'expired',
                  };
                  setProfile(updated);
                  persistProfile(updated);
                }
              } else {
                // Subscription ID not found in verified server cache -> revert to Free
                const updated: UserProfile = {
                  ...loadedProf,
                  subscriptionPlan: 'free',
                  subscriptionStatus: 'expired',
                };
                setProfile(updated);
                persistProfile(updated);
              }
            }).catch(() => {
              // Network/offline error: check local expiry
              if (loadedProf.subscriptionExpiry && new Date(loadedProf.subscriptionExpiry).getTime() <= Date.now()) {
                const updated: UserProfile = {
                  ...loadedProf,
                  subscriptionPlan: 'free',
                  subscriptionStatus: 'expired',
                };
                setProfile(updated);
                persistProfile(updated);
              }
            });
          } else {
            // Local Pro flag without valid subscription ID -> revert to Free
            const updated: UserProfile = {
              ...loadedProf,
              subscriptionPlan: 'free',
              subscriptionStatus: 'expired',
            };
            setProfile(updated);
            persistProfile(updated);
          }
        }

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

  const updateClientsState = (updatedList: Client[]) => {
    setClients(updatedList);
    persistClients(updatedList);
  };

  const handleSaveClient = (client: Client) => {
    const exists = clients.some((c) => c.id === client.id);
    let updated: Client[];
    if (exists) {
      updated = clients.map((c) => (c.id === client.id ? client : c));
    } else {
      updated = [client, ...clients];
    }
    updateClientsState(updated);
  };

  const handleArchiveClient = (clientId: string) => {
    const updated = clients.map((c) => (c.id === clientId ? { ...c, isArchived: true, updatedAt: new Date().toISOString() } : c));
    updateClientsState(updated);
  };

  const handleUnarchiveClient = (clientId: string) => {
    const updated = clients.map((c) => (c.id === clientId ? { ...c, isArchived: false, updatedAt: new Date().toISOString() } : c));
    updateClientsState(updated);
  };

  const isPremium = isSubscriptionActive(profile);
  const invoiceCount = transactions.filter(
    (t) =>
      (t.description || '').startsWith('Invoice #') ||
      (t.description || '').startsWith('Estimate #') ||
      (t.description || '').includes('INV-')
  ).length;

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
    restoredBills?: RecurringBill[],
    restoredClients?: Client[]
  ) => {
    if (restoredTxs) updateTransactionsState(restoredTxs);
    if (restoredCats && restoredCats.length > 0) updateCategoriesState(restoredCats);
    if (restoredProf) handleUpdateProfile(restoredProf);
    if (restoredBills) updateRecurringBillsState(restoredBills);
    if (restoredClients) updateClientsState(restoredClients);
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
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'statements', label: 'Statements', icon: FileSpreadsheet },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'subscription', label: 'My Subscription', icon: Sparkles },
    { id: 'settings', label: 'Settings & Categories', icon: Settings },
  ];

  const ActiveIcon = NAV_ITEMS.find((n) => n.id === activeTab)?.icon || Layers;

  // Enforce 6-digit PIN login before app access
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        initialUserName={profile.ownerName && profile.ownerName !== 'Business Owner' ? profile.ownerName : ''}
      />
    );
  }

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
            <img 
              src="/app-icon.png" 
              alt="Business Expense Tracker" 
              className="w-9 h-9 rounded-xl object-contain shadow-md shrink-0 border border-slate-700/60 bg-blue-600/10" 
            />
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
                <span className="flex-1 text-left">{item.label}</span>
                {!isPremium && (item.id === 'statements' || item.id === 'analytics') && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    PRO
                  </span>
                )}
                {!isPremium && item.id === 'subscription' && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    UPGRADE
                  </span>
                )}
              </button>
            );
          })}
          
          {/* Pro License / Expiry Notice */}
          {(() => {
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
            const showSidebarBilling = isExpiringSoon || isExpired;

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
          {isPremium ? (
            <div className="flex items-center space-x-1 font-mono text-[9px] text-blue-400 font-bold">
              <span>★ Pro {profile.subscriptionInterval === 'year' || profile.subscriptionPlan === 'pro_yearly' ? 'Yearly' : 'Monthly'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 font-mono text-[9px] text-emerald-500 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Offline Database Synced</span>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER NAVIGATION */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-[85vw] bg-[#0F172A] border-r border-slate-800 flex flex-col z-10 select-none shadow-2xl h-full"
            >
              <div className="p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <img 
                    src="/app-icon.png" 
                    alt="Business Expense Tracker" 
                    className="w-9 h-9 rounded-xl object-contain shadow-md shrink-0 border border-slate-700/60 bg-blue-600/10" 
                  />
                  <div>
                    <span className="text-base font-bold text-white tracking-tight block">Business Expense</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">Tracker</span>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
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
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0 text-current" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {!isPremium && (item.id === 'statements' || item.id === 'analytics') && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          PRO
                        </span>
                      )}
                      {!isPremium && item.id === 'subscription' && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          UPGRADE
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-800 bg-[#0c1222] text-[10px] text-slate-400">
                <div className="flex items-center justify-between font-semibold text-slate-300 mb-1">
                  <span className="truncate max-w-[140px]">{profile.businessName}</span>
                  <span className="font-mono text-[9px] uppercase bg-slate-800 px-1 py-0.5 rounded font-bold text-slate-300">
                    {profile.currency}
                  </span>
                </div>
                <span className="text-[9.5px] text-slate-500 block">Owner: {profile.ownerName}</span>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

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

            {/* Current Plan Identification Badge */}
            {isPremium ? (
              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[9.5px] font-black tracking-wider uppercase bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 cursor-pointer hover:bg-blue-500/25 transition-all shadow-xs pointer-events-auto"
                title="Verified Pro Plan - Click to manage subscription"
              >
                <Sparkles className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                <span>PRO PLAN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpgradeTrigger('Upgrade to Pro for unlimited records, account statement PDFs, and advanced analytics.')}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg text-[9.5px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400/50 hover:text-blue-500 transition-all shadow-xs pointer-events-auto"
                title="Free Starter Plan - Click to view Pro plans"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                <span>FREE PLAN</span>
              </button>
            )}
          </div>

          {/* Global Real-Time Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-2 sm:mx-4">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                }}
                onClick={() => {
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearchQuery.trim()) {
                    addRecentSearch(globalSearchQuery);
                  }
                }}
                placeholder="Search description, client, category..."
                className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-100/90 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-2xs pointer-events-auto"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {globalSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalSearchQuery('');
                      setIsSearchOpen(true);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors pointer-events-auto"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <kbd className="hidden md:inline-flex items-center text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 select-none border border-slate-300/60 dark:border-slate-600/60">
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>

            {/* Real-Time Interactive Search Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn overflow-hidden">
                {globalSearchQuery.trim().length > 0 ? (
                  <>
                    <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {searchResults.length === 0
                          ? 'No transactions found'
                          : `Found ${searchResults.length} transaction${searchResults.length === 1 ? '' : 's'}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Matching description, client, or category
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {searchResults.slice(0, 8).map((tx) => {
                        const isIncome = tx.type === 'income';
                        return (
                          <div
                            key={tx.id}
                            onClick={() => {
                              addRecentSearch(globalSearchQuery);
                              if (isIncome) {
                                setActiveTab('income');
                              } else {
                                setActiveTab('expenses');
                              }
                              setIsSearchOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors pointer-events-auto"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                                  isIncome
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isIncome ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
                                  {tx.description}
                                </span>
                                <div className="flex items-center gap-2 text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                                  <span className="truncate">{tx.category}</span>
                                  {tx.clientName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-blue-600 dark:text-blue-400 truncate">
                                        {tx.clientName}
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>{tx.date}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`font-mono font-bold text-xs ${
                                  isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency || profile.currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {searchResults.length === 0 && (
                        <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                          <p className="font-semibold text-slate-600 dark:text-slate-300">
                            No transactions match "{globalSearchQuery}"
                          </p>
                          <p className="text-[11px]">
                            Check the spelling or try searching by category or client name.
                          </p>
                        </div>
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {searchExpenseMatches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                addRecentSearch(globalSearchQuery);
                                setActiveTab('expenses');
                                setIsSearchOpen(false);
                              }}
                              className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors pointer-events-auto font-medium"
                            >
                              View in Expenses ({searchExpenseMatches.length})
                            </button>
                          )}
                          {searchIncomeMatches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                addRecentSearch(globalSearchQuery);
                                setActiveTab('income');
                                setIsSearchOpen(false);
                              }}
                              className="px-2 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors pointer-events-auto font-medium"
                            >
                              View in Income ({searchIncomeMatches.length})
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalSearchQuery('');
                            setIsSearchOpen(true);
                            searchInputRef.current?.focus();
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto px-1.5 py-0.5"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Recent Searches Section (Shown when search input is focused but empty) */
                  <div className="space-y-1">
                    <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>Recent Searches</span>
                      </div>
                      {recentSearches.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllRecentSearches}
                          className="text-[10.5px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors pointer-events-auto"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {recentSearches.length > 0 ? (
                      <div className="py-1">
                        {recentSearches.slice(0, 5).map((term) => (
                          <div
                            key={term}
                            onClick={() => {
                              setGlobalSearchQuery(term);
                              addRecentSearch(term);
                              setIsSearchOpen(true);
                              searchInputRef.current?.focus();
                            }}
                            className="group px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between text-xs transition-colors pointer-events-auto"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                              <span className="truncate font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {term}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRecentSearch(term, e)}
                              title="Remove from recent searches"
                              className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors opacity-60 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
                        <p className="font-semibold text-slate-600 dark:text-slate-300">No recent searches</p>
                        <p className="text-[11px]">Type to search transactions by description, client, or category.</p>
                      </div>
                    )}

                    {/* Suggested Quick Searches / Helper Info */}
                    <div className="px-3.5 pt-2 pb-1.5 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">
                        <span>Quick suggestions</span>
                        <span className="font-mono">⌘K / Esc</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Software', 'Client Payment', 'Hosting', 'Design Services'].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setGlobalSearchQuery(suggestion);
                              addRecentSearch(suggestion);
                              setIsSearchOpen(true);
                              searchInputRef.current?.focus();
                            }}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-[10.5px] text-slate-600 dark:text-slate-300 transition-colors pointer-events-auto"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 shrink-0">
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

            {/* Lock Workspace Header Button */}
            <button
              onClick={handleLockApp}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition-colors pointer-events-auto cursor-pointer"
              title="Lock workspace with 6-digit PIN"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Lock</span>
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
                    {profile.ownerName.split(' ')[0]} {isPremium && '★'}
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
                      isPremium 
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                        : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {isPremium ? (profile.subscriptionPlan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly') : 'Free Plan'}
                    </span>
                  </div>
                  {[
                    { label: 'Profile & Settings', id: 'settings' },
                    { label: 'Account & Monthly Statements', id: 'statements' },
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
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleLockApp}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 pointer-events-auto transition-colors flex items-center space-x-2"
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Lock Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Router Body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto relative">
          
          {/* Real-time Billing Notification Banner */}
          {billingNotification && (
            <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-xs font-medium shadow-sm transition-all ${
              billingNotification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : billingNotification.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {billingNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
                {billingNotification.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                {billingNotification.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />}
                <span>{billingNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBillingNotification(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors pointer-events-auto"
              >
                <X className="w-4 h-4" />
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
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  recurringBills={recurringBills}
                  profile={profile}
                  onNavigate={setActiveTab}
                  onQuickAdd={handleQuickAdd}
                  onOpenBatchReceipts={() => {
                    if (!isPremium) {
                      handleUpgradeTrigger('Unlock multi-document Batch Receipt OCR parsing with Pro.');
                    } else {
                      setBatchReceiptsOpen(true);
                    }
                  }}
                  onOpenRecurringBills={() => {
                    if (!isPremium) {
                      handleUpgradeTrigger('Unlock automated recurring bills & cash-flow forecasting with Pro.');
                    } else {
                      setRecurringBillsOpen(true);
                    }
                  }}
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
                  clients={clients}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onAddCustomCategory={handleAddCustomCategory}
                  onAddClient={handleSaveClient}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                  globalSearchQuery={globalSearchQuery}
                />
              )}

              {activeTab === 'income' && (
                <IncomeView
                  transactions={transactions}
                  categories={categories}
                  profile={profile}
                  clients={clients}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onAddCustomCategory={handleAddCustomCategory}
                  onAddClient={handleSaveClient}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                  globalSearchQuery={globalSearchQuery}
                />
              )}

              {activeTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  transactions={transactions}
                  profile={profile}
                  onSaveClient={handleSaveClient}
                  onArchiveClient={handleArchiveClient}
                  onUnarchiveClient={handleUnarchiveClient}
                  isPremium={isPremium}
                  onUpgradeTrigger={handleUpgradeTrigger}
                  onNavigateToIncomeWithClient={(_clientId, clientName) => {
                    setActiveTab('income');
                    setAutoOpenFormType('income');
                  }}
                  onNavigateToExpenseWithClient={(_clientId, clientName) => {
                    setActiveTab('expenses');
                    setAutoOpenFormType('expense');
                  }}
                  onOpenInvoiceWithClient={(client) => {
                    setInvoiceInitialClient(client);
                    setInvoiceModalOpen(true);
                  }}
                  globalSearchQuery={globalSearchQuery}
                />
              )}

              {activeTab === 'statements' && (
                <StatementsView
                  transactions={transactions}
                  categories={categories}
                  profile={profile}
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
                  onNavigateTab={setActiveTab}
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
                  recurringBills={recurringBills}
                  clients={clients}
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
                  clientsCount={clients.length}
                  invoicesCount={invoiceCount}
                  recurringBillsCount={recurringBills.length}
                  onUpdateProfile={handleUpdateProfile}
                  onNavigateTab={setActiveTab}
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
        isPremium={isPremium}
        onUpgradeTrigger={handleUpgradeTrigger}
      />

      {/* Client Invoice & Estimate Generator Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceInitialClient(null);
          setInvoiceModalOpen(false);
        }}
        profile={profile}
        clients={clients}
        initialSelectedClient={invoiceInitialClient}
        onSaveClient={handleSaveClient}
        onRecordIncome={(tx) => handleAddTransaction(tx)}
        isPremium={isPremium}
        invoiceCount={invoiceCount}
        onUpgradeTrigger={handleUpgradeTrigger}
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
        onSubscriptionUpdated={handleUpdateProfile}
      />
    </div>
  );
}
