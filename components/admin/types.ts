export interface SeedSectionGalleryItem {
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
}

export interface ImageSlot {
  id: string;
  slotId: string;
  page: string;
  pageTitle: string;
  slotIndex: number;
  type: 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
  label: string;
  sectionContext: string;
  sectionName?: string;
  subSectionName?: string;
  src: string;
  lightboxHref?: string;
  r2Key?: string;
  alt: string;
  assetFilename?: string;
  isSharedAsset?: boolean;
  sharedCount?: number;
  isModified?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface SiteTextSlot {
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
  sectionName?: string;
  subSectionName?: string;
  fieldLabel?: string;
  content: string;
  defaultContent: string;
  isDeleted: boolean;
  isCustomAdded: boolean;
  isModified: boolean;
}

export interface PageMeta {
  file: string;
  title: string;
}

export interface R2ObjectRecord {
  r2Key: string;
  cdnUrl: string;
  mimeType: string;
  sizeBytes: number;
  alt: string;
  title: string;
  page?: string;
  remotePushed?: boolean;
  remoteError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface R2StatusPayload {
  bucketName: string;
  accountId: string;
  authMode: string;
  remoteConfigured: boolean;
  cdnBaseUrl: string;
  warning?: string;
  hasAccessKey?: boolean;
  hasSecretKey?: boolean;
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
    ok: boolean;
    message: string;
    latencyMs?: number;
  };
  objects?: R2ObjectRecord[];
}

export interface SyncReport {
  r2Total: number;
  firestoreImagesChecked: number;
  firestoreUrlsNormalized: number;
  orphanedRemoved: number;
  authMode: string;
  cdnBaseUrl: string;
  warning?: string;
  errors?: { key: string; error: string }[];
  syncedAt?: string;
}

export interface SubSectionGroup {
  id: string;
  subSectionName: string;
  images: ImageSlot[];
  texts: SiteTextSlot[];
}

export interface ParentSectionGroup {
  id: string;
  indexNumber: number;
  sectionName: string;
  subSections: SubSectionGroup[];
  totalImages: number;
  totalTexts: number;
}

export interface EnquiryRecord {
  enquiryId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  park: string;
  adults: string;
  kids: string;
  safariDate: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  sourcePage: string;
  adminScope: 'nisha-cms-admin';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AdminTab = 'pages' | 'texts' | 'prices' | 'footer' | 'enquiries' | 'r2-bucket' | 'sync-settings';

export function splitSectionLabel(ctx: string): {
  sectionName: string;
  subSectionName?: string;
} {
  const clean = (ctx || 'Page Content').trim();
  const sep = clean.indexOf(' · ');
  if (sep !== -1) {
    return {
      sectionName: clean.slice(0, sep).trim(),
      subSectionName: clean.slice(sep + 3).trim() || undefined,
    };
  }
  return { sectionName: clean };
}

export function getSlotTypeName(type: ImageSlot['type']): string {
  switch (type) {
    case 'hero-bg':
      return 'Hero Banner';
    case 'lightbox-img':
      return 'Gallery Photo';
    case 'logo':
      return 'Brand Logo / Icon';
    case 'img':
    default:
      return 'Section Image';
  }
}

export function resolveImageUrl(src: string, cacheBuster: number): string {
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
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
