import { Client, Transaction, ClientFinancialSummary } from '../types';
import { roundMoney } from './financeCalculations';

/**
 * Validates a client candidate object.
 * Required: name (non-empty string).
 */
export const validateClient = (candidate: Partial<Client>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!candidate.name || !candidate.name.trim()) {
    errors.push('Client or business name is required.');
  } else if (candidate.name.trim().length > 120) {
    errors.push('Client name must not exceed 120 characters.');
  }

  if (candidate.email && candidate.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidate.email.trim())) {
      errors.push('Please enter a valid email address (e.g., client@example.com).');
    }
  }

  if (candidate.phone && candidate.phone.trim()) {
    // Permissive phone validation allowing +, digits, spaces, hyphens, parentheses
    const phoneRegex = /^[+]?[\d\s\-().]{5,25}$/;
    if (!phoneRegex.test(candidate.phone.trim())) {
      errors.push('Please enter a valid phone number or leave the field blank.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Checks for potential duplicate clients based on Name, Email, or Phone.
 * Returns an array of matched existing clients for user warning.
 */
export const findDuplicateClients = (
  candidate: { name: string; email?: string; phone?: string; id?: string },
  clients: Client[]
): Client[] => {
  const candidateName = candidate.name.trim().toLowerCase();
  const candidateEmail = candidate.email?.trim().toLowerCase();
  const candidatePhone = candidate.phone?.trim().replace(/\D/g, '');

  return clients.filter((c) => {
    // Exclude the client itself when editing
    if (candidate.id && c.id === candidate.id) return false;

    const existingName = c.name.trim().toLowerCase();
    const existingEmail = c.email?.trim().toLowerCase();
    const existingPhone = c.phone?.trim().replace(/\D/g, '');

    // Exact or closely matching name
    if (existingName === candidateName) return true;

    // Matching email if provided
    if (candidateEmail && existingEmail && candidateEmail === existingEmail) return true;

    // Matching phone if provided and not too short
    if (candidatePhone && existingPhone && candidatePhone.length >= 7 && candidatePhone === existingPhone) return true;

    return false;
  });
};

/**
 * Computes financial performance and transaction history for a specific client.
 * Matches transactions either by clientId OR by legacy project/client name.
 */
export const getClientFinancialSummary = (
  client: Client,
  transactions: Transaction[]
): ClientFinancialSummary & { clientTransactions: Transaction[] } => {
  const clientNameLower = client.name.trim().toLowerCase();

  const clientTransactions = transactions.filter((t) => {
    // 1. Direct stable ID match
    if (t.clientId && t.clientId === client.id) return true;

    // 2. Client name match in clientName property
    if (t.clientName && t.clientName.trim().toLowerCase() === clientNameLower) return true;

    // 3. Fallback backward-compatible match with project field
    if (t.project && t.project.trim().toLowerCase() === clientNameLower) return true;

    return false;
  });

  // Sort latest first
  clientTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  clientTransactions.forEach((t) => {
    const rate = typeof t.exchangeRate === 'number' && t.exchangeRate > 0 ? t.exchangeRate : 1;
    const amount = roundMoney(t.amount * rate);

    if (t.type === 'income') {
      totalIncome += amount;
      incomeCount++;
    } else if (t.type === 'expense') {
      // Exclude transfers
      if (!t.isTransfer && t.category?.toLowerCase() !== 'transfer') {
        totalExpenses += amount;
        expenseCount++;
      }
    }
  });

  totalIncome = roundMoney(totalIncome);
  totalExpenses = roundMoney(totalExpenses);
  const netContribution = roundMoney(totalIncome - totalExpenses);

  return {
    clientId: client.id,
    clientName: client.name,
    totalIncome,
    totalExpenses,
    netContribution,
    transactionCount: clientTransactions.length,
    incomeCount,
    expenseCount,
    latestTransactionDate: clientTransactions.length > 0 ? clientTransactions[0].date : null,
    clientTransactions,
  };
};

/**
 * Starter sample clients matching the initial business workspace transactions.
 */
export const getStarterClients = (): Client[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'cli_zenith_corp',
      name: 'Zenith Digital Corp',
      companyName: 'Zenith Global Media Inc.',
      email: 'billing@zenithcorp.com',
      phone: '+1 (555) 234-5678',
      billingAddress: '452 Innovation Blvd, Suite 800, New York, NY 10001, USA',
      gstin: 'GSTIN27AABCT3518Q1Z4',
      notes: 'Key retainer client for monthly digital design and strategic branding.',
      defaultCurrency: 'USD',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cli_stellar_labs',
      name: 'Stellar Labs',
      companyName: 'Stellar BioTech & AI Solutions',
      email: 'accounts@stellarlabs.io',
      phone: '+1 (555) 890-1234',
      billingAddress: '100 Technology Square, Cambridge, MA 02139, USA',
      gstin: 'US-EIN-84-9382104',
      notes: 'Consulting client for interactive data visualizations and user interface.',
      defaultCurrency: 'USD',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cli_helios_fintech',
      name: 'Helios FinTech Systems',
      companyName: 'Helios Technologies Group',
      email: 'procurement@heliosfin.com',
      phone: '+44 20 7946 0912',
      billingAddress: '25 Bank Street, Canary Wharf, London E14 5JP, UK',
      gstin: 'GB982341209',
      notes: 'FinTech dashboard engineering and component architecture milestone payments.',
      defaultCurrency: 'USD',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
};
