'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import {
  Award,
  Check,
  Edit3,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import type { ImageSlot, PageMeta, SeedSectionGalleryItem, SiteTextSlot } from './types';
import { resolveImageUrl } from './types';

interface HeroCrossBadgesPanelProps {
  currentPageMeta: PageMeta;
  pages: PageMeta[];
  primaryHeroSlot: ImageSlot | null;
  pageHeroSlides: SeedSectionGalleryItem[];
  heroCrossImageSlots: ImageSlot[];
  heroCrossTextSlots: SiteTextSlot[];
  cacheBuster: number;
  uploadingTargetId: string | null;
  savingTextId: string | null;
  onSelectPage: (pageFile: string) => void;
  onDirectSlotFileSelected: (slot: ImageSlot, e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteSlot: (slot: ImageSlot) => void;
  onAddHeroSlideFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReplaceSectionImageFile: (
    item: SeedSectionGalleryItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onDeleteSectionImage: (item: SeedSectionGalleryItem) => void;
  onSaveTextContent: (slot: SiteTextSlot, newContent: string) => Promise<void>;
  onOpenR2Picker: (slot: ImageSlot) => void;
}

export function HeroCrossBadgesPanel({
  currentPageMeta,
  primaryHeroSlot,
  pageHeroSlides,
  heroCrossImageSlots,
  heroCrossTextSlots,
  cacheBuster,
  uploadingTargetId,
  savingTextId,
  onDirectSlotFileSelected,
  onDeleteSlot,
  onAddHeroSlideFiles,
  onReplaceSectionImageFile,
  onDeleteSectionImage,
  onSaveTextContent,
  onOpenR2Picker,
}: HeroCrossBadgesPanelProps) {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const groupedCrossBadges = React.useMemo(() => {
    const groups: {
      key: string;
      title: string;
      subtitle: string;
      iconSlot?: ImageSlot;
      texts: SiteTextSlot[];
    }[] = [
      {
        key: 'google',
        title: 'Google Reviews Cross-Badge',
        subtitle: 'Left column card below Hero CTA button on Home (index.html)',
        iconSlot: heroCrossImageSlots.find((s) =>
          (s.sectionContext + ' ' + s.label).toLowerCase().includes('google')
        ),
        texts: heroCrossTextSlots.filter((t) =>
          t.sectionContext.toLowerCase().includes('google')
        ),
      },
      {
        key: 'tripadvisor',
        title: "TripAdvisor Travellers' Choice Cross-Badge",
        subtitle: 'Center featured award crest below Hero CTA button on Home (index.html)',
        iconSlot: heroCrossImageSlots.find((s) =>
          (s.sectionContext + ' ' + s.label).toLowerCase().includes('tripadvisor')
        ),
        texts: heroCrossTextSlots.filter((t) =>
          t.sectionContext.toLowerCase().includes('tripadvisor')
        ),
      },
      {
        key: 'explorers',
        title: 'Happy Safari Explorers Cross-Badge',
        subtitle: 'Right column guest counter badge below Hero CTA button on Home (index.html)',
        iconSlot: heroCrossImageSlots.find((s) =>
          (s.sectionContext + ' ' + s.label).toLowerCase().includes('explorer')
        ),
        texts: heroCrossTextSlots.filter((t) =>
          t.sectionContext.toLowerCase().includes('explorer')
        ),
      },
    ];

    const matchedSlotIds = new Set(groups.map((g) => g.iconSlot?.slotId).filter(Boolean));
    const matchedTextIds = new Set(groups.flatMap((g) => g.texts.map((t) => t.textId)));
    const unmatchedSlots = heroCrossImageSlots.filter((s) => !matchedSlotIds.has(s.slotId));
    const unmatchedTexts = heroCrossTextSlots.filter((t) => !matchedTextIds.has(t.textId));

    if (unmatchedSlots.length > 0 || unmatchedTexts.length > 0) {
      groups.push({
        key: 'other',
        title: 'Additional Cross-Section Elements',
        subtitle: 'Any remaining icon or label inside the hero cross-bridge bar',
        iconSlot: unmatchedSlots[0],
        texts: unmatchedTexts,
      });
    }

    return groups;
  }, [heroCrossImageSlots, heroCrossTextSlots]);

  return (
    <div className="space-y-8">
      {/* 1. Primary Hero & 4s Slideshow for Selected Page */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{currentPageMeta.title} · Hero Slideshow & Primary Banner</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100">
              Top Hero Slideshow (4-Second Rotation)
            </h2>
            <p className="text-xs text-slate-400">
              Manage the full-width top banner and auto-advancing 4s slides for{' '}
              <span className="font-mono text-slate-300">{currentPageMeta.file}</span>.
            </p>
          </div>

          <label
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              uploadingTargetId === 'hero-add-new' ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onAddHeroSlideFiles}
              className="hidden"
            />
            {uploadingTargetId === 'hero-add-new' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading Slides...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hero Slide(s)</span>
              </>
            )}
          </label>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {primaryHeroSlot && (
            <article className="bg-[#090d0b] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative h-44 bg-slate-900 border-b border-slate-800 overflow-hidden flex items-center justify-center">
                  {primaryHeroSlot.isDeleted || !primaryHeroSlot.src ? (
                    <div className="text-center p-4 space-y-1">
                      <ImageIcon className="w-6 h-6 text-slate-600 mx-auto" />
                      <div className="text-xs text-slate-400">Primary hero cleared</div>
                    </div>
                  ) : (
                    <img
                      src={resolveImageUrl(primaryHeroSlot.src, cacheBuster)}
                      alt={primaryHeroSlot.alt || primaryHeroSlot.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-400">
                    <span>PRIMARY HERO</span>
                    <span>Slot #{primaryHeroSlot.slotIndex + 1}</span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-100 truncate">
                    {primaryHeroSlot.label}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {primaryHeroSlot.alt || 'Default HTML hero backdrop'}
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 flex items-center gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onDirectSlotFileSelected(primaryHeroSlot, e)}
                    className="hidden"
                  />
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingTargetId === primaryHeroSlot.slotId ? 'Uploading...' : 'Replace'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => onOpenR2Picker(primaryHeroSlot)}
                  className="px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  title="Pick from R2 bucket"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          )}

          {pageHeroSlides.map((slide, idx) => (
            <article
              key={slide.itemId}
              className="bg-[#090d0b] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-900 border-b border-slate-800 overflow-hidden">
                  <img
                    src={resolveImageUrl(slide.src, cacheBuster)}
                    alt={slide.alt || slide.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                    <span>SLIDE #{String(idx + 1).padStart(2, '0')}</span>
                    <span>4s Auto</span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-100 truncate">{slide.title}</h3>
                  <p className="text-xs text-slate-400 truncate">{slide.caption || slide.alt}</p>
                </div>
              </div>
              <div className="px-4 pb-4 flex items-center gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onReplaceSectionImageFile(slide, e)}
                    className="hidden"
                  />
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingTargetId === slide.itemId ? 'Uploading...' : 'Replace'}</span>
                </label>
                {confirmDeleteId === slide.itemId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      onDeleteSectionImage(slide);
                    }}
                    className="px-2.5 py-2 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(slide.itemId)}
                    className="p-2 rounded-md bg-slate-900 hover:bg-red-950/70 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                    title="Delete slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Hero Bottom Cross-Section Badges & Icons (index.html) */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>Home Page (index.html) · Hero Bottom Cross-Section</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100">
              Hero Cross-Section Icons, Ratings & Badges
            </h2>
            <p className="text-xs text-slate-400">
              Upload custom PNG/SVG/WebP icons and edit ratings or labels for the 3-column badge
              bar positioned between the Hero CTA and Intro section.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {heroCrossImageSlots.length} icons · {heroCrossTextSlots.length} text labels
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {groupedCrossBadges.map((group) => {
            const slot = group.iconSlot;
            const isUploading = slot && uploadingTargetId === slot.slotId;

            return (
              <div
                key={group.key}
                className="bg-[#090d0b] border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{group.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{group.subtitle}</p>
                  </div>

                  {/* Badge Icon Upload Card */}
                  {slot ? (
                    <div className="bg-[#101714] border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="text-amber-400">BADGE ICON · SLOT #{slot.slotIndex + 1}</span>
                        <span>{slot.isDeleted || !slot.src ? 'Empty' : 'Active'}</span>
                      </div>

                      <div className="h-28 bg-[#090d0b] border border-slate-800/80 rounded-md flex items-center justify-center p-4 overflow-hidden">
                        {slot.isDeleted || !slot.src ? (
                          <div className="text-center space-y-1">
                            <ImageIcon className="w-5 h-5 text-slate-600 mx-auto" />
                            <div className="text-[11px] text-slate-500">No icon uploaded</div>
                          </div>
                        ) : (
                          <img
                            src={resolveImageUrl(slot.src, cacheBuster)}
                            alt={slot.alt || slot.label}
                            referrerPolicy="no-referrer"
                            className="max-h-20 w-auto object-contain"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer ${
                            isUploading ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onDirectSlotFileSelected(slot, e)}
                            className="hidden"
                          />
                          {isUploading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>{slot.src ? 'Replace Icon' : 'Upload Icon'}</span>
                            </>
                          )}
                        </label>

                        <button
                          type="button"
                          onClick={() => onOpenR2Picker(slot)}
                          className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                          title="Choose icon from Cloudflare R2 bucket"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>

                        {!slot.isDeleted && slot.src && (
                          confirmDeleteId === slot.slotId ? (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                onDeleteSlot(slot);
                              }}
                              className="px-2.5 py-2 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-500 text-white"
                            >
                              Clear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(slot.slotId)}
                              className="p-2 rounded-md bg-slate-900 hover:bg-red-950/70 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                              title="Clear icon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#101714] border border-slate-800 rounded-lg p-4 text-xs text-slate-400">
                      No icon slot detected for this column.
                    </div>
                  )}

                  {/* Cross-Badge Editable Text Fields */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                      <Type className="w-3.5 h-3.5 text-amber-400" />
                      <span>Badge Metrics & Copy</span>
                    </div>

                    {group.texts.length === 0 ? (
                      <div className="text-xs text-slate-500">No text labels detected.</div>
                    ) : (
                      <div className="space-y-2">
                        {group.texts.map((txt) => {
                          const isEditing = editingTextId === txt.textId;
                          const isSaving = savingTextId === txt.textId;
                          return (
                            <div
                              key={txt.textId}
                              className="bg-[#101714] border border-slate-800/90 rounded-md p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span className="font-mono text-amber-400">{txt.tagName}</span>
                                <span className="truncate ml-2">
                                  {txt.subSectionName || txt.sectionContext}
                                </span>
                              </div>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingTextValue}
                                    onChange={(e) => setEditingTextValue(e.target.value)}
                                    className="w-full bg-[#090d0b] border border-amber-500 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={async () => {
                                        await onSaveTextContent(txt, editingTextValue);
                                        setEditingTextId(null);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTextId(null)}
                                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-100 font-medium break-words">
                                    {txt.content}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTextId(txt.textId);
                                      setEditingTextValue(txt.content);
                                    }}
                                    className="p-1.5 rounded bg-slate-900 hover:bg-amber-500 text-slate-300 hover:text-slate-950 border border-slate-800 shrink-0 transition-colors"
                                    title="Edit badge label"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
