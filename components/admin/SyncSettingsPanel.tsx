'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import type { PageMeta, R2StatusPayload, SyncReport } from './types';

interface SyncSettingsPanelProps {
  currentPageMeta: PageMeta;
  r2Status: R2StatusPayload | null;
  syncingToSite: boolean;
  testingR2: boolean;
  savingCreds: boolean;
  resettingPage: boolean;
  resettingAll: boolean;
  lastSyncReport: SyncReport | null;
  onSyncSavedImagesToSiteR2: () => Promise<void>;
  onTestR2Connection: () => Promise<void>;
  onSaveR2Credentials: (creds: {
    accountId: string;
    bucketName: string;
    accessKeyId: string;
    secretAccessKey: string;
    apiToken: string;
    cdnBaseUrl: string;
  }) => Promise<void>;
  onResetCurrentPage: () => Promise<void>;
  onResetEntireSite: () => Promise<void>;
}

export function SyncSettingsPanel({
  currentPageMeta,
  r2Status,
  syncingToSite,
  testingR2,
  savingCreds,
  resettingPage,
  resettingAll,
  lastSyncReport,
  onSyncSavedImagesToSiteR2,
  onTestR2Connection,
  onSaveR2Credentials,
  onResetCurrentPage,
  onResetEntireSite,
}: SyncSettingsPanelProps) {
  const [accountIdDraft, setAccountIdDraft] = useState<string | null>(null);
  const [bucketNameDraft, setBucketNameDraft] = useState<string | null>(null);
  const [accessKeyId, setAccessKeyId] = useState<string>('');
  const [secretAccessKey, setSecretAccessKey] = useState<string>('');
  const [apiToken, setApiToken] = useState<string>('');
  const [cdnBaseUrlDraft, setCdnBaseUrlDraft] = useState<string | null>(null);
  const [confirmResetPage, setConfirmResetPage] = useState<boolean>(false);
  const [confirmResetAll, setConfirmResetAll] = useState<boolean>(false);

  const accountId = accountIdDraft ?? r2Status?.storedConfig?.accountId ?? r2Status?.accountId ?? '';
  const bucketName =
    bucketNameDraft ?? r2Status?.storedConfig?.bucketName ?? r2Status?.bucketName ?? 'nishatravels';
  const cdnBaseUrl =
    cdnBaseUrlDraft ?? r2Status?.storedConfig?.cdnBaseUrl ?? r2Status?.cdnBaseUrl ?? '';

  return (
    <div className="space-y-6">
      {/* 1. Primary R2 <-> Firestore Sync Card */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloudflare R2 · Firestore CDN Sync</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100">
              Verify &amp; Sync Cloudflare R2 with Firestore
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audits all remote Cloudflare R2 bucket objects, normalizes active R2 CDN URLs in
              Firestore so the live site loads straight from Cloudflare R2, and prunes any broken
              references whose objects were deleted from R2.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void onTestR2Connection()}
              disabled={testingR2}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-slate-200 border border-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingR2 ? 'animate-spin' : ''}`} />
              <span>{testingR2 ? 'Testing...' : 'Test R2 Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => void onSyncSavedImagesToSiteR2()}
              disabled={syncingToSite}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingToSite ? 'animate-spin' : ''}`} />
              <span>
                {syncingToSite ? 'Syncing R2 <-> Firestore...' : 'Sync R2 with Firestore'}
              </span>
            </button>
          </div>
        </div>

        {/* Connection Diagnostics */}
        {r2Status?.testResult && (
          <div
            className={`px-4 py-3 rounded-md border text-xs flex items-start gap-2.5 ${
              r2Status.testResult.ok
                ? 'bg-emerald-950/35 border-emerald-900/70 text-emerald-300'
                : 'bg-amber-950/35 border-amber-900/70 text-amber-300'
            }`}
          >
            {r2Status.testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            )}
            <div className="space-y-0.5">
              <div className="font-medium">{r2Status.testResult.message}</div>
              <div className="text-[11px] opacity-80 font-mono">
                Auth mode: {r2Status.authMode} · Bucket: {r2Status.bucketName} · CDN:{' '}
                {r2Status.cdnBaseUrl}
              </div>
            </div>
          </div>
        )}

        {/* Last Sync Report */}
        {lastSyncReport && (
          <div className="bg-[#090d0b] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Latest Sync Summary</span>
              </span>
              {lastSyncReport.syncedAt && (
                <span className="font-mono text-[11px] text-slate-400">
                  {new Date(lastSyncReport.syncedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-500">Remote R2 Objects</div>
                <div className="font-mono font-semibold text-slate-100 tabular-nums mt-0.5">
                  {lastSyncReport.r2Total}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Firestore Links Checked</div>
                <div className="font-mono font-semibold text-slate-100 tabular-nums mt-0.5">
                  {lastSyncReport.firestoreImagesChecked}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">CDN URLs Updated</div>
                <div className="font-mono font-semibold text-slate-100 tabular-nums mt-0.5">
                  {lastSyncReport.firestoreUrlsNormalized}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Orphaned Cleared</div>
                <div
                  className={`font-mono font-semibold tabular-nums mt-0.5 ${
                    lastSyncReport.orphanedRemoved > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {lastSyncReport.orphanedRemoved}
                </div>
              </div>
            </div>

            {lastSyncReport.warning && (
              <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded px-3 py-2">
                {lastSyncReport.warning}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Cloudflare R2 Credentials Form */}
      <section className="bg-[#101714] border border-emerald-950/90 rounded-lg p-6 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Cloudflare R2 API Configuration</span>
          </div>
          <h2 className="text-base font-semibold text-slate-100">
            Bucket Credentials & Custom CDN Domain
          </h2>
          <p className="text-xs text-slate-400">
            Leave secret fields blank to keep previously saved server keys unchanged.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSaveR2Credentials({
              accountId,
              bucketName,
              accessKeyId,
              secretAccessKey,
              apiToken,
              cdnBaseUrl,
            });
            setAccessKeyId('');
            setSecretAccessKey('');
            setApiToken('');
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="r2-account" className="block text-xs font-medium text-slate-300">
              Cloudflare Account ID
            </label>
            <input
              id="r2-account"
              type="text"
              value={accountId}
              onChange={(e) => setAccountIdDraft(e.target.value)}
              placeholder="e.g. 10382badc5549c70cccebce858ee7f65"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="r2-bucket" className="block text-xs font-medium text-slate-300">
              R2 Bucket Name
            </label>
            <input
              id="r2-bucket"
              type="text"
              value={bucketName}
              onChange={(e) => setBucketNameDraft(e.target.value)}
              placeholder="nishatravels"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="r2-cdn" className="block text-xs font-medium text-slate-300">
              Public CDN Base URL
            </label>
            <input
              id="r2-cdn"
              type="text"
              value={cdnBaseUrl}
              onChange={(e) => setCdnBaseUrlDraft(e.target.value)}
              placeholder="https://cdn.srilankabestsafari.com"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="r2-access-key" className="block text-xs font-medium text-slate-300">
              S3 Access Key ID{' '}
              {r2Status?.storedConfig?.accessKeyId && (
                <span className="text-slate-500 font-mono">
                  (Current: {r2Status.storedConfig.accessKeyId})
                </span>
              )}
            </label>
            <input
              id="r2-access-key"
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="Leave blank to keep current Access Key ID"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="r2-secret-key" className="block text-xs font-medium text-slate-300">
              S3 Secret Access Key{' '}
              {r2Status?.storedConfig?.hasSecret && (
                <span className="text-emerald-400 font-mono">(Saved)</span>
              )}
            </label>
            <input
              id="r2-secret-key"
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="Leave blank to keep existing secret"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="r2-api-token" className="block text-xs font-medium text-slate-300">
              Cloudflare API Token (Optional){' '}
              {r2Status?.storedConfig?.hasApiToken && (
                <span className="text-emerald-400 font-mono">(Saved)</span>
              )}
            </label>
            <input
              id="r2-api-token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Optional Bearer token fallback"
              className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingCreds}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCreds ? 'Saving & Testing...' : 'Save R2 Credentials'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. Wipe Firestore Image Assignments Zone */}
      <section className="bg-[#101714] border border-red-950/60 rounded-lg p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-red-300">Page &amp; Site Image Clear Controls</h2>
          <p className="text-xs text-slate-400">
            Clear all active R2 CDN image assignments in Firestore for the selected page (
            {currentPageMeta.title}) or wipe all saved site image slots across every page.
            Files inside your R2 Media Bucket remain untouched unless deleted directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {confirmResetPage ? (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 rounded-md px-3 py-1.5">
              <span className="text-xs text-red-200">
                Clear all {currentPageMeta.title} images from Firestore?
              </span>
              <button
                type="button"
                disabled={resettingPage}
                onClick={async () => {
                  setConfirmResetPage(false);
                  await onResetCurrentPage();
                }}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white"
              >
                {resettingPage ? 'Clearing...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetPage(false)}
                className="px-2 py-1 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetPage(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-red-950/60 text-red-300 border border-red-900/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear {currentPageMeta.title} Images</span>
            </button>
          )}

          {confirmResetAll ? (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 rounded-md px-3 py-1.5">
              <span className="text-xs text-red-200">Wipe all 12 pages from Firestore?</span>
              <button
                type="button"
                disabled={resettingAll}
                onClick={async () => {
                  setConfirmResetAll(false);
                  await onResetEntireSite();
                }}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white"
              >
                {resettingAll ? 'Wiping...' : 'Confirm Full Wipe'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetAll(false)}
                className="px-2 py-1 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetAll(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-red-950/60 text-red-400 border border-red-900/60 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Site Images</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
