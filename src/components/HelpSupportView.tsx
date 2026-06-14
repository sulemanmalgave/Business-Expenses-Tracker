import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Mail, Send, CheckCircle2, Ticket, LifeBuoy, ArrowRight, ArrowLeft } from 'lucide-react';

interface HelpSupportViewProps {
  onBack?: () => void;
}

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({ onBack }) => {
  // Contact support form
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketSubject, setTicketSubject] = useState('General Inquiry');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // FAQ Expand state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName.trim() || !ticketEmail.trim() || !ticketMessage.trim()) return;

    setSubmitting(true);
    // Simulate support ticket creation
    setTimeout(() => {
      setSubmitting(false);
      setSubmitSuccess(true);
      setTicketName('');
      setTicketEmail('');
      setTicketMessage('');
      setTimeout(() => setSubmitSuccess(false), 5000);
    }, 1500);
  };

  const faqItems = [
    {
      q: 'Where actually is my financial transaction data archived?',
      a: 'Your financial information is cached 100% locally inside your web browser’s sandboxed database storage. It does not automatically synchronize to remote servers, safeguarding your absolute business secrecy. We do not transmit or sell any records.',
    },
    {
      q: 'How do I transfer my business logs over to a different PC?',
      a: 'Easily execute this inside your browser: navigate to the "Backup & Restore" module, choose "Export Sandbox Database", and download your encrypted JSON file. On your secondary computer or browser window, navigate back to the same module and click "Import Data File" to complete your migration within seconds.',
    },
    {
      q: 'How does the free transaction constraint operate?',
      a: 'The complimentory Free Plan accommodates up to 500 complete business transactions. If your startup handles heavier overhead structures or requires multi-business ledger separations, you should upgrade to one of our premium tiers via your profile’s dropdown menu.',
    },
    {
      q: 'Does this tracker comply with Windows and PWA touch screen inputs?',
      a: 'Yes, the software is compiled and fine-tuned for modern desktop computers, touch table displays, tablets, and high resolution (High DPI) displays common across Windows 10 and Windows 11 platforms.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors pointer-events-auto"
          id="help-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Resource Desk</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Help & Support Hub</h1>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Consult common cashflow queries, browse common setups, or open an official support ticket.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: FAQ accordion & troubleshooting */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Common Financial Setup FAQs</span>
            </h2>

            <div className="space-y-2">
              {faqItems.map((item, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/20 pointer-events-auto transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/10">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">License Recovery Details</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Already bought a license from the Microsoft Windows Store or our checkout gateway? Click <strong>"Restore Purchases"</strong> inside the profile menu dropdown. The sandbox automatically queries the local digital ledger signatures to apply your valid Pro, Monthly, or Lifetime license credentials.
            </p>
          </section>
        </div>

        {/* Right column: Interactive support form */}
        <div className="lg:col-span-5">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h2 className="text-sm font-bold text-slate-850 dark:text-slate-150 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-indigo-500" />
                <span>Submit Support Ticket</span>
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Estimated queue duration: Under 12 Hours</p>
            </div>

            {submitSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-400 rounded-2xl flex gap-2 items-start text-[11px] animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Ticket Submitted successfully!</p>
                  <p className="opacity-80">Check your email client shortly for our official follow-up link.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block" htmlFor="support-name">Your Full Name</label>
                <input
                  id="support-name"
                  type="text"
                  required
                  value={ticketName}
                  onChange={(e) => setTicketName(e.target.value)}
                  placeholder="Sarah"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block" htmlFor="support-email">Corporate Email Address</label>
                <input
                  id="support-email"
                  type="email"
                  required
                  value={ticketEmail}
                  onChange={(e) => setTicketEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block" htmlFor="support-subject">Inquiry Subject</label>
                <select
                  id="support-subject"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-350 pointer-events-auto"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Billing help">Billing help & Licensing</option>
                  <option value="CSV Data Migration">CSV / Excel Data Migration</option>
                  <option value="Windows 10/11 Installer">Store App Installation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block" htmlFor="support-message">Message details</label>
                <textarea
                  id="support-message"
                  required
                  rows={4}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Tell us what you need help with..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 resize-none font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 pointer-events-auto transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <span>Logging Ticket...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Support Ticket</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
