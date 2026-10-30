import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Archive, 
  RotateCcw, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Hash, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Tag, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react';
import { Client, Transaction, UserProfile } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { getClientFinancialSummary } from '../utils/clientUtils';
import { QuickClientModal } from './QuickClientModal';

interface ClientsViewProps {
  clients: Client[];
  transactions: Transaction[];
  profile: UserProfile;
  onSaveClient: (client: Client) => void;
  onArchiveClient: (clientId: string) => void;
  onUnarchiveClient: (clientId: string) => void;
  onNavigateToIncomeWithClient?: (clientId: string, clientName: string) => void;
  onNavigateToExpenseWithClient?: (clientId: string, clientName: string) => void;
  onOpenInvoiceWithClient?: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  transactions,
  profile,
  onSaveClient,
  onArchiveClient,
  onUnarchiveClient,
  onNavigateToIncomeWithClient,
  onNavigateToExpenseWithClient,
  onOpenInvoiceWithClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<Client | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Status filter
      if (statusFilter === 'active' && client.isArchived) return false;
      if (statusFilter === 'archived' && !client.isArchived) return false;

      // Search filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        client.name.toLowerCase().includes(q) ||
        (client.companyName && client.companyName.toLowerCase().includes(q)) ||
        (client.email && client.email.toLowerCase().includes(q)) ||
        (client.phone && client.phone.toLowerCase().includes(q)) ||
        (client.gstin && client.gstin.toLowerCase().includes(q))
      );
    });
  }, [clients, statusFilter, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const activeCount = clients.filter((c) => !c.isArchived).length;
    const archivedCount = clients.filter((c) => c.isArchived).length;
    let totalClientIncome = 0;

    clients.forEach((c) => {
      const summary = getClientFinancialSummary(c, transactions);
      totalClientIncome += summary.totalIncome;
    });

    return {
      totalClients: clients.length,
      activeCount,
      archivedCount,
      totalClientIncome,
    };
  }, [clients, transactions]);

  // Handle open add modal
  const handleOpenAdd = () => {
    setClientToEdit(null);
    setModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setClientToEdit(client);
    setModalOpen(true);
  };

  // Profile data for selected client
  const activeProfileData = useMemo(() => {
    if (!selectedClientForProfile) return null;
    // Always get the freshest copy from clients list in case of updates
    const current = clients.find((c) => c.id === selectedClientForProfile.id) || selectedClientForProfile;
    const financialSummary = getClientFinancialSummary(current, transactions);
    return {
      client: current,
      summary: financialSummary,
    };
  }, [selectedClientForProfile, clients, transactions]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Relationship Management
          </span>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Client Directory & Profiles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Save client details once to auto-fill invoices and link income & expense transactions with full historical safety.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors pointer-events-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Saved Clients</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 block mt-0.5">{stats.totalClients}</span>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Clients</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">{stats.activeCount}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Archived Clients</span>
            <span className="text-xl font-bold text-slate-500 block mt-0.5">{stats.archivedCount}</span>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
            <Archive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Client Revenue</span>
            <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 block mt-0.5">
              {formatCurrency(stats.totalClientIncome, profile.currency, profile.numberFormatPreference)}
            </span>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, company, email, phone, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active ({stats.activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === 'archived'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Archived ({stats.archivedCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({stats.totalClients})
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {searchTerm ? `No clients found matching "${searchTerm}"` : 'No Saved Clients Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? 'Try searching with a different keyword or create a new client record.'
              : 'Save client information once to auto-fill invoices and attach to income and expense transactions.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Client</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const summary = getClientFinancialSummary(client, transactions);

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClientForProfile(client)}
                className={`group bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                  client.isArchived
                    ? 'border-slate-200 dark:border-slate-800 opacity-75 bg-slate-50/50 dark:bg-slate-900/50'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {client.name}
                          </h3>
                          {client.isArchived && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded">
                              Archived
                            </span>
                          )}
                        </div>
                        {client.companyName ? (
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{client.companyName}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-mono">Individual Client</p>
                        )}
                      </div>
                    </div>

                    {/* Quick Edit */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEdit(client, e)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Client"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {client.isArchived ? (
                        <button
                          onClick={() => onUnarchiveClient(client.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Restore / Unarchive Client"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onArchiveClient(client.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Archive Client (Preserves All Records)"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact Badges */}
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    {client.email && (
                      <p className="flex items-center gap-1.5 truncate text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.phone && (
                      <p className="flex items-center gap-1.5 truncate text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </p>
                    )}
                    {client.gstin && (
                      <p className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-600 dark:text-slate-300">
                        <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>GSTIN: {client.gstin}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Summary Pill */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Revenue</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(summary.totalIncome, profile.currency, profile.numberFormatPreference)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Activity</span>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {summary.transactionCount} transaction{summary.transactionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLIENT PROFILE MODAL / DRAWER */}
      <AnimatePresence>
        {activeProfileData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/75 backdrop-blur-xs pointer-events-auto overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                    {activeProfileData.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {activeProfileData.client.name}
                      </h2>
                      {activeProfileData.client.isArchived && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {activeProfileData.client.companyName || 'Saved Business Client'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(activeProfileData.client)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setSelectedClientForProfile(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
                {/* Contact & Registration Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {activeProfileData.client.email || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {activeProfileData.client.phone || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GSTIN / Tax ID</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {activeProfileData.client.gstin || 'Not registered'}
                    </span>
                  </div>
                  {activeProfileData.client.billingAddress && (
                    <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Billing Address</span>
                      <p className="text-slate-700 dark:text-slate-300 font-sans mt-0.5">
                        {activeProfileData.client.billingAddress}
                      </p>
                    </div>
                  )}
                  {activeProfileData.client.notes && (
                    <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Notes & Terms</span>
                      <p className="text-slate-700 dark:text-slate-300 font-sans mt-0.5">
                        {activeProfileData.client.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Financial Overview KPIs */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Client Financial Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Total Income</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 block mt-1">
                        {formatCurrency(activeProfileData.summary.totalIncome, profile.currency, profile.numberFormatPreference)}
                      </span>
                      <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                        {activeProfileData.summary.incomeCount} payment{activeProfileData.summary.incomeCount !== 1 ? 's' : ''} received
                      </span>
                    </div>

                    <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">Direct Expenses</span>
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <span className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300 block mt-1">
                        {formatCurrency(activeProfileData.summary.totalExpenses, profile.currency, profile.numberFormatPreference)}
                      </span>
                      <span className="text-[10px] text-rose-600/80 block mt-0.5">
                        {activeProfileData.summary.expenseCount} incurred expense{activeProfileData.summary.expenseCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Net Contribution</span>
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300 block mt-1">
                        {formatCurrency(activeProfileData.summary.netContribution, profile.currency, profile.numberFormatPreference)}
                      </span>
                      <span className="text-[10px] text-blue-600/80 block mt-0.5">
                        Lifetime Profit
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Shortcut Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {onNavigateToIncomeWithClient && (
                    <button
                      onClick={() => {
                        onNavigateToIncomeWithClient(activeProfileData.client.id, activeProfileData.client.name);
                        setSelectedClientForProfile(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Income for Client</span>
                    </button>
                  )}

                  {onNavigateToExpenseWithClient && (
                    <button
                      onClick={() => {
                        onNavigateToExpenseWithClient(activeProfileData.client.id, activeProfileData.client.name);
                        setSelectedClientForProfile(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Expense for Client</span>
                    </button>
                  )}

                  {onOpenInvoiceWithClient && (
                    <button
                      onClick={() => {
                        onOpenInvoiceWithClient(activeProfileData.client);
                        setSelectedClientForProfile(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Create Invoice / Estimate</span>
                    </button>
                  )}
                </div>

                {/* Associated Transaction Ledger */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Associated Transactions ({activeProfileData.summary.clientTransactions.length})
                    </h4>
                  </div>

                  {activeProfileData.summary.clientTransactions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                      No income or expense transactions associated with this client yet.
                    </p>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/70">
                      {activeProfileData.summary.clientTransactions.slice(0, 15).map((tx) => (
                        <div key={tx.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">{tx.date}</span>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-white block truncate">
                                {tx.description}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {tx.category} • {tx.paymentMethod || 'Bank Transfer'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono font-bold">
                            <span className={tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, profile.currency, profile.numberFormatPreference)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add / Edit Client Modal */}
      <QuickClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaveClient={(client) => {
          onSaveClient(client);
          setModalOpen(false);
          // If we were viewing this client in drawer, update view
          if (selectedClientForProfile && selectedClientForProfile.id === client.id) {
            setSelectedClientForProfile(client);
          }
        }}
        existingClients={clients}
        clientToEdit={clientToEdit}
        profile={profile}
      />
    </div>
  );
};
