'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useMemo, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Edit3,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { ImageSlot, PageMeta, R2ObjectRecord, R2StatusPayload } from './types';
import { formatBytes, resolveImageUrl } from './types';

interface R2BucketPanelProps {
  r2Status: R2StatusPayload | null;
  r2Objects: R2ObjectRecord[];
  pages: PageMeta[];
  allSlots: ImageSlot[];
  cacheBuster: number;
  loadingR2: boolean;
  onRefreshR2: () => Promise<void>;
  onUploadR2Files: (files: FileList, pageFilter?: string) => Promise<void>;
  onUpdateR2Meta: (options: {
    r2Key: string;
    newKey?: string;
    alt?: string;
    title?: string;
    page?: string;
  }) => Promise<void>;
  onDeleteR2Object: (r2Key: string) => Promise<void>;
  onAssignR2ToSlot: (obj: R2ObjectRecord, slot: ImageSlot) => Promise<void>;
}

export function R2BucketPanel({
  r2Status,
  r2Objects,
  pages,
  allSlots,
  cacheBuster,
  loadingR2,
  onRefreshR2,
  onUploadR2Files,
  onUpdateR2Meta,
  onDeleteR2Object,
  onAssignR2ToSlot,
}: R2BucketPanelProps) {
  const [search, setSearch] = useState<string>('');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [uploading, setUploading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAlt, setEditAlt] = useState<string>('');
  const [editPage, setEditPage] = useState<string>('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [assigningObj, setAssigningObj] = useState<R2ObjectRecord | null>(null);
  const [assignPage, setAssignPage] = useState<string>('index.html');
  const [assignBusySlotId, setAssignBusySlotId] = useState<string | null>(null);

  const filteredObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return r2Objects.filter((obj) => {
      if (pageFilter !== 'all' && (obj.page || '') !== pageFilter) return false;
      if (!q) return true;
      return (
        obj.r2Key.toLowerCase().includes(q) ||
        (obj.title || '').toLowerCase().includes(q) ||
        (obj.alt || '').toLowerCase().includes(q) ||
        (obj.cdnUrl || '').toLowerCase().includes(q)
      );
    });
  }, [r2Objects, search, pageFilter]);

  const assignTargetSlots = useMemo(
    () => allSlots.filter((s) => s.page === assignPage),
    [allSlots, assignPage]
  );

  const handleCopyUrl = async (obj: R2ObjectRecord) => {
    try {
      await navigator.clipboard.writeText(obj.cdnUrl);
      setCopiedKey(obj.r2Key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === obj.r2Key ? null : prev));
      }, 2000);
    } catch {
      // Clipboard blocked in restricted frame
    }
  };

  return (
    <div className="space-y-6">
      {/* Bucket Overview Header */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloudflare R2 Storage · Bucket &ldquo;{r2Status?.bucketName || 'nishatravels'}&rdquo;</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100">
              R2 Media Bucket Library
            </h2>
            <p className="text-xs text-slate-400">
              Upload assets directly to Cloudflare R2, manage CDN metadata, or assign any saved
              object to a page slot without re-uploading.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void onRefreshR2()}
              disabled={loadingR2}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-slate-200 border border-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingR2 ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <label
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                uploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setUploading(true);
                  try {
                    await onUploadR2Files(
                      files,
                      pageFilter !== 'all' ? pageFilter : undefined
                    );
                  } finally {
                    setUploading(false);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to R2...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload to R2 Bucket</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Metrics & Connection Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-emerald-950/70">
          <div className="bg-[#090d0b] border border-slate-800/80 rounded-md px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Stored Objects</div>
            <div className="text-sm font-semibold font-mono text-slate-100 tabular-nums mt-0.5">
              {r2Objects.length}
            </div>
          </div>
          <div className="bg-[#090d0b] border border-slate-800/80 rounded-md px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Total Size</div>
            <div className="text-sm font-semibold font-mono text-slate-100 tabular-nums mt-0.5">
              {formatBytes(r2Objects.reduce((acc, o) => acc + (o.sizeBytes || 0), 0))}
            </div>
          </div>
          <div className="bg-[#090d0b] border border-slate-800/80 rounded-md px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Remote Sync Status</div>
            <div className="text-xs font-medium text-emerald-400 mt-1 truncate">
              {r2Status?.testResult?.ok ? 'Connected (Remote R2)' : 'Local Mirror / Check R2'}
            </div>
          </div>
          <div className="bg-[#090d0b] border border-slate-800/80 rounded-md px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Public CDN Base</div>
            <div className="text-xs font-mono text-slate-300 mt-1 truncate" title={r2Status?.cdnBaseUrl}>
              {r2Status?.cdnBaseUrl || '/api/r2/file'}
            </div>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search R2 key, image title, alt text, or CDN URL..."
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <select
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            className="bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Pages ({r2Objects.length})</option>
            {pages.map((p) => (
              <option key={p.file} value={p.file}>
                {p.title} ({p.file})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Objects Grid */}
      {filteredObjects.length === 0 ? (
        <div className="bg-[#101714] border border-emerald-950/80 rounded-lg p-10 text-center space-y-2">
          <FolderOpen className="w-7 h-7 text-slate-600 mx-auto" />
          <div className="text-sm font-medium text-slate-300">No matching R2 objects</div>
          <p className="text-xs text-slate-500">
            Upload an image above or clear your search filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredObjects.map((obj) => {
            const isEditing = editingKey === obj.r2Key;
            return (
              <article
                key={obj.r2Key}
                className="bg-[#101714] border border-emerald-950/90 rounded-lg overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-[#090d0b] border-b border-slate-800/80 overflow-hidden flex items-center justify-center">
                    <img
                      src={resolveImageUrl(obj.cdnUrl, cacheBuster)}
                      alt={obj.alt || obj.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                      <span className="truncate text-amber-400" title={obj.r2Key}>
                        {obj.r2Key}
                      </span>
                      <span className="shrink-0 ml-2">{formatBytes(obj.sizeBytes)}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Object title"
                          className="w-full bg-[#090d0b] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                        />
                        <input
                          type="text"
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                          placeholder="Alt text"
                          className="w-full bg-[#090d0b] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                        />
                        <select
                          value={editPage}
                          onChange={(e) => setEditPage(e.target.value)}
                          className="w-full bg-[#090d0b] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          <option value="">Shared / Any Page</option>
                          {pages.map((p) => (
                            <option key={p.file} value={p.file}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await onUpdateR2Meta({
                                r2Key: obj.r2Key,
                                title: editTitle,
                                alt: editAlt,
                                page: editPage || undefined,
                              });
                              setEditingKey(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-100 truncate">
                          {obj.title || obj.r2Key}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {obj.alt || 'No alt description'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningObj(obj);
                      if (obj.page && pages.some((p) => p.file === obj.page)) {
                        setAssignPage(obj.page);
                      }
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors whitespace-nowrap"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Assign to Slot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyUrl(obj)}
                    className="p-1.5 rounded-md bg-[#090d0b] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                    title="Copy R2 CDN URL"
                  >
                    {copiedKey === obj.r2Key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingKey(obj.r2Key);
                      setEditTitle(obj.title || '');
                      setEditAlt(obj.alt || '');
                      setEditPage(obj.page || '');
                    }}
                    className="p-1.5 rounded-md bg-[#090d0b] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                    title="Edit R2 metadata"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteKey === obj.r2Key ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteKey(null);
                        void onDeleteR2Object(obj.r2Key);
                      }}
                      className="px-2 py-1.5 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteKey(obj.r2Key)}
                      className="p-1.5 rounded-md bg-[#090d0b] hover:bg-red-950/70 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                      title="Delete from R2 bucket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Assign R2 Object to Any Page Slot Modal */}
      {assigningObj && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#101714] border border-emerald-950 rounded-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-emerald-950/80 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Assign R2 Image to Website Slot
                </h3>
                <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                  {assigningObj.r2Key}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningObj(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <label htmlFor="assign-page-select" className="text-xs font-medium text-slate-300">
                  Target Page:
                </label>
                <select
                  id="assign-page-select"
                  value={assignPage}
                  onChange={(e) => setAssignPage(e.target.value)}
                  className="flex-1 bg-[#090d0b] border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100"
                >
                  {pages.map((p) => (
                    <option key={p.file} value={p.file}>
                      {p.title} ({p.file})
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-md bg-[#090d0b]">
                {assignTargetSlots.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-9 rounded bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {slot.src && !slot.isDeleted ? (
                          <img
                            src={resolveImageUrl(slot.src, cacheBuster)}
                            alt={slot.label}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-100 truncate">
                          #{slot.slotIndex + 1} · {slot.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {slot.sectionContext}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={assignBusySlotId === slot.slotId}
                      onClick={async () => {
                        setAssignBusySlotId(slot.slotId);
                        try {
                          await onAssignR2ToSlot(assigningObj, slot);
                          setAssigningObj(null);
                        } finally {
                          setAssignBusySlotId(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 whitespace-nowrap shrink-0"
                    >
                      {assignBusySlotId === slot.slotId ? 'Assigning...' : 'Assign Here'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
