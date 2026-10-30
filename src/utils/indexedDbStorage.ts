import { Transaction, Category, UserProfile, RecurringBill, Client } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_PROFILE, STORAGE_KEYS, getStarterTransactions } from './financeUtils';
import { getStarterClients } from './clientUtils';

const DB_NAME = 'BusinessExpenseTrackerDB';
const DB_VERSION = 2;

interface DBSchema {
  transactions: Transaction[];
  categories: Category[];
  profile: UserProfile;
  recurringBills: RecurringBill[];
  clients: Client[];
}

/**
 * Open or upgrade the IndexedDB database.
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('date', 'date', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
        txStore.createIndex('category', 'category', { unique: false });
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('recurring_bills')) {
        db.createObjectStore('recurring_bills', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('receipts')) {
        db.createObjectStore('receipts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('clients')) {
        const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
        clientStore.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Generic IndexedDB helper to read all items from a store.
 */
const getAllFromStore = <T>(storeName: string): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generic IndexedDB helper to overwrite items in a store.
 */
const setAllInStore = <T>(storeName: string, items: T[]): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing records in this store
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const item of items) {
          store.put(item);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Load all application data with seamless, lossless migration from localStorage.
 */
export const loadDurableData = async (): Promise<DBSchema> => {
  try {
    // 1. Try loading from IndexedDB
    const [txs, cats, bills, profiles, loadedClients] = await Promise.all([
      getAllFromStore<Transaction>('transactions').catch(() => []),
      getAllFromStore<Category>('categories').catch(() => []),
      getAllFromStore<RecurringBill>('recurring_bills').catch(() => []),
      getAllFromStore<{ id: string; profile: UserProfile }>('profiles').catch(() => []),
      getAllFromStore<Client>('clients').catch(() => []),
    ]);

    const activeProfile = profiles.find((p) => p.id === 'current')?.profile;
    let finalClients = loadedClients;

    // Check localStorage fallback for clients
    if (finalClients.length === 0) {
      const storedClientsRaw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (storedClientsRaw) {
        try {
          finalClients = JSON.parse(storedClientsRaw);
          setAllInStore('clients', finalClients).catch(console.warn);
        } catch (_) {}
      }
    }

    // 2. Migration Check: If IndexedDB is empty, migrate existing localStorage data safely
    if (txs.length === 0 && cats.length === 0 && !activeProfile) {
      const storedTxsRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const storedCatsRaw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const storedProfRaw = localStorage.getItem(STORAGE_KEYS.PROFILE);

      if (storedTxsRaw || storedCatsRaw || storedProfRaw) {
        console.log('[Storage Migration] Seamlessly migrating existing localStorage records to IndexedDB...');
        const migratedTxs: Transaction[] = storedTxsRaw ? JSON.parse(storedTxsRaw) : [];
        const migratedCats: Category[] = storedCatsRaw ? JSON.parse(storedCatsRaw) : DEFAULT_CATEGORIES;
        const migratedProf: UserProfile = storedProfRaw ? JSON.parse(storedProfRaw) : DEFAULT_PROFILE;
        const starterClients = finalClients.length > 0 ? finalClients : getStarterClients();

        // Persist into IndexedDB
        await Promise.all([
          setAllInStore('transactions', migratedTxs).catch(console.warn),
          setAllInStore('categories', migratedCats).catch(console.warn),
          setAllInStore('profiles', [{ id: 'current', profile: migratedProf }]).catch(console.warn),
          setAllInStore('clients', starterClients).catch(console.warn),
        ]);

        return {
          transactions: migratedTxs,
          categories: migratedCats,
          profile: migratedProf,
          recurringBills: [],
          clients: starterClients,
        };
      }
    }

    // If transactions include starter demo data and no clients exist, seed starter clients
    if (finalClients.length === 0 && txs.some((t) => t.id.startsWith('tx_starter_'))) {
      finalClients = getStarterClients();
      setAllInStore('clients', finalClients).catch(console.warn);
      try {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(finalClients));
      } catch (_) {}
    }

    // Return loaded data or sensible initialized state
    return {
      transactions: txs,
      categories: cats.length > 0 ? cats : DEFAULT_CATEGORIES,
      profile: activeProfile || DEFAULT_PROFILE,
      recurringBills: bills,
      clients: finalClients,
    };
  } catch (err) {
    console.warn('[Storage Layer] IndexedDB encountered error; using localStorage fallback:', err);
    // Fallback to localStorage gracefully
    const storedTxs = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const storedCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    const storedProf = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);

    return {
      transactions: storedTxs ? JSON.parse(storedTxs) : [],
      categories: storedCats ? JSON.parse(storedCats) : DEFAULT_CATEGORIES,
      profile: storedProf ? JSON.parse(storedProf) : DEFAULT_PROFILE,
      recurringBills: [],
      clients: storedClients ? JSON.parse(storedClients) : getStarterClients(),
    };
  }
};

/**
 * Save transactions durably into IndexedDB and keep localStorage backup mirror.
 */
export const persistTransactions = async (txs: Transaction[]): Promise<void> => {
  try {
    await setAllInStore('transactions', txs);
  } catch (err) {
    console.warn('[Storage Layer] IndexedDB save failed, mirroring to localStorage:', err);
  } finally {
    // Keep secondary mirror for resilience
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    } catch (_) {}
  }
};

/**
 * Save categories durably.
 */
export const persistCategories = async (cats: Category[]): Promise<void> => {
  try {
    await setAllInStore('categories', cats);
  } catch (err) {
    console.warn('[Storage Layer] IndexedDB category save failed:', err);
  } finally {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
    } catch (_) {}
  }
};

/**
 * Save profile durably.
 */
export const persistProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await setAllInStore('profiles', [{ id: 'current', profile }]);
  } catch (err) {
    console.warn('[Storage Layer] IndexedDB profile save failed:', err);
  } finally {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (_) {}
  }
};

/**
 * Save recurring bills durably.
 */
export const persistRecurringBills = async (bills: RecurringBill[]): Promise<void> => {
  try {
    await setAllInStore('recurring_bills', bills);
  } catch (err) {
    console.warn('[Storage Layer] IndexedDB recurring bills save failed:', err);
  } finally {
    try {
      localStorage.setItem('finance_app_recurring_bills', JSON.stringify(bills));
    } catch (_) {}
  }
};

/**
 * Save clients durably into IndexedDB and keep localStorage backup mirror.
 */
export const persistClients = async (clients: Client[]): Promise<void> => {
  try {
    await setAllInStore('clients', clients);
  } catch (err) {
    console.warn('[Storage Layer] IndexedDB clients save failed:', err);
  } finally {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (_) {}
  }
};

/**
 * Store high-resolution receipt image directly in IndexedDB object store to avoid 5MB quota errors.
 */
export const persistReceiptImage = async (id: string, base64Data: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('receipts', 'readwrite');
    const store = transaction.objectStore('receipts');
    store.put({ id, data: base64Data, timestamp: new Date().toISOString() });
  } catch (err) {
    console.warn('[Storage Layer] Failed to persist receipt image in IndexedDB:', err);
  }
};

/**
 * Retrieve receipt image by ID.
 */
export const getReceiptImage = async (id: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('receipts', 'readonly');
      const store = transaction.objectStore('receipts');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
};
