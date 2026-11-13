'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import type { EnquiryRecord } from './types';

interface EnquiriesPanelProps {
  enquiries: EnquiryRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onUpdateStatus: (enquiryId: string, status: 'new' | 'read' | 'replied') => Promise<void>;
  onDeleteEnquiry: (enquiryId: string) => Promise<void>;
}

function formatEnquiryDate(rawTs: unknown): string {
  if (!rawTs) return 'Just now';
  try {
    if (typeof rawTs === 'string') {
      const d = new Date(rawTs);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    if (typeof rawTs === 'object' && rawTs !== null) {
      const obj = rawTs as { toDate?: () => Date; seconds?: number };
      if (typeof obj.toDate === 'function') {
        return obj.toDate().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      if (typeof obj.seconds === 'number') {
        return new Date(obj.seconds * 1000).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
  } catch {
    // Fallback below
  }
  return 'Recent';
}

export function EnquiriesPanel({
  enquiries,
  loading,
  onRefresh,
  onUpdateStatus,
  onDeleteEnquiry,
}: EnquiriesPanelProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    let newCount = 0;
    let readCount = 0;
    let repliedCount = 0;
    for (const e of enquiries) {
      if (e.status === 'replied') repliedCount++;
      else if (e.status === 'read') readCount++;
      else newCount++;
    }
    return {
      total: enquiries.length,
      new: newCount,
      read: readCount,
      replied: repliedCount,
    };
  }, [enquiries]);

  const filteredEnquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enquiries.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        item.firstName,
        item.lastName,
        item.email,
        item.whatsapp,
        item.park,
        item.safariDate,
        item.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [enquiries, statusFilter, searchQuery]);

  const handleCopyText = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      // Ignore clipboard restriction
    }
  };

  const handleStatusChange = async (enquiryId: string, status: 'new' | 'read' | 'replied') => {
    setBusyId(enquiryId);
    try {
      await onUpdateStatus(enquiryId, status);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (enquiryId: string) => {
    setBusyId(enquiryId);
    try {
      await onDeleteEnquiry(enquiryId);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* Top Header & Summary Bar */}
      <div className="bg-[#101714] border border-emerald-950/90 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-white">Customer Enquiries</h1>
              <p className="text-xs text-slate-400">
                View and manage all tour &amp; taxi service enquiries submitted by visitors on the Contact page.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#090d0b] border border-emerald-950/80 text-xs">
            <span className="text-slate-400">Total:</span>
            <span className="font-mono font-semibold text-white">{counts.total}</span>
            <span className="text-slate-700">|</span>
            <span className="text-amber-400">New:</span>
            <span className="font-mono font-semibold text-amber-400">{counts.new}</span>
            <span className="text-slate-700">|</span>
            <span className="text-sky-400">Read:</span>
            <span className="font-mono font-semibold text-sky-400">{counts.read}</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400">Replied:</span>
            <span className="font-mono font-semibold text-emerald-400">{counts.replied}</span>
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-slate-200 border border-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#101714] border border-emerald-950/90 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All (${counts.total})` },
              { id: 'new', label: `New (${counts.new})` },
              { id: 'read', label: `Read (${counts.read})` },
              { id: 'replied', label: `Replied (${counts.replied})` },
            ] as const
          ).map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-[#090d0b] text-slate-300 hover:text-white border border-slate-800/80'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, park, date..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#090d0b] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Enquiries List */}
      {filteredEnquiries.length === 0 ? (
        <div className="bg-[#101714] border border-emerald-950/90 rounded-lg p-12 text-center">
          <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {enquiries.length === 0 ? 'No Customer Enquiries Yet' : 'No Matching Enquiries'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {enquiries.length === 0
              ? 'When visitors submit the "Send an Enquiry" form on the Contact page, their full trip details and contact information will appear here automatically.'
              : 'Try adjusting your status filter or search query to see other enquiries.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnquiries.map((enq) => {
            const fullName = `${enq.firstName || ''} ${enq.lastName || ''}`.trim() || 'Guest';
            const cleanWaDigits = (enq.whatsapp || '').replace(/[^\d]/g, '');
            const isBusy = busyId === enq.enquiryId;

            const replySubject = encodeURIComponent(
              `Re: Your Nisha Taxi Service Enquiry${enq.park ? ` - ${enq.park}` : ''}`
            );
            const replyBody = encodeURIComponent(
              `Hello ${enq.firstName || 'there'},\n\nThank you for contacting Nisha Taxi Service regarding your trip${
                enq.park ? ` to ${enq.park}` : ''
              }${enq.safariDate ? ` on ${enq.safariDate}` : ''}.\n\nBest regards,\nNisha Taxi Service\nTelephone: +94 78 872 9414\nWhatsApp: +94 71 739 0327`
            );

            return (
              <article
                key={enq.enquiryId}
                className={`bg-[#101714] rounded-lg border transition-colors p-5 ${
                  enq.status === 'new'
                    ? 'border-amber-500/50 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]'
                    : 'border-emerald-950/90'
                }`}
              >
                {/* Top Row: Guest Name, Status Badge, Date & Quick Status Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-emerald-950/80">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base font-semibold text-white">{fullName}</h2>

                    {enq.status === 'new' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Clock className="w-3 h-3" />
                        NEW ENQUIRY
                      </span>
                    )}
                    {enq.status === 'read' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        <Check className="w-3 h-3" />
                        READ
                      </span>
                    )}
                    {enq.status === 'replied' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        REPLIED
                      </span>
                    )}

                    <span className="text-xs text-slate-400 font-mono">
                      Submitted: {formatEnquiryDate(enq.createdAt)}
                    </span>
                  </div>

                  {/* Status Controls & Delete */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {enq.status !== 'read' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(enq.enquiryId, 'read')}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-sky-300 border border-sky-900/60 transition-colors disabled:opacity-50"
                      >
                        Mark as Read
                      </button>
                    )}
                    {enq.status !== 'replied' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(enq.enquiryId, 'replied')}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-emerald-300 border border-emerald-900/60 transition-colors disabled:opacity-50"
                      >
                        Mark as Replied
                      </button>
                    )}
                    {enq.status !== 'new' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(enq.enquiryId, 'new')}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-amber-300 border border-amber-900/60 transition-colors disabled:opacity-50"
                      >
                        Mark Unread
                      </button>
                    )}

                    {confirmDeleteId === enq.enquiryId ? (
                      <div className="inline-flex items-center gap-1 bg-red-950/50 border border-red-800/70 rounded px-2 py-0.5">
                        <span className="text-[11px] text-red-200">Delete?</span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(enq.enquiryId)}
                          className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 rounded text-[11px] text-slate-300 hover:text-white"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(enq.enquiryId)}
                        className="p-1.5 rounded bg-[#090d0b] hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                        title="Delete Enquiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle Grid: Structured Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 py-4 border-b border-emerald-950/80 text-xs">
                  {/* Email */}
                  <div className="bg-[#090d0b] border border-emerald-950/70 rounded-md p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Email Address</span>
                      </span>
                      {enq.email && (
                        <button
                          type="button"
                          onClick={() => void handleCopyText(`${enq.enquiryId}_email`, enq.email)}
                          className="text-slate-400 hover:text-white"
                          title="Copy email"
                        >
                          {copiedId === `${enq.enquiryId}_email` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {enq.email ? (
                      <a
                        href={`mailto:${enq.email}?subject=${replySubject}&body=${replyBody}`}
                        className="font-mono text-slate-100 hover:text-amber-400 break-all"
                      >
                        {enq.email}
                      </a>
                    ) : (
                      <span className="text-slate-500">Not provided</span>
                    )}
                  </div>

                  {/* WhatsApp / Phone */}
                  <div className="bg-[#090d0b] border border-emerald-950/70 rounded-md p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp / Phone</span>
                      </span>
                      {enq.whatsapp && (
                        <button
                          type="button"
                          onClick={() => void handleCopyText(`${enq.enquiryId}_wa`, enq.whatsapp)}
                          className="text-slate-400 hover:text-white"
                          title="Copy phone/WhatsApp"
                        >
                          {copiedId === `${enq.enquiryId}_wa` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {enq.whatsapp ? (
                      <span className="font-mono text-slate-100">{enq.whatsapp}</span>
                    ) : (
                      <span className="text-slate-500">Not provided</span>
                    )}
                  </div>

                  {/* Preferred Park / Destination */}
                  <div className="bg-[#090d0b] border border-emerald-950/70 rounded-md p-3">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preferred Park</span>
                    </div>
                    <span className="font-semibold text-slate-100">
                      {enq.park || 'Not specified'}
                    </span>
                  </div>

                  {/* Group Size (Adults & Kids) */}
                  <div className="bg-[#090d0b] border border-emerald-950/70 rounded-md p-3">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Group Size</span>
                    </div>
                    <span className="font-semibold text-slate-100">
                      {enq.adults || '1'} Adult(s) · {enq.kids || '0'} Kid(s)
                    </span>
                  </div>

                  {/* Preferred Travel Date */}
                  <div className="bg-[#090d0b] border border-emerald-950/70 rounded-md p-3">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preferred Date</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-100">
                      {enq.safariDate || 'Flexible / Not set'}
                    </span>
                  </div>
                </div>

                {/* Guest Message & Direct Reply Bar */}
                <div className="pt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Guest Message</span>
                    </div>
                    <div className="bg-[#090d0b] border border-emerald-950/80 rounded-md p-3.5 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {enq.message || 'No additional message provided.'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {enq.email && (
                      <a
                        href={`mailto:${enq.email}?subject=${replySubject}&body=${replyBody}`}
                        onClick={() => {
                          if (enq.status === 'new') {
                            void handleStatusChange(enq.enquiryId, 'replied');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Reply by Email</span>
                      </a>
                    )}

                    {cleanWaDigits.length >= 7 && (
                      <a
                        href={`https://wa.me/${cleanWaDigits}?text=${replyBody}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (enq.status === 'new') {
                            void handleStatusChange(enq.enquiryId, 'replied');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Reply on Guest WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
