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
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
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
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function extractR2KeyFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const clean = url.split('?')[0].trim();
  const marker = '/api/r2/file/';
  const idx = clean.indexOf(marker);
  if (idx !== -1) {
    const key = clean.slice(idx + marker.length).replace(/^\/+/, '');
    return key ? key.slice(0, 512) : undefined;
  }
  const publicBase = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
  if (publicBase) {
    const withProto = publicBase.startsWith('http://') || publicBase.startsWith('https://')
      ? publicBase
      : `https://${publicBase}`;
    const bareDomain = publicBase.replace(/^https?:\/\//i, '');
    if (clean.startsWith(withProto + '/')) {
      const key = clean.slice(withProto.length + 1).replace(/^\/+/, '');
      return key ? key.slice(0, 512) : undefined;
    }
    if (clean.startsWith(bareDomain + '/')) {
      const key = clean.slice(bareDomain.length + 1).replace(/^\/+/, '');
      return key ? key.slice(0, 512) : undefined;
    }
    if (clean.startsWith('http://' + bareDomain + '/')) {
      const key = clean.slice(('http://' + bareDomain).length + 1).replace(/^\/+/, '');
      return key ? key.slice(0, 512) : undefined;
    }
  }
  if (clean.startsWith('/assets/r2-bucket/') || clean.startsWith('assets/r2-bucket/')) {
    const key = clean.replace(/^\/+/, '').replace(/^assets\/r2-bucket\//, '');
    return key ? key.slice(0, 512) : undefined;
  }
  if (clean.startsWith('/assets/media/') || clean.startsWith('assets/media/')) {
    const filename = clean.replace(/^\/+/, '').split('/').pop();
    return filename ? `media/${filename}` : undefined;
  }
  return undefined;
}

/**
 * Uploads an image File from device storage directly to the Cloudflare R2 bucket (`/api/r2`)
 * and returns its R2 object key (`r2Key`) and R2 CDN URL (`cdnUrl`).
 * No image binary or base64 data is ever stored in Firestore.
 */
export async function uploadImageToR2Bucket(
  file: File,
  options?: {
    customKey?: string;
    replaceKey?: string;
    alt?: string;
    title?: string;
    page?: string;
  }
): Promise<{
  r2Key: string;
  cdnUrl: string;
  sizeBytes: number;
  mimeType: string;
  remotePushed?: boolean;
  remoteError?: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.customKey) formData.append('customKey', options.customKey);
  if (options?.replaceKey) formData.append('replaceKey', options.replaceKey);
  if (options?.alt !== undefined) formData.append('alt', options.alt);
  if (options?.title !== undefined) formData.append('title', options.title);
  if (options?.page) formData.append('page', options.page);

  const res = await fetch('/api/r2', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.cdnUrl) {
    throw new Error(data.error || 'Failed to upload image to Cloudflare R2 bucket');
  }

  let finalCdn = String(data.cdnUrl);
  if (!finalCdn.startsWith('/') && !finalCdn.startsWith('http://') && !finalCdn.startsWith('https://')) {
    finalCdn = `https://${finalCdn}`;
  }

  return {
    r2Key: String(data.r2Key),
    cdnUrl: finalCdn,
    sizeBytes: Number(data.sizeBytes || file.size),
    mimeType: String(data.mimeType || file.type || 'image/jpeg'),
    remotePushed: Boolean(data.remotePushed),
    remoteError: data.remoteError ? String(data.remoteError) : undefined,
  };
}

/**
 * Converts any legacy base64 `data:image/...` URI into an object in the Cloudflare R2 bucket
 * and returns its R2 key and R2 CDN link so Firestore stores only the R2 CDN URL.
 */
export async function migrateDataUrlToR2Bucket(
  dataUrl: string,
  options?: {
    filenameHint?: string;
    alt?: string;
    title?: string;
    page?: string;
  }
): Promise<{ r2Key: string; cdnUrl: string }> {
  const res = await fetch('/api/r2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upload-data-url',
      dataUrl,
      filenameHint: options?.filenameHint,
      alt: options?.alt,
      title: options?.title,
      page: options?.page,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.cdnUrl) {
    throw new Error(data.error || 'Failed to migrate data URL to Cloudflare R2 bucket');
  }
  const rawCdn = String(data.cdnUrl);
  const finalCdn =
    !rawCdn.startsWith('/') && !rawCdn.startsWith('http://') && !rawCdn.startsWith('https://')
      ? `https://${rawCdn}`
      : rawCdn;
  return {
    r2Key: String(data.r2Key),
    cdnUrl: finalCdn,
  };
}

/**
 * Updates metadata (`alt`, `title`, or object key) of an existing object in the Cloudflare R2 bucket.
 */
export async function updateR2BucketObjectMeta(options: {
  r2Key: string;
  newKey?: string;
  alt?: string;
  title?: string;
  page?: string;
}): Promise<{ r2Key: string; cdnUrl: string }> {
  const res = await fetch('/api/r2', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update R2 object metadata');
  }
  const rawMetaCdn = String(data.cdnUrl || `/api/r2/file/${options.newKey || options.r2Key}`);
  const finalMetaCdn =
    !rawMetaCdn.startsWith('/') && !rawMetaCdn.startsWith('http://') && !rawMetaCdn.startsWith('https://')
      ? `https://${rawMetaCdn}`
      : rawMetaCdn;
  return {
    r2Key: String(data.r2Key || options.newKey || options.r2Key),
    cdnUrl: finalMetaCdn,
  };
}

/**
 * Deletes an image object directly from the Cloudflare R2 bucket.
 */
export async function deleteImageFromR2Bucket(r2KeyOrUrl: string): Promise<void> {
  const key = extractR2KeyFromUrl(r2KeyOrUrl) || r2KeyOrUrl;
  if (!key) return;
  const res = await fetch(`/api/r2?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete object from Cloudflare R2 bucket');
  }
}

/**
 * Upserts a SiteImage record in Firestore (`site_images/{slotId}`) storing ONLY the R2 CDN URL
 * (`src`, `lightboxHref`, and optional `r2Key`) and text metadata — never raw image data.
 */
export async function saveSiteImageInFirestore(input: {
  slotId: string;
  page: string;
  slotIndex: number;
  type: 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
  label: string;
  sectionContext: string;
  src: string;
  lightboxHref?: string;
  r2Key?: string;
  alt: string;
}) {
  const uid = auth.currentUser?.uid || 'nisha-cms-admin';
  if (input.src.startsWith('data:')) {
    throw new Error(
      'Saving raw image data in Firestore is disabled. Upload to Cloudflare R2 bucket first and save the R2 CDN URL.'
    );
  }
  const path = `site_images/${input.slotId}`;
  const docRef = doc(db, 'site_images', input.slotId);
  try {
    const existing = await getDoc(docRef);
    const createdAt = existing.exists() ? existing.data().createdAt : serverTimestamp();
    const authorId = uid;

    const resolvedR2Key = input.r2Key || extractR2KeyFromUrl(input.src);

    let normalizedSrc = input.src.trim();
    if (
      !normalizedSrc.startsWith('/') &&
      !normalizedSrc.startsWith('http://') &&
      !normalizedSrc.startsWith('https://')
    ) {
      normalizedSrc = `https://${normalizedSrc}`;
    }

    let cleanLb =
      input.lightboxHref && !input.lightboxHref.startsWith('data:')
        ? input.lightboxHref.trim()
        : normalizedSrc;
    if (
      cleanLb &&
      !cleanLb.startsWith('/') &&
      !cleanLb.startsWith('http://') &&
      !cleanLb.startsWith('https://')
    ) {
      cleanLb = `https://${cleanLb}`;
    }

    const payload: Record<string, unknown> = {
      slotId: input.slotId,
      page: input.page,
      slotIndex: input.slotIndex,
      type: input.type,
      label: (input.label || 'Image Slot').slice(0, 300),
      sectionContext: (input.sectionContext || 'Page Section').slice(0, 300),
      src: normalizedSrc.slice(0, 2048),
      alt: (input.alt || '').slice(0, 500),
      visibility: 'public',
      authorId,
      createdAt,
      updatedAt: serverTimestamp(),
    };

    if (cleanLb) {
      payload.lightboxHref = cleanLb.slice(0, 2048);
    }
    if (resolvedR2Key) {
      payload.r2Key = resolvedR2Key.slice(0, 512);
    }

    await setDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSiteImageInFirestore(slotId: string) {
  const path = `site_images/${slotId}`;
  try {
    await deleteDoc(doc(db, 'site_images', slotId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Upserts a SectionGalleryItem in Firestore (`section_gallery_items/{itemId}`) storing ONLY
 * the R2 CDN URL (`src` and optional `r2Key`) and text metadata — never raw image data.
 */
export async function saveSectionGalleryItemInFirestore(input: {
  itemId: string;
  page: string;
  sectionKey: string;
  sectionTitle: string;
  title: string;
  caption: string;
  src: string;
  r2Key?: string;
  alt: string;
  order: number;
}) {
  const uid = auth.currentUser?.uid || 'nisha-cms-admin';
  if (input.src.startsWith('data:')) {
    throw new Error(
      'Saving raw image data in Firestore is disabled. Upload to Cloudflare R2 bucket first and save the R2 CDN URL.'
    );
  }
  const path = `section_gallery_items/${input.itemId}`;
  const docRef = doc(db, 'section_gallery_items', input.itemId);
  try {
    const existing = await getDoc(docRef);
    const createdAt = existing.exists() ? existing.data().createdAt : serverTimestamp();
    const authorId = uid;
    const resolvedR2Key = input.r2Key || extractR2KeyFromUrl(input.src);

    let normalizedSrc = input.src.trim();
    if (
      !normalizedSrc.startsWith('/') &&
      !normalizedSrc.startsWith('http://') &&
      !normalizedSrc.startsWith('https://')
    ) {
      normalizedSrc = `https://${normalizedSrc}`;
    }

    const payload: Record<string, unknown> = {
      itemId: input.itemId,
      page: input.page,
      sectionKey: (input.sectionKey || 'gallery').slice(0, 120),
      sectionTitle: (input.sectionTitle || 'Safari Moments').slice(0, 200),
      title: (input.title || 'Safari Photo').slice(0, 200),
      caption: (input.caption || '').slice(0, 1000),
      src: normalizedSrc.slice(0, 2048),
      alt: (input.alt || '').slice(0, 500),
      order: input.order,
      visibility: 'public',
      authorId,
      createdAt,
      updatedAt: serverTimestamp(),
    };

    if (resolvedR2Key) {
      payload.r2Key = resolvedR2Key.slice(0, 512);
    }

    await setDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSectionGalleryItemInFirestore(itemId: string) {
  const path = `section_gallery_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'section_gallery_items', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Upserts a SiteText record in Firestore (`site_texts/{textId}`)
 */
export async function saveSiteTextInFirestore(input: {
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
}) {
  const uid = auth.currentUser?.uid || 'nisha-cms-admin';
  const path = `site_texts/${input.textId}`;
  const docRef = doc(db, 'site_texts', input.textId);
  try {
    const existing = await getDoc(docRef);
    const createdAt = existing.exists() ? existing.data().createdAt : serverTimestamp();
    const authorId = uid;

    await setDoc(docRef, {
      textId: input.textId,
      page: input.page,
      textIndex: input.textIndex,
      tagName: input.tagName,
      sectionContext: (input.sectionContext || 'Page Content').slice(0, 300),
      content: (input.content || '').slice(0, 10000),
      isDeleted: Boolean(input.isDeleted),
      isCustomAdded: Boolean(input.isCustomAdded),
      visibility: 'public',
      authorId,
      createdAt,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSiteTextInFirestore(textId: string) {
  const path = `site_texts/${textId}`;
  try {
    await deleteDoc(doc(db, 'site_texts', textId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to public documents in a Firestore collection
 */
export function subscribePublicCollection<T>(
  collectionName: 'site_images' | 'section_gallery_items' | 'site_texts',
  onData: (items: T[]) => void
) {
  const q = query(collection(db, collectionName), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as T);
      });
      onData(items);
    },
    (err) => {
      console.warn(`Firestore subscription warning on ${collectionName}:`, err.message);
    }
  );
}

export { signInWithPopup, firebaseSignOut, onAuthStateChanged, type User };
