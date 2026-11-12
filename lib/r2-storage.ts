import fs from 'node:fs/promises';
import path from 'node:path';

export interface R2ObjectRecord {
  r2Key: string;
  filename: string;
  cdnUrl: string;
  mimeType: string;
  sizeBytes: number;
  alt: string;
  title: string;
  page?: string;
  originUrl?: string;
  updatedAt: string;
  bucketName: string;
}

export interface R2IndexFile {
  bucketName: string;
  objects: Record<string, R2ObjectRecord>;
  deletedMediaKeys: string[];
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const R2_LOCAL_DIR = path.join(PUBLIC_DIR, 'assets', 'r2-bucket');
const R2_INDEX_PATH = path.join(R2_LOCAL_DIR, '_index.json');
const MEDIA_DIR = path.join(PUBLIC_DIR, 'assets', 'media');

export const DEFAULT_R2_BUCKET_NAME =
  process.env.R2_BUCKET_NAME || 'ai-studio-applet-opennext-cache';
export const DEFAULT_R2_ACCOUNT_ID =
  process.env.R2_ACCOUNT_ID || '10382badc5549c70cccebce858ee7f65';

export function getR2CdnBaseUrl(): string {
  const customPublic = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (customPublic) {
    return customPublic;
  }
  return '/api/r2/file';
}

export function buildR2CdnUrl(r2Key: string): string {
  const cleanKey = r2Key.replace(/^\/+/, '');
  const base = getR2CdnBaseUrl();
  return `${base}/${cleanKey}`;
}

export function extractR2KeyFromCdnUrl(url: string): string | null {
  if (!url) return null;
  const withoutQuery = url.split('?')[0].trim();
  const customBase = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (customBase && withoutQuery.startsWith(customBase + '/')) {
    return withoutQuery.slice(customBase.length + 1);
  }
  const marker = '/api/r2/file/';
  const idx = withoutQuery.indexOf(marker);
  if (idx !== -1) {
    return withoutQuery.slice(idx + marker.length).replace(/^\/+/, '');
  }
  if (withoutQuery.startsWith('/assets/media/') || withoutQuery.startsWith('assets/media/')) {
    const clean = withoutQuery.replace(/^\/+/, '');
    return `media/${path.basename(clean)}`;
  }
  return null;
}

export function detectMimeType(filenameOrExt: string): { ext: string; mimeType: string } {
  const clean = filenameOrExt.split('?')[0];
  const rawExt =
    path.extname(clean).toLowerCase().replace(/^\.+/, '') ||
    clean.toLowerCase().replace(/^\.+/, '');
  switch (rawExt) {
    case 'jpg':
    case 'jpeg':
      return { ext: 'jpg', mimeType: 'image/jpeg' };
    case 'png':
      return { ext: 'png', mimeType: 'image/png' };
    case 'webp':
      return { ext: 'webp', mimeType: 'image/webp' };
    case 'gif':
      return { ext: 'gif', mimeType: 'image/gif' };
    case 'svg':
    case 'svg+xml':
      return { ext: 'svg', mimeType: 'image/svg+xml' };
    case 'avif':
      return { ext: 'avif', mimeType: 'image/avif' };
    default:
      return { ext: 'jpg', mimeType: 'image/jpeg' };
  }
}

export function sanitizeR2Key(inputKey: string): string {
  return inputKey
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9._/-]/g, '-')
    .replace(/\/+/g, '/');
}

export async function loadR2Index(): Promise<R2IndexFile> {
  try {
    const raw = await fs.readFile(R2_INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw) as R2IndexFile;
    return {
      bucketName: parsed.bucketName || DEFAULT_R2_BUCKET_NAME,
      objects: parsed.objects || {},
      deletedMediaKeys: Array.isArray(parsed.deletedMediaKeys) ? parsed.deletedMediaKeys : [],
    };
  } catch {
    return {
      bucketName: DEFAULT_R2_BUCKET_NAME,
      objects: {},
      deletedMediaKeys: [],
    };
  }
}

export async function saveR2Index(index: R2IndexFile): Promise<void> {
  await fs.mkdir(R2_LOCAL_DIR, { recursive: true });
  await fs.writeFile(R2_INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
}

async function pushToCloudflareR2RestApi(
  r2Key: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const apiToken = (process.env.R2_API_TOKEN || '').trim();
  if (!apiToken) return;
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${DEFAULT_R2_ACCOUNT_ID}/r2/buckets/${DEFAULT_R2_BUCKET_NAME}/objects/${encodeURIComponent(r2Key)}`;
    await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': mimeType,
      },
      body: new Uint8Array(buffer),
    });
  } catch (err) {
    console.warn('Cloudflare R2 REST API PUT warning:', err);
  }
}

async function deleteFromCloudflareR2RestApi(r2Key: string): Promise<void> {
  const apiToken = (process.env.R2_API_TOKEN || '').trim();
  if (!apiToken) return;
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${DEFAULT_R2_ACCOUNT_ID}/r2/buckets/${DEFAULT_R2_BUCKET_NAME}/objects/${encodeURIComponent(r2Key)}`;
    await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });
  } catch (err) {
    console.warn('Cloudflare R2 REST API DELETE warning:', err);
  }
}

export async function listR2Objects(): Promise<R2ObjectRecord[]> {
  const index = await loadR2Index();
  const deletedSet = new Set(index.deletedMediaKeys);
  const resultsMap = new Map<string, R2ObjectRecord>();

  // 1. Load indexed R2 bucket objects (skipping any deleted keys)
  for (const [key, record] of Object.entries(index.objects)) {
    if (deletedSet.has(key)) continue;
    resultsMap.set(key, {
      ...record,
      cdnUrl: buildR2CdnUrl(key),
      bucketName: DEFAULT_R2_BUCKET_NAME,
    });
  }

  // 2. Include existing site media files under media/<filename>
  try {
    const mediaFiles = await fs.readdir(MEDIA_DIR);
    for (const filename of mediaFiles.sort()) {
      const r2Key = `media/${filename}`;
      if (deletedSet.has(r2Key) || resultsMap.has(r2Key)) continue;
      const fullPath = path.join(MEDIA_DIR, filename);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const { mimeType } = detectMimeType(filename);
      const cleanTitle = filename
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      resultsMap.set(r2Key, {
        r2Key,
        filename,
        cdnUrl: buildR2CdnUrl(r2Key),
        mimeType,
        sizeBytes: stat.size,
        alt: cleanTitle,
        title: cleanTitle,
        updatedAt: stat.mtime.toISOString(),
        bucketName: DEFAULT_R2_BUCKET_NAME,
      });
    }
  } catch {
    // ignore if media directory does not exist
  }

  return Array.from(resultsMap.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export async function putR2Object(options: {
  buffer: Buffer;
  originalFilename?: string;
  mimeType?: string;
  customKey?: string;
  replaceKey?: string;
  alt?: string;
  title?: string;
  page?: string;
}): Promise<R2ObjectRecord> {
  const index = await loadR2Index();
  const { ext, mimeType: detectedMime } = detectMimeType(
    options.originalFilename || options.customKey || 'image.jpg'
  );
  const mimeType = options.mimeType || detectedMime;

  const baseSlug =
    path
      .basename(
        options.originalFilename || 'safari-photo',
        path.extname(options.originalFilename || '')
      )
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'safari-photo';

  let r2Key: string;
  if (options.customKey && options.customKey.trim()) {
    r2Key = sanitizeR2Key(options.customKey);
    if (!path.extname(r2Key)) {
      r2Key = `${r2Key}.${ext}`;
    }
  } else if (options.replaceKey && options.replaceKey.trim()) {
    // Replace existing R2 object key in-place so all CDN references to this key update immediately
    const cleanReplace = sanitizeR2Key(options.replaceKey);
    const existingExt = path.extname(cleanReplace);
    r2Key = existingExt ? cleanReplace : `${cleanReplace}.${ext}`;
  } else {
    const folder = options.page
      ? options.page.replace('.html', '').replace(/[^a-z0-9_-]/gi, '-')
      : 'uploads';
    r2Key = `${folder}/${Date.now()}-${baseSlug}.${ext}`;
  }

  // If replacing a different previous R2 key, delete the old R2 object first
  if (options.replaceKey && sanitizeR2Key(options.replaceKey) !== r2Key) {
    await deleteR2Object(options.replaceKey);
  }

  // Write binary into R2 bucket storage directory
  const targetPath = path.join(R2_LOCAL_DIR, r2Key);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, options.buffer);

  // If r2Key is a media/<filename> asset, also sync public/assets/media/<filename>
  if (r2Key.startsWith('media/')) {
    const mediaFilename = path.basename(r2Key);
    const pubMediaPath = path.join(MEDIA_DIR, mediaFilename);
    await fs.mkdir(path.dirname(pubMediaPath), { recursive: true });
    await fs.writeFile(pubMediaPath, options.buffer);
    const rootMediaPath = path.join(process.cwd(), 'assets', 'media', mediaFilename);
    try {
      await fs.mkdir(path.dirname(rootMediaPath), { recursive: true });
      await fs.writeFile(rootMediaPath, options.buffer);
    } catch {
      // ignore if root assets folder not writable
    }
  }

  // Push to Cloudflare R2 REST API if credentials are configured
  await pushToCloudflareR2RestApi(r2Key, options.buffer, mimeType);

  const freshIndex = await loadR2Index();
  const now = new Date().toISOString();
  const prev = freshIndex.objects[r2Key];
  const filename = path.basename(r2Key);
  const record: R2ObjectRecord = {
    r2Key,
    filename,
    cdnUrl: buildR2CdnUrl(r2Key),
    mimeType,
    sizeBytes: options.buffer.length,
    alt: options.alt !== undefined ? options.alt : prev?.alt || baseSlug.replace(/-/g, ' '),
    title: options.title !== undefined ? options.title : prev?.title || filename,
    page: options.page || prev?.page,
    updatedAt: now,
    bucketName: DEFAULT_R2_BUCKET_NAME,
  };

  freshIndex.objects[r2Key] = record;
  freshIndex.deletedMediaKeys = freshIndex.deletedMediaKeys.filter((k) => k !== r2Key);
  await saveR2Index(freshIndex);

  return record;
}

export async function putR2ObjectFromDataUrl(options: {
  dataUrl: string;
  filenameHint?: string;
  alt?: string;
  title?: string;
  page?: string;
}): Promise<R2ObjectRecord> {
  const match = options.dataUrl.match(/^data:([^;,]+)?(?:;base64)?,([\s\S]*)$/i);
  if (!match) {
    throw new Error('Invalid data URL format');
  }
  const mimeType = (match[1] || 'image/jpeg').trim();
  const base64Data = match[2].trim();
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
    ? 'webp'
    : mimeType.includes('svg')
    ? 'svg'
    : mimeType.includes('gif')
    ? 'gif'
    : 'jpg';
  const originalFilename = `${options.filenameHint || 'migrated-image'}.${ext}`;

  return putR2Object({
    buffer,
    originalFilename,
    mimeType,
    alt: options.alt,
    title: options.title,
    page: options.page,
  });
}

export async function updateR2ObjectMetadata(options: {
  r2Key: string;
  newKey?: string;
  alt?: string;
  title?: string;
  page?: string;
}): Promise<R2ObjectRecord> {
  const cleanKey = sanitizeR2Key(options.r2Key);
  const index = await loadR2Index();
  const existing = index.objects[cleanKey];

  const existingBinary = await getR2ObjectBinary(cleanKey);
  if (!existingBinary && !existing) {
    throw new Error(`R2 object "${cleanKey}" not found in bucket`);
  }

  let targetKey = cleanKey;
  if (options.newKey && sanitizeR2Key(options.newKey) !== cleanKey) {
    targetKey = sanitizeR2Key(options.newKey);
    if (existingBinary) {
      const destPath = path.join(R2_LOCAL_DIR, targetKey);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.writeFile(destPath, existingBinary.buffer);
      await pushToCloudflareR2RestApi(targetKey, existingBinary.buffer, existingBinary.mimeType);
    }
    await deleteR2Object(cleanKey);
  }

  const now = new Date().toISOString();
  const filename = path.basename(targetKey);
  const { mimeType } = detectMimeType(filename);

  const updatedRecord: R2ObjectRecord = {
    r2Key: targetKey,
    filename,
    cdnUrl: buildR2CdnUrl(targetKey),
    mimeType: existingBinary?.mimeType || existing?.mimeType || mimeType,
    sizeBytes: existingBinary?.buffer.length || existing?.sizeBytes || 0,
    alt: options.alt !== undefined ? options.alt : existing?.alt || filename,
    title: options.title !== undefined ? options.title : existing?.title || filename,
    page: options.page !== undefined ? options.page : existing?.page,
    originUrl: existing?.originUrl,
    updatedAt: now,
    bucketName: DEFAULT_R2_BUCKET_NAME,
  };

  const freshIndex = await loadR2Index();
  freshIndex.objects[targetKey] = updatedRecord;
  freshIndex.deletedMediaKeys = freshIndex.deletedMediaKeys.filter((k) => k !== targetKey);
  await saveR2Index(freshIndex);

  return updatedRecord;
}

export async function deleteR2Object(r2KeyOrUrl: string): Promise<{ deletedKey: string }> {
  const extracted = extractR2KeyFromCdnUrl(r2KeyOrUrl) || r2KeyOrUrl;
  const cleanKey = sanitizeR2Key(extracted);
  const index = await loadR2Index();

  delete index.objects[cleanKey];
  if (!index.deletedMediaKeys.includes(cleanKey)) {
    index.deletedMediaKeys.push(cleanKey);
  }
  await saveR2Index(index);

  const filePath = path.join(R2_LOCAL_DIR, cleanKey);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if file was not in local R2 folder
  }

  await deleteFromCloudflareR2RestApi(cleanKey);
  return { deletedKey: cleanKey };
}

export async function getR2ObjectBinary(
  r2Key: string
): Promise<{ buffer: Buffer; mimeType: string; r2Key: string } | null> {
  const cleanKey = sanitizeR2Key(r2Key);
  const index = await loadR2Index();

  if (index.deletedMediaKeys.includes(cleanKey)) {
    return null;
  }

  // 1. Check R2 bucket storage folder first (local R2 bucket binary store)
  const r2FilePath = path.join(R2_LOCAL_DIR, cleanKey);
  try {
    const buffer = await fs.readFile(r2FilePath);
    const { mimeType } = detectMimeType(cleanKey);
    return {
      buffer,
      mimeType: index.objects[cleanKey]?.mimeType || mimeType,
      r2Key: cleanKey,
    };
  } catch {
    // continue
  }

  // 2. Check if indexed R2 object has an originUrl to materialize into R2 bucket storage
  const indexedRecord = index.objects[cleanKey];
  if (indexedRecord?.originUrl) {
    const origin = indexedRecord.originUrl;
    if (origin.startsWith('/')) {
      const localOriginPath = path.join(PUBLIC_DIR, origin.replace(/^\/+/, ''));
      try {
        const buffer = await fs.readFile(localOriginPath);
        await fs.mkdir(path.dirname(r2FilePath), { recursive: true });
        await fs.writeFile(r2FilePath, buffer);
        const { mimeType } = detectMimeType(origin);
        return { buffer, mimeType, r2Key: cleanKey };
      } catch {
        // continue
      }
    } else if (origin.startsWith('http://') || origin.startsWith('https://')) {
      try {
        const res = await fetch(origin);
        if (res.ok) {
          const arr = await res.arrayBuffer();
          const buffer = Buffer.from(arr);
          const contentType =
            res.headers.get('content-type') ||
            indexedRecord.mimeType ||
            detectMimeType(cleanKey).mimeType;
          // Persist binary directly into R2 bucket folder so subsequent reads are 100% local R2
          await fs.mkdir(path.dirname(r2FilePath), { recursive: true });
          await fs.writeFile(r2FilePath, buffer);
          if (!indexedRecord.sizeBytes || indexedRecord.sizeBytes !== buffer.length) {
            indexedRecord.sizeBytes = buffer.length;
            indexedRecord.mimeType = contentType;
            index.objects[cleanKey] = indexedRecord;
            await saveR2Index(index).catch(() => {});
          }
          return { buffer, mimeType: contentType, r2Key: cleanKey };
        }
      } catch {
        // continue
      }
    }
  }

  // 3. If key starts with media/, check public/assets/media/
  if (cleanKey.startsWith('media/')) {
    const mediaFilename = path.basename(cleanKey);
    const mediaPath = path.join(MEDIA_DIR, mediaFilename);
    try {
      const buffer = await fs.readFile(mediaPath);
      const { mimeType } = detectMimeType(mediaFilename);
      return { buffer, mimeType, r2Key: cleanKey };
    } catch {
      // continue
    }
  }

  // 4. Also check if filename directly matches in public/assets/media/
  const fallbackMediaPath = path.join(MEDIA_DIR, path.basename(cleanKey));
  try {
    const buffer = await fs.readFile(fallbackMediaPath);
    const { mimeType } = detectMimeType(cleanKey);
    return { buffer, mimeType, r2Key: cleanKey };
  } catch {
    // continue
  }

  // 5. If Cloudflare R2 REST API token is configured, fetch from Cloudflare R2 API
  const apiToken = (process.env.R2_API_TOKEN || '').trim();
  if (apiToken) {
    try {
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${DEFAULT_R2_ACCOUNT_ID}/r2/buckets/${DEFAULT_R2_BUCKET_NAME}/objects/${encodeURIComponent(cleanKey)}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        const { mimeType } = detectMimeType(cleanKey);
        return {
          buffer: Buffer.from(arr),
          mimeType: res.headers.get('content-type') || mimeType,
          r2Key: cleanKey,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}
