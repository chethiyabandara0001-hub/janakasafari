'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Layers,
  FolderOpen,
  Check,
  X,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Type,
  Plus,
  Trash2,
  Edit3,
  Database,
  LogIn,
  LogOut,
  Grid,
  Copy,
  Link2,
  Settings,
  Key,
  Info,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  saveSiteImageInFirestore,
  deleteSiteImageInFirestore,
  saveSectionGalleryItemInFirestore,
  deleteSectionGalleryItemInFirestore,
  saveSiteTextInFirestore,
  deleteSiteTextInFirestore,
  subscribePublicCollection,
  uploadImageToR2Bucket,
  migrateDataUrlToR2Bucket,
  updateR2BucketObjectMeta,
  deleteImageFromR2Bucket,
  extractR2KeyFromUrl,
  type User,
} from '@/lib/firebase';
import {
  INITIAL_FIREBASE_SECTION_IMAGES,
  INITIAL_FIREBASE_SLOT_UPGRADES,
  type SeedSectionGalleryItem,
} from '@/lib/section-seed-data';

interface ImageSlot {
  id: string;
  slotId: string;
  page: string;
  pageTitle: string;
  slotIndex: number;
  type: 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
  label: string;
  sectionContext: string;
  src: string;
  lightboxHref?: string;
  r2Key?: string;
  alt: string;
  assetFilename: string;
  isSharedAsset: boolean;
  sharedCount: number;
  isModified?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

interface MediaAssetInfo {
  r2Key?: string;
  cdnUrl?: string;
  filename: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  usedInPages: string[];
  usageCount: number;
  hasDefaultBackup: boolean;
}

interface R2BucketObject {
  r2Key: string;
  filename: string;
  cdnUrl: string;
  mimeType: string;
  sizeBytes: number;
  alt: string;
  title: string;
  page?: string;
  updatedAt: string;
  bucketName: string;
}

interface SiteTextSlot {
  textId: string;
  page: string;
  pageTitle: string;
  textIndex: number;
  tagName:
    | 'H1'
    | 'H2'
    | 'H3'
    | 'H4'
    | 'P'
    | 'SPAN'
    | 'A'
    | 'LI'
    | 'DIV'
    | 'BLOCKQUOTE'
    | 'STRONG'
    | 'TD'
    | 'CUSTOM';
  sectionContext: string;
  content: string;
  defaultContent: string;
  isDeleted: boolean;
  isCustomAdded: boolean;
  isModified: boolean;
}

interface PageMeta {
  file: string;
  title: string;
}

type ViewMode = 'slots' | 'section-images' | 'texts' | 'library';
type SlotTypeFilter = 'all' | 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
type TextTypeFilter = 'all' | 'headings' | 'paragraphs' | 'buttons' | 'lists' | 'custom';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getSlotTypeLabel(type: ImageSlot['type']): string {
  switch (type) {
    case 'hero-bg':
      return 'Hero Banner';
    case 'lightbox-img':
      return 'Gallery + Lightbox';
    case 'logo':
      return 'Site Logo';
    case 'img':
    default:
      return 'Content Photo';
  }
}

export default function AdminCmsStudioPage() {
  const [bucketName, setBucketName] = useState<string>('ai-studio-applet-opennext-cache');
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetInfo[]>([]);
  const [r2Objects, setR2Objects] = useState<R2BucketObject[]>([]);
  const [textSlots, setTextSlots] = useState<SiteTextSlot[]>([]);
  const [customTexts, setCustomTexts] = useState<SiteTextSlot[]>([]);
  const [sectionImages, setSectionImages] = useState<SeedSectionGalleryItem[]>([]);
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cacheBuster, setCacheBuster] = useState<number>(() => Date.now());

  // Firebase Auth & Firestore Live Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firestoreImageDocs, setFirestoreImageDocs] = useState<Record<string, Partial<ImageSlot>>>({});
  const [firestoreSectionDocs, setFirestoreSectionDocs] = useState<SeedSectionGalleryItem[]>([]);
  const [firestoreTextDocs, setFirestoreTextDocs] = useState<Record<string, Partial<SiteTextSlot>>>({});
  // Cloudflare R2 Remote Configuration & Connectivity State
  const [r2ConfigStatus, setR2ConfigStatus] = useState<{
    authMode: string;
    remoteConfigured: boolean;
    bucketName: string;
    accountId: string;
    cdnBaseUrl: string;
    warning?: string;
    hasAccessKey?: boolean;
    hasSecretKey?: boolean;
    secretIsUrlEndpoint?: boolean;
    storedConfig?: {
      accountId: string;
      bucketName: string;
      accessKeyId: string;
      hasSecret: boolean;
      hasApiToken: boolean;
      cdnBaseUrl: string;
      updatedAt?: string;
    };
    testResult?: {
      connected: boolean;
      provider: string;
      message: string;
      status?: number;
      details?: string;
    };
  } | null>(null);
  const [testingR2Connection, setTestingR2Connection] = useState<boolean>(false);
  const [syncingAllR2, setSyncingAllR2] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [showR2ConfigModal, setShowR2ConfigModal] = useState<boolean>(false);
  const [r2CredentialsForm, setR2CredentialsForm] = useState({
    accountId: '10382badc5549c70cccebce858ee7f65',
    bucketName: 'nishatravels',
    accessKeyId: '',
    secretAccessKey: '',
    cdnBaseUrl: 'https://cdn.srilankabestsafari.com',
  });
  const [savingR2Creds, setSavingR2Creds] = useState<boolean>(false);
  const [r2SetupGuideTab, setR2SetupGuideTab] = useState<'credentials' | 'pages-binding' | 'api-token'>('credentials');

  // Navigation & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('slots');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<SlotTypeFilter>('all');
  const [selectedTextType, setSelectedTextType] = useState<TextTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal 1: Active Slot Editing (Pushes image to R2 -> saves R2 CDN link to Firebase Firestore)
  const [editingSlot, setEditingSlot] = useState<ImageSlot | null>(null);
  const [slotScope, setSlotScope] = useState<'slot' | 'global'>('slot');
  const [slotAltText, setSlotAltText] = useState<string>('');
  const [slotExternalUrl, setSlotExternalUrl] = useState<string>('');
  const [slotSelectedR2Key, setSlotSelectedR2Key] = useState<string>('');
  const [slotUploadFile, setSlotUploadFile] = useState<File | null>(null);
  const [slotPreviewUrl, setSlotPreviewUrl] = useState<string | null>(null);
  const [slotSaving, setSlotSaving] = useState<boolean>(false);

  // Modal 2: Add / Edit Section Wildlife Gallery Image (Pushes image to R2 -> saves R2 CDN link to Firebase Firestore)
  const [editingSectionImg, setEditingSectionImg] = useState<SeedSectionGalleryItem | null>(null);
  const [isNewSectionImg, setIsNewSectionImg] = useState<boolean>(false);
  const [secImgUploadFile, setSecImgUploadFile] = useState<File | null>(null);
  const [secImgPreviewUrl, setSecImgPreviewUrl] = useState<string | null>(null);
  const [secImgSaving, setSecImgSaving] = useState<boolean>(false);

  // Modal 3: Add / Edit Site Text Slot or Custom Text Block
  const [editingText, setEditingText] = useState<SiteTextSlot | null>(null);
  const [isNewCustomText, setIsNewCustomText] = useState<boolean>(false);
  const [textDraftContent, setTextDraftContent] = useState<string>('');
  const [textDraftSection, setTextDraftSection] = useState<string>('');
  const [textDraftPage, setTextDraftPage] = useState<string>('index.html');
  const [textDraftTag, setTextDraftTag] = useState<SiteTextSlot['tagName']>('P');
  const [textSaving, setTextSaving] = useState<boolean>(false);

  // Modal 4: Direct Cloudflare R2 Bucket Add / Edit / Replace / Delete Modal
  const [editingR2Obj, setEditingR2Obj] = useState<R2BucketObject | null>(null);
  const [isNewR2Upload, setIsNewR2Upload] = useState<boolean>(false);
  const [r2DraftKey, setR2DraftKey] = useState<string>('');
  const [r2DraftTitle, setR2DraftTitle] = useState<string>('');
  const [r2DraftAlt, setR2DraftAlt] = useState<string>('');
  const [r2DraftPage, setR2DraftPage] = useState<string>('index.html');
  const [r2UploadFile, setR2UploadFile] = useState<File | null>(null);
  const [r2PreviewUrl, setR2PreviewUrl] = useState<string | null>(null);
  const [r2AssignSectionGallery, setR2AssignSectionGallery] = useState<boolean>(false);
  const [r2AssignSlotId, setR2AssignSlotId] = useState<string>('');
  const [r2Saving, setR2Saving] = useState<boolean>(false);

  // Confirmation Modal for Reset All
  const [confirmResetModal, setConfirmResetModal] = useState<{
    open: boolean;
    scope: 'all' | 'page';
    page?: string;
    title: string;
  } | null>(null);

  // Status Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secFileInputRef = useRef<HTMLInputElement>(null);
  const r2FileInputRef = useRef<HTMLInputElement>(null);
  const autoSeededRef = useRef<boolean>(false);
  const migratedLegacyDataUrlsRef = useRef<boolean>(false);

  const showNotice = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const [imgRes, cmsRes, r2Res] = await Promise.all([
        fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/r2?t=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (!imgRes.ok || !cmsRes.ok) throw new Error('Failed to load site CMS & R2 inventory');
      const [imgData, cmsData, r2Data] = await Promise.all([
        imgRes.json(),
        cmsRes.json(),
        r2Res.ok ? r2Res.json() : Promise.resolve({ objects: [] }),
      ]);

      if (r2Data.bucketName || imgData.bucketName) {
        setBucketName(r2Data.bucketName || imgData.bucketName);
      }
      setR2ConfigStatus(r2Data);
      if (r2Data.accountId || r2Data.storedConfig) {
        setR2CredentialsForm((prev) => ({
          ...prev,
          accountId: r2Data.accountId || prev.accountId,
          bucketName: r2Data.bucketName || prev.bucketName,
          cdnBaseUrl: r2Data.cdnBaseUrl || prev.cdnBaseUrl,
        }));
      }
      setSlots(imgData.slots || []);
      setMediaAssets(imgData.mediaAssets || []);
      setR2Objects(r2Data.objects || imgData.r2Objects || []);
      setPages(imgData.pages || []);
      setTextSlots(cmsData.textSlots || []);
      setCustomTexts(cmsData.customTexts || []);
      setSectionImages(cmsData.sectionGalleryItems || []);
      setCacheBuster(Date.now());
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  const handleManualRefresh = useCallback(async () => {
    setLoading(true);
    await fetchInventory();
  }, [fetchInventory]);

  // Initial load of inventory from server + R2 bucket
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/r2?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { objects: [] }))
        .catch(() => ({ objects: [] })),
    ])
      .then(([imgData, cmsData, r2Data]) => {
        if (cancelled) return;
        if (r2Data.bucketName || imgData.bucketName) {
          setBucketName(r2Data.bucketName || imgData.bucketName);
        }
        setR2ConfigStatus(r2Data);
        if (r2Data.accountId || r2Data.storedConfig) {
          setR2CredentialsForm((prev) => ({
            ...prev,
            accountId: r2Data.accountId || prev.accountId,
            bucketName: r2Data.bucketName || prev.bucketName,
            cdnBaseUrl: r2Data.cdnBaseUrl || prev.cdnBaseUrl,
          }));
        }
        setSlots(imgData.slots || []);
        setMediaAssets(imgData.mediaAssets || []);
        setR2Objects(r2Data.objects || imgData.r2Objects || []);
        setPages(imgData.pages || []);
        setTextSlots(cmsData.textSlots || []);
        setCustomTexts(cmsData.customTexts || []);
        setSectionImages(cmsData.sectionGalleryItems || []);
        setCacheBuster(Date.now());
      })
      .catch((err) => {
        if (cancelled) return;
        showNotice(err instanceof Error ? err.message : 'Error loading inventory', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showNotice]);

  // Cloudflare R2 Connection Testing & Credentials Handlers
  const handleTestR2Connection = useCallback(async () => {
    setTestingR2Connection(true);
    try {
      const res = await fetch('/api/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      const data = await res.json();
      if (data.testResult) {
        setR2ConfigStatus((prev) =>
          prev
            ? {
                ...prev,
                testResult: data.testResult,
                authMode: data.status?.authMode || prev.authMode,
                warning: data.status?.warning,
                secretIsUrlEndpoint: data.status?.secretIsUrlEndpoint,
              }
            : null
        );
        if (data.testResult.connected) {
          showNotice(
            data.testResult.message || `Successfully connected to Cloudflare R2 bucket "${bucketName}"!`,
            'success'
          );
        } else {
          showNotice(`R2 Connection Failed: ${data.testResult.message}`, 'error');
        }
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to test R2 connection', 'error');
    } finally {
      setTestingR2Connection(false);
    }
  }, [bucketName, showNotice]);

  const handleSaveR2Credentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingR2Creds(true);
    try {
      const res = await fetch('/api/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-credentials',
          accountId: r2CredentialsForm.accountId,
          bucketName: r2CredentialsForm.bucketName,
          accessKeyId: r2CredentialsForm.accessKeyId,
          secretAccessKey: r2CredentialsForm.secretAccessKey,
          cdnBaseUrl: r2CredentialsForm.cdnBaseUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save R2 credentials');
      setR2ConfigStatus((prev) => ({
        ...(prev || {}),
        ...data.status,
        testResult: data.testResult,
        bucketName: r2CredentialsForm.bucketName,
      }));
      setBucketName(r2CredentialsForm.bucketName);
      if (data.testResult?.connected) {
        showNotice(
          `Credentials saved! Successfully connected to Cloudflare R2 bucket "${r2CredentialsForm.bucketName}".`,
          'success'
        );
        setShowR2ConfigModal(false);
      } else {
        showNotice(
          `Credentials saved, but R2 connection test failed: ${data.testResult?.message}`,
          'warning'
        );
      }
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Error saving credentials', 'error');
    } finally {
      setSavingR2Creds(false);
    }
  };

  const handleSyncAllToRemoteR2 = async () => {
    setSyncingAllR2(true);
    setSyncProgressMsg('Connecting to Cloudflare R2...');
    try {
      const res = await fetch('/api/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-remote-r2' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync R2 bucket');
      if (data.pushed > 0) {
        showNotice(
          `Successfully pushed ${data.pushed} images directly into Cloudflare R2 bucket (${bucketName})!`,
          'success'
        );
      } else if (data.failed > 0) {
        const firstErr = data.errors?.[0]?.error || 'Check R2 credentials';
        showNotice(`0 images pushed to remote R2 (${data.failed} failed: ${firstErr}).`, 'error');
      } else {
        showNotice(`R2 sync completed (${data.total} items checked).`, 'info');
      }
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to sync to remote R2', 'error');
    } finally {
      setSyncingAllR2(false);
      setSyncProgressMsg('');
    }
  };

  // Listen to Firebase Auth state & Firestore public collections (which store ONLY R2 CDN URLs + metadata)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    const unsubImages = subscribePublicCollection<{
      slotId: string;
      src: string;
      lightboxHref?: string;
      r2Key?: string;
      alt: string;
      label: string;
      sectionContext: string;
    }>('site_images', (docs) => {
      const map: Record<string, Partial<ImageSlot>> = {};
      for (const d of docs) {
        if (d.slotId) map[d.slotId] = d;
      }
      setFirestoreImageDocs(map);
    });

    const unsubSections = subscribePublicCollection<SeedSectionGalleryItem>(
      'section_gallery_items',
      (docs) => {
        if (docs.length > 0) {
          setFirestoreSectionDocs(docs.sort((a, b) => a.order - b.order));
        } else {
          setFirestoreSectionDocs([]);
        }
      }
    );

    const unsubTexts = subscribePublicCollection<SiteTextSlot>('site_texts', (docs) => {
      const map: Record<string, Partial<SiteTextSlot>> = {};
      for (const d of docs) {
        if (d.textId) map[d.textId] = d;
      }
      setFirestoreTextDocs(map);
    });

    return () => {
      unsubAuth();
      unsubImages();
      unsubSections();
      unsubTexts();
    };
  }, []);

  // Automatically migrate any legacy data:image/... records in Firestore to Cloudflare R2 CDN links
  useEffect(() => {
    if (!currentUser || migratedLegacyDataUrlsRef.current) return;
    const slotEntriesWithDataUrl = Object.values(firestoreImageDocs).filter(
      (d) => d && typeof d.src === 'string' && d.src.startsWith('data:')
    );
    const sectionEntriesWithDataUrl = firestoreSectionDocs.filter(
      (d) => d && typeof d.src === 'string' && d.src.startsWith('data:')
    );

    if (slotEntriesWithDataUrl.length === 0 && sectionEntriesWithDataUrl.length === 0) {
      return;
    }

    migratedLegacyDataUrlsRef.current = true;
    (async () => {
      try {
        for (const docItem of slotEntriesWithDataUrl) {
          if (!docItem.slotId || !docItem.src) continue;
          const r2Res = await migrateDataUrlToR2Bucket(docItem.src, {
            filenameHint: docItem.slotId,
            alt: docItem.alt || docItem.label || docItem.slotId,
            title: docItem.label || docItem.slotId,
          });
          const baseSlot = slots.find((s) => s.slotId === docItem.slotId);
          await saveSiteImageInFirestore({
            slotId: docItem.slotId,
            page: baseSlot?.page || 'index.html',
            slotIndex: baseSlot?.slotIndex || 0,
            type: baseSlot?.type || 'img',
            label: docItem.label || baseSlot?.label || 'Safari Image',
            sectionContext: docItem.sectionContext || baseSlot?.sectionContext || 'Page Section',
            src: r2Res.cdnUrl,
            lightboxHref: r2Res.cdnUrl,
            r2Key: r2Res.r2Key,
            alt: docItem.alt || '',
          });
        }

        for (const secItem of sectionEntriesWithDataUrl) {
          const r2Res = await migrateDataUrlToR2Bucket(secItem.src, {
            filenameHint: secItem.itemId,
            alt: secItem.alt || secItem.title,
            title: secItem.title,
            page: secItem.page,
          });
          await saveSectionGalleryItemInFirestore({
            ...secItem,
            src: r2Res.cdnUrl,
            r2Key: r2Res.r2Key,
          });
        }

        await fetchInventory();
        showNotice('Migrated legacy Firestore image data to Cloudflare R2 CDN links.');
      } catch (err) {
        console.warn('Legacy data URL migration warning:', err);
      }
    })();
  }, [
    currentUser,
    firestoreImageDocs,
    firestoreSectionDocs,
    slots,
    fetchInventory,
    showNotice,
  ]);

  // Sync current active R2 CDN links (and clean up any non-R2 or deleted docs) to Firebase Firestore
  const handleSeedSectionImagesToFirestore = useCallback(
    async (silent = false) => {
      if (!auth.currentUser) {
        if (!silent) {
          showNotice(
            'Please sign in with Google Admin first to sync R2 CDN links to Firestore.',
            'error'
          );
        }
        return;
      }
      setSyncingSeed(true);
      try {
        // Trigger background sync to remote Cloudflare R2 bucket if credentials/bindings are present
        void fetch('/api/r2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync-remote-r2' }),
        }).catch(() => {});

        // 1. Remove any Firestore section docs that were deleted or don't use R2 CDN links
        const isCdnUrl = (src?: string) =>
          Boolean(
            src &&
              !src.startsWith('data:') &&
              (src.includes('/api/r2/file/') ||
                src.startsWith('http://') ||
                src.startsWith('https://') ||
                src.startsWith('/assets/'))
          );

        const activeSectionIds = new Set(sectionImages.map((s) => s.itemId));
        for (const fbSec of firestoreSectionDocs) {
          if (!activeSectionIds.has(fbSec.itemId) || !isCdnUrl(fbSec.src)) {
            await deleteSectionGalleryItemInFirestore(fbSec.itemId);
          }
        }

        // 2. Push active section gallery R2 CDN links to Firestore
        await Promise.all(
          sectionImages.map((item) => saveSectionGalleryItemInFirestore(item))
        );

        // 3. Remove any Firestore slot docs that are marked deleted or don't use R2 CDN links
        const activeSlots = slots.filter((s) => !s.isDeleted && s.src);
        const deletedSlotIds = new Set(slots.filter((s) => s.isDeleted).map((s) => s.slotId));
        for (const slotId of Object.keys(firestoreImageDocs)) {
          const fbDoc = firestoreImageDocs[slotId];
          if (
            deletedSlotIds.has(slotId) ||
            (fbDoc?.src && !isCdnUrl(fbDoc.src) && !fbDoc.r2Key)
          ) {
            await deleteSiteImageInFirestore(slotId);
          }
        }

        // 4. Push active slot R2 CDN links to Firestore in batches
        const chunkSize = 25;
        for (let i = 0; i < activeSlots.length; i += chunkSize) {
          const batch = activeSlots.slice(i, i + chunkSize);
          await Promise.all(
            batch.map((slot) =>
              saveSiteImageInFirestore({
                slotId: slot.slotId,
                page: slot.page,
                slotIndex: slot.slotIndex,
                type: slot.type,
                label: slot.label,
                sectionContext: slot.sectionContext,
                src: slot.src,
                lightboxHref: slot.lightboxHref || slot.src,
                r2Key: slot.r2Key || extractR2KeyFromUrl(slot.src) || `slots/${slot.slotId}.jpg`,
                alt: slot.alt || slot.label,
              })
            )
          );
        }

        if (!silent) {
          showNotice(
            `Synced ${activeSlots.length} R2 slot CDN links and ${sectionImages.length} R2 section CDN links to Firebase Firestore.`
          );
        }
        await fetchInventory();
      } catch (err) {
        if (!silent) {
          showNotice(err instanceof Error ? err.message : 'Firestore CDN sync failed', 'error');
        }
      } finally {
        setSyncingSeed(false);
      }
    },
    [slots, sectionImages, firestoreSectionDocs, firestoreImageDocs, fetchInventory, showNotice]
  );

  // One-time sync when Admin signs in and R2 inventory is loaded
  useEffect(() => {
    if (currentUser && !loading && slots.length > 0 && !autoSeededRef.current) {
      autoSeededRef.current = true;
      void handleSeedSectionImagesToFirestore(true);
    }
  }, [currentUser, loading, slots.length, handleSeedSectionImagesToFirestore]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotice('Connected to Firebase + R2 Admin as ' + (auth.currentUser?.email || 'Admin'));
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Google Sign-In failed', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    await firebaseSignOut(auth);
    showNotice('Signed out of Admin.');
  };

  // Authoritative R2 & server slots (never let stale non-R2 Firestore docs overwrite R2 edits/deletions)
  const mergedSlots = useMemo(() => {
    return slots.map((slot) => {
      if (slot.isDeleted) return slot;
      const fbDoc = firestoreImageDocs[slot.slotId];
      if (!fbDoc || !fbDoc.src || fbDoc.src.startsWith('data:')) return slot;
      const isR2Cdn =
        fbDoc.src.includes('/api/r2/file/') ||
        Boolean(fbDoc.r2Key) ||
        fbDoc.src.startsWith('http://') ||
        fbDoc.src.startsWith('https://');
      if (!isR2Cdn) return slot;
      // Only prefer fbDoc if slot wasn't more recently modified in server R2 state
      if (slot.isModified) return slot;
      const isLbCdn =
        fbDoc.lightboxHref &&
        !fbDoc.lightboxHref.startsWith('data:') &&
        (fbDoc.lightboxHref.includes('/api/r2/file/') ||
          fbDoc.lightboxHref.startsWith('http://') ||
          fbDoc.lightboxHref.startsWith('https://'));
      return {
        ...slot,
        src: fbDoc.src,
        lightboxHref: isLbCdn ? fbDoc.lightboxHref : fbDoc.src,
        r2Key: fbDoc.r2Key || extractR2KeyFromUrl(fbDoc.src) || slot.r2Key,
        alt: fbDoc.alt !== undefined ? fbDoc.alt : slot.alt,
        label: fbDoc.label || slot.label,
      };
    });
  }, [slots, firestoreImageDocs]);

  // Authoritative R2 & server section gallery items
  const mergedSectionImages = useMemo(() => {
    return [...sectionImages].sort((a, b) => a.order - b.order);
  }, [sectionImages]);

  // Merge text slots + custom texts with live Firestore text docs
  const mergedTexts = useMemo(() => {
    const baseList = [...textSlots, ...customTexts].map((t) => {
      const fbDoc = firestoreTextDocs[t.textId];
      if (!fbDoc) return t;
      return {
        ...t,
        content: fbDoc.content !== undefined ? fbDoc.content : t.content,
        isDeleted: fbDoc.isDeleted !== undefined ? fbDoc.isDeleted : t.isDeleted,
        sectionContext: fbDoc.sectionContext || t.sectionContext,
        isModified: true,
      };
    });

    const existingIds = new Set(baseList.map((b) => b.textId));
    for (const [id, fbDoc] of Object.entries(firestoreTextDocs)) {
      if (!existingIds.has(id) && fbDoc.isCustomAdded && fbDoc.page) {
        const pMeta = pages.find((p) => p.file === fbDoc.page);
        baseList.push({
          textId: id,
          page: fbDoc.page,
          pageTitle: pMeta ? pMeta.title : fbDoc.page,
          textIndex: -1,
          tagName: fbDoc.tagName || 'CUSTOM',
          sectionContext: fbDoc.sectionContext || 'Custom Added Text',
          content: fbDoc.content || '',
          defaultContent: '',
          isDeleted: Boolean(fbDoc.isDeleted),
          isCustomAdded: true,
          isModified: true,
        });
      }
    }
    return baseList;
  }, [textSlots, customTexts, firestoreTextDocs, pages]);

  // Enrich R2 bucket objects with usage info across pages
  const enrichedR2Objects = useMemo(() => {
    return r2Objects.map((obj) => {
      const mediaInfo = mediaAssets.find(
        (m) => m.r2Key === obj.r2Key || m.filename === obj.filename
      );
      const usedInSlots = mergedSlots.filter(
        (s) =>
          s.r2Key === obj.r2Key ||
          s.src.includes(obj.r2Key) ||
          (obj.r2Key.startsWith('media/') && s.assetFilename === obj.filename)
      );
      const usedInSections = mergedSectionImages.filter(
        (sec) => sec.r2Key === obj.r2Key || sec.src.includes(obj.r2Key)
      );
      const pageTitles = new Set<string>(mediaInfo?.usedInPages || []);
      for (const s of usedInSlots) pageTitles.add(s.pageTitle);
      for (const sec of usedInSections) {
        const pMeta = pages.find((p) => p.file === sec.page);
        pageTitles.add(pMeta ? pMeta.title : sec.page);
      }

      return {
        ...obj,
        usedInPages: Array.from(pageTitles),
        usageCount:
          usedInSlots.length + usedInSections.length || mediaInfo?.usageCount || 0,
      };
    });
  }, [r2Objects, mediaAssets, mergedSlots, mergedSectionImages, pages]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return mergedSlots.filter((slot) => {
      if (selectedPage !== 'all' && slot.page !== selectedPage) return false;
      if (selectedType !== 'all' && slot.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          slot.label.toLowerCase().includes(q) ||
          slot.sectionContext.toLowerCase().includes(q) ||
          slot.alt.toLowerCase().includes(q) ||
          slot.src.toLowerCase().includes(q) ||
          (slot.r2Key && slot.r2Key.toLowerCase().includes(q)) ||
          slot.pageTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mergedSlots, selectedPage, selectedType, searchQuery]);

  // Filtered section gallery items
  const filteredSectionImages = useMemo(() => {
    return mergedSectionImages.filter((item) => {
      if (selectedPage !== 'all' && item.page !== selectedPage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.sectionTitle.toLowerCase().includes(q) ||
          item.caption.toLowerCase().includes(q) ||
          (item.r2Key && item.r2Key.toLowerCase().includes(q)) ||
          item.page.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mergedSectionImages, selectedPage, searchQuery]);

  // Filtered texts
  const filteredTexts = useMemo(() => {
    return mergedTexts.filter((t) => {
      if (selectedPage !== 'all' && t.page !== selectedPage) return false;
      if (selectedTextType !== 'all') {
        if (
          selectedTextType === 'headings' &&
          !['H1', 'H2', 'H3', 'H4'].includes(t.tagName)
        ) {
          return false;
        }
        if (selectedTextType === 'paragraphs' && !['P', 'BLOCKQUOTE'].includes(t.tagName)) {
          return false;
        }
        if (selectedTextType === 'buttons' && !['SPAN', 'A'].includes(t.tagName)) {
          return false;
        }
        if (selectedTextType === 'lists' && t.tagName !== 'LI') {
          return false;
        }
        if (selectedTextType === 'custom' && !t.isCustomAdded) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.content.toLowerCase().includes(q) ||
          t.sectionContext.toLowerCase().includes(q) ||
          t.pageTitle.toLowerCase().includes(q) ||
          t.tagName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mergedTexts, selectedPage, selectedTextType, searchQuery]);

  // Filtered R2 bucket objects
  const filteredR2Objects = useMemo(() => {
    return enrichedR2Objects.filter((obj) => {
      if (selectedPage !== 'all') {
        const pMeta = pages.find((p) => p.file === selectedPage);
        const matchesPage =
          obj.page === selectedPage ||
          (pMeta && obj.usedInPages.includes(pMeta.title)) ||
          obj.usedInPages.includes(selectedPage);
        if (!matchesPage) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          obj.r2Key.toLowerCase().includes(q) ||
          obj.filename.toLowerCase().includes(q) ||
          obj.title.toLowerCase().includes(q) ||
          obj.alt.toLowerCase().includes(q) ||
          obj.cdnUrl.toLowerCase().includes(q) ||
          obj.usedInPages.some((p) => p.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [enrichedR2Objects, selectedPage, pages, searchQuery]);

  // Page item counts depending on active viewMode
  const pageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    if (viewMode === 'slots') {
      counts.all = mergedSlots.length;
      for (const s of mergedSlots) counts[s.page] = (counts[s.page] || 0) + 1;
    } else if (viewMode === 'section-images') {
      counts.all = mergedSectionImages.length;
      for (const s of mergedSectionImages) counts[s.page] = (counts[s.page] || 0) + 1;
    } else if (viewMode === 'texts') {
      counts.all = mergedTexts.length;
      for (const t of mergedTexts) counts[t.page] = (counts[t.page] || 0) + 1;
    } else {
      counts.all = enrichedR2Objects.length;
      for (const p of pages) {
        counts[p.file] = enrichedR2Objects.filter(
          (o) => o.page === p.file || o.usedInPages.includes(p.title)
        ).length;
      }
    }
    return counts;
  }, [viewMode, mergedSlots, mergedSectionImages, mergedTexts, enrichedR2Objects, pages]);

  // --- Slot Image Editor Handlers (Pushes binary to R2 -> saves R2 CDN link in Firestore) ---
  const openSlotEditor = (slot: ImageSlot) => {
    setEditingSlot(slot);
    setSlotScope(slot.type === 'logo' ? 'global' : 'slot');
    setSlotAltText(slot.alt || '');
    setSlotExternalUrl(slot.src.startsWith('http') || slot.src.startsWith('/api/r2/file/') ? slot.src : '');
    setSlotSelectedR2Key(slot.r2Key || extractR2KeyFromUrl(slot.src) || '');
    setSlotUploadFile(null);
    setSlotPreviewUrl(null);
  };

  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlotUploadFile(file);
    setSlotExternalUrl('');
    setSlotPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setSlotSaving(true);
    try {
      let finalCdnUrl = slotExternalUrl.trim() || editingSlot.src;
      let finalR2Key =
        slotSelectedR2Key || editingSlot.r2Key || extractR2KeyFromUrl(finalCdnUrl);

      if (slotUploadFile) {
        // 1. Push binary file from device storage directly to Cloudflare R2 bucket
        const r2Uploaded = await uploadImageToR2Bucket(slotUploadFile, {
          replaceKey:
            editingSlot.r2Key && !editingSlot.r2Key.startsWith('media/')
              ? editingSlot.r2Key
              : undefined,
          alt: slotAltText || editingSlot.label,
          title: editingSlot.label,
          page: editingSlot.page,
        });
        finalCdnUrl = r2Uploaded.cdnUrl;
        finalR2Key = r2Uploaded.r2Key;
      }

      if (finalCdnUrl.startsWith('data:')) {
        throw new Error('Base64 data URLs are disabled. Please select a file to upload to R2 or provide a CDN URL.');
      }

      // 2. Sync slot CDN link with server CMS state
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-slot-meta',
          page: editingSlot.page,
          slotIndex: editingSlot.slotIndex,
          scope: slotScope,
          altText: slotAltText,
          externalUrl: finalCdnUrl,
          r2Key: finalR2Key,
          type: editingSlot.type,
          label: editingSlot.label,
          sectionContext: editingSlot.sectionContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update slot');

      // 3. Save ONLY the R2 CDN URL & metadata to Firebase Firestore
      if (auth.currentUser) {
        await saveSiteImageInFirestore({
          slotId: editingSlot.slotId,
          page: editingSlot.page,
          slotIndex: editingSlot.slotIndex,
          type: editingSlot.type,
          label: editingSlot.label,
          sectionContext: editingSlot.sectionContext,
          src: finalCdnUrl,
          lightboxHref: finalCdnUrl,
          r2Key: finalR2Key,
          alt: slotAltText,
        });
      }

      showNotice(
        `Uploaded to R2 bucket & linked "${editingSlot.label}" via Firebase CDN URL (${finalR2Key || finalCdnUrl}).`
      );
      setEditingSlot(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSlotSaving(false);
    }
  };

  const handleDeleteSingleSlot = async (slot: ImageSlot) => {
    setSlotSaving(true);
    try {
      const r2KeyToDelete = slot.r2Key || extractR2KeyFromUrl(slot.src);
      if (r2KeyToDelete) {
        await deleteImageFromR2Bucket(r2KeyToDelete);
      }

      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-slot',
          page: slot.page,
          slotIndex: slot.slotIndex,
          slotId: slot.slotId,
          r2Key: r2KeyToDelete,
        }),
      });
      if (!res.ok) throw new Error('Failed to delete slot image from R2');

      if (auth.currentUser) {
        await deleteSiteImageInFirestore(slot.slotId);
      }
      showNotice(
        `Deleted "${slot.label}" from Cloudflare R2 bucket and removed its CDN link from Firebase.`
      );
      setEditingSlot(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setSlotSaving(false);
    }
  };

  const handleResetSingleSlot = async (slot: ImageSlot) => {
    setSlotSaving(true);
    try {
      await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          target: 'slot',
          page: slot.page,
          slotIndex: slot.slotIndex,
        }),
      });
      if (auth.currentUser) {
        await deleteSiteImageInFirestore(slot.slotId);
      }
      showNotice(`Restored default R2 image for "${slot.label}".`);
      setEditingSlot(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Reset failed', 'error');
    } finally {
      setSlotSaving(false);
    }
  };

  // --- Section Wildlife Gallery Handlers (Pushes to R2 -> stores R2 CDN URL in Firebase Firestore) ---
  const openNewSectionImageModal = () => {
    const defaultPage = selectedPage === 'all' ? 'index.html' : selectedPage;
    setIsNewSectionImg(true);
    setSecImgUploadFile(null);
    setSecImgPreviewUrl(null);
    setEditingSectionImg({
      itemId: `sec_${defaultPage.replace('.html', '').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      page: defaultPage,
      sectionKey: 'custom_section_gallery',
      sectionTitle: 'Featured Safari Moments',
      title: '',
      caption: '',
      src: '',
      r2Key: undefined,
      alt: '',
      order: mergedSectionImages.length + 1,
    });
  };

  const openEditSectionImageModal = (item: SeedSectionGalleryItem) => {
    setIsNewSectionImg(false);
    setSecImgUploadFile(null);
    setSecImgPreviewUrl(null);
    setEditingSectionImg({ ...item });
  };

  const handleSecImgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSecImgUploadFile(file);
    setSecImgPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveSectionImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionImg) return;
    setSecImgSaving(true);
    try {
      let finalCdnUrl = editingSectionImg.src.trim();
      let finalR2Key =
        editingSectionImg.r2Key || extractR2KeyFromUrl(finalCdnUrl) || undefined;

      if (secImgUploadFile) {
        // Push image file from device storage directly to Cloudflare R2 bucket
        const uploaded = await uploadImageToR2Bucket(secImgUploadFile, {
          replaceKey:
            !isNewSectionImg &&
            editingSectionImg.r2Key &&
            !editingSectionImg.r2Key.startsWith('media/')
              ? editingSectionImg.r2Key
              : undefined,
          alt: editingSectionImg.alt.trim() || editingSectionImg.title.trim() || 'Safari photo',
          title: editingSectionImg.title.trim() || secImgUploadFile.name,
          page: editingSectionImg.page,
        });
        finalCdnUrl = uploaded.cdnUrl;
        finalR2Key = uploaded.r2Key;
      }

      if (!finalCdnUrl) {
        throw new Error('Please choose an image from device storage to push to R2 or enter an R2 CDN URL.');
      }
      if (finalCdnUrl.startsWith('data:')) {
        throw new Error('Base64 data URLs are not permitted. Upload the image file to Cloudflare R2 instead.');
      }

      const itemToSave: SeedSectionGalleryItem = {
        ...editingSectionImg,
        title: editingSectionImg.title.trim() || 'Safari Wildlife Photo',
        alt: editingSectionImg.alt.trim() || editingSectionImg.title.trim() || 'Safari photo',
        src: finalCdnUrl,
        r2Key: finalR2Key,
      };

      // Save R2 CDN link to server CMS state
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-section-image',
          ...itemToSave,
        }),
      });

      // Save ONLY R2 CDN URL & metadata to Firebase Firestore
      if (auth.currentUser) {
        await saveSectionGalleryItemInFirestore(itemToSave);
      }

      showNotice(
        `${isNewSectionImg ? 'Pushed new photo to R2 & added' : 'Updated R2 photo & synced'} "${
          itemToSave.title
        }" via Firebase CDN link.`
      );
      setEditingSectionImg(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save section image', 'error');
    } finally {
      setSecImgSaving(false);
    }
  };

  const handleDeleteSectionImage = async (item: SeedSectionGalleryItem) => {
    setSecImgSaving(true);
    try {
      const r2KeyToDelete = item.r2Key || extractR2KeyFromUrl(item.src);
      if (r2KeyToDelete && !r2KeyToDelete.startsWith('media/')) {
        await deleteImageFromR2Bucket(r2KeyToDelete);
      }

      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-section-image',
          itemId: item.itemId,
          r2Key: r2KeyToDelete,
        }),
      });
      if (auth.currentUser) {
        await deleteSectionGalleryItemInFirestore(item.itemId);
      }
      showNotice(`Deleted "${item.title}" from Cloudflare R2 bucket and Firebase Firestore.`);
      setEditingSectionImg(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete section image', 'error');
    } finally {
      setSecImgSaving(false);
    }
  };

  // --- Site Text Editor Handlers (Add, Edit, Delete through Firebase Firestore) ---
  const openEditTextModal = (slot: SiteTextSlot) => {
    setIsNewCustomText(false);
    setEditingText(slot);
    setTextDraftContent(slot.content);
    setTextDraftSection(slot.sectionContext);
    setTextDraftPage(slot.page);
    setTextDraftTag(slot.tagName);
  };

  const openNewCustomTextModal = () => {
    const defaultPage = selectedPage === 'all' ? 'index.html' : selectedPage;
    const pMeta = pages.find((p) => p.file === defaultPage);
    const newSlot: SiteTextSlot = {
      textId: `${defaultPage.replace(/[^a-zA-Z0-9_-]/g, '_')}__custom_${Date.now()}`,
      page: defaultPage,
      pageTitle: pMeta ? pMeta.title : defaultPage,
      textIndex: -1,
      tagName: 'CUSTOM',
      sectionContext: 'Featured Safari Section',
      content: '',
      defaultContent: '',
      isDeleted: false,
      isCustomAdded: true,
      isModified: true,
    };
    setIsNewCustomText(true);
    setEditingText(newSlot);
    setTextDraftContent('');
    setTextDraftSection('Featured Safari Section');
    setTextDraftPage(defaultPage);
    setTextDraftTag('CUSTOM');
  };

  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingText) return;
    setTextSaving(true);
    try {
      const payload = {
        textId: editingText.textId,
        page: isNewCustomText ? textDraftPage : editingText.page,
        textIndex: editingText.textIndex,
        tagName: isNewCustomText ? textDraftTag : editingText.tagName,
        sectionContext: textDraftSection.trim() || editingText.sectionContext,
        content: textDraftContent,
        isDeleted: false,
        isCustomAdded: editingText.isCustomAdded,
      };

      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-text',
          ...payload,
        }),
      });
      if (!res.ok) throw new Error('Failed to save text');

      if (auth.currentUser) {
        await saveSiteTextInFirestore(payload);
      }

      showNotice(
        `${isNewCustomText ? 'Added new text block' : 'Updated text'} on ${payload.page} via Firebase.`
      );
      setEditingText(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save text', 'error');
    } finally {
      setTextSaving(false);
    }
  };

  const handleDeleteOrRestoreText = async (slot: SiteTextSlot, restoreDefault = false) => {
    setTextSaving(true);
    try {
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-text',
          textId: slot.textId,
          page: slot.page,
          textIndex: slot.textIndex,
          tagName: slot.tagName,
          sectionContext: slot.sectionContext,
          content: slot.content,
          restoreDefault,
        }),
      });

      if (auth.currentUser) {
        if (restoreDefault || slot.isCustomAdded) {
          await deleteSiteTextInFirestore(slot.textId);
        } else {
          await saveSiteTextInFirestore({
            textId: slot.textId,
            page: slot.page,
            textIndex: slot.textIndex,
            tagName: slot.tagName,
            sectionContext: slot.sectionContext,
            content: slot.content,
            isDeleted: true,
            isCustomAdded: false,
          });
        }
      }

      showNotice(
        restoreDefault
          ? 'Restored original default text.'
          : slot.isCustomAdded
          ? 'Deleted custom text block from Firebase.'
          : 'Deleted/hidden text element on live page via Firebase.'
      );
      setEditingText(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Text operation failed', 'error');
    } finally {
      setTextSaving(false);
    }
  };

  // --- Direct Cloudflare R2 Bucket Manager Handlers (Add, Replace, Edit, Delete) ---
  const openNewR2UploadModal = () => {
    const defaultPage = selectedPage === 'all' ? 'index.html' : selectedPage;
    setIsNewR2Upload(true);
    setEditingR2Obj({
      r2Key: '',
      filename: '',
      cdnUrl: '',
      mimeType: 'image/jpeg',
      sizeBytes: 0,
      alt: '',
      title: '',
      page: defaultPage,
      updatedAt: new Date().toISOString(),
      bucketName,
    });
    setR2DraftKey('');
    setR2DraftTitle('');
    setR2DraftAlt('');
    setR2DraftPage(defaultPage);
    setR2UploadFile(null);
    setR2PreviewUrl(null);
    setR2AssignSectionGallery(false);
    setR2AssignSlotId('');
  };

  const openEditR2ObjectModal = (obj: R2BucketObject) => {
    setIsNewR2Upload(false);
    setEditingR2Obj(obj);
    setR2DraftKey(obj.r2Key);
    setR2DraftTitle(obj.title || obj.filename);
    setR2DraftAlt(obj.alt || '');
    setR2DraftPage(obj.page || (selectedPage === 'all' ? 'index.html' : selectedPage));
    setR2UploadFile(null);
    setR2PreviewUrl(null);
    setR2AssignSectionGallery(false);
  };

  const handleR2FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setR2UploadFile(file);
    setR2PreviewUrl(URL.createObjectURL(file));
    if (!r2DraftTitle) {
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setR2DraftTitle(cleanName);
    }
    if (!r2DraftAlt) {
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      setR2DraftAlt(cleanName);
    }
  };

  const handleSaveR2Object = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingR2Obj) return;
    setR2Saving(true);
    try {
      let finalR2Key = editingR2Obj.r2Key;
      let finalCdnUrl = editingR2Obj.cdnUrl;

      if (isNewR2Upload) {
        if (!r2UploadFile) {
          throw new Error('Please choose an image file from your device to upload to Cloudflare R2.');
        }
        const uploaded = await uploadImageToR2Bucket(r2UploadFile, {
          customKey: r2DraftKey.trim() || undefined,
          alt: r2DraftAlt.trim() || r2DraftTitle.trim() || r2UploadFile.name,
          title: r2DraftTitle.trim() || r2UploadFile.name,
          page: r2DraftPage,
        });
        finalR2Key = uploaded.r2Key;
        finalCdnUrl = uploaded.cdnUrl;

        // If a target Page Image Slot was chosen, link this newly uploaded R2 image directly to that slot
        if (r2AssignSlotId) {
          const targetSlot = mergedSlots.find((s) => s.slotId === r2AssignSlotId);
          if (targetSlot) {
            await fetch('/api/admin/images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update-slot-meta',
                page: targetSlot.page,
                slotIndex: targetSlot.slotIndex,
                scope: targetSlot.type === 'logo' ? 'global' : 'slot',
                altText: r2DraftAlt.trim() || targetSlot.alt || targetSlot.label,
                externalUrl: finalCdnUrl,
                r2Key: finalR2Key,
                type: targetSlot.type,
                label: r2DraftTitle.trim() || targetSlot.label,
                sectionContext: targetSlot.sectionContext,
              }),
            });
            if (auth.currentUser) {
              await saveSiteImageInFirestore({
                slotId: targetSlot.slotId,
                page: targetSlot.page,
                slotIndex: targetSlot.slotIndex,
                type: targetSlot.type,
                label: r2DraftTitle.trim() || targetSlot.label,
                sectionContext: targetSlot.sectionContext,
                src: finalCdnUrl,
                lightboxHref: finalCdnUrl,
                r2Key: finalR2Key,
                alt: r2DraftAlt.trim() || targetSlot.alt || targetSlot.label,
              });
            }
          }
        }

        // If checked, also add this R2 image directly to the page's Section Wildlife Gallery in Firebase via its R2 CDN link
        if (r2AssignSectionGallery) {
          const newSecItem: SeedSectionGalleryItem = {
            itemId: `sec_r2_${Date.now()}`,
            page: r2DraftPage,
            sectionKey: 'r2_section_gallery',
            sectionTitle: 'Featured Safari Moments',
            title: r2DraftTitle.trim() || 'Safari Wildlife Photo',
            caption: r2DraftAlt.trim() || '',
            src: finalCdnUrl,
            r2Key: finalR2Key,
            alt: r2DraftAlt.trim() || r2DraftTitle.trim() || 'Safari photo',
            order: mergedSectionImages.length + 1,
          };
          await fetch('/api/admin/cms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save-section-image',
              ...newSecItem,
            }),
          });
          if (auth.currentUser) {
            await saveSectionGalleryItemInFirestore(newSecItem);
          }
        }

        showNotice(
          `Pushed "${r2UploadFile.name}" directly to Cloudflare R2 bucket (${finalR2Key}).`
        );
      } else {
        // Updating existing R2 object (either replacing binary file or updating metadata/key)
        if (r2UploadFile) {
          if (editingR2Obj.r2Key.startsWith('media/')) {
            const fd = new FormData();
            fd.append('mode', 'replace-media');
            fd.append('assetFilename', editingR2Obj.filename);
            fd.append('file', r2UploadFile);
            const res = await fetch('/api/admin/images', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to replace R2 media object');
            finalR2Key = data.r2Key || editingR2Obj.r2Key;
            finalCdnUrl = data.cdnUrl || editingR2Obj.cdnUrl;
          } else {
            const uploaded = await uploadImageToR2Bucket(r2UploadFile, {
              customKey: r2DraftKey.trim() || editingR2Obj.r2Key,
              replaceKey: editingR2Obj.r2Key,
              alt: r2DraftAlt.trim(),
              title: r2DraftTitle.trim(),
              page: r2DraftPage,
            });
            finalR2Key = uploaded.r2Key;
            finalCdnUrl = uploaded.cdnUrl;
          }
        } else {
          const updatedMeta = await updateR2BucketObjectMeta({
            r2Key: editingR2Obj.r2Key,
            newKey:
              r2DraftKey.trim() && r2DraftKey.trim() !== editingR2Obj.r2Key
                ? r2DraftKey.trim()
                : undefined,
            alt: r2DraftAlt.trim(),
            title: r2DraftTitle.trim(),
            page: r2DraftPage,
          });
          finalR2Key = updatedMeta.r2Key;
          finalCdnUrl = updatedMeta.cdnUrl;
        }

        // Propagate updated R2 CDN URL & alt/title to any linked Firestore records
        if (auth.currentUser) {
          const linkedSlots = mergedSlots.filter(
            (s) => s.r2Key === editingR2Obj.r2Key || s.src === editingR2Obj.cdnUrl
          );
          for (const ls of linkedSlots) {
            await saveSiteImageInFirestore({
              slotId: ls.slotId,
              page: ls.page,
              slotIndex: ls.slotIndex,
              type: ls.type,
              label: r2DraftTitle.trim() || ls.label,
              sectionContext: ls.sectionContext,
              src: finalCdnUrl,
              lightboxHref: finalCdnUrl,
              r2Key: finalR2Key,
              alt: r2DraftAlt.trim() || ls.alt,
            });
          }

          const linkedSections = mergedSectionImages.filter(
            (sec) => sec.r2Key === editingR2Obj.r2Key || sec.src === editingR2Obj.cdnUrl
          );
          for (const lsec of linkedSections) {
            await saveSectionGalleryItemInFirestore({
              ...lsec,
              title: r2DraftTitle.trim() || lsec.title,
              alt: r2DraftAlt.trim() || lsec.alt,
              src: finalCdnUrl,
              r2Key: finalR2Key,
            });
          }
        }

        showNotice(`Updated R2 bucket object "${finalR2Key}" & synced Firebase CDN links.`);
      }

      setEditingR2Obj(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'R2 bucket operation failed', 'error');
    } finally {
      setR2Saving(false);
    }
  };

  const handleDeleteR2Object = async (obj: R2BucketObject) => {
    setR2Saving(true);
    try {
      await deleteImageFromR2Bucket(obj.r2Key);

      // Also clean up any section gallery item or slot override referencing this deleted R2 object
      const linkedSections = mergedSectionImages.filter(
        (sec) => sec.r2Key === obj.r2Key || sec.src === obj.cdnUrl
      );
      for (const sec of linkedSections) {
        await fetch('/api/admin/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete-section-image',
            itemId: sec.itemId,
          }),
        });
        if (auth.currentUser) {
          await deleteSectionGalleryItemInFirestore(sec.itemId);
        }
      }

      const linkedSlots = mergedSlots.filter(
        (s) => s.r2Key === obj.r2Key || s.src === obj.cdnUrl || s.src.startsWith(`${obj.cdnUrl}?`)
      );
      for (const s of linkedSlots) {
        await fetch('/api/admin/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete-slot',
            page: s.page,
            slotIndex: s.slotIndex,
            slotId: s.slotId,
            r2Key: obj.r2Key,
          }),
        });
        if (auth.currentUser) {
          await deleteSiteImageInFirestore(s.slotId);
        }
      }

      showNotice(`Deleted "${obj.r2Key}" from Cloudflare R2 bucket and cleaned up Firebase links.`);
      setEditingR2Obj(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete from R2 bucket', 'error');
    } finally {
      setR2Saving(false);
    }
  };

  const copyCdnLink = async (cdnUrl: string) => {
    try {
      const fullUrl =
        cdnUrl.startsWith('http://') || cdnUrl.startsWith('https://')
          ? cdnUrl
          : `${window.location.origin}${cdnUrl.startsWith('/') ? '' : '/'}${cdnUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      showNotice(`Copied R2 CDN link: ${fullUrl}`);
    } catch {
      showNotice(`R2 CDN URL: ${cdnUrl}`);
    }
  };

  const executeConfirmedReset = async () => {
    if (!confirmResetModal) return;
    try {
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          confirmResetModal.scope === 'all'
            ? { action: 'reset', target: 'all' }
            : { action: 'reset', target: 'page', page: confirmResetModal.page }
        ),
      });
      if (!res.ok) throw new Error('Reset failed');

      if (confirmResetModal.scope === 'all') {
        await fetch('/api/admin/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'seed-defaults' }),
        });
        if (auth.currentUser) {
          await Promise.all(
            INITIAL_FIREBASE_SECTION_IMAGES.map((item) => saveSectionGalleryItemInFirestore(item))
          );
          const chunkSize = 25;
          for (let i = 0; i < INITIAL_FIREBASE_SLOT_UPGRADES.length; i += chunkSize) {
            const batch = INITIAL_FIREBASE_SLOT_UPGRADES.slice(i, i + chunkSize);
            await Promise.all(batch.map((slot) => saveSiteImageInFirestore(slot)));
          }
        }
      }

      showNotice(
        confirmResetModal.scope === 'all'
          ? 'All 12 pages restored to default Cloudflare R2 CDN links.'
          : `Restored ${confirmResetModal.title} to default R2 images.`
      );
      setConfirmResetModal(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Reset failed', 'error');
    }
  };

  const resolveImageUrl = (src: string) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    if (src.includes('.') && !src.startsWith('/')) {
      return `https://${src}`;
    }
    const normalized = src.startsWith('/') ? src : `/${src}`;
    const sep = normalized.includes('?') ? '&' : '?';
    return `${normalized}${sep}v=${cacheBuster}`;
  };

  const currentPageObj = pages.find((p) => p.file === selectedPage);

  return (
    <div className="min-h-screen bg-[#0B0F0D] text-[#F1F5F2] flex flex-col md:flex-row font-sans selection:bg-[#E59819]/30 selection:text-[#FBBF24]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 bg-[#111714] border-b md:border-b-0 md:border-r border-[#1F2923] flex flex-col justify-between">
        <div className="p-4 md:p-5 space-y-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-[#E59819]">
                Nisha Safari Tours
              </div>
              <h1 className="text-base font-semibold text-[#F1F5F2] tracking-tight mt-0.5">
                R2 + Firebase Studio
              </h1>
            </div>
            <a
              href={`/${selectedPage === 'all' ? 'index.html' : selectedPage}?editImages=1`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2] bg-[#18211C] hover:bg-[#202C25] border border-[#26332B] px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0"
              title="Open live page with visual click-to-edit overlays"
            >
              <span>Live Edit</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Cloudflare R2 + Firebase Admin Status Box */}
          <div className="p-3 rounded-md bg-[#151D19] border border-[#233029] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#D5E0D9] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#E59819]" />
                <span>Cloudflare R2 + Firebase</span>
              </span>
              <span className="text-[11px] font-mono text-[#86EFAC]">Active</span>
            </div>
            <div className="text-[11px] font-mono text-[#9CA9A1] truncate" title={bucketName}>
              Bucket: <span className="text-[#E59819]">{bucketName}</span>
            </div>
            <div className="text-[10px] text-[#86EFAC]/90 leading-snug">
              All image files stored in R2. Firestore stores only R2 CDN links.
            </div>
            {currentUser ? (
              <div className="space-y-2 pt-1 border-t border-[#222F28]">
                <div className="text-[11px] text-[#9CA9A1] truncate" title={currentUser.email || ''}>
                  Admin: <span className="text-[#F1F5F2]">{currentUser.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSeedSectionImagesToFirestore(false)}
                    disabled={syncingSeed}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#1F2D25] hover:bg-[#283A30] text-[#E59819] border border-[#2F4438] transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingSeed ? 'animate-spin' : ''}`} />
                    <span>{syncingSeed ? 'Syncing...' : 'Sync CDN Links'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="p-1 rounded bg-[#1A231E] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#26332B]"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google Admin</span>
              </button>
            )}
          </div>

          {/* Primary Mode Switcher (4 Tabs) */}
          <div className="space-y-1">
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-[#68756D] mb-1">
              CMS & R2 Workspaces
            </div>
            <button
              type="button"
              onClick={() => setViewMode('slots')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'slots'
                  ? 'bg-[#1A2620] text-[#F1F5F2] border-l-2 border-[#E59819]'
                  : 'text-[#9CA9A1] hover:text-[#F1F5F2] hover:bg-[#161E1A]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#E59819]" />
                <span>Page Image Slots</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#68756D]">
                {mergedSlots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('section-images')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'section-images'
                  ? 'bg-[#1A2620] text-[#F1F5F2] border-l-2 border-[#E59819]'
                  : 'text-[#9CA9A1] hover:text-[#F1F5F2] hover:bg-[#161E1A]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-[#E59819]" />
                <span>Section Wildlife Photos</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#68756D]">
                {mergedSectionImages.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('texts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'texts'
                  ? 'bg-[#1A2620] text-[#F1F5F2] border-l-2 border-[#E59819]'
                  : 'text-[#9CA9A1] hover:text-[#F1F5F2] hover:bg-[#161E1A]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#E59819]" />
                <span>Site Text Editor</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#68756D]">
                {mergedTexts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('library')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'library'
                  ? 'bg-[#1A2620] text-[#F1F5F2] border-l-2 border-[#E59819]'
                  : 'text-[#9CA9A1] hover:text-[#F1F5F2] hover:bg-[#161E1A]'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#E59819]" />
                <span>R2 Storage Bucket</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#68756D]">
                {enrichedR2Objects.length}
              </span>
            </button>
          </div>

          {/* Page Filter Navigation */}
          <div className="space-y-1">
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-[#68756D] mb-1">
              Filter by Page (12)
            </div>
            <div className="max-h-[260px] md:max-h-[calc(100vh-470px)] overflow-y-auto space-y-0.5 pr-1">
              <button
                type="button"
                onClick={() => setSelectedPage('all')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedPage === 'all'
                    ? 'bg-[#1E2B24] text-[#F1F5F2]'
                    : 'text-[#9CA9A1] hover:text-[#F1F5F2] hover:bg-[#151D19]'
                }`}
              >
                <span className="truncate">All Website Pages</span>
                <span className="font-mono tabular-nums text-[11px] text-[#68756D] ml-2">
                  {pageCounts.all || 0}
                </span>
              </button>
              {pages.map((p) => (
                <button
                  key={p.file}
                  type="button"
                  onClick={() => setSelectedPage(p.file)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedPage === p.file
                      ? 'bg-[#1E2B24] text-[#F1F5F2]'
                      : 'text-[#9CA9A1] hover:text-[#F1F5F2] hover:bg-[#151D19]'
                  }`}
                >
                  <span className="truncate">{p.title}</span>
                  <span className="font-mono tabular-nums text-[11px] text-[#68756D] ml-2">
                    {pageCounts[p.file] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-[#1F2923] space-y-2 bg-[#0E1411]">
          <a
            href={`/${selectedPage === 'all' ? 'index.html' : selectedPage}`}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-[#18221D] hover:bg-[#1F2C26] text-[#D5E0D9] border border-[#26352D] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Live Website</span>
          </a>
          <button
            type="button"
            onClick={() =>
              setConfirmResetModal({
                open: true,
                scope: 'all',
                title: 'All Website Images',
              })
            }
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-[#F87171] hover:bg-[#2A1616] border border-transparent hover:border-[#4C2222] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Factory Defaults</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header */}
        <header className="h-auto min-h-16 px-6 py-3 bg-[#111714] border-b border-[#1F2923] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#68756D]">R2 + Firebase CMS</span>
            <span className="text-[#3B4740]">/</span>
            <span className="font-medium text-[#F1F5F2]">
              {viewMode === 'slots'
                ? 'Page Image Slots (R2 CDN)'
                : viewMode === 'section-images'
                ? 'Section Wildlife Galleries (R2 CDN)'
                : viewMode === 'texts'
                ? 'Site Text Editor'
                : `Cloudflare R2 Bucket (${bucketName})`}
            </span>
            <span className="text-[#3B4740]">/</span>
            <span className="text-[#E59819] font-medium">
              {selectedPage === 'all' ? 'All 12 Pages' : currentPageObj?.title || selectedPage}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64 sm:w-72">
              <Search className="w-4 h-4 text-[#68756D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  viewMode === 'texts'
                    ? 'Search any heading, paragraph, button...'
                    : viewMode === 'section-images'
                    ? 'Search section photos, R2 keys...'
                    : viewMode === 'library'
                    ? 'Search R2 key, filename, CDN link...'
                    : 'Search section, alt text, R2 key...'
                }
                className="w-full bg-[#0B0F0D] border border-[#243029] focus:border-[#E59819] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#F1F5F2] placeholder-[#68756D] focus:outline-none transition-colors"
              />
            </div>

            {viewMode === 'section-images' && (
              <button
                type="button"
                onClick={openNewSectionImageModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section Image (R2)</span>
              </button>
            )}

            {viewMode !== 'texts' && (
              <button
                type="button"
                onClick={openNewR2UploadModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#182820] hover:bg-[#22382D] text-[#86EFAC] border border-[#2B4739] transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image to R2 Bucket</span>
              </button>
            )}

            {viewMode === 'texts' && (
              <button
                type="button"
                onClick={openNewCustomTextModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Text Block</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1A241E] hover:bg-[#222F28] text-[#D5E0D9] border border-[#2A3830] transition-colors whitespace-nowrap shrink-0"
              title="Refresh R2 & Firebase inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Sub-Toolbar: Context Filters & Counts */}
        <div className="px-6 py-3 bg-[#0E1411] border-b border-[#1A231E] flex flex-wrap items-center justify-between gap-4">
          {viewMode === 'slots' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Types' },
                  { id: 'hero-bg', label: 'Hero Banners' },
                  { id: 'img', label: 'Content Photos' },
                  { id: 'lightbox-img', label: 'Gallery + Lightbox' },
                  { id: 'logo', label: 'Logos' },
                ] as { id: SlotTypeFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selectedType === tab.id
                      ? 'bg-[#E59819] text-[#0B0F0D] font-semibold'
                      : 'bg-[#151D19] text-[#9CA9A1] hover:text-[#F1F5F2] border border-[#222E27]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : viewMode === 'texts' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Text Elements' },
                  { id: 'headings', label: 'Headings (H1–H4)' },
                  { id: 'paragraphs', label: 'Paragraphs & Quotes' },
                  { id: 'buttons', label: 'Buttons & Links' },
                  { id: 'lists', label: 'Bullet Items' },
                  { id: 'custom', label: 'Added Text Blocks' },
                ] as { id: TextTypeFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTextType(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selectedTextType === tab.id
                      ? 'bg-[#E59819] text-[#0B0F0D] font-semibold'
                      : 'bg-[#151D19] text-[#9CA9A1] hover:text-[#F1F5F2] border border-[#222E27]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : viewMode === 'section-images' ? (
            <div className="text-xs text-[#9CA9A1]">
              Uploaded section photos are pushed directly to the Cloudflare R2 bucket and accessed through Firebase Firestore via R2 CDN links.
            </div>
          ) : (
            <div className="text-xs text-[#9CA9A1]">
              Direct Cloudflare R2 Bucket Manager ({bucketName}): Add new images from device storage, replace/edit existing R2 objects, copy CDN links, or delete from R2.
            </div>
          )}

          <div className="text-xs text-[#9CA9A1] font-mono tabular-nums">
            {viewMode === 'slots'
              ? `Showing ${filteredSlots.length} of ${mergedSlots.length} image slots`
              : viewMode === 'section-images'
              ? `Showing ${filteredSectionImages.length} of ${mergedSectionImages.length} section photos`
              : viewMode === 'texts'
              ? `Showing ${filteredTexts.length} of ${mergedTexts.length} text elements`
              : `Showing ${filteredR2Objects.length} of ${enrichedR2Objects.length} R2 bucket objects`}
          </div>
        </div>

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-md border flex items-center justify-between text-xs font-medium ${
              toast.type === 'error'
                ? 'bg-[#2A1414] border-[#5C2424] text-[#FCA5A5]'
                : 'bg-[#13261C] border-[#234734] text-[#86EFAC]'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-current opacity-75 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Workspace Grid */}
        <main className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-[#121915] border border-[#1F2923] rounded-lg overflow-hidden animate-pulse"
                >
                  <div className="h-44 bg-[#18221D]" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-3.5 bg-[#1C2721] rounded w-2/3" />
                    <div className="h-3 bg-[#18221D] rounded w-1/2" />
                    <div className="h-8 bg-[#1C2721] rounded w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'slots' ? (
            filteredSlots.length === 0 ? (
              <div className="bg-[#121915] border border-[#1F2923] rounded-lg p-12 text-center max-w-md mx-auto my-8">
                <ImageIcon className="w-8 h-8 text-[#68756D] mx-auto mb-3" />
                <h2 className="text-sm font-semibold text-[#F1F5F2]">No matching image slots</h2>
                <p className="text-xs text-[#9CA9A1] mt-1">
                  Try clearing your search filter or switching to All Website Pages.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredSlots.map((slot) => (
                  <article
                    key={slot.id}
                    className="bg-[#121915] border border-[#1F2923] hover:border-[#314238] rounded-lg overflow-hidden flex flex-col justify-between transition-colors group"
                  >
                    <div>
                      <div
                        onClick={() => openSlotEditor(slot)}
                        className="relative h-44 bg-[#090D0B] border-b border-[#1A231E] overflow-hidden cursor-pointer flex items-center justify-center"
                      >
                        {slot.isDeleted || !slot.src ? (
                          <div className="flex flex-col items-center justify-center text-center p-4 space-y-1.5">
                            <Trash2 className="w-6 h-6 text-[#F87171]" />
                            <span className="text-xs font-semibold text-[#FCA5A5]">
                              Deleted from R2 Bucket
                            </span>
                            <span className="text-[11px] text-[#9CA9A1]">
                              Click to upload a new image from device to R2
                            </span>
                          </div>
                        ) : (
                          <img
                            src={resolveImageUrl(slot.src)}
                            alt={slot.alt || slot.label}
                            className={`w-full h-full transition-transform duration-200 group-hover:scale-[1.02] ${
                              slot.type === 'logo' ? 'object-contain p-6' : 'object-cover'
                            }`}
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 bg-[#E59819] text-[#0B0F0D] font-semibold text-xs px-3 py-1.5 rounded-md shadow-md">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{slot.isDeleted ? 'Upload New to R2' : 'Upload to R2 & Link'}</span>
                          </span>
                        </div>
                        <div className="absolute top-2.5 left-2.5 bg-[#0B0F0D]/85 backdrop-blur-xs border border-[#26332B] px-2 py-0.5 rounded text-[11px] font-mono tabular-nums text-[#D5E0D9]">
                          #{slot.slotIndex + 1} · {getSlotTypeLabel(slot.type)}
                        </div>
                        {slot.isDeleted ? (
                          <div className="absolute bottom-2 left-2 bg-[#2A1616]/90 border border-[#5C2424] px-2 py-0.5 rounded text-[10px] font-mono text-[#FCA5A5]">
                            Deleted from R2
                          </div>
                        ) : (
                          slot.r2Key && (
                            <div className="absolute bottom-2 left-2 bg-[#13261C]/90 border border-[#234734] px-2 py-0.5 rounded text-[10px] font-mono text-[#86EFAC] truncate max-w-[90%]">
                              R2: {slot.r2Key}
                            </div>
                          )
                        )}
                      </div>

                      <div className="p-4 space-y-1.5">
                        <div className="text-[11px] text-[#9CA9A1] flex items-center gap-1.5 truncate">
                          <span className="font-medium text-[#E59819]">{slot.pageTitle}</span>
                          <span>·</span>
                          <span className="truncate" title={slot.sectionContext}>
                            {slot.sectionContext}
                          </span>
                        </div>

                        <h3
                          className="text-sm font-medium text-[#F1F5F2] truncate"
                          title={slot.label}
                        >
                          {slot.label}
                        </h3>

                        <div
                          className="text-xs font-mono text-[#68756D] truncate"
                          title={slot.src || 'Deleted from R2'}
                        >
                          {slot.isDeleted ? 'Deleted (Hidden on Live Page)' : slot.src}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openSlotEditor(slot)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1B2620] hover:bg-[#E59819] text-[#F1F5F2] hover:text-[#0B0F0D] border border-[#2A3A31] hover:border-[#E59819] font-medium text-xs py-2 px-3 rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{slot.isDeleted ? 'Add Image to R2' : 'Update via R2'}</span>
                      </button>
                      {(slot.isModified || slot.isDeleted) && (
                        <button
                          type="button"
                          onClick={() => handleResetSingleSlot(slot)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#222F28] text-[#9CA9A1] hover:text-[#F1F5F2] border border-[#24322A] transition-colors"
                          title="Restore default R2 image"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!slot.isDeleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleSlot(slot)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#24322A] transition-colors"
                          title="Delete image from R2 bucket & hide on page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : viewMode === 'section-images' ? (
            /* Section Wildlife Galleries View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredSectionImages.map((item) => {
                  const pMeta = pages.find((p) => p.file === item.page);
                  return (
                    <article
                      key={item.itemId}
                      className="bg-[#121915] border border-[#1F2923] hover:border-[#314238] rounded-lg overflow-hidden flex flex-col justify-between transition-colors group"
                    >
                      <div>
                        <div
                          onClick={() => openEditSectionImageModal(item)}
                          className="relative h-44 bg-[#090D0B] border-b border-[#1A231E] overflow-hidden cursor-pointer flex items-center justify-center"
                        >
                          <img
                            src={resolveImageUrl(item.src)}
                            alt={item.alt}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 bg-[#E59819] text-[#0B0F0D] font-semibold text-xs px-3 py-1.5 rounded-md shadow-md">
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit / Replace in R2</span>
                            </span>
                          </div>
                          <div className="absolute top-2.5 left-2.5 bg-[#0B0F0D]/85 backdrop-blur-xs border border-[#26332B] px-2 py-0.5 rounded text-[11px] font-mono text-[#E59819]">
                            {pMeta ? pMeta.title : item.page}
                          </div>
                          {item.r2Key && (
                            <div className="absolute bottom-2 left-2 bg-[#13261C]/90 border border-[#234734] px-2 py-0.5 rounded text-[10px] font-mono text-[#86EFAC] truncate max-w-[90%]">
                              R2: {item.r2Key}
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-1.5">
                          <div className="text-[11px] font-medium text-[#E59819] truncate">
                            Section: {item.sectionTitle}
                          </div>
                          <h3 className="text-sm font-semibold text-[#F1F5F2] truncate" title={item.title}>
                            {item.title}
                          </h3>
                          <p className="text-xs text-[#9CA9A1] line-clamp-2 leading-relaxed">
                            {item.caption}
                          </p>
                          <div className="text-[11px] font-mono text-[#68756D] truncate" title={item.src}>
                            CDN: {item.src}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditSectionImageModal(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1B2620] hover:bg-[#E59819] text-[#F1F5F2] hover:text-[#0B0F0D] border border-[#2A3A31] hover:border-[#E59819] font-medium text-xs py-2 px-3 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit / R2 Upload</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSectionImage(item)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#24322A] transition-colors"
                          title="Delete section photo from R2 & Firebase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'texts' ? (
            /* Site Text Editor View */
            <div className="space-y-3">
              {filteredTexts.length === 0 ? (
                <div className="bg-[#121915] border border-[#1F2923] rounded-lg p-12 text-center max-w-md mx-auto my-8">
                  <Type className="w-8 h-8 text-[#68756D] mx-auto mb-3" />
                  <h2 className="text-sm font-semibold text-[#F1F5F2]">No matching text elements</h2>
                  <p className="text-xs text-[#9CA9A1] mt-1">
                    Try clearing your search query or selecting All Text Elements.
                  </p>
                </div>
              ) : (
                <div className="bg-[#121915] border border-[#1F2923] rounded-lg divide-y divide-[#1F2923]">
                  {filteredTexts.map((t) => (
                    <div
                      key={t.textId}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#151E19] transition-colors ${
                        t.isDeleted ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#E59819]">{t.pageTitle}</span>
                          <span className="text-[#3B4740]">·</span>
                          <span className="font-mono text-[11px] text-[#9CA9A1] bg-[#18221D] px-1.5 py-0.5 rounded border border-[#26352D]">
                            {t.isCustomAdded ? 'ADDED BLOCK' : t.tagName}
                          </span>
                          <span className="text-[#3B4740]">·</span>
                          <span className="text-[#9CA9A1] truncate">{t.sectionContext}</span>
                          {t.isDeleted && (
                            <span className="text-[#F87171] font-medium">· Deleted / Hidden</span>
                          )}
                          {!t.isDeleted && t.isModified && (
                            <span className="text-[#86EFAC] font-medium">· Edited via Firebase</span>
                          )}
                        </div>
                        <p className="text-sm text-[#F1F5F2] leading-relaxed break-words">
                          {t.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditTextModal(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1B2620] hover:bg-[#E59819] text-[#F1F5F2] hover:text-[#0B0F0D] border border-[#2A3A31] hover:border-[#E59819] transition-colors whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Text</span>
                        </button>
                        {t.isModified && !t.isCustomAdded && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrRestoreText(t, true)}
                            className="p-1.5 rounded-md bg-[#161F1A] hover:bg-[#222F28] text-[#9CA9A1] hover:text-[#F1F5F2] border border-[#24322A]"
                            title="Restore default text"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!t.isDeleted && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOrRestoreText(t, false)}
                            className="p-1.5 rounded-md bg-[#161F1A] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#24322A]"
                            title={
                              t.isCustomAdded
                                ? 'Delete added text block'
                                : 'Delete / hide this text on page'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Cloudflare R2 Storage Bucket Manager Grid */
            <div className="space-y-4">
              {filteredR2Objects.length === 0 ? (
                <div className="bg-[#121915] border border-[#1F2923] rounded-lg p-12 text-center max-w-md mx-auto my-8 space-y-3">
                  <FolderOpen className="w-8 h-8 text-[#E59819] mx-auto" />
                  <h2 className="text-sm font-semibold text-[#F1F5F2]">No matching R2 bucket objects</h2>
                  <p className="text-xs text-[#9CA9A1]">
                    Upload an image from your device to push it directly to the Cloudflare R2 bucket.
                  </p>
                  <button
                    type="button"
                    onClick={openNewR2UploadModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image to R2 Bucket</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredR2Objects.map((obj) => (
                    <article
                      key={obj.r2Key}
                      className="bg-[#121915] border border-[#1F2923] hover:border-[#314238] rounded-lg overflow-hidden flex flex-col justify-between transition-colors group"
                    >
                      <div>
                        <div
                          onClick={() => openEditR2ObjectModal(obj)}
                          className="relative h-44 bg-[#090D0B] border-b border-[#1A231E] overflow-hidden cursor-pointer flex items-center justify-center"
                        >
                          <img
                            src={resolveImageUrl(obj.cdnUrl)}
                            alt={obj.alt || obj.filename}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 bg-[#E59819] text-[#0B0F0D] font-semibold text-xs px-3 py-1.5 rounded-md shadow-md">
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit / Replace in R2</span>
                            </span>
                          </div>
                          <div className="absolute top-2.5 left-2.5 bg-[#0B0F0D]/85 backdrop-blur-xs border border-[#26332B] px-2 py-0.5 rounded text-[10px] font-mono text-[#86EFAC] truncate max-w-[85%]">
                            R2: {obj.r2Key}
                          </div>
                        </div>

                        <div className="p-4 space-y-1.5">
                          <h3
                            className="text-sm font-medium text-[#F1F5F2] truncate"
                            title={obj.title || obj.filename}
                          >
                            {obj.title || obj.filename}
                          </h3>

                          <div className="text-xs text-[#9CA9A1] font-mono tabular-nums">
                            {obj.mimeType.replace('image/', '').toUpperCase()} ·{' '}
                            {formatBytes(obj.sizeBytes)} · Used {obj.usageCount}x
                          </div>

                          <div
                            className="text-[11px] font-mono text-[#E59819] truncate"
                            title={obj.cdnUrl}
                          >
                            CDN: {obj.cdnUrl}
                          </div>

                          <div className="text-[11px] text-[#68756D] truncate">
                            Pages:{' '}
                            {obj.usedInPages.length > 0
                              ? obj.usedInPages.join(', ')
                              : obj.page || 'R2 Bucket Object'}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditR2ObjectModal(obj)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1B2620] hover:bg-[#E59819] text-[#F1F5F2] hover:text-[#0B0F0D] border border-[#2A3A31] hover:border-[#E59819] font-medium text-xs py-2 px-2.5 rounded-md transition-colors whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit / Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyCdnLink(obj.cdnUrl)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#222F28] text-[#9CA9A1] hover:text-[#F1F5F2] border border-[#24322A] transition-colors"
                          title="Copy R2 CDN URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteR2Object(obj)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#24322A] transition-colors"
                          title="Delete object from R2 bucket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal 1: Edit Page Slot Image (Pushes to R2 -> saves R2 CDN link in Firebase Firestore) */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#161F1A] border-b border-[#222F28] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E59819] font-medium">
                  {editingSlot.pageTitle} · Slot #{editingSlot.slotIndex + 1} (
                  {getSlotTypeLabel(editingSlot.type)})
                </div>
                <h2 className="text-base font-semibold text-[#F1F5F2] mt-0.5">
                  {editingSlot.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-[#9CA9A1] hover:text-[#F1F5F2] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9CA9A1]">Current R2 / CDN Image</div>
                  <div className="h-40 rounded-md bg-[#090D0B] border border-[#1F2923] overflow-hidden flex items-center justify-center">
                    <img
                      src={resolveImageUrl(editingSlot.src)}
                      alt={editingSlot.alt}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9CA9A1]">
                    Choose Device Image (Push to R2)
                  </div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-40 rounded-md bg-[#0B0F0D] border border-dashed border-[#34463C] hover:border-[#E59819] overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors p-3 text-center"
                  >
                    {slotPreviewUrl ? (
                      <img
                        src={slotPreviewUrl}
                        alt="New R2 upload preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : slotExternalUrl.trim() ? (
                      <img
                        src={resolveImageUrl(slotExternalUrl.trim())}
                        alt="CDN URL preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-[#E59819] mb-2" />
                        <span className="text-xs font-medium text-[#F1F5F2]">
                          Click to choose image from device
                        </span>
                        <span className="text-[11px] text-[#86EFAC] mt-1">
                          Pushes directly to R2 & saves CDN link in Firebase
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSlotFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA9A1]">
                  Or Select an Existing Image from Cloudflare R2 Bucket
                </label>
                <select
                  value={slotSelectedR2Key}
                  onChange={(e) => {
                    const key = e.target.value;
                    setSlotSelectedR2Key(key);
                    const found = r2Objects.find((o) => o.r2Key === key);
                    if (found) {
                      setSlotExternalUrl(found.cdnUrl);
                      setSlotUploadFile(null);
                      setSlotPreviewUrl(null);
                      if (!slotAltText && found.alt) setSlotAltText(found.alt);
                    }
                  }}
                  className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                >
                  <option value="">-- Choose from R2 Storage Bucket ({r2Objects.length} items) --</option>
                  {r2Objects.map((o) => (
                    <option key={o.r2Key} value={o.r2Key}>
                      {o.r2Key} ({formatBytes(o.sizeBytes)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA9A1]">
                  R2 CDN URL / Direct Image Link (Saved to Firebase Firestore)
                </label>
                <input
                  type="text"
                  value={slotExternalUrl}
                  onChange={(e) => {
                    setSlotExternalUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setSlotUploadFile(null);
                      setSlotPreviewUrl(null);
                    }
                  }}
                  placeholder="/api/r2/file/... or https://..."
                  className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2] placeholder-[#68756D] focus:outline-none font-mono"
                />
              </div>

              {editingSlot.type !== 'hero-bg' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#9CA9A1]">
                    Image Alt Text (SEO & Accessibility)
                  </label>
                  <input
                    type="text"
                    value={slotAltText}
                    onChange={(e) => setSlotAltText(e.target.value)}
                    placeholder="Describe this safari photo..."
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2] placeholder-[#68756D] focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#222F28] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!editingSlot.isDeleted && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSingleSlot(editingSlot)}
                      disabled={slotSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#FCA5A5] bg-[#2A1616] hover:bg-[#3B1D1D] border border-[#4C2222] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete from R2</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleResetSingleSlot(editingSlot)}
                    disabled={slotSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2] bg-[#18221D] hover:bg-[#222F28] border border-[#26352D] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-4 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={slotSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{slotSaving ? 'Uploading to R2...' : 'Push to R2 & Save CDN Link'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add / Edit Section Wildlife Photo (Pushes to R2 -> saves R2 CDN URL in Firebase Firestore) */}
      {editingSectionImg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#161F1A] border-b border-[#222F28] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E59819] font-medium">
                  Cloudflare R2 + Firebase Section Gallery Photo
                </div>
                <h2 className="text-base font-semibold text-[#F1F5F2] mt-0.5">
                  {isNewSectionImg ? 'Add New Photo to R2 & Page Section' : 'Edit R2 Section Photo'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingSectionImg(null)}
                className="text-[#9CA9A1] hover:text-[#F1F5F2] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSectionImage} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    Target Website Page
                  </label>
                  <select
                    value={editingSectionImg.page}
                    onChange={(e) =>
                      setEditingSectionImg({ ...editingSectionImg, page: e.target.value })
                    }
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                  >
                    {pages.map((p) => (
                      <option key={p.file} value={p.file}>
                        {p.title} ({p.file})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    Section Heading / Group Name
                  </label>
                  <input
                    type="text"
                    value={editingSectionImg.sectionTitle}
                    onChange={(e) =>
                      setEditingSectionImg({
                        ...editingSectionImg,
                        sectionTitle: e.target.value,
                      })
                    }
                    placeholder="e.g. Yala Leopard Highlights"
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                  Photo Title
                </label>
                <input
                  type="text"
                  required
                  value={editingSectionImg.title}
                  onChange={(e) =>
                    setEditingSectionImg({ ...editingSectionImg, title: e.target.value })
                  }
                  placeholder="e.g. Morning Leopard Sighting at Block 1"
                  className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                  Caption / Description
                </label>
                <textarea
                  rows={2}
                  value={editingSectionImg.caption}
                  onChange={(e) =>
                    setEditingSectionImg({ ...editingSectionImg, caption: e.target.value })
                  }
                  placeholder="Describe this safari moment..."
                  className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    Choose Device Image (Pushed Directly to R2)
                  </label>
                  <div
                    onClick={() => secFileInputRef.current?.click()}
                    className="h-36 rounded-md bg-[#0B0F0D] border border-dashed border-[#34463C] hover:border-[#E59819] overflow-hidden flex flex-col items-center justify-center cursor-pointer p-2 text-center"
                  >
                    {secImgPreviewUrl || editingSectionImg.src ? (
                      <img
                        src={secImgPreviewUrl || resolveImageUrl(editingSectionImg.src)}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-[#E59819] mb-1.5" />
                        <span className="text-xs text-[#F1F5F2]">Click to select image from device</span>
                        <span className="text-[10px] text-[#86EFAC] mt-1">
                          Uploads to R2 & stores CDN link in Firebase
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={secFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSecImgFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                      Or Pick Existing R2 Object
                    </label>
                    <select
                      value={editingSectionImg.r2Key || ''}
                      onChange={(e) => {
                        const key = e.target.value;
                        const found = r2Objects.find((o) => o.r2Key === key);
                        if (found) {
                          setEditingSectionImg({
                            ...editingSectionImg,
                            src: found.cdnUrl,
                            r2Key: found.r2Key,
                            alt: editingSectionImg.alt || found.alt,
                          });
                          setSecImgUploadFile(null);
                          setSecImgPreviewUrl(null);
                        }
                      }}
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-1.5 text-xs text-[#F1F5F2]"
                    >
                      <option value="">-- Select from R2 Bucket --</option>
                      {r2Objects.map((o) => (
                        <option key={o.r2Key} value={o.r2Key}>
                          {o.r2Key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                      R2 CDN URL
                    </label>
                    <input
                      type="text"
                      value={editingSectionImg.src}
                      onChange={(e) => {
                        setEditingSectionImg({ ...editingSectionImg, src: e.target.value });
                        setSecImgUploadFile(null);
                        setSecImgPreviewUrl(null);
                      }}
                      placeholder="/api/r2/file/... or https://..."
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-1.5 text-xs text-[#F1F5F2] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={editingSectionImg.alt}
                      onChange={(e) =>
                        setEditingSectionImg({ ...editingSectionImg, alt: e.target.value })
                      }
                      placeholder="Accessible image description"
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-1.5 text-xs text-[#F1F5F2]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#222F28] flex items-center justify-between gap-3">
                {!isNewSectionImg ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSectionImage(editingSectionImg)}
                    disabled={secImgSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#FCA5A5] bg-[#2A1616] hover:bg-[#3B1D1D] border border-[#4C2222]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from R2 & Firebase</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingSectionImg(null)}
                    className="px-4 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={secImgSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{secImgSaving ? 'Uploading to R2...' : 'Push to R2 & Save CDN Link'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit / Add Site Text via Firebase Firestore */}
      {editingText && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#161F1A] border-b border-[#222F28] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E59819] font-medium">
                  {isNewCustomText
                    ? 'Add Custom Text Block via Firebase'
                    : `${editingText.pageTitle} · ${editingText.tagName} (#${
                        editingText.textIndex + 1
                      })`}
                </div>
                <h2 className="text-base font-semibold text-[#F1F5F2] mt-0.5">
                  {isNewCustomText ? 'New Section Text Block' : editingText.sectionContext}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingText(null)}
                className="text-[#9CA9A1] hover:text-[#F1F5F2] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveText} className="p-6 space-y-4">
              {isNewCustomText && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                      Target Page
                    </label>
                    <select
                      value={textDraftPage}
                      onChange={(e) => setTextDraftPage(e.target.value)}
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                    >
                      {pages.map((p) => (
                        <option key={p.file} value={p.file}>
                          {p.title} ({p.file})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                      Section Heading / Title
                    </label>
                    <input
                      type="text"
                      value={textDraftSection}
                      onChange={(e) => setTextDraftSection(e.target.value)}
                      placeholder="e.g. Special Safari Offer"
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                    />
                  </div>
                </div>
              )}

              {!isNewCustomText && editingText.defaultContent && (
                <div className="p-3 rounded-md bg-[#0E1411] border border-[#1F2923] space-y-1">
                  <div className="text-[11px] font-medium text-[#68756D]">Original Default Text</div>
                  <div className="text-xs text-[#9CA9A1]">{editingText.defaultContent}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                  Text Content
                </label>
                <textarea
                  rows={5}
                  required
                  value={textDraftContent}
                  onChange={(e) => setTextDraftContent(e.target.value)}
                  placeholder="Enter text to display on the website..."
                  className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-sm text-[#F1F5F2] leading-relaxed focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-[#222F28] flex items-center justify-between gap-3">
                {!isNewCustomText ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteOrRestoreText(editingText, false)}
                      disabled={textSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#FCA5A5] bg-[#2A1616] hover:bg-[#3B1D1D] border border-[#4C2222]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete / Hide Text</span>
                    </button>
                    {editingText.isModified && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOrRestoreText(editingText, true)}
                        disabled={textSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2] bg-[#18221D] border border-[#26352D]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Default</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingText(null)}
                    className="px-4 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={textSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{textSaving ? 'Saving...' : 'Save Text via Firebase'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Cloudflare R2 Bucket Direct Upload / Edit / Replace / Delete Modal */}
      {editingR2Obj && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#161F1A] border-b border-[#222F28] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E59819] font-medium">
                  Cloudflare R2 Bucket ({bucketName})
                </div>
                <h2 className="text-base font-mono font-semibold text-[#F1F5F2] mt-0.5">
                  {isNewR2Upload
                    ? 'Upload New Image from Device to R2 Bucket'
                    : editingR2Obj.r2Key}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingR2Obj(null)}
                className="text-[#9CA9A1] hover:text-[#F1F5F2] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveR2Object} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isNewR2Upload && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-[#9CA9A1]">Current R2 Object</div>
                    <div className="h-40 rounded-md bg-[#090D0B] border border-[#1F2923] overflow-hidden flex items-center justify-center">
                      <img
                        src={resolveImageUrl(editingR2Obj.cdnUrl)}
                        alt={editingR2Obj.alt || editingR2Obj.filename}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className={isNewR2Upload ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
                  <div className="text-xs font-medium text-[#9CA9A1]">
                    {isNewR2Upload
                      ? 'Choose Image File from Device Storage'
                      : 'Upload Replacement File to R2 (optional)'}
                  </div>
                  <div
                    onClick={() => r2FileInputRef.current?.click()}
                    className="h-40 rounded-md bg-[#0B0F0D] border border-dashed border-[#34463C] hover:border-[#E59819] overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors p-3 text-center"
                  >
                    {r2PreviewUrl ? (
                      <img
                        src={r2PreviewUrl}
                        alt="New R2 file preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-[#E59819] mb-2" />
                        <span className="text-xs font-medium text-[#F1F5F2]">
                          Click to select image from device storage
                        </span>
                        <span className="text-[11px] text-[#86EFAC] mt-1">
                          Pushed directly into Cloudflare R2 bucket ({bucketName})
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={r2FileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleR2FileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    R2 Object Key (optional custom path)
                  </label>
                  <input
                    type="text"
                    value={r2DraftKey}
                    onChange={(e) => setR2DraftKey(e.target.value)}
                    placeholder="e.g. yala-safari/leopard-hero.jpg"
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    Associated Website Page
                  </label>
                  <select
                    value={r2DraftPage}
                    onChange={(e) => setR2DraftPage(e.target.value)}
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                  >
                    {pages.map((p) => (
                      <option key={p.file} value={p.file}>
                        {p.title} ({p.file})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    Image Title / Label
                  </label>
                  <input
                    type="text"
                    value={r2DraftTitle}
                    onChange={(e) => setR2DraftTitle(e.target.value)}
                    placeholder="Safari Wildlife Photo"
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                    Alt Text (SEO & Caption)
                  </label>
                  <input
                    type="text"
                    value={r2DraftAlt}
                    onChange={(e) => setR2DraftAlt(e.target.value)}
                    placeholder="Describe this image..."
                    className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                  />
                </div>
              </div>

              {!isNewR2Upload && editingR2Obj.cdnUrl && (
                <div className="p-3 rounded-md bg-[#0E1411] border border-[#1F2923] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-[#68756D] flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-[#E59819]" />
                      <span>R2 Bucket CDN URL (stored in Firebase Firestore)</span>
                    </div>
                    <div className="text-xs font-mono text-[#86EFAC] truncate mt-0.5">
                      {editingR2Obj.cdnUrl}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCdnLink(editingR2Obj.cdnUrl)}
                    className="px-2.5 py-1.5 rounded bg-[#18221D] hover:bg-[#222F28] text-xs text-[#F1F5F2] border border-[#26352D] shrink-0"
                  >
                    Copy Link
                  </button>
                </div>
              )}

              {isNewR2Upload && (
                <div className="space-y-3 pt-1 border-t border-[#1F2923]">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA9A1] mb-1">
                      Optionally Link Uploaded R2 Image Directly to a Page Slot
                    </label>
                    <select
                      value={r2AssignSlotId}
                      onChange={(e) => setR2AssignSlotId(e.target.value)}
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
                    >
                      <option value="">
                        -- None (Store in R2 Bucket Only or Add to Section Gallery below) --
                      </option>
                      {mergedSlots
                        .filter((s) => s.page === r2DraftPage)
                        .map((s) => (
                          <option key={s.slotId} value={s.slotId}>
                            Slot #{s.slotIndex + 1}: {s.label} ({getSlotTypeLabel(s.type)})
                          </option>
                        ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#D5E0D9] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r2AssignSectionGallery}
                      onChange={(e) => setR2AssignSectionGallery(e.target.checked)}
                      className="rounded border-[#34463C] bg-[#0B0F0D] text-[#E59819]"
                    />
                    <span>
                      Also publish this R2 CDN link as a new card in {r2DraftPage}’s Section Wildlife Gallery
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-2 border-t border-[#222F28] flex items-center justify-between gap-3">
                {!isNewR2Upload ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteR2Object(editingR2Obj)}
                    disabled={r2Saving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#FCA5A5] bg-[#2A1616] hover:bg-[#3B1D1D] border border-[#4C2222]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from R2 Bucket</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingR2Obj(null)}
                    className="px-4 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={r2Saving || (isNewR2Upload && !r2UploadFile)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {r2Saving
                        ? 'Pushing to R2...'
                        : isNewR2Upload
                        ? 'Upload Directly to R2'
                        : 'Save Changes to R2'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Confirm Reset Dialog */}
      {confirmResetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[#F1F5F2]">
                  Restore Default Images for {confirmResetModal.title}?
                </h3>
                <p className="text-xs text-[#9CA9A1] mt-1 leading-relaxed">
                  {confirmResetModal.scope === 'all'
                    ? 'This will revert all 12 HTML pages and media slots back to their original factory state.'
                    : `This will revert all image slots on ${confirmResetModal.title} back to their default configuration.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedReset}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#DC2626] hover:bg-[#EF4444] text-white transition-colors"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
