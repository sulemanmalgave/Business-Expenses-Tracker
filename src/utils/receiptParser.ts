import { Transaction } from '../types';

export interface BatchReceiptItem {
  id: string;
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  suggestedData: {
    vendor: string;
    date: string;
    amount: number;
    currency: string;
    taxAmount?: number;
    invoiceNumber?: string;
    category: string;
    paymentMethod: string;
    isDuplicateCandidate?: boolean;
  };
}

/**
 * Parses receipt filename and basic text heuristics locally on client device.
 * Extracts dates, amounts, vendors, and tags without uploading to any remote server.
 */
export const parseReceiptLocally = async (
  file: File,
  existingTransactions: Transaction[],
  defaultCurrency: string = 'USD'
): Promise<BatchReceiptItem> => {
  const fileId = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Convert to DataURL for preview and storage
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const rawName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
  const cleanName = rawName.replace(/[-_]/g, ' ');

  // 1. Try finding date in filename or metadata (e.g. 2026-04-12 or 20260412 or 12-04-2026)
  let detectedDate = new Date().toISOString().split('T')[0];
  const dateMatchIso = rawName.match(/\b(202\d[-_]?\d{2}[-_]?\d{2})\b/);
  if (dateMatchIso) {
    const cleanDate = dateMatchIso[1].replace(/[-_]/g, '-');
    if (cleanDate.length === 8) {
      detectedDate = `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`;
    } else {
      detectedDate = cleanDate;
    }
  }

  // 2. Try finding amount (e.g., "$45.50" or "45_50" or "45.00" or "USD_120")
  let detectedAmount = 0;
  const amountMatch = rawName.match(/(?:[\$€£₹]|usd|inr|eur|amount)?\s*([0-9]+(?:[\.\,][0-9]{2}))/i);
  if (amountMatch) {
    detectedAmount = parseFloat(amountMatch[1].replace(',', '.')) || 0;
  } else {
    // Look for integer numbers that look like an expense
    const intMatch = rawName.match(/\b([1-9][0-9]{1,4})\b/);
    if (intMatch) {
      detectedAmount = parseFloat(intMatch[1]) || 0;
    }
  }

  // 3. Try finding vendor name
  let vendor = 'Office Vendor';
  const knownVendors = [
    { pattern: /aws|amazon/i, name: 'Amazon Web Services', category: 'Software & SaaS Tools' },
    { pattern: /google|gsuite/i, name: 'Google Cloud / Workspace', category: 'Software & SaaS Tools' },
    { pattern: /adobe/i, name: 'Adobe Creative Cloud', category: 'Software & SaaS Tools' },
    { pattern: /github/i, name: 'GitHub Enterprise', category: 'Software & SaaS Tools' },
    { pattern: /slack/i, name: 'Slack Technologies', category: 'Software & SaaS Tools' },
    { pattern: /figma/i, name: 'Figma Design', category: 'Software & SaaS Tools' },
    { pattern: /uber|lyft|taxi/i, name: 'Uber Rides', category: 'Travel & Meals' },
    { pattern: /starbucks|coffee|cafe/i, name: 'Starbucks Coffee', category: 'Travel & Meals' },
    { pattern: /hotel|airbnb|flight/i, name: 'Travel Lodging', category: 'Travel & Meals' },
    { pattern: /staples|office/i, name: 'Office Depot', category: 'Office Hardware & Supplies' },
  ];

  let detectedCategory = 'Other Expenses';
  for (const kv of knownVendors) {
    if (kv.pattern.test(cleanName)) {
      vendor = kv.name;
      detectedCategory = kv.category;
      break;
    }
  }

  if (vendor === 'Office Vendor') {
    // Use first two words of filename
    const words = cleanName.split(' ').filter((w) => w.length > 2 && !/^\d+$/.test(w));
    if (words.length > 0) {
      vendor = words.slice(0, 3).join(' ');
    }
  }

  // 4. Duplicate Detection: Check if another transaction on the same date with same amount exists
  const isDuplicateCandidate = existingTransactions.some(
    (t) => t.date === detectedDate && Math.abs(t.amount - detectedAmount) < 0.01 && detectedAmount > 0
  );

  return {
    id: fileId,
    file,
    fileName: file.name,
    fileType: file.type || 'image/jpeg',
    fileSize: file.size,
    dataUrl,
    status: 'ready',
    suggestedData: {
      vendor,
      date: detectedDate,
      amount: detectedAmount,
      currency: defaultCurrency,
      category: detectedCategory,
      paymentMethod: 'Credit Card',
      isDuplicateCandidate,
    },
  };
};
