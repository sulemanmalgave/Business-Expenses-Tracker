import { RecurringBill, Transaction } from '../types';

/**
 * Calculates the next due date based on frequency.
 */
export const advanceDueDate = (
  currentDueDate: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string => {
  const d = new Date(currentDueDate);
  if (isNaN(d.getTime())) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().split('T')[0];
};

/**
 * Evaluates recurring bills and separates them into:
 * - Overdue (due before today)
 * - Due soon (due within next 7 days)
 * - Future (due > 7 days away)
 */
export const evaluateRecurringBills = (
  bills: RecurringBill[],
  todayStr: string = new Date().toISOString().split('T')[0]
) => {
  const activeBills = bills.filter((b) => b.isActive);
  const overdue: RecurringBill[] = [];
  const dueSoon: RecurringBill[] = [];
  const future: RecurringBill[] = [];

  const today = new Date(todayStr).getTime();
  const sevenDaysFromNow = today + 7 * 24 * 60 * 60 * 1000;

  for (const bill of activeBills) {
    // Check if end date passed
    if (bill.endDate && bill.endDate < todayStr) {
      continue;
    }

    const dueDate = new Date(bill.nextDueDate).getTime();

    if (bill.nextDueDate < todayStr) {
      overdue.push(bill);
    } else if (dueDate <= sevenDaysFromNow) {
      dueSoon.push(bill);
    } else {
      future.push(bill);
    }
  }

  return {
    overdue,
    dueSoon,
    future,
    totalUpcomingCount: overdue.length + dueSoon.length,
  };
};

/**
 * Creates a genuine Transaction from a confirmed RecurringBill and advances its due date.
 * Prevents double-counting by returning the updated bill and the created transaction.
 */
export const processBillPayment = (
  bill: RecurringBill,
  paidDate: string = new Date().toISOString().split('T')[0]
): { updatedBill: RecurringBill; newTransaction: Omit<Transaction, 'id'> } => {
  const newTransaction: Omit<Transaction, 'id'> = {
    type: bill.type,
    amount: bill.amount,
    currency: 'USD',
    exchangeRate: 1.0,
    category: bill.category,
    date: paidDate,
    description: `${bill.description} (Scheduled Bill)`,
    paymentMethod: bill.paymentMethod || 'Bank Transfer',
    account: bill.account || 'Operating Account',
    project: bill.project || undefined,
    notes: `Generated from recurring bill schedule: ${bill.frequency}. Paid on ${paidDate}.`,
    isRecurring: true,
    recurrencePeriod: bill.frequency,
    createdAt: new Date().toISOString(),
  };

  const nextDate = advanceDueDate(bill.nextDueDate, bill.frequency);

  const updatedBill: RecurringBill = {
    ...bill,
    lastPaidDate: paidDate,
    nextDueDate: nextDate,
  };

  return {
    updatedBill,
    newTransaction,
  };
};
