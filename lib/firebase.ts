'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot as required by firebase-integration-rpc skill
let connectionTested = false;
export async function testFirestoreConnection(): Promise<boolean> {
  if (connectionTested) return true;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  void testFirestoreConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Defensive sanitization helper matching firebase-blueprint.json constraints
export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || 'item_0';
}

export function sanitizePageName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 64);
  return cleaned || 'index.html';
}

/**
 * Compresses an uploaded image file into a transferrable Data URL (< 500KB)
 * so it can be transferred and stored directly through Firebase Firestore
 * while staying well within Firestore's 1MB document limit.
 */
export async function fileToFirestoreDataUrl(
  file: File,
  maxWidth = 1400,
  quality = 0.82
): Promise<string> {
  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    const encoded = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(text))) : '';
    return `data:image/svg+xml;base64,${encoded}`.slice(0, 740000);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result).slice(0, 740000));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > 700000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
        resolve(dataUrl.slice(0, 740000));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export interface FirestoreSiteImageInput {
  slotId: string;
  page: string;
  slotIndex: number;
  type: 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
  label: string;
  sectionContext: string;
  src: string;
  lightboxHref?: string;
  alt: string;
}

export async function saveSiteImageInFirestore(input: FirestoreSiteImageInput): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google Admin to save directly to Firebase Firestore.');
  }
  const slotId = sanitizeId(input.slotId);
  const docPath = `site_images/${slotId}`;
  const docRef = doc(db, 'site_images', slotId);

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  const basePayload = {
    slotId,
    page: sanitizePageName(input.page),
    slotIndex: Math.max(0, Math.min(1000, Math.floor(input.slotIndex))),
    type: input.type,
    label: (input.label || 'Image Slot').slice(0, 200),
    sectionContext: (input.sectionContext || 'Page Section').slice(0, 200),
    src: input.src.slice(0, 750000),
    ...(input.lightboxHref ? { lightboxHref: input.lightboxHref.slice(0, 750000) } : {}),
    alt: (input.alt || '').slice(0, 500),
    visibility: 'public' as const,
    authorId: sanitizeId(user.uid),
  };

  try {
    if (exists) {
      await updateDoc(docRef, {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      docPath
    );
  }
}

export async function deleteSiteImageInFirestore(rawSlotId: string): Promise<void> {
  const slotId = sanitizeId(rawSlotId);
  const docPath = `site_images/${slotId}`;
  try {
    await deleteDoc(doc(db, 'site_images', slotId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export interface FirestoreSectionGalleryInput {
  itemId: string;
  page: string;
  sectionKey: string;
  sectionTitle: string;
  title: string;
  caption: string;
  src: string;
  alt: string;
  order: number;
}

export async function saveSectionGalleryItemInFirestore(
  input: FirestoreSectionGalleryInput
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google Admin to save section images to Firebase Firestore.');
  }
  const itemId = sanitizeId(input.itemId);
  const docPath = `section_gallery_items/${itemId}`;
  const docRef = doc(db, 'section_gallery_items', itemId);

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  const basePayload = {
    itemId,
    page: sanitizePageName(input.page),
    sectionKey: sanitizeId(input.sectionKey),
    sectionTitle: (input.sectionTitle || 'Safari Section').slice(0, 200),
    title: (input.title || 'Safari Photo').slice(0, 200),
    caption: (input.caption || '').slice(0, 600),
    src: input.src.slice(0, 750000),
    alt: (input.alt || input.title || 'Safari photo').slice(0, 300),
    order: Math.max(0, Math.min(10000, Math.floor(input.order))),
    visibility: 'public' as const,
    authorId: sanitizeId(user.uid),
  };

  try {
    if (exists) {
      await updateDoc(docRef, {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      docPath
    );
  }
}

export async function deleteSectionGalleryItemInFirestore(rawItemId: string): Promise<void> {
  const itemId = sanitizeId(rawItemId);
  const docPath = `section_gallery_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'section_gallery_items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export interface FirestoreSiteTextInput {
  textId: string;
  page: string;
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
  isDeleted: boolean;
  isCustomAdded: boolean;
}

export async function saveSiteTextInFirestore(input: FirestoreSiteTextInput): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google Admin to save text changes to Firebase Firestore.');
  }
  const textId = sanitizeId(input.textId);
  const docPath = `site_texts/${textId}`;
  const docRef = doc(db, 'site_texts', textId);

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  const basePayload = {
    textId,
    page: sanitizePageName(input.page),
    textIndex: Math.max(-1, Math.min(5000, Math.floor(input.textIndex))),
    tagName: input.tagName,
    sectionContext: (input.sectionContext || 'Page Content').slice(0, 200),
    content: (input.content || '').slice(0, 20000),
    isDeleted: Boolean(input.isDeleted),
    isCustomAdded: Boolean(input.isCustomAdded),
    visibility: 'public' as const,
    authorId: sanitizeId(user.uid),
  };

  try {
    if (exists) {
      await updateDoc(docRef, {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      exists ? OperationType.UPDATE : OperationType.CREATE,
      docPath
    );
  }
}

export async function deleteSiteTextInFirestore(rawTextId: string): Promise<void> {
  const textId = sanitizeId(rawTextId);
  const docPath = `site_texts/${textId}`;
  try {
    await deleteDoc(doc(db, 'site_texts', textId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribePublicCollection<T>(
  collectionName: 'site_images' | 'section_gallery_items' | 'site_texts',
  onData: (items: T[]) => void
): Unsubscribe {
  const q = query(collection(db, collectionName), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: T[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as T);
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

export async function fetchPublicCollectionOnce<T>(
  collectionName: 'site_images' | 'section_gallery_items' | 'site_texts'
): Promise<T[]> {
  const q = query(collection(db, collectionName), where('visibility', '==', 'public'));
  try {
    const snap = await getDocs(q);
    const list: T[] = [];
    snap.forEach((d) => list.push(d.data() as T));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export { signInWithPopup, firebaseSignOut, onAuthStateChanged, type User };
