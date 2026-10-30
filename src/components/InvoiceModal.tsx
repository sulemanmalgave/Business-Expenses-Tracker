import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Download, 
  Building, 
  User, 
  Calendar,
  Percent,
  Receipt,
  Save,
  Mail,
  Phone,
  MapPin,
  Hash,
  Sparkles
} from 'lucide-react';
import { UserProfile, Transaction, Client } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { roundMoney } from '../utils/financeCalculations';
import { isSubscriptionActive } from '../utils/subscriptionService';
import { ClientSelector } from './ClientSelector';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  clients?: Client[];
  initialSelectedClient?: Client | null;
  onSaveClient?: (client: Client) => void;
  onRecordIncome?: (tx: Omit<Transaction, 'id'>) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  profile,
  clients = [],
  initialSelectedClient = null,
  onSaveClient,
  onRecordIncome
}) => {
  const [docType, setDocType] = useState<'Invoice' | 'Estimate'>('Invoice');
  const [docNumber, setDocNumber] = useState(`INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default due date: +15 days
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  };
  const [dueDate, setDueDate] = useState(defaultDueDate());

  // Client Details
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [clientUpdatedToast, setClientUpdatedToast] = useState(false);

  // Sync initial client when passed from Client Profile drawer
  useEffect(() => {
    if (initialSelectedClient && isOpen) {
      setSelectedClientId(initialSelectedClient.id);
      setClientName(initialSelectedClient.name);
      setClientCompany(initialSelectedClient.companyName || '');
      setClientEmail(initialSelectedClient.email || '');
      setClientPhone(initialSelectedClient.phone || '');
      setClientAddress(initialSelectedClient.billingAddress || '');
      setClientGstin(initialSelectedClient.gstin || '');
    }
  }, [initialSelectedClient, isOpen]);

  // Items
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: 'item_1', description: 'Consulting & Development Services', quantity: 1, unitPrice: 15000 },
  ]);

  // Tax
  const [taxRate, setTaxRate] = useState<number>(profile.taxRate || 18);
  const [notes, setNotes] = useState('Payment is due within 15 days. Bank Transfer / UPI accepted.');
  const [isRecorded, setIsRecorded] = useState(false);
  const isPro = isSubscriptionActive(profile);

  if (!isOpen) return null;

  // Add line item
  const handleAddItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  // Calculations
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + (Math.max(0, item.quantity) * Math.max(0, item.unitPrice)), 0)
  );
  const taxAmount = roundMoney(subtotal * (Math.max(0, taxRate) / 100));
  const totalAmount = roundMoney(subtotal + taxAmount);

  // Print document
  const handlePrint = () => {
    window.print();
  };

  const handleSelectClient = (client: Client | null) => {
    if (client) {
      setSelectedClientId(client.id);
      setClientName(client.name);
      setClientCompany(client.companyName || '');
      setClientEmail(client.email || '');
      setClientPhone(client.phone || '');
      setClientAddress(client.billingAddress || '');
      setClientGstin(client.gstin || '');
    } else {
      setSelectedClientId('');
      setClientName('');
      setClientCompany('');
      setClientEmail('');
      setClientPhone('');
      setClientAddress('');
      setClientGstin('');
    }
  };

  const handleUpdateSavedClient = () => {
    if (!selectedClientId || !onSaveClient) return;
    const existing = clients.find((c) => c.id === selectedClientId);
    if (!existing) return;

    const updated: Client = {
      ...existing,
      name: clientName.trim() || existing.name,
      companyName: clientCompany.trim() || undefined,
      email: clientEmail.trim() || undefined,
      phone: clientPhone.trim() || undefined,
      billingAddress: clientAddress.trim() || undefined,
      gstin: clientGstin.trim().toUpperCase() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveClient(updated);
    setClientUpdatedToast(true);
    setTimeout(() => setClientUpdatedToast(false), 3000);
  };

  // Save to ledger as income
  const handleRecordToLedger = () => {
    if (!onRecordIncome || subtotal <= 0) return;

    onRecordIncome({
      type: 'income',
      amount: totalAmount,
      currency: profile.currency,
      exchangeRate: 1.0,
      category: 'Client Services',
      date: issueDate,
      description: `${docType} #${docNumber}: ${clientName || 'Client'}`,
      clientId: selectedClientId || undefined,
      clientName: clientName.trim() || undefined,
      project: clientName.trim() || undefined,
      account: 'Operating Account',
      paymentMethod: 'Bank Transfer',
      notes: `${docType} #${docNumber} Snapshot:\nClient: ${clientName}${clientCompany ? ` (${clientCompany})` : ''}\nEmail: ${clientEmail || 'N/A'}\nPhone: ${clientPhone || 'N/A'}\nGSTIN: ${clientGstin || 'N/A'}\nAddress: ${clientAddress || 'N/A'}\nSubtotal: ${formatCurrency(subtotal, profile.currency)}\nTax: ${formatCurrency(taxAmount, profile.currency)}\nTotal: ${formatCurrency(totalAmount, profile.currency)}\nTerms: ${notes}`,
      isRecurring: false,
      recurrencePeriod: 'none',
      createdAt: new Date().toISOString()
    });

    setIsRecorded(true);
    setTimeout(() => {
      setIsRecorded(false);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/75 backdrop-blur-sm pointer-events-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden"
      >
        {/* Top Header bar */}
        <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Document Generator
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  <Sparkles className="w-2.5 h-2.5" />
                  PRO
                </span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  Print & PDF Ready
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {docType === 'Invoice' ? 'Client Invoice' : 'Estimate / Quotation'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form & Document Layout */}
        <div className="p-5 md:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 print:p-0 print:m-0">
          
          {/* Controls: Type and Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Document Format
              </label>
              <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDocType('Invoice')}
                  className={`flex-1 py-1 rounded-lg transition-colors ${
                    docType === 'Invoice' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('Estimate')}
                  className={`flex-1 py-1 rounded-lg transition-colors ${
                    docType === 'Estimate' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Estimate
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Document #
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Business & Client Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Business */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/20 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                From (Your Business)
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {profile.businessName || 'Business Workspace'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">{profile.ownerName || 'Finance Manager'}</p>
              <p className="text-xs text-slate-500 font-mono">{profile.email || 'finance@business.local'}</p>
            </div>

            {/* Bill To */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/20 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <ClientSelector
                clients={clients}
                selectedClientId={selectedClientId}
                selectedClientName={clientName}
                onSelectClient={handleSelectClient}
                onAddNewClient={(newClient) => {
                  if (onSaveClient) onSaveClient(newClient);
                  handleSelectClient(newClient);
                }}
                label="Bill To (Recipient Client)"
                placeholder="Select a client to auto-fill billing details..."
                helperText="Select a client to automatically fill in their billing details."
                profile={profile}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="Recipient / Client Name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Company / Org Name"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="billing@client.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, City, Postal Code, Country"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                    Tax ID / GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="GSTIN / EIN / VAT Number"
                    value={clientGstin}
                    onChange={(e) => setClientGstin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Option to sync edits back to saved client record */}
              {selectedClientId && onSaveClient && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 italic">
                    Editing fields above applies only to this document unless saved back.
                  </span>
                  <button
                    type="button"
                    onClick={handleUpdateSavedClient}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Save className="w-3 h-3" />
                    <span>Update Saved Client Details</span>
                  </button>
                </div>
              )}

              {clientUpdatedToast && (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Master client record updated with current details!</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Line Items & Services</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-32 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 w-32 text-right">Amount</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => {
                    const rowTotal = roundMoney(item.quantity * item.unitPrice);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            placeholder="Description of service or goods"
                            className="w-full px-2.5 py-1.5 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 rounded-lg outline-none text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-xs outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-28 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right text-xs font-mono outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                          {formatCurrency(rowTotal, profile.currency, profile.numberFormatPreference)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtotals & Tax Calculation Summary */}
          <div className="flex flex-col md:flex-row justify-between gap-6 pt-2">
            {/* Notes */}
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Terms & Payment Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bank details, payment due terms, or delivery notes"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
              <p className="text-[10px] text-slate-400 italic">
                Note: Standard business template. Verify tax registration and local compliance rules for your jurisdiction.
              </p>
            </div>

            {/* Financial Summary Box */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(subtotal, profile.currency, profile.numberFormatPreference)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span>Tax / GST</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-12 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-center font-mono"
                  />
                  <span>%</span>
                </div>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  +{formatCurrency(taxAmount, profile.currency, profile.numberFormatPreference)}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>Total Amount Due</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 text-base">
                  {formatCurrency(totalAmount, profile.currency, profile.numberFormatPreference)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isRecorded && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recorded as Income transaction in your ledger!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            {onRecordIncome && (
              <button
                type="button"
                onClick={handleRecordToLedger}
                disabled={subtotal <= 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Record into Income Ledger</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
