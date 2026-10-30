import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  Check, 
  Building, 
  Mail, 
  Phone,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Client, UserProfile } from '../types';
import { QuickClientModal } from './QuickClientModal';

interface ClientSelectorProps {
  clients: Client[];
  selectedClientId?: string;
  selectedClientName?: string;
  onSelectClient: (client: Client | null) => void;
  onAddNewClient: (newClient: Client) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  profile?: UserProfile;
  disabled?: boolean;
  required?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  clients,
  selectedClientId,
  selectedClientName,
  onSelectClient,
  onAddNewClient,
  label = 'Client / Customer',
  placeholder = 'Search by client name, company, email...',
  helperText = 'Select a saved client to reuse their details. Client selection is optional for income and expenses.',
  profile,
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active (non-archived) clients for standard selection
  const activeClients = clients.filter((c) => !c.isArchived);

  // Filter clients by search query
  const filteredClients = activeClients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  // Find currently selected client
  const currentClient = clients.find(
    (c) =>
      (selectedClientId && c.id === selectedClientId) ||
      (selectedClientName && c.name.toLowerCase() === selectedClientName.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filteredClients.length + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredClients.length + 1) % (filteredClients.length + 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex < filteredClients.length) {
        handlePickClient(filteredClients[highlightedIndex]);
      } else {
        // "+ Add New Client" row highlighted
        handleOpenQuickAdd();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handlePickClient = (client: Client) => {
    onSelectClient(client);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectClient(null);
  };

  const handleOpenQuickAdd = () => {
    setIsOpen(false);
    setQuickAddModalOpen(true);
  };

  const handleSaveQuickClient = (newClient: Client) => {
    onAddNewClient(newClient);
    onSelectClient(newClient);
  };

  return (
    <div className="space-y-1 relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Label and optional tag */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          {label} {required ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal lowercase">(optional)</span>}
        </label>
        {currentClient && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Client Linked</span>
          </span>
        )}
      </div>

      {/* Main Selector Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-700'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : currentClient
            ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            currentClient 
              ? 'bg-blue-600 text-white font-bold text-xs' 
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            {currentClient ? currentClient.name.charAt(0).toUpperCase() : <Users className="w-3.5 h-3.5" />}
          </div>

          {currentClient ? (
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                {currentClient.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-sans">
                {currentClient.companyName || currentClient.email || currentClient.phone || 'Saved Client'}
              </span>
            </div>
          ) : selectedClientName ? (
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                {selectedClientName}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">Custom / Unlinked</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(currentClient || selectedClientName) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              title="Remove Client Selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Helper Text */}
      {helperText && !isOpen && (
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
          {helperText}
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
          {/* Search Input Bar */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search clients by name, email, or company..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Client Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredClients.length > 0 ? (
              filteredClients.map((client, idx) => {
                const isSelected = currentClient?.id === client.id;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handlePickClient(client)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : isHighlighted
                        ? 'bg-slate-100/70 dark:bg-slate-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {client.name}
                          </span>
                          {client.companyName && (
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              • {client.companyName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate">
                          {client.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-2.5 h-2.5" />
                              {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1 truncate">
                              <Phone className="w-2.5 h-2.5" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                <p>No saved clients matching "{searchQuery}".</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click below to add this client in 1 click.</p>
              </div>
            )}
          </div>

          {/* "+ Add New Client" Action Row */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={handleOpenQuickAdd}
              onMouseEnter={() => setHighlightedIndex(filteredClients.length)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs ${
                highlightedIndex === filteredClients.length ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Client {searchQuery ? `"${searchQuery}"` : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Client Modal */}
      <QuickClientModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
        onSaveClient={handleSaveQuickClient}
        existingClients={clients}
        initialName={searchQuery}
        profile={profile}
      />
    </div>
  );
};
