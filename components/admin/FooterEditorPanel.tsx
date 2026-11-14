'use client';

import React, { useState } from 'react';
import {
  Check,
  Edit3,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Save,
  Type,
} from 'lucide-react';

export interface FooterFieldDefinition {
  textId: string;
  columnGroup: 'Column 1 · Brand & Experience' | 'Column 2 · Explore Navigation' | 'Column 3 · Get in Touch & CTA' | 'Bottom Bar · Copyright';
  label: string;
  description: string;
  defaultValue: string;
  multiline?: boolean;
  tagName: 'DIV' | 'SPAN' | 'A';
}

export const FOOTER_FIELD_DEFINITIONS: FooterFieldDefinition[] = [
  {
    textId: 'global_footer__brand_tagline',
    columnGroup: 'Column 1 · Brand & Experience',
    label: 'Brand Experience Tagline',
    description: 'Appears directly under the footer logo (supports 2 lines).',
    defaultValue: 'Safari trip experience since 2002.\nOur own business since 2006.',
    multiline: true,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__brand_desc',
    columnGroup: 'Column 1 · Brand & Experience',
    label: 'Brand Subtitle',
    description: 'Short summary line at the bottom of Column 1.',
    defaultValue: 'Guided wildlife trips across Sri Lanka.',
    multiline: false,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__explore_heading',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Explore Column Heading',
    description: 'Heading at the top of the middle navigation column.',
    defaultValue: 'Explore',
    multiline: false,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__nav_home',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Home Link Label',
    description: 'Link text for index.html in the footer.',
    defaultValue: 'Home',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_about',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'About Us Link Label',
    description: 'Link text for about.html in the footer.',
    defaultValue: 'About Us',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_contact',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Contact Link Label',
    description: 'Link text for contact.html in the footer.',
    defaultValue: 'Contact',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_yala',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Yala Link Label',
    description: 'Link text for yala-safari.html in the footer.',
    defaultValue: 'Yala Safari',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_udawalawe',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Udawalawe Link Label',
    description: 'Link text for udawalawe-safari.html in the footer.',
    defaultValue: 'Udawalawe Safari',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_bundala',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Bundala Link Label',
    description: 'Link text for bundala-birding-safari.html in the footer.',
    defaultValue: 'Bundala Safari',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_wilpattu',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Wilpattu Link Label',
    description: 'Link text for wilpattu-safari.html in the footer.',
    defaultValue: 'Wilpattu Safari',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_minneriya',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Minneriya Link Label',
    description: 'Link text for minneriya-safari.html in the footer.',
    defaultValue: 'Minneriya Safari',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__nav_kumana',
    columnGroup: 'Column 2 · Explore Navigation',
    label: 'Kumana Link Label',
    description: 'Link text for kumana-birding-safari.html in the footer.',
    defaultValue: 'Kumana Safari',
    multiline: false,
    tagName: 'A',
  },
  {
    textId: 'global_footer__contact_heading',
    columnGroup: 'Column 3 · Get in Touch & CTA',
    label: 'Contact Column Heading',
    description: 'Heading at the top of the right-hand contact column.',
    defaultValue: 'Get in Touch',
    multiline: false,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__phone',
    columnGroup: 'Column 3 · Get in Touch & CTA',
    label: 'Telephone Number',
    description: 'Updates both the displayed phone number and the clickable tel: link.',
    defaultValue: '+94 78 872 9414',
    multiline: false,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__email',
    columnGroup: 'Column 3 · Get in Touch & CTA',
    label: 'Email Address',
    description: 'Updates both the displayed email address and the clickable mailto: link.',
    defaultValue: 'nishasafari@gmail.com',
    multiline: false,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__address',
    columnGroup: 'Column 3 · Get in Touch & CTA',
    label: 'Physical Address',
    description: 'Location address in Tissamaharama (supports 2 lines).',
    defaultValue: 'No. 1068/A, Gamunupura,\nTissamaharama, Sri Lanka',
    multiline: true,
    tagName: 'DIV',
  },
  {
    textId: 'global_footer__cta_button',
    columnGroup: 'Column 3 · Get in Touch & CTA',
    label: 'WhatsApp CTA Button Label',
    description: 'Button text inside the footer WhatsApp button.',
    defaultValue: 'Chat with Nisha',
    multiline: false,
    tagName: 'SPAN',
  },
  {
    textId: 'global_footer__copyright',
    columnGroup: 'Bottom Bar · Copyright',
    label: 'Copyright Notice',
    description: 'Bottom copyright line (the "• Admin Panel" link is preserved automatically).',
    defaultValue: '© 2026 Nisha car safari trip Tours. All rights reserved.',
    multiline: false,
    tagName: 'DIV',
  },
];

interface FooterEditorPanelProps {
  footerValues: Record<string, string>;
  modifiedKeys: Set<string>;
  savingKey: string | null;
  onSaveField: (field: FooterFieldDefinition, newValue: string) => Promise<void>;
  onRestoreField: (field: FooterFieldDefinition) => Promise<void>;
  onSaveAllFields: (drafts: Record<string, string>) => Promise<void>;
  onResetAllFooterFields: () => Promise<void>;
}

export function FooterEditorPanel({
  footerValues,
  modifiedKeys,
  savingKey,
  onSaveField,
  onRestoreField,
  onSaveAllFields,
  onResetAllFooterFields,
}: FooterEditorPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const getEffectiveValue = (field: FooterFieldDefinition): string => {
    if (drafts[field.textId] !== undefined) return drafts[field.textId];
    if (footerValues[field.textId] !== undefined) return footerValues[field.textId];
    return field.defaultValue;
  };

  const hasUnsavedDrafts = Object.keys(drafts).some((textId) => {
    const def = FOOTER_FIELD_DEFINITIONS.find((f) => f.textId === textId);
    if (!def) return false;
    const saved = footerValues[textId] ?? def.defaultValue;
    return drafts[textId] !== saved;
  });

  const groups: FooterFieldDefinition['columnGroup'][] = [
    'Column 1 · Brand & Experience',
    'Column 2 · Explore Navigation',
    'Column 3 · Get in Touch & CTA',
    'Bottom Bar · Copyright',
  ];

  const handleSaveSingle = async (field: FooterFieldDefinition) => {
    const val = getEffectiveValue(field);
    await onSaveField(field, val);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[field.textId];
      return next;
    });
  };

  const handleRestoreSingle = async (field: FooterFieldDefinition) => {
    await onRestoreField(field);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[field.textId];
      return next;
    });
  };

  const handleSaveAll = async () => {
    const fullPayload: Record<string, string> = {};
    for (const field of FOOTER_FIELD_DEFINITIONS) {
      fullPayload[field.textId] = getEffectiveValue(field);
    }
    await onSaveAllFields(fullPayload);
    setDrafts({});
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Actions */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              <span>Global Site Footer CMS · Syncs Across All 12 Pages</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
              Website Footer Text Editor
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Edit any text in the 3-column website footer below — including brand taglines, navigation link labels, contact details (phone, email, address), the WhatsApp CTA button, and the copyright notice. Changes automatically apply across all 12 pages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveAll()}
              disabled={savingKey !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {savingKey === 'all'
                  ? 'Saving All Footer Texts...'
                  : hasUnsavedDrafts
                    ? 'Save All Unsaved Changes'
                    : 'Save All Footer Texts'}
              </span>
            </button>

            {modifiedKeys.size > 0 && (
              confirmResetAll ? (
                <div className="inline-flex items-center gap-1.5 bg-red-950/80 border border-red-700/80 rounded-md px-2.5 py-1.5">
                  <span className="text-[11px] text-red-200">Reset all footer texts?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmResetAll(false);
                      setDrafts({});
                      await onResetAllFooterFields();
                    }}
                    className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(false)}
                    className="px-1.5 py-0.5 text-[11px] text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetAll(true)}
                  disabled={savingKey !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-slate-300 border border-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults ({modifiedKeys.size})</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Live Interactive Footer Preview */}
        <div className="pt-3 border-t border-emerald-950/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span>Live Footer Preview (All 12 Pages)</span>
            <span className="font-mono text-emerald-400">
              {modifiedKeys.size} customized field{modifiedKeys.size === 1 ? '' : 's'}
            </span>
          </div>
          <div className="rounded-xl bg-[#07261d] border border-emerald-800/60 p-5 sm:p-6 text-[#dce7e2] shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-emerald-800/60">
              {/* Preview Col 1 */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                  Nisha Safari Trips
                </div>
                <p className="text-xs sm:text-sm whitespace-pre-line text-[#dce7e2] leading-relaxed">
                  {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[0])}
                </p>
                <p className="text-xs sm:text-sm text-[#dce7e2]">
                  {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[1])}
                </p>
              </div>

              {/* Preview Col 2 */}
              <div className="space-y-2">
                <div className="text-sm font-bold text-white">
                  {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[2])}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#e8f2ee]">
                  {FOOTER_FIELD_DEFINITIONS.slice(3, 12).map((navField) => (
                    <span key={navField.textId} className="truncate hover:text-amber-300">
                      {getEffectiveValue(navField)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview Col 3 */}
              <div className="space-y-2.5">
                <div className="text-sm font-bold text-white">
                  {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[12])}
                </div>
                <div className="space-y-1.5 text-xs text-[#e8f2ee]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="underline">{getEffectiveValue(FOOTER_FIELD_DEFINITIONS[13])}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="underline">{getEffectiveValue(FOOTER_FIELD_DEFINITIONS[14])}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">
                      {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[15])}
                    </span>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[16])}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 text-center text-xs text-[#dce7e2]">
              {getEffectiveValue(FOOTER_FIELD_DEFINITIONS[17])} &nbsp;•&nbsp;{' '}
              <span className="opacity-70">Admin Panel</span>
            </div>
          </div>
        </div>
      </section>

      {/* Editable Column Groups */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {groups.map((grpName) => {
          const fields = FOOTER_FIELD_DEFINITIONS.filter((f) => f.columnGroup === grpName);
          return (
            <section
              key={grpName}
              className="bg-[#101714] border border-emerald-950/90 rounded-lg overflow-hidden flex flex-col"
            >
              <div className="px-5 py-3.5 bg-[#121c18] border-b border-emerald-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <h2 className="text-sm font-semibold text-slate-100">{grpName}</h2>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {fields.length} field{fields.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-800/80 space-y-4">
                {fields.map((field) => {
                  const val = getEffectiveValue(field);
                  const savedVal = footerValues[field.textId] ?? field.defaultValue;
                  const isDirty = val !== savedVal;
                  const isModified = modifiedKeys.has(field.textId);
                  const isSavingThis = savingKey === field.textId || savingKey === 'all';

                  return (
                    <div key={field.textId} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                            <Type className="w-3 h-3" />
                            {field.label}
                          </span>
                          {isModified && (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              · Customized
                            </span>
                          )}
                          {isDirty && (
                            <span className="text-[11px] text-amber-400 font-medium">
                              · Unsaved edit
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(isModified || isDirty) && (
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => void handleRestoreSingle(field)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#090d0b] hover:bg-slate-800 border border-slate-800 transition-colors"
                              title="Restore default value"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Default</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isSavingThis}
                            onClick={() => void handleSaveSingle(field)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isDirty
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-[#090d0b] hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-800 hover:border-amber-500'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{savingKey === field.textId ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400">{field.description}</p>

                      {field.multiline ? (
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [field.textId]: e.target.value,
                            }))
                          }
                          className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none leading-relaxed"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [field.textId]: e.target.value,
                            }))
                          }
                          className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
