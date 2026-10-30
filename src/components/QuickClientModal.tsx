import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, UserPlus, CheckCircle2, AlertTriangle, Building, Mail, Phone, MapPin, Hash, FileText } from 'lucide-react';
import { Client, UserProfile } from '../types';
import { validateClient, findDuplicateClients } from '../utils/clientUtils';
import { DEFAULT_CURRENCIES } from '../utils/financeUtils';

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveClient: (client: Client) => void;
  existingClients: Client[];
  initialName?: string;
  clientToEdit?: Client | null;
  profile?: UserProfile;
}

export const QuickClientModal: React.FC<QuickClientModalProps> = ({
  isOpen,
  onClose,
  onSaveClient,
  existingClients,
  initialName = '',
  clientToEdit = null,
  profile,
}) => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState(profile?.currency || 'INR');
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setCompanyName(clientToEdit.companyName || '');
      setEmail(clientToEdit.email || '');
      setPhone(clientToEdit.phone || '');
      setBillingAddress(clientToEdit.billingAddress || '');
      setGstin(clientToEdit.gstin || '');
      setNotes(clientToEdit.notes || '');
      setDefaultCurrency(clientToEdit.defaultCurrency || profile?.currency || 'INR');
    } else {
      setName(initialName);
      setCompanyName('');
      setEmail('');
      setPhone('');
      setBillingAddress('');
      setGstin('');
      setNotes('');
      setDefaultCurrency(profile?.currency || 'INR');
    }
    setErrors([]);
    setDuplicateWarning(null);
  }, [clientToEdit, initialName, isOpen, profile]);

  // Live duplicate check on name, email, or phone change
  useEffect(() => {
    if (!name.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const dupes = findDuplicateClients(
      {
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        id: clientToEdit?.id,
      },
      existingClients
    );

    if (dupes.length > 0) {
      const match = dupes[0];
      setDuplicateWarning(
        `Notice: A client with similar details already exists: "${match.name}"${
          match.companyName ? ` (${match.companyName})` : ''
        }. You can still save if this is a separate account.`
      );
    } else {
      setDuplicateWarning(null);
    }
  }, [name, email, phone, existingClients, clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: Partial<Client> = {
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      notes: notes.trim() || undefined,
      defaultCurrency,
    };

    const validation = validateClient(candidate);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const now = new Date().toISOString();
    const clientPayload: Client = {
      id: clientToEdit ? clientToEdit.id : `cli_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: candidate.name!,
      companyName: candidate.companyName,
      email: candidate.email,
      phone: candidate.phone,
      billingAddress: candidate.billingAddress,
      gstin: candidate.gstin,
      notes: candidate.notes,
      defaultCurrency: candidate.defaultCurrency,
      isArchived: clientToEdit ? Boolean(clientToEdit.isArchived) : false,
      createdAt: clientToEdit ? clientToEdit.createdAt : now,
      updatedAt: now,
    };

    onSaveClient(clientPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-xs pointer-events-auto overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {clientToEdit ? 'Edit Client Details' : 'Add New Client'}
              </h3>
              <p className="text-xs text-slate-500">
                Save client info once to reuse across transactions and invoices.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1 text-xs text-rose-700 dark:text-rose-300">
              {errors.map((err, i) => (
                <p key={i}>• {err}</p>
              ))}
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Client Name - Required */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Client / Individual Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Innovations or John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Company Name - Optional */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Company / Organization Name (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corporation Pvt Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address (Optional)</span>
              </label>
              <input
                type="email"
                placeholder="billing@client.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone Number (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* GSTIN / Tax ID & Default Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>GSTIN / Tax ID (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 27AABCT3518Q1Z4"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Default Currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {DEFAULT_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Address - Optional */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Billing Address (Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Suite, Street Address, City, State, Postal Code, Country"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Internal Notes - Optional */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Client Notes & Payment Terms (Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Monthly retainer client, NET 15 payment terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{clientToEdit ? 'Save Changes' : 'Save Client'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
