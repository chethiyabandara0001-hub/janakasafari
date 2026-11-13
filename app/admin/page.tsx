'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Edit3,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  deleteImageFromR2Bucket,
  deleteSectionGalleryItemInFirestore,
  deleteSiteImageInFirestore,
  deleteSiteTextInFirestore,
  extractR2KeyFromUrl,
  firebaseSignOut,
  onAuthStateChanged,
  saveSectionGalleryItemInFirestore,
  saveSiteImageInFirestore,
  saveSiteTextInFirestore,
  signInWithEmailAndPassword,
  subscribePublicCollection,
  uploadImageToR2Bucket,
} from '@/lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { AdminLoginCard } from '@/components/admin/AdminLoginCard';
import { R2BucketPanel } from '@/components/admin/R2BucketPanel';
import { SyncSettingsPanel } from '@/components/admin/SyncSettingsPanel';
import {
  formatBytes,
  getSlotTypeName,
  resolveImageUrl,
  splitSectionLabel,
  type AdminTab,
  type ImageSlot,
  type PageMeta,
  type ParentSectionGroup,
  type R2ObjectRecord,
  type R2StatusPayload,
  type SeedSectionGalleryItem,
  type SiteTextSlot,
  type SubSectionGroup,
  type SyncReport,
} from '@/components/admin/types';

function getTextRoleLabel(txt: SiteTextSlot): string {
  if (txt.fieldLabel) return txt.fieldLabel;
  if (txt.isCustomAdded) return 'Custom Text Block';
  switch (txt.tagName) {
    case 'H1':
    case 'H2':
      return 'Section Heading';
    case 'H3':
    case 'H4':
      return 'Sub-Heading';
    case 'LI':
      return 'List Item';
    case 'BLOCKQUOTE':
      return 'Quote';
    case 'SPAN':
      return 'Button / Label';
    default:
      return 'Body Copy';
  }
}

export default function AdminStudioPage() {
  // Core Inventory State (pure HTML schema from /api/admin/images + /api/admin/cms)
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [textSlots, setTextSlots] = useState<SiteTextSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cacheBuster, setCacheBuster] = useState<number>(1);

  // R2 Bucket State
  const [r2Status, setR2Status] = useState<R2StatusPayload | null>(null);
  const [r2Objects, setR2Objects] = useState<R2ObjectRecord[]>([]);
  const [loadingR2, setLoadingR2] = useState<boolean>(false);
  const [testingR2, setTestingR2] = useState<boolean>(false);
  const [savingCreds, setSavingCreds] = useState<boolean>(false);
  const [syncingToSite, setSyncingToSite] = useState<boolean>(false);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null);

  // Authentication State
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  // Live Firestore Collections
  const [firestoreImageDocs, setFirestoreImageDocs] = useState<Record<string, Partial<ImageSlot>>>({});
  const [firestoreSectionDocs, setFirestoreSectionDocs] = useState<SeedSectionGalleryItem[]>([]);
  const [firestoreTextDocs, setFirestoreTextDocs] = useState<
    Record<string, Partial<SiteTextSlot> & { updatedAt?: unknown }>
  >({});

  // Navigation & Filters
  const [selectedPage, setSelectedPage] = useState<string>('index.html');
  const [activeTab, setActiveTab] = useState<AdminTab>('pages');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contentFilter, setContentFilter] = useState<'both' | 'images' | 'text'>('both');
  const [textStatusFilter, setTextStatusFilter] = useState<'all' | 'modified'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [expandedSidebarSections, setExpandedSidebarSections] = useState<Record<string, boolean>>({});

  // Action & Feedback State
  const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);
  const [savingTextId, setSavingTextId] = useState<string | null>(null);
  const [resettingPage, setResettingPage] = useState<boolean>(false);
  const [resettingAll, setResettingAll] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inline Editors & Pickers
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingCaptionTitle, setEditingCaptionTitle] = useState<string>('');
  const [editingCaptionAlt, setEditingCaptionAlt] = useState<string>('');
  const [confirmClearSlotId, setConfirmClearSlotId] = useState<string | null>(null);
  const [confirmDeleteHeroSlideId, setConfirmDeleteHeroSlideId] = useState<string | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  // Custom Text Creator
  const [showCustomTextForm, setShowCustomTextForm] = useState<boolean>(false);
  const [customTextSection, setCustomTextSection] = useState<string>('Page Content');
  const [customTextTag, setCustomTextTag] = useState<SiteTextSlot['tagName']>('P');
  const [customTextValue, setCustomTextValue] = useState<string>('');
  const [addingCustomText, setAddingCustomText] = useState<boolean>(false);

  // Unified R2 Picker Modal for image slots and Hero Slideshow
  const [r2PickerTarget, setR2PickerTarget] = useState<
    { mode: 'slot'; slot: ImageSlot } | { mode: 'hero-slide' } | null
  >(null);
  const [r2PickerSearch, setR2PickerSearch] = useState<string>('');
  const [r2PickerBusyKey, setR2PickerBusyKey] = useState<string | null>(null);

  const showNotice = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
    void testConnection();
  }, []);

  const fetchR2Status = useCallback(async () => {
    setLoadingR2(true);
    try {
      const res = await fetch(`/api/r2?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as R2StatusPayload & { ok?: boolean };
      setR2Status(data);
      setR2Objects(data.objects || []);
    } catch {
      // Ignore R2 background poll failure
    } finally {
      setLoadingR2(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const [imgRes, cmsRes] = await Promise.all([
        fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (!imgRes.ok || !cmsRes.ok) {
        throw new Error('Failed to load page inventory');
      }
      const [imgData, cmsData] = await Promise.all([imgRes.json(), cmsRes.json()]);
      setPages(imgData.pages || []);
      setSlots(imgData.slots || []);
      if (Array.isArray(imgData.r2Objects)) {
        setR2Objects(imgData.r2Objects);
      }
      setTextSlots(cmsData.textSlots || []);
      setCacheBuster((prev) => prev + 1);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Error loading CMS inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  // Verify Admin Session on Mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cached =
          typeof window !== 'undefined' && sessionStorage.getItem('nisha_admin_auth') === '1';
        const res = await fetch(`/api/admin/auth?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({ authenticated: false }));
        if (!active) return;
        if (data.authenticated || cached) {
          setAdminAuthenticated(true);
          const [imgRes, cmsRes, r2Res] = await Promise.all([
            fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }),
            fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }),
            fetch(`/api/r2?t=${Date.now()}`, { cache: 'no-store' }),
          ]);
          if (active && imgRes.ok && cmsRes.ok) {
            const [imgData, cmsData] = await Promise.all([imgRes.json(), cmsRes.json()]);
            setPages(imgData.pages || []);
            setSlots(imgData.slots || []);
            setTextSlots(cmsData.textSlots || []);
            setCacheBuster((prev) => prev + 1);
          }
          if (active && r2Res.ok) {
            const r2Data = (await r2Res.json()) as R2StatusPayload;
            setR2Status(r2Data);
            setR2Objects(r2Data.objects || []);
          }
        }
      } catch {
        // Require login on failure
      } finally {
        if (active) {
          setLoading(false);
          setAuthChecking(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to Live Firestore Collections
  useEffect(() => {
    if (!adminAuthenticated) return;

    const unsubImages = subscribePublicCollection<
      Partial<ImageSlot> & { slotId: string; src?: string }
    >('site_images', (items) => {
      const next: Record<string, Partial<ImageSlot>> = {};
      for (const item of items) {
        if (item.slotId) {
          next[item.slotId] = item;
        }
      }
      setFirestoreImageDocs(next);
    });

    const unsubSections = subscribePublicCollection<SeedSectionGalleryItem>(
      'section_gallery_items',
      (items) => {
        setFirestoreSectionDocs(items);
      }
    );

    const unsubTexts = subscribePublicCollection<
      Partial<SiteTextSlot> & { textId: string; updatedAt?: unknown }
    >('site_texts', (items) => {
      const next: Record<string, Partial<SiteTextSlot> & { updatedAt?: unknown }> = {};
      for (const item of items) {
        if (item.textId) {
          next[item.textId] = item;
        }
      }
      setFirestoreTextDocs(next);
    });

    return () => {
      unsubImages();
      unsubSections();
      unsubTexts();
    };
  }, [adminAuthenticated]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      // Auth state listener kept active for Firestore write credentials
    });
    return () => unsub();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const emailClean = loginEmail.trim().toLowerCase();
      const passwordRaw = loginPassword;
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean, password: passwordRaw }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setLoginError(data.error || 'Invalid email or password.');
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nisha_admin_auth', '1');
      }

      try {
        await signInWithEmailAndPassword(auth, emailClean, passwordRaw);
      } catch {
        try {
          await createUserWithEmailAndPassword(auth, emailClean, passwordRaw);
        } catch {
          // Continue with verified server session
        }
      }

      setLoginPassword('');
      setAdminAuthenticated(true);
      await Promise.all([fetchInventory(), fetchR2Status()]);
    } catch {
      setLoginError('Unable to sign in. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // Ignore network error
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nisha_admin_auth');
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore
    }
    setAdminAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
  };

  // Live Firestore Image Slots
  const mergedSlots = useMemo(() => {
    return slots.map((slot) => {
      const fbDoc = firestoreImageDocs[slot.slotId];
      if (!fbDoc) return slot;
      if (fbDoc.src === '/deleted' || fbDoc.isDeleted) {
        return {
          ...slot,
          src: '',
          lightboxHref: '',
          r2Key: undefined,
          isDeleted: true,
          isModified: false,
        };
      }
      if (!fbDoc.src || fbDoc.src.startsWith('data:') || fbDoc.src.includes('empty-slot.svg')) {
        return slot;
      }
      return {
        ...slot,
        src: fbDoc.src,
        lightboxHref: fbDoc.lightboxHref || fbDoc.src,
        r2Key: fbDoc.r2Key || extractR2KeyFromUrl(fbDoc.src) || slot.r2Key,
        alt: fbDoc.alt !== undefined ? fbDoc.alt : slot.alt,
        label: fbDoc.label || slot.label,
        isDeleted: false,
        isModified: true,
      };
    });
  }, [slots, firestoreImageDocs]);

  const mergedTexts = useMemo(() => {
    const isLegacyPreRedesignText = (fbDoc: Partial<SiteTextSlot> & { updatedAt?: unknown }) => {
      if (fbDoc.isCustomAdded) return false;
      const rawTs = fbDoc.updatedAt as { toDate?: () => Date; seconds?: number } | string | undefined;
      if (!rawTs) return false;
      let iso = '';
      if (typeof rawTs === 'string') {
        iso = rawTs;
      } else if (typeof rawTs === 'object' && typeof rawTs.toDate === 'function') {
        iso = rawTs.toDate().toISOString();
      } else if (typeof rawTs === 'object' && typeof rawTs.seconds === 'number') {
        iso = new Date(rawTs.seconds * 1000).toISOString();
      }
      return Boolean(iso && iso < '2026-11-12T18:00:00Z');
    };

    const baseList = textSlots.map((t) => {
      const fbDoc = firestoreTextDocs[t.textId];
      if (!fbDoc || isLegacyPreRedesignText(fbDoc)) return t;
      if (!t.isCustomAdded && fbDoc.tagName && t.tagName && fbDoc.tagName !== t.tagName) {
        return t;
      }
      const nextContent = fbDoc.content !== undefined ? fbDoc.content : t.content;
      const nextDeleted = fbDoc.isDeleted !== undefined ? fbDoc.isDeleted : t.isDeleted;
      return {
        ...t,
        content: nextContent,
        isDeleted: nextDeleted,
        sectionContext: fbDoc.sectionContext || t.sectionContext,
        fieldLabel: t.fieldLabel,
        isModified: t.isCustomAdded || nextContent !== t.defaultContent || Boolean(nextDeleted),
      };
    });

    const existingIds = new Set(baseList.map((b) => b.textId));
    for (const [id, fbDoc] of Object.entries(firestoreTextDocs)) {
      if (!existingIds.has(id) && fbDoc.isCustomAdded && fbDoc.page) {
        const pMeta = pages.find((p) => p.file === fbDoc.page);
        const splitCtx = splitSectionLabel(fbDoc.sectionContext || 'Page Section');
        baseList.push({
          textId: id,
          page: fbDoc.page,
          pageTitle: pMeta ? pMeta.title : fbDoc.page,
          textIndex: -1,
          tagName: fbDoc.tagName || 'CUSTOM',
          sectionContext: fbDoc.sectionContext || 'Page Section',
          sectionName: splitCtx.sectionName,
          subSectionName: splitCtx.subSectionName,
          fieldLabel: 'Custom Text Block',
          content: fbDoc.content || '',
          defaultContent: '',
          isDeleted: Boolean(fbDoc.isDeleted),
          isCustomAdded: true,
          isModified: true,
        });
      }
    }
    return baseList;
  }, [textSlots, firestoreTextDocs, pages]);

  const currentPageMeta = useMemo(
    () => pages.find((p) => p.file === selectedPage) || { file: selectedPage, title: selectedPage },
    [pages, selectedPage]
  );

  const pageHeroSlides = useMemo(
    () =>
      firestoreSectionDocs
        .filter(
          (item) =>
            item &&
            item.page === selectedPage &&
            item.sectionKey === 'hero_slideshow' &&
            item.src &&
            item.src !== '/deleted' &&
            !item.src.startsWith('data:')
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [firestoreSectionDocs, selectedPage]
  );

  const isR2KeyStillUsedInFirestore = useCallback(
    (r2Key: string, exclude?: { slotId?: string; itemId?: string }) => {
      if (!r2Key) return false;
      const usedInSlots = Object.values(firestoreImageDocs).some((d) => {
        if (!d || d.slotId === exclude?.slotId || d.isDeleted || !d.src || d.src === '/deleted') {
          return false;
        }
        const k = d.r2Key || extractR2KeyFromUrl(d.src);
        return k === r2Key;
      });
      if (usedInSlots) return true;
      return firestoreSectionDocs.some((item) => {
        if (
          !item ||
          item.itemId === exclude?.itemId ||
          item.sectionKey === 'deleted_section_item' ||
          !item.src ||
          item.src === '/deleted'
        ) {
          return false;
        }
        const k = item.r2Key || extractR2KeyFromUrl(item.src);
        return k === r2Key;
      });
    },
    [firestoreImageDocs, firestoreSectionDocs]
  );

  // Hierarchical Parent Section -> Sub-Section Tree for Selected Page
  const parentSections = useMemo<ParentSectionGroup[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const isTextsWorkspace = activeTab === 'texts';
    const effectiveFilter = isTextsWorkspace ? 'text' : contentFilter;
    const pageImages = effectiveFilter === 'text' ? [] : mergedSlots.filter((s) => s.page === selectedPage);
    const pageTexts = mergedTexts.filter((t) => t.page === selectedPage);

    const parentOrder: string[] = [];
    const parentSeen = new Set<string>();

    const registerParent = (rawCtx: string, explicitParent?: string) => {
      const { sectionName } = splitSectionLabel(rawCtx);
      const pName = (explicitParent || sectionName || 'Page Content').trim();
      if (!parentSeen.has(pName)) {
        parentSeen.add(pName);
        parentOrder.push(pName);
      }
    };

    for (const s of pageImages) registerParent(s.sectionContext, s.sectionName);
    for (const t of pageTexts) registerParent(t.sectionContext, t.sectionName);

    const groups: ParentSectionGroup[] = [];
    let runningIdx = 1;

    for (const pName of parentOrder) {
      const imgsInParent = pageImages.filter((s) => {
        const name = (s.sectionName || splitSectionLabel(s.sectionContext).sectionName).trim();
        return name === pName;
      });
      const textsInParent = pageTexts.filter((t) => {
        const name = (t.sectionName || splitSectionLabel(t.sectionContext).sectionName).trim();
        return name === pName;
      });

      const subOrder: string[] = [];
      const subSeen = new Set<string>();
      const registerSub = (rawCtx: string, explicitSub?: string) => {
        const parsed = splitSectionLabel(rawCtx);
        const subName = (explicitSub || parsed.subSectionName || 'Overview & General').trim();
        if (!subSeen.has(subName)) {
          subSeen.add(subName);
          subOrder.push(subName);
        }
      };

      for (const s of imgsInParent) registerSub(s.sectionContext, s.subSectionName);
      for (const t of textsInParent) registerSub(t.sectionContext, t.subSectionName);

      const subSections: SubSectionGroup[] = [];
      let totalImages = 0;
      let totalTexts = 0;

      for (const subName of subOrder) {
        let subImgs = imgsInParent.filter((s) => {
          const parsed = splitSectionLabel(s.sectionContext);
          const resolvedSub = (s.subSectionName || parsed.subSectionName || 'Overview & General').trim();
          return resolvedSub === subName;
        });
        let subTexts = textsInParent.filter((t) => {
          const parsed = splitSectionLabel(t.sectionContext);
          const resolvedSub = (t.subSectionName || parsed.subSectionName || 'Overview & General').trim();
          return resolvedSub === subName;
        });

        if (isTextsWorkspace && textStatusFilter === 'modified') {
          subTexts = subTexts.filter((t) => t.isModified || t.isDeleted || t.isCustomAdded);
        }

        if (q) {
          const headerMatches =
            pName.toLowerCase().includes(q) || subName.toLowerCase().includes(q);
          if (!headerMatches) {
            subImgs = subImgs.filter(
              (s) =>
                s.label.toLowerCase().includes(q) ||
                s.alt.toLowerCase().includes(q) ||
                s.sectionContext.toLowerCase().includes(q)
            );
            subTexts = subTexts.filter(
              (t) =>
                t.content.toLowerCase().includes(q) ||
                t.sectionContext.toLowerCase().includes(q) ||
                (t.fieldLabel || '').toLowerCase().includes(q) ||
                t.tagName.toLowerCase().includes(q)
            );
          }
        }

        if (effectiveFilter === 'images') subTexts = [];
        if (effectiveFilter === 'text') subImgs = [];

        if (subImgs.length === 0 && subTexts.length === 0) continue;

        totalImages += subImgs.length;
        totalTexts += subTexts.length;

        subSections.push({
          id: `sub-${runningIdx}-${subSections.length + 1}`,
          subSectionName: subName,
          images: subImgs,
          texts: subTexts,
        });
      }

      if (subSections.length === 0) continue;

      groups.push({
        id: `sec-${runningIdx}`,
        indexNumber: runningIdx,
        sectionName: pName,
        subSections,
        totalImages,
        totalTexts,
      });
      runningIdx++;
    }

    return groups;
  }, [mergedSlots, mergedTexts, selectedPage, searchQuery, contentFilter, activeTab, textStatusFilter]);

  const pageTextStats = useMemo(() => {
    const pageTexts = mergedTexts.filter((t) => t.page === selectedPage);
    return {
      total: pageTexts.length,
      edited: pageTexts.filter((t) => t.isModified && !t.isDeleted).length,
      hidden: pageTexts.filter((t) => t.isDeleted).length,
      custom: pageTexts.filter((t) => t.isCustomAdded).length,
    };
  }, [mergedTexts, selectedPage]);

  const allSectionNamesOnPage = useMemo(() => {
    const names = new Set<string>();
    for (const grp of parentSections) names.add(grp.sectionName);
    if (names.size === 0) names.add('Page Content');
    return Array.from(names);
  }, [parentSections]);

  // --- Image Slot Actions (R2 -> CDN URL -> Firestore) ---
  const handleDirectSlotFileSelected = async (
    targetSlot: ImageSlot,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingTargetId(targetSlot.slotId);
    try {
      const prevKey = targetSlot.r2Key || extractR2KeyFromUrl(targetSlot.src);
      const canDeletePrev =
        prevKey && !isR2KeyStillUsedInFirestore(prevKey, { slotId: targetSlot.slotId });

      const r2Uploaded = await uploadImageToR2Bucket(file, {
        replaceKey: canDeletePrev ? prevKey : undefined,
        alt: targetSlot.alt || targetSlot.label,
        title: targetSlot.label,
        page: targetSlot.page,
      });

      await saveSiteImageInFirestore({
        slotId: targetSlot.slotId,
        page: targetSlot.page,
        slotIndex: targetSlot.slotIndex,
        type: targetSlot.type,
        label: targetSlot.label,
        sectionContext: targetSlot.sectionContext,
        src: r2Uploaded.cdnUrl,
        lightboxHref: r2Uploaded.cdnUrl,
        r2Key: r2Uploaded.r2Key,
        alt: targetSlot.alt || targetSlot.label,
      });

      setCacheBuster((prev) => prev + 1);
      showNotice(`Uploaded "${targetSlot.label}" to Cloudflare R2 and saved to Firestore.`);
      await fetchR2Status();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleAssignR2ToSlot = async (obj: R2ObjectRecord, targetSlot: ImageSlot) => {
    setUploadingTargetId(targetSlot.slotId);
    try {
      await saveSiteImageInFirestore({
        slotId: targetSlot.slotId,
        page: targetSlot.page,
        slotIndex: targetSlot.slotIndex,
        type: targetSlot.type,
        label: targetSlot.label,
        sectionContext: targetSlot.sectionContext,
        src: obj.cdnUrl,
        lightboxHref: obj.cdnUrl,
        r2Key: obj.r2Key,
        alt: targetSlot.alt || obj.alt || targetSlot.label,
      });

      setCacheBuster((prev) => prev + 1);
      showNotice(`Assigned R2 asset "${obj.title || obj.r2Key}" to "${targetSlot.label}".`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to assign R2 asset', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleSaveSlotCaption = async (slot: ImageSlot) => {
    if (!slot.src || slot.isDeleted) {
      showNotice('Upload or pick an R2 image before editing its caption.', 'error');
      setEditingCaptionId(null);
      return;
    }
    setUploadingTargetId(slot.slotId);
    try {
      const newLabel = editingCaptionTitle.trim() || slot.label;
      const newAlt = editingCaptionAlt.trim();

      await saveSiteImageInFirestore({
        slotId: slot.slotId,
        page: slot.page,
        slotIndex: slot.slotIndex,
        type: slot.type,
        label: newLabel,
        sectionContext: slot.sectionContext,
        src: slot.src,
        lightboxHref: slot.lightboxHref || slot.src,
        r2Key: slot.r2Key || extractR2KeyFromUrl(slot.src),
        alt: newAlt,
      });

      setEditingCaptionId(null);
      showNotice(`Saved metadata for "${newLabel}".`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save metadata', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleDeleteSlot = async (slot: ImageSlot) => {
    setUploadingTargetId(slot.slotId);
    try {
      const r2KeyToDelete = slot.r2Key || extractR2KeyFromUrl(slot.src);

      await deleteSiteImageInFirestore(slot.slotId);
      setFirestoreImageDocs((prev) => {
        const next = { ...prev };
        delete next[slot.slotId];
        return next;
      });

      if (
        r2KeyToDelete &&
        !isR2KeyStillUsedInFirestore(r2KeyToDelete, { slotId: slot.slotId })
      ) {
        await deleteImageFromR2Bucket(r2KeyToDelete);
        await fetchR2Status();
      }

      setCacheBuster((prev) => prev + 1);
      showNotice(`Deleted "${slot.label}" from Firestore and Cloudflare R2.`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  // --- Hero Slideshow Actions (R2 -> CDN URL -> Firestore) ---
  const handleAddHeroSlideFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setUploadingTargetId('hero-add-new');
    try {
      let currentOrder =
        pageHeroSlides.reduce((max, s) => Math.max(max, s.order || 0), 0) + 1;
      for (const file of files) {
        const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const uploaded = await uploadImageToR2Bucket(file, {
          alt: `${currentPageMeta.title} Hero Slide — ${cleanTitle}`,
          title: `Hero Slide #${currentOrder}`,
          page: selectedPage,
        });

        const newSlide: SeedSectionGalleryItem = {
          itemId: `hero_slide_${selectedPage.replace('.html', '').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${currentOrder}`,
          page: selectedPage,
          sectionKey: 'hero_slideshow',
          sectionTitle: 'Hero Section Slideshow (4s)',
          title: `Hero Slide #${currentOrder}`,
          caption: '4-second auto-advancing hero banner slide',
          src: uploaded.cdnUrl,
          r2Key: uploaded.r2Key,
          alt: `${currentPageMeta.title} Hero Banner Slide`,
          order: currentOrder,
        };

        await saveSectionGalleryItemInFirestore(newSlide);
        currentOrder++;
      }

      setCacheBuster((prev) => prev + 1);
      showNotice(
        `Uploaded ${files.length} Hero Slide${files.length > 1 ? 's' : ''} to R2 and synced to Firestore.`
      );
      await fetchR2Status();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add hero slide', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleAssignR2ToHeroSlide = async (obj: R2ObjectRecord) => {
    const nextOrder =
      pageHeroSlides.reduce((max, s) => Math.max(max, s.order || 0), 0) + 1;
    const newSlide: SeedSectionGalleryItem = {
      itemId: `hero_slide_${selectedPage.replace('.html', '').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${nextOrder}`,
      page: selectedPage,
      sectionKey: 'hero_slideshow',
      sectionTitle: 'Hero Section Slideshow (4s)',
      title: obj.title || `Hero Slide #${nextOrder}`,
      caption: '4-second auto-advancing hero banner slide',
      src: obj.cdnUrl,
      r2Key: obj.r2Key,
      alt: obj.alt || obj.title || `${currentPageMeta.title} Hero Banner Slide`,
      order: nextOrder,
    };
    await saveSectionGalleryItemInFirestore(newSlide);
    setCacheBuster((prev) => prev + 1);
    showNotice(`Added "${obj.title || obj.r2Key}" to ${currentPageMeta.title} Hero Slideshow.`);
  };

  const handleReplaceSectionImageFile = async (
    targetItem: SeedSectionGalleryItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingTargetId(targetItem.itemId);
    try {
      const prevKey = targetItem.r2Key || extractR2KeyFromUrl(targetItem.src);
      const canDeletePrev =
        prevKey && !isR2KeyStillUsedInFirestore(prevKey, { itemId: targetItem.itemId });

      const uploaded = await uploadImageToR2Bucket(file, {
        replaceKey: canDeletePrev ? prevKey : undefined,
        alt: targetItem.alt || targetItem.title,
        title: targetItem.title,
        page: targetItem.page,
      });

      const updatedItem: SeedSectionGalleryItem = {
        ...targetItem,
        src: uploaded.cdnUrl,
        r2Key: uploaded.r2Key,
      };

      await saveSectionGalleryItemInFirestore(updatedItem);
      setCacheBuster((prev) => prev + 1);
      showNotice(`Replaced "${targetItem.title}" via Cloudflare R2.`);
      await fetchR2Status();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to replace hero slide', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleDeleteSectionImage = async (item: SeedSectionGalleryItem) => {
    setUploadingTargetId(item.itemId);
    try {
      const r2KeyToDelete = item.r2Key || extractR2KeyFromUrl(item.src);

      await deleteSectionGalleryItemInFirestore(item.itemId);
      setFirestoreSectionDocs((prev) => prev.filter((i) => i.itemId !== item.itemId));

      if (
        r2KeyToDelete &&
        !isR2KeyStillUsedInFirestore(r2KeyToDelete, { itemId: item.itemId })
      ) {
        await deleteImageFromR2Bucket(r2KeyToDelete);
        await fetchR2Status();
      }

      setCacheBuster((prev) => prev + 1);
      showNotice(`Deleted "${item.title}" from Firestore and Cloudflare R2.`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete hero slide', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  // --- Text Editing & Custom Text Actions (Firestore) ---
  const handleSaveTextContent = async (slot: SiteTextSlot, newContent: string) => {
    setSavingTextId(slot.textId);
    try {
      const payload = {
        textId: slot.textId,
        page: slot.page,
        textIndex: slot.textIndex,
        tagName: slot.tagName,
        sectionContext: slot.sectionContext,
        content: newContent,
        isDeleted: false,
        isCustomAdded: slot.isCustomAdded,
      };

      await saveSiteTextInFirestore(payload);
      setFirestoreTextDocs((prev) => ({
        ...prev,
        [payload.textId]: {
          ...payload,
          updatedAt: new Date().toISOString(),
        },
      }));
      setEditingTextId(null);
      showNotice(`Saved and synced "${slot.sectionContext}" to Firestore.`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save text', 'error');
    } finally {
      setSavingTextId(null);
    }
  };

  const handleRestoreOrDeleteText = async (slot: SiteTextSlot, restoreDefault: boolean) => {
    setSavingTextId(slot.textId);
    try {
      if (restoreDefault || slot.isCustomAdded) {
        await deleteSiteTextInFirestore(slot.textId);
        setFirestoreTextDocs((prev) => {
          const next = { ...prev };
          delete next[slot.textId];
          return next;
        });
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
        setFirestoreTextDocs((prev) => ({
          ...prev,
          [slot.textId]: {
            textId: slot.textId,
            page: slot.page,
            textIndex: slot.textIndex,
            tagName: slot.tagName,
            sectionContext: slot.sectionContext,
            content: slot.content,
            isDeleted: true,
            isCustomAdded: false,
            updatedAt: new Date().toISOString(),
          },
        }));
      }

      showNotice(
        restoreDefault
          ? `Restored default text in "${slot.sectionContext}".`
          : `Hidden text block on ${currentPageMeta.title}.`
      );
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Text update failed', 'error');
    } finally {
      setSavingTextId(null);
    }
  };

  const handleAddCustomText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTextValue.trim()) return;
    setAddingCustomText(true);
    try {
      const payload = {
        textId: `${selectedPage.replace(/[^a-zA-Z0-9_-]/g, '_')}__custom_${Date.now()}`,
        page: selectedPage,
        textIndex: -1,
        tagName: customTextTag,
        sectionContext: customTextSection || 'Page Content',
        content: customTextValue.trim(),
        isDeleted: false,
        isCustomAdded: true,
      };

      await saveSiteTextInFirestore(payload);
      setFirestoreTextDocs((prev) => ({
        ...prev,
        [payload.textId]: {
          ...payload,
          updatedAt: new Date().toISOString(),
        },
      }));
      setCustomTextValue('');
      setShowCustomTextForm(false);
      showNotice(`Added custom text note to "${payload.sectionContext}".`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add custom text', 'error');
    } finally {
      setAddingCustomText(false);
    }
  };

  // --- Cloudflare R2 <-> Firestore Sync Actions ---
  const handleSyncSavedImagesToSiteR2 = async () => {
    setSyncingToSite(true);
    try {
      const res = await fetch(`/api/r2?t=${Date.now()}`, { cache: 'no-store' });
      const data = (await res.json()) as R2StatusPayload & { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to read Cloudflare R2 bucket');
      }

      const liveObjects = Array.isArray(data.objects) ? data.objects : [];
      setR2Status(data);
      setR2Objects(liveObjects);

      const liveByKey = new Map<string, R2ObjectRecord>();
      for (const obj of liveObjects) {
        liveByKey.set(obj.r2Key, obj);
      }

      const canVerifyOrphans = Boolean(data.testResult?.ok);
      let checked = 0;
      let urlsNormalized = 0;
      let orphanedRemoved = 0;

      for (const docItem of Object.values(firestoreImageDocs)) {
        if (!docItem || !docItem.slotId) continue;
        checked++;
        if (docItem.isDeleted || docItem.src === '/deleted' || !docItem.src) {
          await deleteSiteImageInFirestore(docItem.slotId);
          orphanedRemoved++;
          continue;
        }
        const key = docItem.r2Key || extractR2KeyFromUrl(docItem.src);
        const liveObj = key ? liveByKey.get(key) : undefined;
        if (!liveObj && canVerifyOrphans) {
          await deleteSiteImageInFirestore(docItem.slotId);
          orphanedRemoved++;
        } else if (liveObj && docItem.src !== liveObj.cdnUrl) {
          await saveSiteImageInFirestore({
            slotId: docItem.slotId,
            page: docItem.page || 'index.html',
            slotIndex: docItem.slotIndex ?? 0,
            type: docItem.type || 'img',
            label: docItem.label || 'Image Slot',
            sectionContext: docItem.sectionContext || 'Page Content',
            src: liveObj.cdnUrl,
            lightboxHref: liveObj.cdnUrl,
            r2Key: liveObj.r2Key,
            alt: docItem.alt || liveObj.alt || '',
          });
          urlsNormalized++;
        }
      }

      for (const secItem of firestoreSectionDocs) {
        if (!secItem || !secItem.itemId) continue;
        checked++;
        if (
          secItem.sectionKey === 'deleted_section_item' ||
          secItem.src === '/deleted' ||
          !secItem.src
        ) {
          await deleteSectionGalleryItemInFirestore(secItem.itemId);
          orphanedRemoved++;
          continue;
        }
        const key = secItem.r2Key || extractR2KeyFromUrl(secItem.src);
        const liveObj = key ? liveByKey.get(key) : undefined;
        if (!liveObj && canVerifyOrphans) {
          await deleteSectionGalleryItemInFirestore(secItem.itemId);
          orphanedRemoved++;
        } else if (liveObj && secItem.src !== liveObj.cdnUrl) {
          await saveSectionGalleryItemInFirestore({
            ...secItem,
            src: liveObj.cdnUrl,
            r2Key: liveObj.r2Key,
          });
          urlsNormalized++;
        }
      }

      setCacheBuster((prev) => prev + 1);
      const report: SyncReport = {
        r2Total: liveObjects.length,
        firestoreImagesChecked: checked,
        firestoreUrlsNormalized: urlsNormalized,
        orphanedRemoved,
        authMode: data.authMode,
        cdnBaseUrl: data.cdnBaseUrl,
        warning: data.testResult?.ok ? undefined : data.testResult?.message || data.warning,
        syncedAt: new Date().toISOString(),
      };
      setLastSyncReport(report);

      showNotice(
        `Synced R2 (${liveObjects.length} objects) with Firestore: ${urlsNormalized} URL(s) updated, ${orphanedRemoved} orphaned cleared.`
      );
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'R2 sync failed', 'error');
    } finally {
      setSyncingToSite(false);
    }
  };

  const handleTestR2Connection = async () => {
    setTestingR2(true);
    try {
      const res = await fetch('/api/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      const data = await res.json();
      if (data.testResult) {
        setR2Status((prev) =>
          prev
            ? { ...prev, ...data.status, testResult: data.testResult }
            : { ...data.status, testResult: data.testResult }
        );
        showNotice(data.testResult.message, data.testResult.ok ? 'success' : 'error');
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Connection test failed', 'error');
    } finally {
      setTestingR2(false);
    }
  };

  const handleSaveR2Credentials = async (creds: {
    accountId: string;
    bucketName: string;
    accessKeyId: string;
    secretAccessKey: string;
    apiToken: string;
    cdnBaseUrl: string;
  }) => {
    setSavingCreds(true);
    try {
      const res = await fetch('/api/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-credentials',
          ...creds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save R2 credentials');
      await fetchR2Status();
      showNotice(
        data.testResult?.message || 'Saved Cloudflare R2 credentials.',
        data.testResult?.ok === false ? 'error' : 'success'
      );
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save credentials', 'error');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleUploadR2Files = async (files: FileList, pageTag?: string) => {
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      await uploadImageToR2Bucket(file, {
        title: cleanTitle,
        alt: cleanTitle,
        page: pageTag,
      });
    }
    showNotice(`Uploaded ${fileArr.length} asset(s) to R2 bucket.`);
    await fetchR2Status();
  };

  const handleUpdateR2Meta = async (options: {
    r2Key: string;
    newKey?: string;
    alt?: string;
    title?: string;
    page?: string;
  }) => {
    const res = await fetch('/api/r2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) {
      showNotice(data.error || 'Failed to update R2 metadata', 'error');
      return;
    }
    if (data.objects) setR2Objects(data.objects);

    const updatedKey = String(data.r2Key || options.newKey || options.r2Key);
    const updatedCdnUrl = String(data.cdnUrl || '');
    if (updatedCdnUrl) {
      for (const docItem of Object.values(firestoreImageDocs)) {
        if (!docItem?.slotId || docItem.isDeleted || !docItem.src) continue;
        const k = docItem.r2Key || extractR2KeyFromUrl(docItem.src);
        if (k === options.r2Key) {
          await saveSiteImageInFirestore({
            slotId: docItem.slotId,
            page: docItem.page || 'index.html',
            slotIndex: docItem.slotIndex ?? 0,
            type: docItem.type || 'img',
            label: docItem.label || 'Image Slot',
            sectionContext: docItem.sectionContext || 'Page Content',
            src: updatedCdnUrl,
            lightboxHref: updatedCdnUrl,
            r2Key: updatedKey,
            alt: options.alt ?? docItem.alt ?? '',
          });
        }
      }
      for (const secItem of firestoreSectionDocs) {
        if (!secItem?.itemId || !secItem.src || secItem.sectionKey === 'deleted_section_item') {
          continue;
        }
        const k = secItem.r2Key || extractR2KeyFromUrl(secItem.src);
        if (k === options.r2Key) {
          await saveSectionGalleryItemInFirestore({
            ...secItem,
            src: updatedCdnUrl,
            r2Key: updatedKey,
            alt: options.alt ?? secItem.alt,
          });
        }
      }
    }

    setCacheBuster((prev) => prev + 1);
    showNotice(`Updated R2 metadata for "${updatedKey}".`);
  };

  const handleDeleteR2Object = async (r2Key: string) => {
    const res = await fetch(`/api/r2?key=${encodeURIComponent(r2Key)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      showNotice(data.error || 'Failed to delete R2 object', 'error');
      return;
    }
    if (data.objects) setR2Objects(data.objects);

    // Cascade delete any Firestore site_images & hero slides referencing this deleted R2 key
    for (const docItem of Object.values(firestoreImageDocs)) {
      if (!docItem?.slotId) continue;
      const k = docItem.r2Key || extractR2KeyFromUrl(docItem.src);
      if (k === r2Key) {
        await deleteSiteImageInFirestore(docItem.slotId);
      }
    }
    for (const secItem of firestoreSectionDocs) {
      if (!secItem?.itemId) continue;
      const k = secItem.r2Key || extractR2KeyFromUrl(secItem.src);
      if (k === r2Key) {
        await deleteSectionGalleryItemInFirestore(secItem.itemId);
      }
    }

    setCacheBuster((prev) => prev + 1);
    showNotice(`Deleted "${r2Key}" from R2 bucket and cleared linked Firestore slots.`);
  };

  const handleResetCurrentPage = async () => {
    setResettingPage(true);
    try {
      const pageSlotIds = new Set(
        slots.filter((s) => s.page === selectedPage).map((s) => s.slotId)
      );
      for (const docItem of Object.values(firestoreImageDocs)) {
        if (docItem?.slotId && (docItem.page === selectedPage || pageSlotIds.has(docItem.slotId))) {
          pageSlotIds.add(docItem.slotId);
        }
      }
      for (const slotId of pageSlotIds) {
        if (firestoreImageDocs[slotId]) {
          await deleteSiteImageInFirestore(slotId);
        }
      }

      for (const secItem of firestoreSectionDocs) {
        if (secItem.page === selectedPage && secItem.itemId) {
          await deleteSectionGalleryItemInFirestore(secItem.itemId);
        }
      }

      setCacheBuster((prev) => prev + 1);
      showNotice(`Cleared all saved images for ${currentPageMeta.title} from Firestore.`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to clear page images', 'error');
    } finally {
      setResettingPage(false);
    }
  };

  const handleResetEntireSite = async () => {
    setResettingAll(true);
    try {
      for (const slotId of Object.keys(firestoreImageDocs)) {
        await deleteSiteImageInFirestore(slotId);
      }
      for (const secItem of firestoreSectionDocs) {
        if (secItem.itemId) {
          await deleteSectionGalleryItemInFirestore(secItem.itemId);
        }
      }

      setCacheBuster((prev) => prev + 1);
      showNotice('Wiped all image assignments across all 12 pages from Firestore.');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Full wipe failed', 'error');
    } finally {
      setResettingAll(false);
    }
  };

  const toggleAllSections = (collapse: boolean) => {
    const next: Record<string, boolean> = {};
    for (const grp of parentSections) {
      next[grp.id] = collapse;
    }
    setCollapsedSections(next);
  };

  const handleCopySlotUrl = async (slot: ImageSlot) => {
    if (!slot.src) return;
    try {
      await navigator.clipboard.writeText(slot.src);
      setCopiedUrlId(slot.slotId);
      setTimeout(() => {
        setCopiedUrlId((prev) => (prev === slot.slotId ? null : prev));
      }, 2000);
    } catch {
      // Ignore restricted clipboard
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#090d0b] text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Loading Nisha Travelling CMS...</span>
        </div>
      </div>
    );
  }

  if (!adminAuthenticated) {
    return (
      <AdminLoginCard
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        loginError={loginError}
        loggingIn={loggingIn}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onSubmit={handleAdminLogin}
      />
    );
  }

  const r2Connected = Boolean(r2Status?.testResult?.ok);
  const filteredR2PickerObjects = r2Objects.filter((obj) => {
    const q = r2PickerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      obj.r2Key.toLowerCase().includes(q) ||
      (obj.title || '').toLowerCase().includes(q) ||
      (obj.alt || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#090d0b] text-slate-100 flex flex-col">
      {/* Sticky 3-Zone Header */}
      <header className="sticky top-0 z-30 h-14 px-4 lg:px-6 bg-[#101714] border-b border-emerald-950/90 flex items-center justify-between gap-4">
        {/* Left: Brand & R2 Status */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            <span className="w-7 h-7 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </span>
            <span>Nisha Travelling CMS</span>
          </Link>

          <span className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 pl-3 border-l border-emerald-950/80 whitespace-nowrap">
            <span
              className={`w-2 h-2 rounded-full ${
                r2Connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-[11px]">
              {r2Status?.bucketName || 'nishatravels'}
            </span>
            <span className="text-slate-500">·</span>
            <span>{r2Connected ? 'R2 Connected' : 'Check R2 Settings'}</span>
          </span>
        </div>

        {/* Center: 4 Workspace Tabs */}
        <nav
          aria-label="CMS Workspace"
          className="hidden md:flex items-center gap-1 bg-[#090d0b] p-1 rounded-md border border-emerald-950/80"
        >
          {(
            [
              { id: 'pages', label: 'Pages & Sections' },
              { id: 'texts', label: 'Site Texts Editor' },
              { id: 'r2-bucket', label: 'R2 Media Bucket' },
              { id: 'sync-settings', label: 'Sync & R2 Settings' },
            ] as { id: AdminTab; label: string }[]
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Sync CTA + View Live + Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleSyncSavedImagesToSiteR2()}
            disabled={syncingToSite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingToSite ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {syncingToSite ? 'Syncing R2...' : 'Sync R2 <-> Firestore'}
            </span>
            <span className="sm:hidden">{syncingToSite ? 'Syncing...' : 'Sync R2'}</span>
          </button>

          <a
            href={`/${selectedPage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-slate-900 text-slate-200 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
            title={`Preview ${currentPageMeta.title}`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">View Live</span>
          </a>

          <button
            type="button"
            onClick={() => void handleAdminLogout()}
            className="p-1.5 rounded-md bg-[#090d0b] hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-[#101714] border-b border-emerald-950/80 overflow-x-auto">
        {(
          [
            { id: 'pages', label: 'Pages & Sections' },
            { id: 'texts', label: 'Site Texts' },
            { id: 'r2-bucket', label: 'R2 Bucket' },
            { id: 'sync-settings', label: 'Sync & Settings' },
          ] as { id: AdminTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 bg-[#090d0b] border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transient Notification Banner */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-lg border shadow-xl flex items-center gap-3 text-xs font-medium ${
            toast.type === 'error'
              ? 'bg-red-950 border-red-700 text-red-100'
              : 'bg-[#101714] border-emerald-600 text-emerald-100'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 2-Column Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Sidebar: All 12 Pages + Parent -> Sub-Section Jump Tree */}
        <aside className="w-full lg:w-68 shrink-0 bg-[#0d1411] border-b lg:border-b-0 lg:border-r border-emerald-950/80 flex flex-col">
          <div className="p-4 space-y-5">
            {/* Step 1: 12 Website Pages */}
            <div className="space-y-2">
              <div className="px-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <span>Website Pages</span>
                <span className="font-mono tabular-nums text-amber-400">{pages.length}</span>
              </div>

              <div className="space-y-1 max-h-64 lg:max-h-none overflow-y-auto pr-0.5">
                {pages.map((p, idx) => {
                  const isActive = selectedPage === p.file;
                  const imgCount = mergedSlots.filter((s) => s.page === p.file && !s.isDeleted).length;
                  const totalPageSlots = mergedSlots.filter((s) => s.page === p.file).length;
                  const pageTxtList = mergedTexts.filter((t) => t.page === p.file);
                  const editedTxtCount = pageTxtList.filter((t) => t.isModified || t.isDeleted).length;

                  return (
                    <button
                      key={p.file}
                      type="button"
                      onClick={() => {
                        setSelectedPage(p.file);
                        setEditingTextId(null);
                        setEditingCaptionId(null);
                        setConfirmClearSlotId(null);
                        if (activeTab !== 'pages' && activeTab !== 'texts') {
                          setActiveTab('pages');
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-[#101714]'
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            isActive ? 'text-slate-950/75' : 'text-slate-500'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate">{p.title}</span>
                      </span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ml-2 ${
                          isActive ? 'text-slate-950/80' : 'text-slate-500'
                        }`}
                        title={
                          activeTab === 'texts'
                            ? `${editedTxtCount} edited / ${pageTxtList.length} text slots`
                            : `${imgCount} active images / ${totalPageSlots} total slots`
                        }
                      >
                        {activeTab === 'texts'
                          ? editedTxtCount > 0
                            ? `${editedTxtCount}/${pageTxtList.length}`
                            : `${pageTxtList.length}`
                          : `${imgCount}/${totalPageSlots}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Parent Section -> Sub-Section Jump Tree */}
            <div className="pt-4 border-t border-emerald-950/80 space-y-2">
              <div className="px-1.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <span className="truncate">
                  {activeTab === 'texts' ? `${currentPageMeta.title} Texts` : `${currentPageMeta.title} Tree`}
                </span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {parentSections.length}
                </span>
              </div>

              <div className="space-y-1 max-h-72 lg:max-h-[42vh] overflow-y-auto pr-0.5">
                {parentSections.map((sec) => {
                  const hasMultipleSubs =
                    sec.subSections.length > 1 ||
                    (sec.subSections[0] && sec.subSections[0].subSectionName !== 'Overview & General');
                  const isExpanded = expandedSidebarSections[sec.id] ?? true;

                  return (
                    <div key={sec.id} className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        {hasMultipleSubs ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSidebarSections((prev) => ({
                                ...prev,
                                [sec.id]: !isExpanded,
                              }))
                            }
                            className="p-1 text-slate-500 hover:text-slate-200 shrink-0"
                            aria-label={`Toggle ${sec.sectionName}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <span className="w-5 shrink-0" />
                        )}

                        <a
                          href={`#${sec.id}`}
                          onClick={() => {
                            if (activeTab !== 'pages' && activeTab !== 'texts') {
                              setActiveTab('pages');
                            }
                          }}
                          className="flex-1 flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:text-amber-300 hover:bg-[#101714] transition-colors min-w-0"
                        >
                          <span className="truncate">
                            <span className="font-mono text-[10px] text-amber-400/90 mr-1.5">
                              {String(sec.indexNumber).padStart(2, '0')}
                            </span>
                            {sec.sectionName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 tabular-nums ml-1.5 shrink-0">
                            {activeTab === 'texts' ? sec.totalTexts : sec.totalImages + sec.totalTexts}
                          </span>
                        </a>
                      </div>

                      {hasMultipleSubs && isExpanded && (
                        <div className="ml-6 pl-2 border-l border-emerald-950/90 space-y-0.5">
                          {sec.subSections.map((sub) => (
                            <a
                              key={sub.id}
                              href={`#${sub.id}`}
                              onClick={() => {
                                if (activeTab !== 'pages' && activeTab !== 'texts') {
                                  setActiveTab('pages');
                                }
                              }}
                              className="flex items-center justify-between px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-100 hover:bg-[#101714] transition-colors"
                            >
                              <span className="truncate">{sub.subSectionName}</span>
                              <span className="font-mono text-[10px] text-slate-600 tabular-nums ml-1.5 shrink-0">
                                {activeTab === 'texts'
                                  ? sub.texts.length
                                  : sub.images.length + sub.texts.length}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <main className="flex-1 min-w-0 p-5 lg:p-8">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
              <span>Loading all pages, section trees, and Cloudflare R2 objects...</span>
            </div>
          ) : activeTab === 'r2-bucket' ? (
            <R2BucketPanel
              r2Status={r2Status}
              r2Objects={r2Objects}
              pages={pages}
              allSlots={mergedSlots}
              cacheBuster={cacheBuster}
              loadingR2={loadingR2}
              onRefreshR2={fetchR2Status}
              onUploadR2Files={handleUploadR2Files}
              onUpdateR2Meta={handleUpdateR2Meta}
              onDeleteR2Object={handleDeleteR2Object}
              onAssignR2ToSlot={handleAssignR2ToSlot}
            />
          ) : activeTab === 'sync-settings' ? (
            <SyncSettingsPanel
              currentPageMeta={currentPageMeta}
              r2Status={r2Status}
              syncingToSite={syncingToSite}
              testingR2={testingR2}
              savingCreds={savingCreds}
              resettingPage={resettingPage}
              resettingAll={resettingAll}
              lastSyncReport={lastSyncReport}
              onSyncSavedImagesToSiteR2={handleSyncSavedImagesToSiteR2}
              onTestR2Connection={handleTestR2Connection}
              onSaveR2Credentials={handleSaveR2Credentials}
              onResetCurrentPage={handleResetCurrentPage}
              onResetEntireSite={handleResetEntireSite}
            />
          ) : (
            <div className="space-y-6">
              {/* Page Workspace Toolbar */}
              <section className="bg-[#101714] border border-emerald-950/90 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-amber-400">{currentPageMeta.file}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        {parentSections.length} parent section
                        {parentSections.length === 1 ? '' : 's'}
                      </span>
                      {activeTab === 'texts' && (
                        <>
                          <span>·</span>
                          <span className="font-mono tabular-nums text-emerald-400">
                            {pageTextStats.total} editable texts ({pageTextStats.edited} edited)
                          </span>
                        </>
                      )}
                    </div>
                    <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
                      {activeTab === 'texts'
                        ? `${currentPageMeta.title} — Site Texts Editor`
                        : `${currentPageMeta.title} Page Structure`}
                    </h1>
                    {activeTab === 'texts' && (
                      <p className="text-xs text-slate-400">
                        Edit Hero headlines, kickers, buttons, section headings, cards, and Site Footer copy directly to Firestore.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTextSection(allSectionNamesOnPage[0] || 'Page Content');
                        setShowCustomTextForm((v) => !v);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Text</span>
                    </button>
                  </div>
                </div>

                {/* Search + Filter Controls */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2 border-t border-emerald-950/70">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        activeTab === 'texts'
                          ? `Search headings, buttons, sub-sections, footer or copy on ${currentPageMeta.title}...`
                          : `Search sections, sub-sections, images, or copy on ${currentPageMeta.title}...`
                      }
                      className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {activeTab === 'texts' ? (
                      <div className="inline-flex bg-[#090d0b] border border-slate-800 rounded-md p-0.5">
                        {(
                          [
                            { id: 'all', label: `All Texts (${pageTextStats.total})` },
                            {
                              id: 'modified',
                              label: `Edited (${pageTextStats.edited + pageTextStats.hidden})`,
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTextStatusFilter(opt.id)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                              textStatusFilter === opt.id
                                ? 'bg-amber-500 text-slate-950 font-semibold'
                                : 'text-slate-400 hover:text-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex bg-[#090d0b] border border-slate-800 rounded-md p-0.5">
                        {(
                          [
                            { id: 'both', label: 'All' },
                            { id: 'images', label: 'Images' },
                            { id: 'text', label: 'Text' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setContentFilter(opt.id)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              contentFilter === opt.id
                                ? 'bg-amber-500 text-slate-950 font-semibold'
                                : 'text-slate-400 hover:text-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleAllSections(false)}
                      className="px-2.5 py-1.5 rounded-md text-xs text-slate-300 bg-[#090d0b] hover:bg-slate-900 border border-slate-800 whitespace-nowrap"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllSections(true)}
                      className="px-2.5 py-1.5 rounded-md text-xs text-slate-300 bg-[#090d0b] hover:bg-slate-900 border border-slate-800 whitespace-nowrap"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Inline Custom Text Creator */}
                {showCustomTextForm && (
                  <form
                    onSubmit={handleAddCustomText}
                    className="bg-[#090d0b] border border-emerald-900/70 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span>Add Custom Text Block to {currentPageMeta.title}</span>
                      <button
                        type="button"
                        onClick={() => setShowCustomTextForm(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={customTextSection}
                        onChange={(e) => setCustomTextSection(e.target.value)}
                        className="bg-[#101714] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100"
                      >
                        {allSectionNamesOnPage.map((secName) => (
                          <option key={secName} value={secName}>
                            Section: {secName}
                          </option>
                        ))}
                      </select>
                      <select
                        value={customTextTag}
                        onChange={(e) =>
                          setCustomTextTag(e.target.value as SiteTextSlot['tagName'])
                        }
                        className="bg-[#101714] border border-slate-800 rounded px-3 py-2 text-xs text-slate-100"
                      >
                        <option value="P">Paragraph (P)</option>
                        <option value="H2">Section Heading (H2)</option>
                        <option value="H3">Sub-Heading (H3)</option>
                        <option value="CUSTOM">Notice / Custom Text</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={customTextValue}
                      onChange={(e) => setCustomTextValue(e.target.value)}
                      placeholder="Enter text content..."
                      className="w-full bg-[#101714] border border-slate-800 focus:border-amber-500 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addingCustomText}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{addingCustomText ? 'Saving...' : 'Save Custom Text'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Parent Section -> Sub-Section Cards */}
              {parentSections.length === 0 ? (
                <div className="bg-[#101714] border border-emerald-950/90 rounded-lg p-12 text-center space-y-2">
                  <Layers className="w-7 h-7 text-slate-600 mx-auto" />
                  <div className="text-sm font-medium text-slate-300">
                    No matching sections found on {currentPageMeta.title}
                  </div>
                  <p className="text-xs text-slate-500">
                    Try clearing the search query or switching content filter to All.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {parentSections.map((sec) => {
                    const isCollapsed = Boolean(collapsedSections[sec.id]);
                    return (
                      <section
                        key={sec.id}
                        id={sec.id}
                        className="bg-[#101714] border border-emerald-950/90 rounded-lg overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [sec.id]: !isCollapsed,
                            }))
                          }
                          className="w-full px-5 py-4 bg-[#121c18] hover:bg-[#15211c] border-b border-emerald-950/80 flex items-center justify-between gap-4 text-left transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 tabular-nums shrink-0">
                              {String(sec.indexNumber).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                                {sec.sectionName}
                              </h2>
                              <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                                {sec.subSections.length} sub-section
                                {sec.subSections.length === 1 ? '' : 's'} · {sec.totalImages} image
                                {sec.totalImages === 1 ? '' : 's'} · {sec.totalTexts} text item
                                {sec.totalTexts === 1 ? '' : 's'}
                              </div>
                            </div>
                          </div>

                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {!isCollapsed && (
                          <div className="p-5 space-y-6">
                            {/* Single Canonical Hero Slideshow (4s) Manager inside Hero Banner Section */}
                            {sec.sectionName === 'Hero Banner' &&
                              activeTab !== 'texts' &&
                              contentFilter !== 'text' && (
                              <div className="bg-[#090d0b] border border-amber-500/30 rounded-lg p-4 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                  <div className="space-y-0.5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                                      Hero Section Slideshow (4-Second Auto-Rotate)
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                      Add multiple slides via R2 to cycle every 4 seconds on{' '}
                                      {currentPageMeta.title}. When slides exist, they override the single
                                      banner image below.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setR2PickerTarget({ mode: 'hero-slide' });
                                        setR2PickerSearch('');
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#101714] hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
                                    >
                                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Pick from R2</span>
                                    </button>

                                    <label
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                        uploadingTargetId === 'hero-add-new'
                                          ? 'opacity-50 pointer-events-none'
                                          : ''
                                      }`}
                                    >
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleAddHeroSlideFiles}
                                        className="hidden"
                                      />
                                      {uploadingTargetId === 'hero-add-new' ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span>Uploading...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>Upload Slide(s)</span>
                                        </>
                                      )}
                                    </label>
                                  </div>
                                </div>

                                {pageHeroSlides.length === 0 ? (
                                  <div className="text-xs text-slate-500 py-2">
                                    No slideshow slides added yet — single Hero Banner Background slot
                                    is active.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {pageHeroSlides.map((slide, sIdx) => (
                                      <article
                                        key={slide.itemId}
                                        className="bg-[#101714] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
                                      >
                                        <div>
                                          <div className="h-36 bg-slate-900 border-b border-slate-800 overflow-hidden">
                                            <img
                                              src={resolveImageUrl(slide.src, cacheBuster)}
                                              alt={slide.alt || slide.title}
                                              referrerPolicy="no-referrer"
                                              className="w-full h-full object-cover"
                                              loading="lazy"
                                            />
                                          </div>
                                          <div className="p-3 space-y-1">
                                            <div className="text-[11px] font-mono text-amber-400">
                                              Slide #{sIdx + 1}
                                            </div>
                                            <div className="text-xs font-semibold text-slate-100 truncate">
                                              {slide.title}
                                            </div>
                                            <div
                                              className="text-[10px] font-mono text-slate-500 truncate"
                                              title={slide.src}
                                            >
                                              {slide.r2Key || slide.src}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="px-3 pb-3 flex items-center gap-1.5">
                                          <label
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer ${
                                              uploadingTargetId === slide.itemId
                                                ? 'opacity-50 pointer-events-none'
                                                : ''
                                            }`}
                                          >
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) =>
                                                handleReplaceSectionImageFile(slide, e)
                                              }
                                              className="hidden"
                                            />
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>
                                              {uploadingTargetId === slide.itemId
                                                ? 'Uploading...'
                                                : 'Replace'}
                                            </span>
                                          </label>

                                          {confirmDeleteHeroSlideId === slide.itemId ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmDeleteHeroSlideId(null);
                                                void handleDeleteSectionImage(slide);
                                              }}
                                              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white"
                                            >
                                              Confirm
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setConfirmDeleteHeroSlideId(slide.itemId)
                                              }
                                              className="p-1.5 rounded-md bg-[#090d0b] hover:bg-red-950/70 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                                              title="Delete slide from Firestore & R2"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {sec.subSections.map((sub) => (
                              <div
                                key={sub.id}
                                id={sub.id}
                                className="bg-[#090d0b] border border-slate-800/90 rounded-lg p-4 space-y-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                                    {sub.subSectionName}
                                  </h3>
                                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                                    {sub.images.length} img · {sub.texts.length} text
                                  </span>
                                </div>

                                {/* Sub-Section Image Slots */}
                                {sub.images.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {sub.images.map((slot) => {
                                      const isUploadingThis = uploadingTargetId === slot.slotId;
                                      const isEditingCap = editingCaptionId === slot.slotId;

                                      return (
                                        <article
                                          key={slot.id}
                                          className="bg-[#101714] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
                                        >
                                          <div>
                                            <label className="relative h-40 bg-slate-900 border-b border-slate-800 overflow-hidden cursor-pointer flex items-center justify-center group">
                                              <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                  handleDirectSlotFileSelected(slot, e)
                                                }
                                                className="hidden"
                                              />
                                              {slot.isDeleted || !slot.src ? (
                                                <div className="text-center p-4 space-y-1">
                                                  <ImageIcon className="w-6 h-6 text-slate-600 mx-auto" />
                                                  <div className="text-xs font-medium text-slate-300">
                                                    Empty Image Slot
                                                  </div>
                                                  <div className="text-[11px] text-slate-500">
                                                    Click to upload to R2
                                                  </div>
                                                </div>
                                              ) : (
                                                <img
                                                  src={resolveImageUrl(slot.src, cacheBuster)}
                                                  alt={slot.alt || slot.label}
                                                  referrerPolicy="no-referrer"
                                                  loading="lazy"
                                                  className={`w-full h-full transition-transform duration-200 group-hover:scale-[1.02] ${
                                                    slot.type === 'logo' ||
                                                    slot.sectionContext.includes('Cross-Section')
                                                      ? 'object-contain p-5 bg-[#0d1411]'
                                                      : 'object-cover'
                                                  }`}
                                                />
                                              )}
                                              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-md">
                                                  <Upload className="w-3.5 h-3.5" />
                                                  <span>
                                                    {slot.isDeleted || !slot.src
                                                      ? 'Upload Photo'
                                                      : 'Replace Photo'}
                                                  </span>
                                                </span>
                                              </div>
                                            </label>

                                            <div className="p-3.5 space-y-1.5">
                                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                                                <span className="text-amber-400">
                                                  Slot #{slot.slotIndex + 1}
                                                </span>
                                                <span>{getSlotTypeName(slot.type)}</span>
                                              </div>

                                              {isEditingCap ? (
                                                <div className="space-y-2 pt-1">
                                                  <input
                                                    type="text"
                                                    value={editingCaptionTitle}
                                                    onChange={(e) =>
                                                      setEditingCaptionTitle(e.target.value)
                                                    }
                                                    placeholder="Slot label"
                                                    className="w-full bg-[#090d0b] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={editingCaptionAlt}
                                                    onChange={(e) =>
                                                      setEditingCaptionAlt(e.target.value)
                                                    }
                                                    placeholder="SEO alt description"
                                                    className="w-full bg-[#090d0b] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                                                  />
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => void handleSaveSlotCaption(slot)}
                                                      className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950"
                                                    >
                                                      Save
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setEditingCaptionId(null)}
                                                      className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div>
                                                  <h4
                                                    className="text-xs font-semibold text-slate-100 truncate"
                                                    title={slot.label}
                                                  >
                                                    {slot.label}
                                                  </h4>
                                                  <p
                                                    className="text-[11px] text-slate-400 truncate mt-0.5"
                                                    title={slot.alt || slot.src}
                                                  >
                                                    {slot.isDeleted || !slot.src
                                                      ? 'Awaiting upload'
                                                      : slot.alt || slot.src}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="px-3.5 pb-3.5 pt-1 flex items-center gap-1.5">
                                            <label
                                              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#090d0b] hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer whitespace-nowrap ${
                                                isUploadingThis
                                                  ? 'opacity-50 pointer-events-none'
                                                  : ''
                                              }`}
                                            >
                                              <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                  handleDirectSlotFileSelected(slot, e)
                                                }
                                                className="hidden"
                                              />
                                              {isUploadingThis ? (
                                                <>
                                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                  <span>Uploading...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Upload className="w-3.5 h-3.5" />
                                                  <span>
                                                    {slot.isDeleted || !slot.src
                                                      ? 'Upload'
                                                      : 'Replace'}
                                                  </span>
                                                </>
                                              )}
                                            </label>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setR2PickerTarget({ mode: 'slot', slot });
                                                setR2PickerSearch('');
                                              }}
                                              className="p-1.5 rounded-md bg-[#090d0b] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                                              title="Choose from R2 bucket"
                                            >
                                              <FolderOpen className="w-3.5 h-3.5" />
                                            </button>

                                            {!slot.isDeleted && slot.src && (
                                              <button
                                                type="button"
                                                onClick={() => void handleCopySlotUrl(slot)}
                                                className="p-1.5 rounded-md bg-[#090d0b] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                                                title="Copy image URL"
                                              >
                                                {copiedUrlId === slot.slotId ? (
                                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                ) : (
                                                  <Copy className="w-3.5 h-3.5" />
                                                )}
                                              </button>
                                            )}

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingCaptionId(slot.slotId);
                                                setEditingCaptionTitle(slot.label);
                                                setEditingCaptionAlt(slot.alt || '');
                                              }}
                                              className="p-1.5 rounded-md bg-[#090d0b] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                                              title="Edit label & SEO alt"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>

                                            {!slot.isDeleted && slot.src && (
                                              confirmClearSlotId === slot.slotId ? (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setConfirmClearSlotId(null);
                                                    void handleDeleteSlot(slot);
                                                  }}
                                                  className="px-2 py-1.5 rounded-md text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white"
                                                >
                                                  Confirm
                                                </button>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setConfirmClearSlotId(slot.slotId)
                                                  }
                                                  className="p-1.5 rounded-md bg-[#090d0b] hover:bg-red-950/70 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                                                  title="Clear slot photo"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )
                                            )}
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Sub-Section Editable Text Items */}
                                {sub.texts.length > 0 && (
                                  <div className="bg-[#101714] border border-slate-800/90 rounded-lg divide-y divide-slate-800/80">
                                    {sub.texts.map((txt) => {
                                      const isEditingThis = editingTextId === txt.textId;
                                      const isSavingThis = savingTextId === txt.textId;
                                      const roleLabel = getTextRoleLabel(txt);

                                      return (
                                        <div
                                          key={txt.textId}
                                          className={`p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                                            txt.isDeleted ? 'opacity-55' : ''
                                          }`}
                                        >
                                          <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                                                <Type className="w-3 h-3" />
                                                {roleLabel}
                                              </span>
                                              <span className="font-mono text-[10px] text-slate-500">
                                                {txt.textIndex >= 0 ? `#${txt.textIndex}` : 'CUSTOM'} · &lt;{txt.tagName}&gt;
                                              </span>
                                              {txt.isModified && !txt.isDeleted && (
                                                <span className="text-emerald-400 font-medium">· Edited</span>
                                              )}
                                              {txt.isCustomAdded && (
                                                <span className="text-sky-400 font-medium">· Custom</span>
                                              )}
                                              {txt.isDeleted && (
                                                <span className="text-red-400 font-medium">· Hidden</span>
                                              )}
                                            </div>

                                            {isEditingThis ? (
                                              <div className="space-y-2 pt-1">
                                                <textarea
                                                  rows={3}
                                                  autoFocus
                                                  value={editingTextValue}
                                                  onChange={(e) =>
                                                    setEditingTextValue(e.target.value)
                                                  }
                                                  onKeyDown={(e) => {
                                                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isSavingThis) {
                                                      e.preventDefault();
                                                      void handleSaveTextContent(txt, editingTextValue);
                                                    }
                                                  }}
                                                  className="w-full bg-[#090d0b] border border-amber-500/80 rounded px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none leading-relaxed"
                                                />
                                                {!txt.isCustomAdded && txt.defaultContent && (
                                                  <div className="text-[11px] text-slate-500 bg-[#090d0b] border border-slate-800/80 rounded px-2.5 py-1.5">
                                                    <span className="font-semibold text-slate-400">Default:</span>{' '}
                                                    {txt.defaultContent}
                                                  </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    type="button"
                                                    disabled={isSavingThis}
                                                    onClick={() =>
                                                      void handleSaveTextContent(
                                                        txt,
                                                        editingTextValue
                                                      )
                                                    }
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950"
                                                  >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>
                                                      {isSavingThis ? 'Saving...' : 'Save Text'}
                                                    </span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditingTextId(null)}
                                                    className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                                                  >
                                                    Cancel
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-1">
                                                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed break-words whitespace-pre-line">
                                                  {txt.content}
                                                </p>
                                                {txt.isModified &&
                                                  !txt.isCustomAdded &&
                                                  txt.defaultContent &&
                                                  txt.content !== txt.defaultContent && (
                                                    <p className="text-[11px] text-slate-500 line-clamp-2">
                                                      Original: {txt.defaultContent}
                                                    </p>
                                                  )}
                                              </div>
                                            )}
                                          </div>

                                          {!isEditingThis && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingTextId(txt.textId);
                                                  setEditingTextValue(txt.content);
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium bg-[#090d0b] hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                                <span>Edit</span>
                                              </button>

                                              {(txt.isModified || txt.isDeleted) &&
                                                !txt.isCustomAdded && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void handleRestoreOrDeleteText(txt, true)
                                                    }
                                                    disabled={isSavingThis}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-[#090d0b] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs"
                                                    title="Restore default copy"
                                                  >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span className="hidden lg:inline">Restore</span>
                                                  </button>
                                                )}

                                              {!txt.isDeleted && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    void handleRestoreOrDeleteText(txt, false)
                                                  }
                                                  disabled={isSavingThis}
                                                  className="p-1.5 rounded bg-[#090d0b] hover:bg-red-950/70 text-slate-400 hover:text-red-300 border border-slate-800"
                                                  title={
                                                    txt.isCustomAdded
                                                      ? 'Delete custom text'
                                                      : 'Hide text on page'
                                                  }
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Unified Quick R2 Picker Modal (Page Slots & Hero Slideshow) */}
      {r2PickerTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#101714] border border-emerald-950 rounded-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-emerald-950/80 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Pick Image from Cloudflare R2 Bucket
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r2PickerTarget.mode === 'slot'
                    ? `Target: ${r2PickerTarget.slot.page} · Slot #${r2PickerTarget.slot.slotIndex + 1} (${r2PickerTarget.slot.label})`
                    : `Target: ${currentPageMeta.title} · Hero Slideshow (4s)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setR2PickerTarget(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={r2PickerSearch}
                  onChange={(e) => setR2PickerSearch(e.target.value)}
                  placeholder="Filter R2 objects by key or title..."
                  className="w-full bg-[#090d0b] border border-slate-800 focus:border-amber-500 rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              {filteredR2PickerObjects.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No matching objects found in Cloudflare R2 bucket. Upload an image directly to a
                  slot or in the R2 Media Bucket tab.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
                  {filteredR2PickerObjects.map((obj) => (
                    <button
                      key={obj.r2Key}
                      type="button"
                      disabled={r2PickerBusyKey === obj.r2Key}
                      onClick={async () => {
                        setR2PickerBusyKey(obj.r2Key);
                        try {
                          if (r2PickerTarget.mode === 'slot') {
                            await handleAssignR2ToSlot(obj, r2PickerTarget.slot);
                          } else {
                            await handleAssignR2ToHeroSlide(obj);
                          }
                          setR2PickerTarget(null);
                        } finally {
                          setR2PickerBusyKey(null);
                        }
                      }}
                      className="text-left bg-[#090d0b] hover:border-amber-500 border border-slate-800 rounded-md overflow-hidden transition-colors flex flex-col"
                    >
                      <div className="h-28 w-full bg-slate-900 overflow-hidden">
                        <img
                          src={resolveImageUrl(obj.cdnUrl, cacheBuster)}
                          alt={obj.alt || obj.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2.5 space-y-0.5">
                        <div className="text-xs font-medium text-slate-100 truncate">
                          {r2PickerBusyKey === obj.r2Key ? 'Assigning...' : obj.title || obj.r2Key}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {formatBytes(obj.sizeBytes)} · {obj.r2Key}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
