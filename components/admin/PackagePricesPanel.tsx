'use client';

import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  MapPin,
  RotateCcw,
  Save,
  Tag,
} from 'lucide-react';

export interface PackagePriceDefinition {
  priceId: string;
  page:
    | 'yala-safari.html'
    | 'udawalawe-safari.html'
    | 'bundala-birding-safari.html'
    | 'wilpattu-safari.html'
    | 'minneriya-safari.html'
    | 'kumana-birding-safari.html';
  destinationName: string;
  packageTitle: string;
  timingOrRoute: string;
  unitLabel: string;
  defaultValue: string;
}

export const DESTINATION_PAGES_META: {
  page: PackagePriceDefinition['page'];
  destinationName: string;
}[] = [
  { page: 'yala-safari.html', destinationName: 'Yala Safari' },
  { page: 'udawalawe-safari.html', destinationName: 'Udawalawe Safari' },
  { page: 'bundala-birding-safari.html', destinationName: 'Bundala Safari' },
  { page: 'wilpattu-safari.html', destinationName: 'Wilpattu Safari' },
  { page: 'minneriya-safari.html', destinationName: 'Minneriya Safari' },
  { page: 'kumana-birding-safari.html', destinationName: 'Kumana Safari' },
];

export const PACKAGE_PRICE_DEFINITIONS: PackagePriceDefinition[] = [
  // Yala Safari
  {
    priceId: 'pkg_price__yala_full_day',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Full Day Safari',
    timingOrRoute: '4:30 AM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€30',
  },
  {
    priceId: 'pkg_price__yala_special_leopard',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Special Leopard & Elephants Safari',
    timingOrRoute: '4:30 AM – 11:30 AM',
    unitLabel: '/ person',
    defaultValue: '€12',
  },
  {
    priceId: 'pkg_price__yala_evening',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Evening Safari',
    timingOrRoute: '1:30 PM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€20',
  },
  {
    priceId: 'pkg_price__yala_transfer_ella_south_full',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Ella → Yala → Southern Coast (Full Day & Transfer)',
    timingOrRoute: '3:00 AM – 8:00 PM',
    unitLabel: 'per person',
    defaultValue: '€60',
  },
  {
    priceId: 'pkg_price__yala_transfer_ella_south_special',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Ella → Yala → Southern Coast (Special Leopard & Transfer)',
    timingOrRoute: '3:00 AM – 2:00 PM',
    unitLabel: 'per person',
    defaultValue: '€40',
  },
  {
    priceId: 'pkg_price__yala_transfer_south_ella_full',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Southern Coast → Yala → Ella (Full Day & Transfer)',
    timingOrRoute: '3:00 AM – 8:00 PM',
    unitLabel: 'per person',
    defaultValue: '€60',
  },
  {
    priceId: 'pkg_price__yala_transfer_south_ella_special',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Southern Coast → Yala → Ella (Special Leopard & Transfer)',
    timingOrRoute: '3:00 AM – 2:00 PM',
    unitLabel: 'per person',
    defaultValue: '€40',
  },
  {
    priceId: 'pkg_price__yala_hambantota_port',
    page: 'yala-safari.html',
    destinationName: 'Yala Safari',
    packageTitle: 'Special Safari from Hambantota Port',
    timingOrRoute: 'Approx. 8:00 AM – 5:30 PM',
    unitLabel: 'per person',
    defaultValue: '€45',
  },

  // Udawalawe Safari
  {
    priceId: 'pkg_price__udawalawe_full_day',
    page: 'udawalawe-safari.html',
    destinationName: 'Udawalawe Safari',
    packageTitle: 'Full Day Safari',
    timingOrRoute: '5:30 AM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€35',
  },
  {
    priceId: 'pkg_price__udawalawe_morning',
    page: 'udawalawe-safari.html',
    destinationName: 'Udawalawe Safari',
    packageTitle: 'Morning Safari',
    timingOrRoute: '5:30 AM – 10:00 AM',
    unitLabel: '/ person',
    defaultValue: '€20',
  },
  {
    priceId: 'pkg_price__udawalawe_evening',
    page: 'udawalawe-safari.html',
    destinationName: 'Udawalawe Safari',
    packageTitle: 'Evening Safari',
    timingOrRoute: '2:00 PM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€20',
  },
  {
    priceId: 'pkg_price__udawalawe_hambantota_port',
    page: 'udawalawe-safari.html',
    destinationName: 'Udawalawe Safari',
    packageTitle: 'Udawalawe Special Safari from Hambantota Port',
    timingOrRoute: 'Approx. 8:00 AM – 5:00 PM',
    unitLabel: 'per person',
    defaultValue: '€45',
  },

  // Bundala Safari
  {
    priceId: 'pkg_price__bundala_morning',
    page: 'bundala-birding-safari.html',
    destinationName: 'Bundala Safari',
    packageTitle: 'Morning Safari',
    timingOrRoute: '5:30 AM – 10:00 AM',
    unitLabel: '/ person',
    defaultValue: '€20',
  },
  {
    priceId: 'pkg_price__bundala_evening',
    page: 'bundala-birding-safari.html',
    destinationName: 'Bundala Safari',
    packageTitle: 'Evening Safari',
    timingOrRoute: '2:00 PM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€20',
  },
  {
    priceId: 'pkg_price__bundala_hambantota_port',
    page: 'bundala-birding-safari.html',
    destinationName: 'Bundala Safari',
    packageTitle: 'Bundala Special Safari from Hambantota Port',
    timingOrRoute: 'Approx. 8:00 AM – 5:00 PM',
    unitLabel: 'per person',
    defaultValue: '€45',
  },

  // Wilpattu Safari
  {
    priceId: 'pkg_price__wilpattu_full_day',
    page: 'wilpattu-safari.html',
    destinationName: 'Wilpattu Safari',
    packageTitle: 'Full Day Safari',
    timingOrRoute: '5:30 AM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€45',
  },
  {
    priceId: 'pkg_price__wilpattu_morning',
    page: 'wilpattu-safari.html',
    destinationName: 'Wilpattu Safari',
    packageTitle: 'Morning Safari',
    timingOrRoute: '5:30 AM – 10:30 AM',
    unitLabel: '/ person',
    defaultValue: '€25',
  },
  {
    priceId: 'pkg_price__wilpattu_evening',
    page: 'wilpattu-safari.html',
    destinationName: 'Wilpattu Safari',
    packageTitle: 'Evening Safari',
    timingOrRoute: '2:00 PM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€25',
  },

  // Minneriya Safari
  {
    priceId: 'pkg_price__minneriya_morning',
    page: 'minneriya-safari.html',
    destinationName: 'Minneriya Safari',
    packageTitle: 'Morning Safari',
    timingOrRoute: '5:30 AM – 10:00 AM',
    unitLabel: '/ person',
    defaultValue: '€25',
  },
  {
    priceId: 'pkg_price__minneriya_evening',
    page: 'minneriya-safari.html',
    destinationName: 'Minneriya Safari',
    packageTitle: 'Evening Safari',
    timingOrRoute: '2:00 PM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€25',
  },

  // Kumana Safari
  {
    priceId: 'pkg_price__kumana_morning',
    page: 'kumana-birding-safari.html',
    destinationName: 'Kumana Safari',
    packageTitle: 'Morning Safari',
    timingOrRoute: '5:30 AM – 10:30 AM',
    unitLabel: '/ person',
    defaultValue: '€25',
  },
  {
    priceId: 'pkg_price__kumana_evening',
    page: 'kumana-birding-safari.html',
    destinationName: 'Kumana Safari',
    packageTitle: 'Evening Safari',
    timingOrRoute: '2:00 PM – 6:00 PM',
    unitLabel: '/ person',
    defaultValue: '€25',
  },
];

interface PackagePricesPanelProps {
  priceValues: Record<string, string>;
  modifiedKeys: Set<string>;
  savingKey: string | null;
  onSavePrice: (pkg: PackagePriceDefinition, newValue: string) => Promise<void>;
  onRestorePrice: (pkg: PackagePriceDefinition) => Promise<void>;
  onSaveAllPrices: (drafts: Record<string, string>) => Promise<void>;
  onResetAllPrices: () => Promise<void>;
}

export function PackagePricesPanel({
  priceValues,
  modifiedKeys,
  savingKey,
  onSavePrice,
  onRestorePrice,
  onSaveAllPrices,
  onResetAllPrices,
}: PackagePricesPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const getEffectiveValue = (pkg: PackagePriceDefinition): string => {
    if (drafts[pkg.priceId] !== undefined) return drafts[pkg.priceId];
    if (priceValues[pkg.priceId] !== undefined) return priceValues[pkg.priceId];
    return pkg.defaultValue;
  };

  const hasUnsavedDrafts = Object.keys(drafts).some((priceId) => {
    const def = PACKAGE_PRICE_DEFINITIONS.find((p) => p.priceId === priceId);
    if (!def) return false;
    const saved = priceValues[priceId] ?? def.defaultValue;
    return drafts[priceId] !== saved;
  });

  const handleSaveSingle = async (pkg: PackagePriceDefinition) => {
    const val = getEffectiveValue(pkg).trim() || pkg.defaultValue;
    await onSavePrice(pkg, val);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[pkg.priceId];
      return next;
    });
  };

  const handleRestoreSingle = async (pkg: PackagePriceDefinition) => {
    await onRestorePrice(pkg);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[pkg.priceId];
      return next;
    });
  };

  const handleSaveAll = async () => {
    const fullPayload: Record<string, string> = {};
    for (const pkg of PACKAGE_PRICE_DEFINITIONS) {
      fullPayload[pkg.priceId] = getEffectiveValue(pkg).trim() || pkg.defaultValue;
    }
    await onSaveAllPrices(fullPayload);
    setDrafts({});
  };

  const visibleDestinations =
    selectedDestination === 'all'
      ? DESTINATION_PAGES_META
      : DESTINATION_PAGES_META.filter((d) => d.page === selectedDestination);

  return (
    <div className="space-y-6">
      {/* Header & Global Actions */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>Safari Destinations Pricing CMS · Live Firestore Sync</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
              Destination Package Prices Editor
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Update package prices across all 6 pages in the Safari Destinations menu (Yala, Udawalawe, Bundala, Wilpattu, Minneriya, and Kumana) including morning, evening, full-day, transfer, and Hambantota Port packages.
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
                  ? 'Saving All Prices...'
                  : hasUnsavedDrafts
                    ? 'Save All Unsaved Prices'
                    : 'Save All Package Prices'}
              </span>
            </button>

            {modifiedKeys.size > 0 && (
              confirmResetAll ? (
                <div className="inline-flex items-center gap-1.5 bg-red-950/80 border border-red-700/80 rounded-md px-2.5 py-1.5">
                  <span className="text-[11px] text-red-200">Reset all prices?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmResetAll(false);
                      setDrafts({});
                      await onResetAllPrices();
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

        {/* Destination Filter Bar */}
        <div className="pt-3 border-t border-emerald-950/80 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDestination('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedDestination === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-[#090d0b] text-slate-300 border border-slate-800 hover:text-white'
            }`}
          >
            All Destinations ({PACKAGE_PRICE_DEFINITIONS.length})
          </button>
          {DESTINATION_PAGES_META.map((dest) => {
            const count = PACKAGE_PRICE_DEFINITIONS.filter((p) => p.page === dest.page).length;
            const customizedCount = PACKAGE_PRICE_DEFINITIONS.filter(
              (p) => p.page === dest.page && modifiedKeys.has(p.priceId)
            ).length;
            return (
              <button
                key={dest.page}
                type="button"
                onClick={() => setSelectedDestination(dest.page)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                  selectedDestination === dest.page
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-[#090d0b] text-slate-300 border border-slate-800 hover:text-white'
                }`}
              >
                <span>{dest.destinationName}</span>
                <span className="font-mono text-[10px] opacity-75">
                  ({customizedCount > 0 ? `${customizedCount}/` : ''}
                  {count})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Destination Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {visibleDestinations.map((dest) => {
          const packages = PACKAGE_PRICE_DEFINITIONS.filter((p) => p.page === dest.page);
          return (
            <section
              key={dest.page}
              className="bg-[#101714] border border-emerald-950/90 rounded-lg overflow-hidden flex flex-col"
            >
              <div className="px-5 py-3.5 bg-[#121c18] border-b border-emerald-950/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-100 truncate">
                    {dest.destinationName}
                  </h2>
                  <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">
                    ({dest.page})
                  </span>
                </div>

                <a
                  href={`/${dest.page}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#090d0b] hover:bg-slate-900 text-slate-200 border border-slate-800 transition-colors shrink-0"
                >
                  <span>View Page</span>
                  <ExternalLink className="w-3 h-3 text-amber-400" />
                </a>
              </div>

              <div className="p-4 divide-y divide-slate-800/80 space-y-3.5">
                {packages.map((pkg) => {
                  const val = getEffectiveValue(pkg);
                  const savedVal = priceValues[pkg.priceId] ?? pkg.defaultValue;
                  const isDirty = val !== savedVal;
                  const isModified = modifiedKeys.has(pkg.priceId);
                  const isSavingThis = savingKey === pkg.priceId || savingKey === 'all';

                  return (
                    <div key={pkg.priceId} className="pt-3.5 first:pt-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-slate-100">
                              {pkg.packageTitle}
                            </span>
                            {isModified && (
                              <span className="text-[11px] text-emerald-400 font-medium">
                                · Customized
                              </span>
                            )}
                            {isDirty && (
                              <span className="text-[11px] text-amber-400 font-medium">
                                · Unsaved
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {pkg.timingOrRoute} · Default: {pkg.defaultValue} {pkg.unitLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(isModified || isDirty) && (
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => void handleRestoreSingle(pkg)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-[#090d0b] hover:bg-slate-800 border border-slate-800 transition-colors"
                              title="Restore default price"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Default</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isSavingThis}
                            onClick={() => void handleSaveSingle(pkg)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isDirty
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-[#090d0b] hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-800 hover:border-amber-500'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{savingKey === pkg.priceId ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [pkg.priceId]: e.target.value,
                            }))
                          }
                          placeholder={pkg.defaultValue}
                          aria-label={`${dest.destinationName} — ${pkg.packageTitle} price`}
                          className="w-36 bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-1.5 text-sm font-semibold text-amber-300 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400">{pkg.unitLabel}</span>
                      </div>
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
