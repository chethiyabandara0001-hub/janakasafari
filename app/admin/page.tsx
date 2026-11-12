'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  Check,
  X,
  Eye,
  ArrowUpRight,
  RefreshCw,
  Type,
  Plus,
  Trash2,
  Edit3,
  LogIn,
  LogOut,
  Layers,
} from 'lucide-react';
import {
  db,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  saveSiteImageInFirestore,
  deleteSiteImageInFirestore,
  saveSectionGalleryItemInFirestore,
  deleteSiteTextInFirestore,
  saveSiteTextInFirestore,
  subscribePublicCollection,
  uploadImageToR2Bucket,
  extractR2KeyFromUrl,
} from '@/lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import {
  INITIAL_FIREBASE_SECTION_IMAGES,
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

type SectionFilterTab = 'all' | 'hero' | 'sections' | 'gallery';

interface PageSectionGroup {
  id: string;
  indexNumber: number;
  sectionName: string;
  images: ImageSlot[];
  texts: SiteTextSlot[];
}

function getSlotTypeName(type: ImageSlot['type']): string {
  switch (type) {
    case 'hero-bg':
      return 'Hero Banner';
    case 'lightbox-img':
      return 'Gallery Lightbox Photo';
    case 'logo':
      return 'Brand Logo';
    case 'img':
    default:
      return 'Section Photo';
  }
}

export default function AdminStudioPage() {
  // Core Inventory State
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [sectionImages, setSectionImages] = useState<SeedSectionGalleryItem[]>([]);
  const [textSlots, setTextSlots] = useState<SiteTextSlot[]>([]);
  const [customTexts, setCustomTexts] = useState<SiteTextSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cacheBuster, setCacheBuster] = useState<number>(() => Date.now());

  // Authentication State
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  // Live Firestore Overrides
  const [firestoreImageDocs, setFirestoreImageDocs] = useState<Record<string, Partial<ImageSlot>>>({});
  const [firestoreSectionDocs, setFirestoreSectionDocs] = useState<SeedSectionGalleryItem[]>([]);
  const [firestoreTextDocs, setFirestoreTextDocs] = useState<Record<string, Partial<SiteTextSlot>>>({});

  // Step-by-Step Navigation State
  const [selectedPage, setSelectedPage] = useState<string>('index.html');
  const [activeTab, setActiveTab] = useState<SectionFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sectionContentFilter, setSectionContentFilter] = useState<'both' | 'images' | 'text'>('both');

  // Direct One-Click Upload State
  const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);
  const [syncingLive, setSyncingLive] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inline Text Editing State
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');
  const [savingTextId, setSavingTextId] = useState<string | null>(null);

  // Inline Image Caption / Alt Text Editing State
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingCaptionTitle, setEditingCaptionTitle] = useState<string>('');
  const [editingCaptionAlt, setEditingCaptionAlt] = useState<string>('');

  const showNotice = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Validate Firestore connectivity on boot
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

  const fetchInventory = useCallback(async () => {
    try {
      const [imgRes, cmsRes] = await Promise.all([
        fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (!imgRes.ok || !cmsRes.ok) {
        throw new Error('Failed to load page sections and images');
      }
      const [imgData, cmsData] = await Promise.all([imgRes.json(), cmsRes.json()]);
      setPages(imgData.pages || []);
      setSlots(imgData.slots || []);
      setSectionImages(cmsData.sectionGalleryItems || []);
      setTextSlots(cmsData.textSlots || []);
      setCustomTexts(cmsData.customTexts || []);
      setCacheBuster(Date.now());
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Error loading page content', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  // Verify Admin Session on Mount & Load Inventory
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
          const [imgRes, cmsRes] = await Promise.all([
            fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }),
            fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }),
          ]);
          if (active && imgRes.ok && cmsRes.ok) {
            const [imgData, cmsData] = await Promise.all([imgRes.json(), cmsRes.json()]);
            setPages(imgData.pages || []);
            setSlots(imgData.slots || []);
            setSectionImages(cmsData.sectionGalleryItems || []);
            setTextSlots(cmsData.textSlots || []);
            setCustomTexts(cmsData.customTexts || []);
            setCacheBuster(Date.now());
            setLoading(false);
          }
        }
      } catch {
        // Require manual login if session check fails
      } finally {
        if (active) setAuthChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to Live Firestore Collections
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, () => {});

    const unsubImages = subscribePublicCollection<{
      slotId: string;
      src: string;
      lightboxHref?: string;
      r2Key?: string;
      alt: string;
      label: string;
      sectionContext: string;
      isDeleted?: boolean;
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
        setFirestoreSectionDocs(docs.sort((a, b) => (a.order || 0) - (b.order || 0)));
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

  // Login & Logout Handlers
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
        body: JSON.stringify({
          action: 'login',
          email: emailClean,
          password: passwordRaw,
        }),
      });
      const data = await res.json().catch(() => ({}));
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
      await fetchInventory();
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

  // Merge Server State + Live Firestore State (with Deletion Tombstone Support)
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

  const mergedSectionImages = useMemo(() => {
    const map = new Map<string, SeedSectionGalleryItem>();
    for (const item of sectionImages) {
      if (item && item.itemId) {
        map.set(item.itemId, item);
      }
    }
    for (const fbItem of firestoreSectionDocs) {
      if (!fbItem || !fbItem.itemId) continue;
      if (fbItem.sectionKey === 'deleted_section_item' || fbItem.src === '/deleted') {
        map.delete(fbItem.itemId);
      } else if (fbItem.src && !fbItem.src.startsWith('data:')) {
        map.set(fbItem.itemId, fbItem);
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [sectionImages, firestoreSectionDocs]);

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
          sectionContext: fbDoc.sectionContext || 'Page Section',
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

  // Selected Page Data Organized Step-by-Step into Numbered Sections
  const currentPageMeta = useMemo(
    () => pages.find((p) => p.file === selectedPage) || { file: selectedPage, title: selectedPage },
    [pages, selectedPage]
  );

  const primaryHeroSlot = useMemo(
    () => mergedSlots.find((s) => s.page === selectedPage && s.type === 'hero-bg') || null,
    [mergedSlots, selectedPage]
  );

  const pageHeroSlides = useMemo(
    () =>
      mergedSectionImages.filter(
        (item) => item.page === selectedPage && item.sectionKey === 'hero_slideshow'
      ),
    [mergedSectionImages, selectedPage]
  );

  const pageExtraGallery = useMemo(
    () =>
      mergedSectionImages.filter(
        (item) => item.page === selectedPage && item.sectionKey !== 'hero_slideshow'
      ),
    [mergedSectionImages, selectedPage]
  );

  // Build ordered PageSectionGroup[] for the selected page from top to bottom
  const pageSections = useMemo<PageSectionGroup[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const pageSlots = mergedSlots.filter(
      (s) => s.page === selectedPage && s.type !== 'hero-bg'
    );
    const pageTexts = mergedTexts.filter((t) => t.page === selectedPage);

    const orderedNames: string[] = [];
    const seen = new Set<string>();

    for (const s of pageSlots) {
      const name = (s.sectionContext || 'Page Content').trim();
      if (!seen.has(name)) {
        seen.add(name);
        orderedNames.push(name);
      }
    }
    for (const t of pageTexts) {
      const name = (t.sectionContext || 'Page Content').trim();
      if (!seen.has(name)) {
        seen.add(name);
        orderedNames.push(name);
      }
    }

    const groups: PageSectionGroup[] = [];
    let runningIndex = 2; // Section 01 is always Top Hero Banner & Slideshow

    for (const secName of orderedNames) {
      let imgs = pageSlots.filter(
        (s) => (s.sectionContext || 'Page Content').trim() === secName
      );
      let txts = pageTexts.filter(
        (t) => (t.sectionContext || 'Page Content').trim() === secName
      );

      if (q) {
        const secMatches = secName.toLowerCase().includes(q);
        if (!secMatches) {
          imgs = imgs.filter(
            (s) =>
              s.label.toLowerCase().includes(q) ||
              s.alt.toLowerCase().includes(q)
          );
          txts = txts.filter((t) => t.content.toLowerCase().includes(q));
        }
      }

      if (imgs.length === 0 && txts.length === 0) continue;

      groups.push({
        id: `section-${runningIndex}`,
        indexNumber: runningIndex,
        sectionName: secName,
        images: imgs,
        texts: txts,
      });
      runningIndex++;
    }

    return groups;
  }, [mergedSlots, mergedTexts, selectedPage, searchQuery]);

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

  // --- Direct One-Click Image Actions for Page Slots ---
  const handleDirectSlotFileSelected = async (
    targetSlot: ImageSlot,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingTargetId(targetSlot.slotId);
    try {
      const r2Uploaded = await uploadImageToR2Bucket(file, {
        replaceKey:
          targetSlot.r2Key && !targetSlot.r2Key.startsWith('media/')
            ? targetSlot.r2Key
            : undefined,
        alt: targetSlot.alt || targetSlot.label,
        title: targetSlot.label,
        page: targetSlot.page,
      });

      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-slot-meta',
          page: targetSlot.page,
          slotIndex: targetSlot.slotIndex,
          scope: targetSlot.type === 'logo' ? 'global' : 'slot',
          altText: targetSlot.alt || targetSlot.label,
          externalUrl: r2Uploaded.cdnUrl,
          r2Key: r2Uploaded.r2Key,
          type: targetSlot.type,
          label: targetSlot.label,
          sectionContext: targetSlot.sectionContext,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update image');
      }

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

      showNotice(`Updated "${targetSlot.label}" in ${targetSlot.sectionContext}.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleSaveSlotCaption = async (slot: ImageSlot) => {
    setUploadingTargetId(slot.slotId);
    try {
      const newLabel = editingCaptionTitle.trim() || slot.label;
      const newAlt = editingCaptionAlt.trim();

      await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-slot-meta',
          page: slot.page,
          slotIndex: slot.slotIndex,
          scope: slot.type === 'logo' ? 'global' : 'slot',
          altText: newAlt,
          externalUrl: slot.src,
          r2Key: slot.r2Key,
          type: slot.type,
          label: newLabel,
          sectionContext: slot.sectionContext,
        }),
      });

      await saveSiteImageInFirestore({
        slotId: slot.slotId,
        page: slot.page,
        slotIndex: slot.slotIndex,
        type: slot.type,
        label: newLabel,
        sectionContext: slot.sectionContext,
        src: slot.src,
        lightboxHref: slot.lightboxHref || slot.src,
        r2Key: slot.r2Key,
        alt: newAlt,
      });

      setEditingCaptionId(null);
      showNotice(`Saved caption for "${newLabel}".`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save caption', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleDeleteSlot = async (slot: ImageSlot) => {
    setUploadingTargetId(slot.slotId);
    try {
      const r2KeyToDelete = slot.r2Key || extractR2KeyFromUrl(slot.src);
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slot.slotId
            ? { ...s, src: '', lightboxHref: '', r2Key: undefined, isDeleted: true, isModified: true }
            : s
        )
      );

      await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-slot',
          page: slot.page,
          slotIndex: slot.slotIndex,
          slotId: slot.slotId,
          r2Key: r2KeyToDelete,
          type: slot.type,
          label: slot.label,
          sectionContext: slot.sectionContext,
        }),
      });

      await saveSiteImageInFirestore({
        slotId: slot.slotId,
        page: slot.page,
        slotIndex: slot.slotIndex,
        type: slot.type,
        label: slot.label,
        sectionContext: slot.sectionContext,
        src: '/deleted',
        lightboxHref: '/deleted',
        alt: slot.alt || '',
      });

      showNotice(`Deleted "${slot.label}" from ${currentPageMeta.title}.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Delete failed', 'error');
      await fetchInventory();
    } finally {
      setUploadingTargetId(null);
    }
  };

  // --- Direct One-Click Hero Slideshow (4s) Actions ---
  const handleAddHeroSlideFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setUploadingTargetId('hero-add-new');
    try {
      let currentOrder = pageHeroSlides.length + 1;
      for (const file of files) {
        const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const uploaded = await uploadImageToR2Bucket(file, {
          alt: `${currentPageMeta.title} Hero Slide — ${cleanTitle}`,
          title: `Hero Slide #${currentOrder + 1}`,
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

        await fetch('/api/admin/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-section-image',
            ...newSlide,
          }),
        });

        await saveSectionGalleryItemInFirestore(newSlide);
        currentOrder++;
      }

      showNotice(
        `Added ${files.length} new Hero Slideshow image${files.length > 1 ? 's' : ''} (4s interval) to ${currentPageMeta.title}.`
      );
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to add hero slide', 'error');
    } finally {
      setUploadingTargetId(null);
    }
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
      const uploaded = await uploadImageToR2Bucket(file, {
        replaceKey:
          targetItem.r2Key && !targetItem.r2Key.startsWith('media/')
            ? targetItem.r2Key
            : undefined,
        alt: targetItem.alt || targetItem.title,
        title: targetItem.title,
        page: targetItem.page,
      });

      const updatedItem: SeedSectionGalleryItem = {
        ...targetItem,
        src: uploaded.cdnUrl,
        r2Key: uploaded.r2Key,
      };

      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-section-image',
          ...updatedItem,
        }),
      });

      await saveSectionGalleryItemInFirestore(updatedItem);
      showNotice(`Updated "${targetItem.title}" on ${currentPageMeta.title}.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to replace image', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  const handleDeleteSectionImage = async (item: SeedSectionGalleryItem) => {
    setUploadingTargetId(item.itemId);
    try {
      const r2KeyToDelete = item.r2Key || extractR2KeyFromUrl(item.src);
      setSectionImages((prev) => prev.filter((i) => i.itemId !== item.itemId));
      setFirestoreSectionDocs((prev) => [
        ...prev.filter((i) => i.itemId !== item.itemId),
        { ...item, sectionKey: 'deleted_section_item', src: '/deleted' },
      ]);

      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-section-image',
          itemId: item.itemId,
          r2Key: r2KeyToDelete,
        }),
      });

      await saveSectionGalleryItemInFirestore({
        ...item,
        sectionKey: 'deleted_section_item',
        src: '/deleted',
      });

      showNotice(`Removed "${item.title}" from ${currentPageMeta.title}.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to delete image', 'error');
      await fetchInventory();
    } finally {
      setUploadingTargetId(null);
    }
  };

  // --- Direct One-Click Extra Gallery Upload ---
  const handleAddGalleryPhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setUploadingTargetId('gallery-add-new');
    try {
      let currentOrder = mergedSectionImages.length + 1;
      for (const file of files) {
        const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const uploaded = await uploadImageToR2Bucket(file, {
          alt: cleanTitle,
          title: cleanTitle,
          page: selectedPage,
        });

        const newGalleryItem: SeedSectionGalleryItem = {
          itemId: `sec_${selectedPage.replace('.html', '').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${currentOrder}`,
          page: selectedPage,
          sectionKey: 'custom_section_gallery',
          sectionTitle: 'Featured Safari Moments',
          title: cleanTitle || 'Safari Wildlife Photo',
          caption: `${currentPageMeta.title} wildlife highlight`,
          src: uploaded.cdnUrl,
          r2Key: uploaded.r2Key,
          alt: cleanTitle || 'Safari photo',
          order: currentOrder,
        };

        await fetch('/api/admin/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-section-image',
            ...newGalleryItem,
          }),
        });

        await saveSectionGalleryItemInFirestore(newGalleryItem);
        currentOrder++;
      }

      showNotice(`Added ${files.length} photo(s) to ${currentPageMeta.title} gallery.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to upload gallery photo', 'error');
    } finally {
      setUploadingTargetId(null);
    }
  };

  // --- Inline Text Save / Restore / Hide ---
  const handleSaveInlineText = async (slot: SiteTextSlot) => {
    setSavingTextId(slot.textId);
    try {
      const payload = {
        textId: slot.textId,
        page: slot.page,
        textIndex: slot.textIndex,
        tagName: slot.tagName,
        sectionContext: slot.sectionContext,
        content: editingTextValue,
        isDeleted: false,
        isCustomAdded: slot.isCustomAdded,
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

      await saveSiteTextInFirestore(payload);
      setEditingTextId(null);
      showNotice(`Saved text in "${slot.sectionContext}".`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to save text', 'error');
    } finally {
      setSavingTextId(null);
    }
  };

  const handleRestoreOrDeleteText = async (slot: SiteTextSlot, restoreDefault: boolean) => {
    setSavingTextId(slot.textId);
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

      showNotice(
        restoreDefault
          ? `Restored default text in "${slot.sectionContext}".`
          : `Hidden text item on ${currentPageMeta.title}.`
      );
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Text update failed', 'error');
    } finally {
      setSavingTextId(null);
    }
  };

  // --- Clear Current Page Images or Sync All Changes ---
  const handleResetCurrentPage = async () => {
    setSyncingLive(true);
    try {
      await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          target: 'page',
          page: selectedPage,
        }),
      });

      const pageSlotIds = slots.filter((s) => s.page === selectedPage).map((s) => s.slotId);
      for (const slotId of pageSlotIds) {
        await deleteSiteImageInFirestore(slotId);
      }

      const defaultPageHeroSlides = INITIAL_FIREBASE_SECTION_IMAGES.filter(
        (item) => item.page === selectedPage
      );
      for (const item of defaultPageHeroSlides) {
        await saveSectionGalleryItemInFirestore(item);
      }

      showNotice(`Cleared all images on ${currentPageMeta.title}.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to clear page images', 'error');
    } finally {
      setSyncingLive(false);
    }
  };

  const handlePublishSyncAll = async () => {
    setSyncingLive(true);
    try {
      const pageActiveSlots = mergedSlots.filter(
        (s) => s.page === selectedPage && !s.isDeleted && s.src
      );
      await Promise.all(
        pageActiveSlots.map((slot) =>
          saveSiteImageInFirestore({
            slotId: slot.slotId,
            page: slot.page,
            slotIndex: slot.slotIndex,
            type: slot.type,
            label: slot.label,
            sectionContext: slot.sectionContext,
            src: slot.src,
            lightboxHref: slot.lightboxHref || slot.src,
            r2Key: slot.r2Key || extractR2KeyFromUrl(slot.src),
            alt: slot.alt || slot.label,
          })
        )
      );

      const pageSecItems = mergedSectionImages.filter((item) => item.page === selectedPage);
      await Promise.all(pageSecItems.map((item) => saveSectionGalleryItemInFirestore(item)));

      showNotice(`Published all sections & slideshow images for ${currentPageMeta.title}.`);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncingLive(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!adminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-7 space-y-6">
          <div className="space-y-1 text-center">
            <div className="text-xs font-medium text-amber-500">Nisha Safari</div>
            <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
              Admin Sign In
            </h1>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div className="px-3 py-2 rounded-md bg-red-950/60 border border-red-800 text-xs text-red-300">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="block text-xs font-medium text-slate-300">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-md px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{loggingIn ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 text-center">
            <Link
              href="/index.html"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Back to Website</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalHeroSlidesCount =
    pageHeroSlides.length > 0
      ? pageHeroSlides.length
      : primaryHeroSlot && !primaryHeroSlot.isDeleted && primaryHeroSlot.src
      ? 1
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800">
        <Link
          href="/admin"
          className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          Nisha Safari Admin
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'all' ? 'text-amber-400 font-semibold underline underline-offset-4' : ''
            }`}
          >
            All Page Sections
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'hero' ? 'text-amber-400 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Hero Slideshow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sections'
                ? 'text-amber-400 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Content Sections
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'gallery'
                ? 'text-amber-400 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Bottom Gallery
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`/${selectedPage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Live Page</span>
          </a>
        </div>
      </header>

      {/* Main 2-Column Workspace: Left Step-by-Step Sidebar + Right Sectionized Page Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Sidebar: Step 1 Choose Page -> Step 2 Jump to Section */}
        <aside className="w-full lg:w-72 shrink-0 bg-slate-900/70 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div className="p-4 space-y-6">
            {/* Step 1: Website Pages */}
            <div className="space-y-2">
              <div className="px-2 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Step 1. Select Page</span>
                <span className="font-mono tabular-nums">{pages.length} pages</span>
              </div>

              <div className="space-y-1 max-h-72 lg:max-h-80 overflow-y-auto pr-1">
                {pages.map((p, idx) => {
                  const isActive = selectedPage === p.file;
                  const pageImgCount =
                    mergedSlots.filter((s) => s.page === p.file && !s.isDeleted).length +
                    mergedSectionImages.filter((s) => s.page === p.file).length;

                  return (
                    <button
                      key={p.file}
                      type="button"
                      onClick={() => {
                        setSelectedPage(p.file);
                        setEditingTextId(null);
                        setEditingCaptionId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        <span
                          className={`font-mono tabular-nums text-[11px] ${
                            isActive ? 'text-slate-950/75' : 'text-slate-500'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="truncate">{p.title}</span>
                      </span>
                      <span
                        className={`font-mono tabular-nums text-[11px] ml-2 ${
                          isActive ? 'text-slate-950/80' : 'text-slate-500'
                        }`}
                      >
                        {pageImgCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Sections on Selected Page */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="px-2 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  Step 2. {currentPageMeta.title} Sections
                </span>
                <span className="font-mono tabular-nums">{pageSections.length + 1}</span>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                <a
                  href="#section-hero"
                  onClick={() => setActiveTab('all')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                >
                  <span className="truncate">01. Hero Slideshow (4s)</span>
                  <span className="font-mono tabular-nums text-[11px] text-amber-400 ml-2">
                    {totalHeroSlidesCount}
                  </span>
                </a>

                {pageSections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveTab('all')}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="truncate">
                      {String(sec.indexNumber).padStart(2, '0')}. {sec.sectionName}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500 ml-2">
                      {sec.images.length}
                    </span>
                  </a>
                ))}

                <a
                  href="#section-bottom-gallery"
                  onClick={() => setActiveTab('all')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                >
                  <span className="truncate">
                    {String(pageSections.length + 2).padStart(2, '0')}. Extra Bottom Gallery
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 ml-2">
                    {pageExtraGallery.length}
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Actions */}
          <div className="p-4 border-t border-slate-800 space-y-2">
            <button
              type="button"
              onClick={handlePublishSyncAll}
              disabled={syncingLive}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncingLive ? 'animate-spin' : ''}`} />
              <span>{syncingLive ? 'Syncing Page...' : 'Sync Page Changes'}</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Area: Step-by-Step Sections for Selected Page */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          {/* Page Control Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Currently Editing Page</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-amber-400">{currentPageMeta.file}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {pageSections.length + 1} sections on this page
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
                {currentPageMeta.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search within this page */}
              <div className="relative w-60 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search in ${currentPageMeta.title}...`}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Toggle Images / Text visibility inside sections */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md">
                <button
                  type="button"
                  onClick={() => setSectionContentFilter('both')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    sectionContentFilter === 'both'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Images & Text
                </button>
                <button
                  type="button"
                  onClick={() => setSectionContentFilter('images')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    sectionContentFilter === 'images'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Images Only
                </button>
                <button
                  type="button"
                  onClick={() => setSectionContentFilter('text')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    sectionContentFilter === 'text'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Text Only
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetCurrentPage}
                disabled={syncingLive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Page Images</span>
              </button>
            </div>
          </div>

          {/* Status Toast Banner */}
          {toast && (
            <div
              className={`px-4 py-3 rounded-md border flex items-center justify-between text-xs font-medium ${
                toast.type === 'error'
                  ? 'bg-red-950/70 border-red-800 text-red-200'
                  : 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
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

          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4 animate-pulse"
                >
                  <div className="h-5 bg-slate-800 rounded w-1/3" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="h-48 bg-slate-800 rounded" />
                    <div className="h-48 bg-slate-800 rounded" />
                    <div className="h-48 bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* =====================================================================
                  SECTION 01: TOP HERO BANNER & 4-SECOND SLIDESHOW
                 ===================================================================== */}
              {(activeTab === 'all' || activeTab === 'hero') && (
                <section
                  id="section-hero"
                  className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono font-semibold text-amber-400">Section 01</span>
                        <span aria-hidden="true">·</span>
                        <span>Top of {currentPageMeta.title}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-emerald-400">
                          {totalHeroSlidesCount} active slide{totalHeroSlidesCount === 1 ? '' : 's'} (4s interval)
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-slate-100">
                        01. Top Hero Banner & 4-Second Image Slideshow
                      </h2>
                      <p className="text-xs text-slate-400">
                        Upload multiple hero photos below. They automatically crossfade every 4 seconds at the top of{' '}
                        <span className="text-slate-200 font-medium">{currentPageMeta.title}</span>.
                      </p>
                    </div>

                    <label
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        uploadingTargetId === 'hero-add-new' ? 'opacity-50 pointer-events-none' : ''
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
                          <span>Uploading Slide...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Hero Slide Image (4s)</span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {/* Fallback Single Banner if no multi-slides exist yet */}
                    {pageHeroSlides.length === 0 &&
                      primaryHeroSlot &&
                      !primaryHeroSlot.isDeleted &&
                      primaryHeroSlot.src && (
                        <article className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
                          <div>
                            <label className="relative h-44 bg-slate-900 border-b border-slate-800 overflow-hidden cursor-pointer flex items-center justify-center group">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDirectSlotFileSelected(primaryHeroSlot, e)}
                                className="hidden"
                              />
                              <img
                                src={resolveImageUrl(primaryHeroSlot.src)}
                                alt={primaryHeroSlot.alt || primaryHeroSlot.label}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-md">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Choose New Image</span>
                                </span>
                              </div>
                            </label>

                            <div className="p-4 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="font-mono font-semibold text-amber-400">
                                  Slide 01
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>Main Hero Banner</span>
                              </div>
                              <h3 className="text-sm font-medium text-slate-100 truncate">
                                {primaryHeroSlot.label}
                              </h3>
                            </div>
                          </div>

                          <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                            <label
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                uploadingTargetId === primaryHeroSlot.slotId
                                  ? 'opacity-50 pointer-events-none'
                                  : ''
                              }`}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDirectSlotFileSelected(primaryHeroSlot, e)}
                                className="hidden"
                              />
                              {uploadingTargetId === primaryHeroSlot.slotId ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Replace Photo</span>
                                </>
                              )}
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(primaryHeroSlot)}
                              disabled={uploadingTargetId === primaryHeroSlot.slotId}
                              className="p-2 rounded-md bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                              title="Clear Slide 01"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </article>
                      )}

                    {/* Sequential Active Hero Slideshow (1..N) */}
                    {pageHeroSlides.map((slide, idx) => (
                      <article
                        key={slide.itemId}
                        className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <label className="relative h-44 bg-slate-900 border-b border-slate-800 overflow-hidden cursor-pointer flex items-center justify-center group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleReplaceSectionImageFile(slide, e)}
                              className="hidden"
                            />
                            <img
                              src={resolveImageUrl(slide.src)}
                              alt={slide.alt || slide.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-md">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Replace Slide Photo</span>
                              </span>
                            </div>
                          </label>

                          <div className="p-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <span className="font-mono font-semibold text-emerald-400">
                                Slide {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>4s Auto-Slideshow</span>
                            </div>
                            <h3 className="text-sm font-medium text-slate-100 truncate">
                              {slide.title}
                            </h3>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                          <label
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              uploadingTargetId === slide.itemId
                                ? 'opacity-50 pointer-events-none'
                                : ''
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleReplaceSectionImageFile(slide, e)}
                              className="hidden"
                            />
                            {uploadingTargetId === slide.itemId ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Replace Photo</span>
                              </>
                            )}
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteSectionImage(slide)}
                            disabled={uploadingTargetId === slide.itemId}
                            className="p-2 rounded-md bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                            title="Delete this Hero Slide"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </article>
                    ))}

                    {/* Direct One-Click Add Slide Card */}
                    <label
                      className={`min-h-[240px] rounded-lg bg-slate-950 border border-dashed border-slate-700 hover:border-amber-500 flex flex-col items-center justify-center p-5 text-center transition-colors cursor-pointer group ${
                        uploadingTargetId === 'hero-add-new' ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAddHeroSlideFiles}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-900 group-hover:bg-amber-500 text-amber-400 group-hover:text-slate-950 flex items-center justify-center mb-2.5 transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-100">
                        Add Slide {String(totalHeroSlidesCount + 1).padStart(2, '0')} to Hero Slideshow
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Click to choose one or more photos from your device
                      </span>
                    </label>
                  </div>
                </section>
              )}

              {/* =====================================================================
                  SECTIONS 02..N: EVERY CONTENT SECTION ON THE PAGE IN TOP-TO-BOTTOM ORDER
                 ===================================================================== */}
              {(activeTab === 'all' || activeTab === 'sections') &&
                pageSections.map((sec) => (
                  <section
                    key={sec.id}
                    id={sec.id}
                    className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono font-semibold text-amber-400">
                            Section {String(sec.indexNumber).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{currentPageMeta.title}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {sec.images.length} image{sec.images.length === 1 ? '' : 's'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {sec.texts.length} text block{sec.texts.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <h2 className="text-base font-semibold text-slate-100">
                          {String(sec.indexNumber).padStart(2, '0')}. {sec.sectionName}
                        </h2>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Part A: Images in this Section */}
                      {(sectionContentFilter === 'both' || sectionContentFilter === 'images') &&
                        sec.images.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-400" />
                                <span>Images in &ldquo;{sec.sectionName}&rdquo;</span>
                              </span>
                              <span className="font-mono tabular-nums">
                                {sec.images.length} photo{sec.images.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                              {sec.images.map((slot) => {
                                const isEditingCap = editingCaptionId === slot.slotId;
                                const isUploadingThis = uploadingTargetId === slot.slotId;

                                return (
                                  <article
                                    key={slot.id}
                                    className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
                                  >
                                    <div>
                                      <label className="relative h-44 bg-slate-900 border-b border-slate-800 overflow-hidden cursor-pointer flex items-center justify-center group">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleDirectSlotFileSelected(slot, e)}
                                          className="hidden"
                                        />
                                        {slot.isDeleted || !slot.src ? (
                                          <div className="flex flex-col items-center justify-center text-center p-4 space-y-1.5">
                                            <ImageIcon className="w-6 h-6 text-slate-500" />
                                            <span className="text-xs font-medium text-slate-300">
                                              Empty Slot
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                              Click to upload a new photo here
                                            </span>
                                          </div>
                                        ) : (
                                          <img
                                            src={resolveImageUrl(slot.src)}
                                            alt={slot.alt || slot.label}
                                            referrerPolicy="no-referrer"
                                            className={`w-full h-full transition-transform duration-200 group-hover:scale-[1.02] ${
                                              slot.type === 'logo'
                                                ? 'object-contain p-6'
                                                : 'object-cover'
                                            }`}
                                            loading="lazy"
                                          />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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

                                      <div className="p-4 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                          <span className="font-mono tabular-nums text-amber-400">
                                            Image #{slot.slotIndex + 1}
                                          </span>
                                          <span>{getSlotTypeName(slot.type)}</span>
                                        </div>

                                        {isEditingCap ? (
                                          <div className="space-y-2 pt-1">
                                            <input
                                              type="text"
                                              value={editingCaptionTitle}
                                              onChange={(e) => setEditingCaptionTitle(e.target.value)}
                                              placeholder="Image label"
                                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                                            />
                                            <input
                                              type="text"
                                              value={editingCaptionAlt}
                                              onChange={(e) => setEditingCaptionAlt(e.target.value)}
                                              placeholder="SEO alt description"
                                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                                            />
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleSaveSlotCaption(slot)}
                                                className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950"
                                              >
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingCaptionId(null)}
                                                className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <h3
                                              className="text-sm font-medium text-slate-100 truncate"
                                              title={slot.label}
                                            >
                                              {slot.label}
                                            </h3>
                                            <p
                                              className="text-xs text-slate-400 truncate mt-0.5"
                                              title={slot.alt || slot.label}
                                            >
                                              {slot.isDeleted || !slot.src
                                                ? 'No photo uploaded yet'
                                                : slot.alt || slot.label}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="px-4 pb-4 pt-1 flex items-center gap-1.5">
                                      <label
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                          isUploadingThis ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                      >
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleDirectSlotFileSelected(slot, e)}
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
                                                ? 'Upload Photo'
                                                : 'Replace Photo'}
                                            </span>
                                          </>
                                        )}
                                      </label>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCaptionId(slot.slotId);
                                          setEditingCaptionTitle(slot.label);
                                          setEditingCaptionAlt(slot.alt || '');
                                        }}
                                        className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors"
                                        title="Edit label & SEO alt text"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>

                                      {!slot.isDeleted && slot.src && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSlot(slot)}
                                          disabled={isUploadingThis}
                                          className="p-2 rounded-md bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                                          title="Clear / delete photo"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* Part B: Text & Headings in this Section */}
                      {(sectionContentFilter === 'both' || sectionContentFilter === 'text') &&
                        sec.texts.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                                <Type className="w-3.5 h-3.5 text-amber-400" />
                                <span>Text & Headings in &ldquo;{sec.sectionName}&rdquo;</span>
                              </span>
                              <span className="font-mono tabular-nums">
                                {sec.texts.length} text item{sec.texts.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800/80">
                              {sec.texts.map((txt) => {
                                const isEditingThisText = editingTextId === txt.textId;
                                const isSavingThisText = savingTextId === txt.textId;

                                return (
                                  <div
                                    key={txt.textId}
                                    className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                                      txt.isDeleted ? 'opacity-50' : ''
                                    }`}
                                  >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span className="font-mono text-[11px] text-amber-400">
                                          {txt.tagName}
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span>{sec.sectionName}</span>
                                        {txt.isModified && !txt.isDeleted && (
                                          <>
                                            <span aria-hidden="true">·</span>
                                            <span className="text-emerald-400">Edited</span>
                                          </>
                                        )}
                                        {txt.isDeleted && (
                                          <>
                                            <span aria-hidden="true">·</span>
                                            <span className="text-red-400">Hidden</span>
                                          </>
                                        )}
                                      </div>

                                      {isEditingThisText ? (
                                        <div className="space-y-2 pt-1">
                                          <textarea
                                            rows={3}
                                            value={editingTextValue}
                                            onChange={(e) => setEditingTextValue(e.target.value)}
                                            className="w-full bg-slate-900 border border-amber-500/70 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none"
                                          />
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveInlineText(txt)}
                                              disabled={isSavingThisText}
                                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                              <span>
                                                {isSavingThisText ? 'Saving...' : 'Save Text'}
                                              </span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingTextId(null)}
                                              className="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-slate-100 leading-relaxed break-words">
                                          {txt.content}
                                        </p>
                                      )}
                                    </div>

                                    {!isEditingThisText && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingTextId(txt.textId);
                                            setEditingTextValue(txt.content);
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors whitespace-nowrap shrink-0"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          <span>Edit Text</span>
                                        </button>

                                        {(txt.isModified || txt.isDeleted) && !txt.isCustomAdded && (
                                          <button
                                            type="button"
                                            onClick={() => handleRestoreOrDeleteText(txt, true)}
                                            disabled={isSavingThisText}
                                            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800"
                                            title="Restore default text"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {!txt.isDeleted && (
                                          <button
                                            type="button"
                                            onClick={() => handleRestoreOrDeleteText(txt, false)}
                                            disabled={isSavingThisText}
                                            className="p-1.5 rounded-md bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800"
                                            title="Hide text on page"
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
                          </div>
                        )}
                    </div>
                  </section>
                ))}

              {/* =====================================================================
                  FINAL SECTION: BOTTOM EXTRA PHOTO GALLERY ON THIS PAGE
                 ===================================================================== */}
              {(activeTab === 'all' || activeTab === 'gallery') && (
                <section
                  id="section-bottom-gallery"
                  className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono font-semibold text-amber-400">
                          Section {String(pageSections.length + 2).padStart(2, '0')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Bottom of {currentPageMeta.title}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {pageExtraGallery.length} photo{pageExtraGallery.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-slate-100">
                        {String(pageSections.length + 2).padStart(2, '0')}. Bottom Extra Wildlife Gallery
                      </h2>
                      <p className="text-xs text-slate-400">
                        Additional featured safari photos displayed near the bottom of{' '}
                        <span className="text-slate-200 font-medium">{currentPageMeta.title}</span>.
                      </p>
                    </div>

                    <label
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        uploadingTargetId === 'gallery-add-new' ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAddGalleryPhotoFiles}
                        className="hidden"
                      />
                      {uploadingTargetId === 'gallery-add-new' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Upload Photo to Gallery</span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="p-6">
                    {pageExtraGallery.length === 0 ? (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-8 text-center space-y-3">
                        <ImageIcon className="w-6 h-6 text-slate-500 mx-auto" />
                        <div className="text-xs text-slate-400">
                          No extra bottom gallery photos added for {currentPageMeta.title} yet.
                        </div>
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAddGalleryPhotoFiles}
                            className="hidden"
                          />
                          <Plus className="w-3.5 h-3.5" />
                          <span>Upload First Gallery Photo</span>
                        </label>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {pageExtraGallery.map((item, idx) => (
                          <article
                            key={item.itemId}
                            className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <label className="relative h-44 bg-slate-900 border-b border-slate-800 overflow-hidden cursor-pointer flex items-center justify-center group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleReplaceSectionImageFile(item, e)}
                                  className="hidden"
                                />
                                <img
                                  src={resolveImageUrl(item.src)}
                                  alt={item.alt || item.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-md">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Replace Photo</span>
                                  </span>
                                </div>
                              </label>

                              <div className="p-4 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <span className="font-mono text-amber-400">
                                    Gallery #{idx + 1}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">{item.sectionTitle}</span>
                                </div>
                                <h3 className="text-sm font-medium text-slate-100 truncate">
                                  {item.title}
                                </h3>
                              </div>
                            </div>

                            <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                              <label
                                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-900 hover:bg-amber-500 text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-amber-500 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                  uploadingTargetId === item.itemId
                                    ? 'opacity-50 pointer-events-none'
                                    : ''
                                }`}
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleReplaceSectionImageFile(item, e)}
                                  className="hidden"
                                />
                                {uploadingTargetId === item.itemId ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Replace Photo</span>
                                  </>
                                )}
                              </label>

                              <button
                                type="button"
                                onClick={() => handleDeleteSectionImage(item)}
                                disabled={uploadingTargetId === item.itemId}
                                className="p-2 rounded-md bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-800 transition-colors"
                                title="Delete photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
