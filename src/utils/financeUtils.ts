import { Transaction, Category, UserProfile } from '../types';

export const DEFAULT_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan (¥)' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar (NZ$)' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Income Categories
  { id: 'inc_client', name: 'Client Services', type: 'income', color: '#10b981', icon: 'Briefcase' },
  { id: 'inc_product', name: 'Product Sales', type: 'income', color: '#3b82f6', icon: 'ShoppingBag' },
  { id: 'inc_consult', name: 'Consulting & Advisory', type: 'income', color: '#8b5cf6', icon: 'Users' },
  { id: 'inc_affiliate', name: 'Affiliate & Ads', type: 'income', color: '#f59e0b', icon: 'Megaphone' },
  { id: 'inc_investment', name: 'Investments', type: 'income', color: '#ec4899', icon: 'TrendingUp' },
  { id: 'inc_other', name: 'Miscellaneous Income', type: 'income', color: '#6b7280', icon: 'Coins' },

  // Expense Categories
  { id: 'exp_rent', name: 'Office Rent & Workspace', type: 'expense', color: '#f43f5e', icon: 'Building' },
  { id: 'exp_salaries', name: 'Salaries & Contractors', type: 'expense', color: '#de66fa', icon: 'UserCheck' },
  { id: 'exp_software', name: 'Software & SaaS Tools', type: 'expense', color: '#06b6d4', icon: 'Cpu' },
  { id: 'exp_marketing', name: 'Marketing & Advertising', type: 'expense', color: '#f97316', icon: 'Sparkles' },
  { id: 'exp_travel', name: 'Travel & Meals', type: 'expense', color: '#14b8a6', icon: 'Plane' },
  { id: 'exp_supplies', name: 'Office Hardware & Supplies', type: 'expense', color: '#64748b', icon: 'Paperclip' },
  { id: 'exp_utilities', name: 'Utilities & Internet', type: 'expense', color: '#eab308', icon: 'Zap' },
  { id: 'exp_legal', name: 'Tax, Legal & Accounting', type: 'expense', color: '#6366f1', icon: 'Scale' },
  { id: 'exp_other', name: 'Other Expenses', type: 'expense', color: '#94a3b8', icon: 'FileText' },
];

export const DEFAULT_PROFILE: UserProfile = {
  businessName: 'Apex Advisory Services',
  ownerName: 'Sarah Jenkins',
  currency: 'USD',
  email: 'finance@apex-advisory.com',
  taxRate: 15,
};

// Generates highly realistic starting transactions for demonstration
export const getStarterTransactions = (): Transaction[] => {
  const currentDate = new Date();
  const formatOffsetDate = (daysAgo: number): string => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'tx_starter_1',
      type: 'income',
      amount: 4800,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Client Services',
      date: formatOffsetDate(2),
      description: 'Monthly Retainer - Milestone #3 - Zenith Digital Corp',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_2',
      type: 'expense',
      amount: 1200,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Office Rent & Workspace',
      date: formatOffsetDate(8),
      description: 'Downtown Premium Coworking & Boardroom Access',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_3',
      type: 'expense',
      amount: 340,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Software & SaaS Tools',
      date: formatOffsetDate(5),
      description: 'Google Suite, Slack, Figma & Vercel Subscriptions',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_4',
      type: 'income',
      amount: 1500,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Consulting & Advisory',
      date: formatOffsetDate(6),
      description: 'Strategy Consultation Workshop - Nova Ventures LLC',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_5',
      type: 'expense',
      amount: 850,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Salaries & Contractors',
      date: formatOffsetDate(10),
      description: 'Visual Design Contract Work - Freelancer Invoice #221',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_6',
      type: 'expense',
      amount: 450,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Marketing & Advertising',
      date: formatOffsetDate(3),
      description: 'LinkedIn Ads & Retargeting - Campaign A3',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_7',
      type: 'income',
      amount: 950,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Product Sales',
      date: formatOffsetDate(12),
      description: 'Strategy Guide Vol 2 & UI Resource Kits - Gumroad Payout',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_8',
      type: 'expense',
      amount: 75,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Travel & Meals',
      date: formatOffsetDate(1),
      description: 'Business Lunch with Executive Partner from Zenith Corp',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_9',
      type: 'income',
      amount: 3200,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Client Services',
      date: formatOffsetDate(15),
      description: 'Interactive Design Consultation - Stellar Labs',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_10',
      type: 'expense',
      amount: 250,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Utilities & Internet',
      date: formatOffsetDate(14),
      description: 'High-speed Fiber Broadband & AWS Cloud Server Hosting',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_11',
      type: 'expense',
      amount: 400,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Tax, Legal & Accounting',
      date: formatOffsetDate(18),
      description: 'Quarterly Corporate Tax Prep - QuickBooks Accounting Firm',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_12',
      type: 'income',
      amount: 420,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Affiliate & Ads',
      date: formatOffsetDate(20),
      description: 'Digital Ecosystem Blog Affiliate Fee - Monthly payout',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_13',
      type: 'expense',
      amount: 110,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Office Hardware & Supplies',
      date: formatOffsetDate(4),
      description: 'Ergonomic Accessories, Notebooks & Packaging Box',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_14',
      type: 'income',
      amount: 5200,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Client Services',
      date: formatOffsetDate(22),
      description: 'Monthly Retainer - Milestone #2 - Zenith Digital Corp',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_15',
      type: 'expense',
      amount: 1200,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Office Rent & Workspace',
      date: formatOffsetDate(35),
      description: 'Downtown Premium Coworking & Boardroom Access Previous Month',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_16',
      type: 'expense',
      amount: 340,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Software & SaaS Tools',
      date: formatOffsetDate(32),
      description: 'Google Suite, Figma & Web Host Suite Previous Month',
      isRecurring: true,
      recurrencePeriod: 'monthly',
    },
    {
      id: 'tx_starter_17',
      type: 'income',
      amount: 4100,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Client Services',
      date: formatOffsetDate(36),
      description: 'Project Initiation Deposit - Helios FinTech Systems',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
    {
      id: 'tx_starter_18',
      type: 'expense',
      amount: 600,
      currency: 'USD',
      exchangeRate: 1,
      category: 'Marketing & Advertising',
      date: formatOffsetDate(38),
      description: 'SEO Campaign Blast Prep - Organic Leads',
      isRecurring: false,
      recurrencePeriod: 'none',
    },
  ];
};

// Local storage namespacing
export const STORAGE_KEYS = {
  TRANSACTIONS: 'finance_app_transactions',
  CATEGORIES: 'finance_app_categories',
  PROFILE: 'finance_app_profile',
  THEME: 'finance_app_theme',
};

// High-speed browser compression tool for receipts to avoid localStorage quota issues (exceeding 5MB)
export const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate resizing scale
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Save as Medium quality JPEG
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

// Currency Formatter
export const formatCurrency = (val: number, currencyCode: string = 'USD', numberFormatPreference?: string): string => {
  const currencyObj = DEFAULT_CURRENCIES.find((c) => c.code === currencyCode) || DEFAULT_CURRENCIES[0];
  const locale = numberFormatPreference || 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
  return `${currencyObj.symbol}${formatted}`;
};

// Date Formatter
export const formatDate = (dateStr: string, dateFormatPreference: string = 'YYYY-MM-DD'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  if (dateFormatPreference === 'DD-MM-YYYY') return `${day}-${month}-${year}`;
  if (dateFormatPreference === 'MM-DD-YYYY') return `${month}-${day}-${year}`;
  return `${year}-${month}-${day}`; // default YYYY-MM-DD
};

// CSV Export Builder
export const exportToCSV = (transactions: Transaction[], filename = 'business_transactions.csv') => {
  const headers = ['ID', 'Type', 'Category', 'Amount', 'Date', 'Description', 'Recurring', 'Period'];
  const rows = transactions.map((t) => [
    t.id,
    t.type.toUpperCase(),
    t.category,
    t.amount.toString(),
    t.date,
    t.description.replace(/"/g, '""'), // Escape double quotes
    t.isRecurring ? 'YES' : 'NO',
    t.recurrencePeriod,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// CSV Export for Excel-style compatibility
export const exportToExcelCSV = (transactions: Transaction[], filename = 'business_transactions_excel.csv') => {
  // Excel expects UTF-8 BOM byte order mark to parse characters and commas perfectly
  const headers = ['ID', 'Type', 'Category', 'Amount', 'Date', 'Description', 'Recurring', 'Period'];
  const csvRows = [headers.join(',')];

  transactions.forEach((t) => {
    const row = [
      t.id,
      t.type.toUpperCase(),
      t.category,
      t.amount,
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.isRecurring ? 'YES' : 'NO',
      t.recurrencePeriod,
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Simple parser for CSV imports
export const parseCSVData = (text: string): Partial<Transaction>[] => {
  try {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const result: Partial<Transaction>[] = [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const amtIdx = headers.findIndex((h) => h.includes('amount'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const catIdx = headers.findIndex((h) => h.includes('category'));
    const dateIdx = headers.findIndex((h) => h.includes('date'));
    const descIdx = headers.findIndex((h) => h.includes('description') || h.includes('desc'));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes with commas
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const cells = matches.map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const amount = parseFloat(cells[amtIdx]) || 0;
      const typeStr = cells[typeIdx]?.toLowerCase() === 'income' ? 'income' : 'expense';
      const category = cells[catIdx] || (typeStr === 'income' ? 'Client Services' : 'Other Expenses');
      const dateStr = cells[dateIdx] || new Date().toISOString().split('T')[0];
      const description = cells[descIdx] || 'Imported Transaction';

      result.push({
        type: typeStr,
        amount: Math.abs(amount),
        category,
        date: dateStr,
        description,
        isRecurring: false,
        recurrencePeriod: 'none',
      });
    }
    return result;
  } catch (err) {
    console.error('Error parsing CSV', err);
    return [];
  }
};
