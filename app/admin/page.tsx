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
  fileToFirestoreDataUrl,
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
  alt: string;
  assetFilename: string;
  isSharedAsset: boolean;
  sharedCount: number;
  isModified?: boolean;
}

interface MediaAssetInfo {
  filename: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  usedInPages: string[];
  usageCount: number;
  hasDefaultBackup: boolean;
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
  if (bytes === 0) return '0 B';
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
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetInfo[]>([]);
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
  const [syncingSeed, setSyncingSeed] = useState<boolean>(false);

  // Navigation & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('slots');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<SlotTypeFilter>('all');
  const [selectedTextType, setSelectedTextType] = useState<TextTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal 1: Active Slot Editing
  const [editingSlot, setEditingSlot] = useState<ImageSlot | null>(null);
  const [slotScope, setSlotScope] = useState<'slot' | 'global'>('slot');
  const [slotAltText, setSlotAltText] = useState<string>('');
  const [slotExternalUrl, setSlotExternalUrl] = useState<string>('');
  const [slotUploadFile, setSlotUploadFile] = useState<File | null>(null);
  const [slotPreviewUrl, setSlotPreviewUrl] = useState<string | null>(null);
  const [slotSaving, setSlotSaving] = useState<boolean>(false);

  // Modal 2: Add / Edit Section Wildlife Gallery Image
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

  // Modal 4: Global Media Library Replacement
  const [editingAsset, setEditingAsset] = useState<MediaAssetInfo | null>(null);
  const [assetUploadFile, setAssetUploadFile] = useState<File | null>(null);
  const [assetPreviewUrl, setAssetPreviewUrl] = useState<string | null>(null);
  const [assetSaving, setAssetSaving] = useState<boolean>(false);

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
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const autoSeededRef = useRef<boolean>(false);

  const showNotice = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const [imgRes, cmsRes] = await Promise.all([
        fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (!imgRes.ok || !cmsRes.ok) throw new Error('Failed to load site CMS inventory');
      const [imgData, cmsData] = await Promise.all([imgRes.json(), cmsRes.json()]);

      setSlots(imgData.slots || []);
      setMediaAssets(imgData.mediaAssets || []);
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

  // Initial load of inventory from server
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/images?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/admin/cms?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([imgData, cmsData]) => {
        if (cancelled) return;
        setSlots(imgData.slots || []);
        setMediaAssets(imgData.mediaAssets || []);
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

  // Listen to Firebase Auth state & Firestore public collections
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    const unsubImages = subscribePublicCollection<{
      slotId: string;
      src: string;
      lightboxHref?: string;
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

  // Sync all 160 image slots and 23 curated section wildlife images to Firebase Firestore when Admin signs in
  const handleSeedSectionImagesToFirestore = useCallback(
    async (silent = false) => {
      if (!auth.currentUser) {
        if (!silent) {
          showNotice('Please sign in with Google Admin first to push records to Firestore.', 'error');
        }
        return;
      }
      setSyncingSeed(true);
      try {
        await Promise.all(
          INITIAL_FIREBASE_SECTION_IMAGES.map((item) => saveSectionGalleryItemInFirestore(item))
        );

        const chunkSize = 20;
        for (let i = 0; i < INITIAL_FIREBASE_SLOT_UPGRADES.length; i += chunkSize) {
          const batch = INITIAL_FIREBASE_SLOT_UPGRADES.slice(i, i + chunkSize);
          await Promise.all(batch.map((slot) => saveSiteImageInFirestore(slot)));
        }

        await fetch('/api/admin/cms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'seed-defaults' }),
        });
        if (!silent) {
          showNotice(
            `Synced all ${INITIAL_FIREBASE_SLOT_UPGRADES.length} image slots and ${INITIAL_FIREBASE_SECTION_IMAGES.length} section wildlife photos to Firebase Firestore.`
          );
        }
        await fetchInventory();
      } catch (err) {
        if (!silent) {
          showNotice(err instanceof Error ? err.message : 'Firestore sync failed', 'error');
        }
      } finally {
        setSyncingSeed(false);
      }
    },
    [fetchInventory, showNotice]
  );

  useEffect(() => {
    const knownSlotsCount = Object.keys(firestoreImageDocs).length;
    if (
      currentUser &&
      !autoSeededRef.current &&
      (firestoreSectionDocs.length === 0 ||
        knownSlotsCount < INITIAL_FIREBASE_SLOT_UPGRADES.length)
    ) {
      autoSeededRef.current = true;
      void handleSeedSectionImagesToFirestore(true);
    }
  }, [
    currentUser,
    firestoreSectionDocs.length,
    firestoreImageDocs,
    handleSeedSectionImagesToFirestore,
  ]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotice('Connected to Firebase Admin as ' + (auth.currentUser?.email || 'Admin'));
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Google Sign-In failed', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    await firebaseSignOut(auth);
    showNotice('Signed out of Firebase Admin.');
  };

  // Merge server slots with live Firestore overrides
  const mergedSlots = useMemo(() => {
    return slots.map((slot) => {
      const fbDoc = firestoreImageDocs[slot.slotId];
      if (!fbDoc) return slot;
      return {
        ...slot,
        src: fbDoc.src || slot.src,
        lightboxHref: fbDoc.lightboxHref || slot.lightboxHref,
        alt: fbDoc.alt !== undefined ? fbDoc.alt : slot.alt,
        label: fbDoc.label || slot.label,
        isModified: true,
      };
    });
  }, [slots, firestoreImageDocs]);

  // Merge section gallery items with live Firestore section docs
  const mergedSectionImages = useMemo(() => {
    if (firestoreSectionDocs.length === 0) return sectionImages;
    const byId = new Map<string, SeedSectionGalleryItem>();
    for (const item of sectionImages) {
      byId.set(item.itemId, item);
    }
    for (const fbItem of firestoreSectionDocs) {
      byId.set(fbItem.itemId, fbItem);
    }
    return Array.from(byId.values()).sort((a, b) => a.order - b.order);
  }, [sectionImages, firestoreSectionDocs]);

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

    // Also include any custom texts present only in Firestore
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

  // Filtered media assets
  const filteredAssets = useMemo(() => {
    return mediaAssets.filter((asset) => {
      if (selectedPage !== 'all' && !asset.usedInPages.includes(selectedPage)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          asset.filename.toLowerCase().includes(q) ||
          asset.mimeType.toLowerCase().includes(q) ||
          asset.usedInPages.some((p) => p.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [mediaAssets, selectedPage, searchQuery]);

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
      counts.all = mediaAssets.length;
      for (const p of pages) {
        counts[p.file] = mediaAssets.filter((a) => a.usedInPages.includes(p.title)).length;
      }
    }
    return counts;
  }, [viewMode, mergedSlots, mergedSectionImages, mergedTexts, mediaAssets, pages]);

  // --- Slot Image Editor Handlers (Firebase Firestore + Server Sync) ---
  const openSlotEditor = (slot: ImageSlot) => {
    setEditingSlot(slot);
    setSlotScope(slot.type === 'logo' ? 'global' : 'slot');
    setSlotAltText(slot.alt || '');
    setSlotExternalUrl(slot.src.startsWith('http') ? slot.src : '');
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
      let finalSrc = slotExternalUrl.trim() || editingSlot.src;

      if (slotUploadFile) {
        // 1. Upload binary file to server media endpoint AND compress for Firestore transfer
        const formData = new FormData();
        formData.append('mode', 'update-slot');
        formData.append('page', editingSlot.page);
        formData.append('slotIndex', String(editingSlot.slotIndex));
        formData.append('scope', slotScope);
        formData.append('altText', slotAltText);
        formData.append('file', slotUploadFile);

        const [res, transferredDataUrl] = await Promise.all([
          fetch('/api/admin/images', { method: 'POST', body: formData }),
          fileToFirestoreDataUrl(slotUploadFile),
        ]);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload image');
        finalSrc = data.updatedSrc ? `/${data.updatedSrc.replace(/^\/+/, '')}` : transferredDataUrl;
      } else {
        const res = await fetch('/api/admin/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-slot-meta',
            page: editingSlot.page,
            slotIndex: editingSlot.slotIndex,
            altText: slotAltText,
            externalUrl: slotExternalUrl.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update slot');
        if (slotExternalUrl.trim()) finalSrc = slotExternalUrl.trim();
      }

      // 2. Save directly to Firebase Firestore if Admin is signed in
      if (auth.currentUser) {
        await saveSiteImageInFirestore({
          slotId: editingSlot.slotId,
          page: editingSlot.page,
          slotIndex: editingSlot.slotIndex,
          type: editingSlot.type,
          label: editingSlot.label,
          sectionContext: editingSlot.sectionContext,
          src: finalSrc,
          lightboxHref: finalSrc,
          alt: slotAltText,
        });
      }

      showNotice(
        `Saved "${editingSlot.label}" on ${editingSlot.pageTitle} (${
          auth.currentUser ? 'Synced to Firebase Firestore' : 'Saved & ready for Firestore sync'
        }).`
      );
      setEditingSlot(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Update failed', 'error');
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
      showNotice(`Deleted custom override and restored default for "${slot.label}".`);
      setEditingSlot(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Reset failed', 'error');
    } finally {
      setSlotSaving(false);
    }
  };

  // --- Section Wildlife Gallery Handlers (Add, Edit, Delete through Firebase Firestore) ---
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
      let finalSrc = editingSectionImg.src.trim();
      if (secImgUploadFile) {
        finalSrc = await fileToFirestoreDataUrl(secImgUploadFile);
      }
      if (!finalSrc) {
        throw new Error('Please upload an image file or enter an image URL.');
      }

      const itemToSave: SeedSectionGalleryItem = {
        ...editingSectionImg,
        title: editingSectionImg.title.trim() || 'Safari Wildlife Photo',
        alt: editingSectionImg.alt.trim() || editingSectionImg.title.trim() || 'Safari photo',
        src: finalSrc,
      };

      // Save to server CMS state
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-section-image',
          ...itemToSave,
        }),
      });

      // Save to Firebase Firestore
      if (auth.currentUser) {
        await saveSectionGalleryItemInFirestore(itemToSave);
      }

      showNotice(
        `${isNewSectionImg ? 'Added' : 'Updated'} section image "${itemToSave.title}" via Firebase.`
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
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-section-image',
          itemId: item.itemId,
        }),
      });
      if (auth.currentUser) {
        await deleteSectionGalleryItemInFirestore(item.itemId);
      }
      showNotice(`Deleted section image "${item.title}" from Firebase.`);
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

  // --- Global Media Library Handlers ---
  const openAssetEditor = (asset: MediaAssetInfo) => {
    setEditingAsset(asset);
    setAssetUploadFile(null);
    setAssetPreviewUrl(null);
  };

  const handleAssetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssetUploadFile(file);
    setAssetPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !assetUploadFile) return;
    setAssetSaving(true);
    try {
      const formData = new FormData();
      formData.append('mode', 'replace-media');
      formData.append('assetFilename', editingAsset.filename);
      formData.append('file', assetUploadFile);

      const res = await fetch('/api/admin/images', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to replace media file');

      showNotice(`Replaced "${editingAsset.filename}" globally.`);
      setEditingAsset(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to replace file', 'error');
    } finally {
      setAssetSaving(false);
    }
  };

  const handleResetSingleAsset = async (asset: MediaAssetInfo) => {
    setAssetSaving(true);
    try {
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          target: 'asset',
          assetFilename: asset.filename,
        }),
      });
      if (!res.ok) throw new Error('Failed to restore original file');
      showNotice(`Restored "${asset.filename}" to original default.`);
      setEditingAsset(null);
      await fetchInventory();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Restore failed', 'error');
    } finally {
      setAssetSaving(false);
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
      showNotice(
        confirmResetModal.scope === 'all'
          ? 'All 12 pages and 118 media files restored to factory defaults.'
          : `Restored ${confirmResetModal.title} to default images.`
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
                Firebase CMS Studio
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

          {/* Firebase Admin Auth Box */}
          <div className="p-3 rounded-md bg-[#151D19] border border-[#233029] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#D5E0D9] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#E59819]" />
                <span>Firebase Firestore</span>
              </span>
              <span className="text-[11px] font-mono text-[#86EFAC]">Connected</span>
            </div>
            {currentUser ? (
              <div className="space-y-2">
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
                    <span>{syncingSeed ? 'Syncing...' : 'Sync Section Photos'}</span>
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
              CMS Workspaces
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
                <span>Global Media Files</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#68756D]">
                {mediaAssets.length}
              </span>
            </button>
          </div>

          {/* Page Filter Navigation */}
          <div className="space-y-1">
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-[#68756D] mb-1">
              Filter by Page (12)
            </div>
            <div className="max-h-[260px] md:max-h-[calc(100vh-450px)] overflow-y-auto space-y-0.5 pr-1">
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
            <span className="text-[#68756D]">Firebase CMS</span>
            <span className="text-[#3B4740]">/</span>
            <span className="font-medium text-[#F1F5F2]">
              {viewMode === 'slots'
                ? 'Page Image Slots'
                : viewMode === 'section-images'
                ? 'Section Wildlife Galleries'
                : viewMode === 'texts'
                ? 'Site Text Editor'
                : 'Global Media Files'}
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
                    ? 'Search section photos, captions...'
                    : 'Search section, alt text, filename...'
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
                <span>Add Section Image</span>
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
              title="Refresh inventory"
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
              Curated wildlife & safari images injected into every page section via Firebase Firestore. Add, edit, or delete photos for any section.
            </div>
          ) : (
            <div className="text-xs text-[#9CA9A1]">
              Replacing a file in the Global Media Library updates every page that references that filename.
            </div>
          )}

          <div className="text-xs text-[#9CA9A1] font-mono tabular-nums">
            {viewMode === 'slots'
              ? `Showing ${filteredSlots.length} of ${mergedSlots.length} image slots`
              : viewMode === 'section-images'
              ? `Showing ${filteredSectionImages.length} of ${mergedSectionImages.length} section photos`
              : viewMode === 'texts'
              ? `Showing ${filteredTexts.length} of ${mergedTexts.length} text elements`
              : `Showing ${filteredAssets.length} of ${mediaAssets.length} media files`}
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
                        <img
                          src={resolveImageUrl(slot.src)}
                          alt={slot.alt || slot.label}
                          className={`w-full h-full transition-transform duration-200 group-hover:scale-[1.02] ${
                            slot.type === 'logo' ? 'object-contain p-6' : 'object-cover'
                          }`}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 bg-[#E59819] text-[#0B0F0D] font-semibold text-xs px-3 py-1.5 rounded-md shadow-md">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Change via Firebase</span>
                          </span>
                        </div>
                        <div className="absolute top-2.5 left-2.5 bg-[#0B0F0D]/85 backdrop-blur-xs border border-[#26332B] px-2 py-0.5 rounded text-[11px] font-mono tabular-nums text-[#D5E0D9]">
                          #{slot.slotIndex + 1} · {getSlotTypeLabel(slot.type)}
                        </div>
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
                          title={slot.src}
                        >
                          {slot.src.startsWith('data:')
                            ? 'Firebase Transferred Data Image'
                            : slot.assetFilename || slot.src}
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
                        <span>Replace / Transfer</span>
                      </button>
                      {slot.isModified && (
                        <button
                          type="button"
                          onClick={() => handleResetSingleSlot(slot)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#24322A] transition-colors"
                          title="Delete override & restore default"
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
                              <span>Edit Section Photo</span>
                            </span>
                          </div>
                          <div className="absolute top-2.5 left-2.5 bg-[#0B0F0D]/85 backdrop-blur-xs border border-[#26332B] px-2 py-0.5 rounded text-[11px] font-mono text-[#E59819]">
                            {pMeta ? pMeta.title : item.page}
                          </div>
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
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditSectionImageModal(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1B2620] hover:bg-[#E59819] text-[#F1F5F2] hover:text-[#0B0F0D] border border-[#2A3A31] hover:border-[#E59819] font-medium text-xs py-2 px-3 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSectionImage(item)}
                          className="p-2 rounded-md bg-[#161F1A] hover:bg-[#2A1616] text-[#9CA9A1] hover:text-[#FCA5A5] border border-[#24322A] transition-colors"
                          title="Delete section photo from Firebase"
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
            /* Global Media Library Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAssets.map((asset) => (
                <article
                  key={asset.filename}
                  className="bg-[#121915] border border-[#1F2923] hover:border-[#314238] rounded-lg overflow-hidden flex flex-col justify-between transition-colors group"
                >
                  <div>
                    <div
                      onClick={() => openAssetEditor(asset)}
                      className="relative h-44 bg-[#090D0B] border-b border-[#1A231E] overflow-hidden cursor-pointer flex items-center justify-center"
                    >
                      <img
                        src={resolveImageUrl(asset.url)}
                        alt={asset.filename}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 bg-[#E59819] text-[#0B0F0D] font-semibold text-xs px-3 py-1.5 rounded-md shadow-md">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace File Globally</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <h3
                        className="text-sm font-mono font-medium text-[#F1F5F2] truncate"
                        title={asset.filename}
                      >
                        {asset.filename}
                      </h3>

                      <div className="text-xs text-[#9CA9A1] font-mono tabular-nums">
                        {asset.mimeType.replace('image/', '').toUpperCase()} ·{' '}
                        {formatBytes(asset.sizeBytes)} · Used {asset.usageCount}x
                      </div>

                      <div className="text-[11px] text-[#68756D] truncate">
                        Pages:{' '}
                        {asset.usedInPages.length > 0
                          ? asset.usedInPages.join(', ')
                          : 'Direct media path'}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAssetEditor(asset)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1B2620] hover:bg-[#E59819] text-[#F1F5F2] hover:text-[#0B0F0D] border border-[#2A3A31] hover:border-[#E59819] font-medium text-xs py-2 px-3 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace File</span>
                    </button>
                    {asset.hasDefaultBackup && (
                      <button
                        type="button"
                        onClick={() => handleResetSingleAsset(asset)}
                        className="p-2 rounded-md bg-[#161F1A] hover:bg-[#222F28] text-[#9CA9A1] hover:text-[#F1F5F2] border border-[#24322A] transition-colors"
                        title="Restore original file"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal 1: Edit Page Slot Image */}
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
                  <div className="text-xs font-medium text-[#9CA9A1]">Current Image</div>
                  <div className="h-40 rounded-md bg-[#090D0B] border border-[#1F2923] overflow-hidden flex items-center justify-center">
                    <img
                      src={resolveImageUrl(editingSlot.src)}
                      alt={editingSlot.alt}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9CA9A1]">New Upload / Transfer</div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-40 rounded-md bg-[#0B0F0D] border border-dashed border-[#34463C] hover:border-[#E59819] overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors p-3 text-center"
                  >
                    {slotPreviewUrl ? (
                      <img
                        src={slotPreviewUrl}
                        alt="New upload preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : slotExternalUrl.trim() ? (
                      <img
                        src={slotExternalUrl.trim()}
                        alt="External URL preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-[#E59819] mb-2" />
                        <span className="text-xs font-medium text-[#F1F5F2]">
                          Click to upload & transfer via Firebase
                        </span>
                        <span className="text-[11px] text-[#68756D] mt-1">
                          JPG, PNG, WebP, GIF, or SVG
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
                  Or Paste Direct Image URL (optional)
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
                  placeholder="https://images.unsplash.com/... (direct web image link)"
                  className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2] placeholder-[#68756D] focus:outline-none"
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

              <div className="pt-2 border-t border-[#222F28] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleResetSingleSlot(editingSlot)}
                  disabled={slotSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2] bg-[#18221D] hover:bg-[#222F28] border border-[#26352D] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>

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
                    <span>{slotSaving ? 'Transferring...' : 'Save via Firebase'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add / Edit Section Wildlife Photo */}
      {editingSectionImg && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#161F1A] border-b border-[#222F28] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E59819] font-medium">
                  Firebase Section Gallery Photo
                </div>
                <h2 className="text-base font-semibold text-[#F1F5F2] mt-0.5">
                  {isNewSectionImg ? 'Add New Photo to Page Section' : 'Edit Section Photo'}
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
                    Upload Image File (Transferred via Firestore)
                  </label>
                  <div
                    onClick={() => secFileInputRef.current?.click()}
                    className="h-32 rounded-md bg-[#0B0F0D] border border-dashed border-[#34463C] hover:border-[#E59819] overflow-hidden flex flex-col items-center justify-center cursor-pointer p-2 text-center"
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
                        <span className="text-xs text-[#F1F5F2]">Click to select image</span>
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
                      Or Image URL
                    </label>
                    <input
                      type="text"
                      value={editingSectionImg.src}
                      onChange={(e) => {
                        setEditingSectionImg({ ...editingSectionImg, src: e.target.value });
                        setSecImgUploadFile(null);
                        setSecImgPreviewUrl(null);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
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
                      className="w-full bg-[#0B0F0D] border border-[#26352D] focus:border-[#E59819] rounded-md px-3 py-2 text-xs text-[#F1F5F2]"
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
                    <span>Delete Photo</span>
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
                    <span>{secImgSaving ? 'Saving...' : 'Save to Firebase'}</span>
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

      {/* Modal 4: Global Media Asset Replacement */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121915] border border-[#26352D] rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#161F1A] border-b border-[#222F28] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#E59819] font-medium">Global Media Asset</div>
                <h2 className="text-base font-mono font-semibold text-[#F1F5F2] mt-0.5">
                  {editingAsset.filename}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="text-[#9CA9A1] hover:text-[#F1F5F2] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9CA9A1]">Current File</div>
                  <div className="h-40 rounded-md bg-[#090D0B] border border-[#1F2923] overflow-hidden flex items-center justify-center">
                    <img
                      src={resolveImageUrl(editingAsset.url)}
                      alt={editingAsset.filename}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#9CA9A1]">Replacement File</div>
                  <div
                    onClick={() => assetFileInputRef.current?.click()}
                    className="h-40 rounded-md bg-[#0B0F0D] border border-dashed border-[#34463C] hover:border-[#E59819] overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors p-3 text-center"
                  >
                    {assetPreviewUrl ? (
                      <img
                        src={assetPreviewUrl}
                        alt="New file preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-[#E59819] mb-2" />
                        <span className="text-xs font-medium text-[#F1F5F2]">
                          Select replacement image
                        </span>
                        <span className="text-[11px] text-[#68756D] mt-1">
                          Updates all {editingAsset.usageCount} occurrences
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={assetFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAssetFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#222F28] flex items-center justify-between gap-3">
                {editingAsset.hasDefaultBackup ? (
                  <button
                    type="button"
                    onClick={() => handleResetSingleAsset(editingAsset)}
                    disabled={assetSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2] bg-[#18221D] hover:bg-[#222F28] border border-[#26352D]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingAsset(null)}
                    className="px-4 py-2 rounded-md text-xs font-medium text-[#9CA9A1] hover:text-[#F1F5F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!assetUploadFile || assetSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#E59819] hover:bg-[#F5A623] text-[#0B0F0D] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{assetSaving ? 'Uploading...' : 'Replace Everywhere'}</span>
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
                    ? 'This will revert all 12 HTML pages and all 118 media files back to their original factory state.'
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
