import crypto from 'node:crypto';
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

export interface R2BindingLike {
  put: (
    key: string,
    value: Uint8Array | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }
  ) => Promise<unknown>;
  get: (
    key: string
  ) => Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete: (key: string | string[]) => Promise<unknown>;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const R2_LOCAL_DIR = path.join(PUBLIC_DIR, 'assets', 'r2-bucket');
const R2_INDEX_PATH = path.join(R2_LOCAL_DIR, '_index.json');
const MEDIA_DIR = path.join(PUBLIC_DIR, 'assets', 'media');

export function getR2BucketName(): string {
  return (process.env.R2_BUCKET_NAME || 'ai-studio-applet-opennext-cache').trim();
}

export function getR2AccountId(): string {
  const explicit = (
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    ''
  ).trim();
  if (explicit) return explicit;
  const endpoint = (process.env.R2_ENDPOINT || process.env.S3_ENDPOINT || '').trim();
  const match = endpoint.match(/https?:\/\/([a-f0-9]{32})\.r2\.cloudflarestorage\.com/i);
  if (match) return match[1];
  return '10382badc5549c70cccebce858ee7f65';
}

export const DEFAULT_R2_BUCKET_NAME = getR2BucketName();
export const DEFAULT_R2_ACCOUNT_ID = getR2AccountId();

function getS3Credentials(): { accessKeyId: string; secretAccessKey: string } | null {
  const accessKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    ''
  ).trim();
  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    ''
  ).trim();
  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }
  return null;
}

function getApiToken(): string | null {
  const token = (
    process.env.R2_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    ''
  ).trim();
  return token || null;
}

function getWorkerR2Binding(): R2BindingLike | null {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g.R2_BUCKET && typeof (g.R2_BUCKET as R2BindingLike).put === 'function') {
    return g.R2_BUCKET as R2BindingLike;
  }
  const envObj = (process.env as unknown as Record<string, unknown>)?.R2_BUCKET;
  if (envObj && typeof (envObj as R2BindingLike).put === 'function') {
    return envObj as R2BindingLike;
  }
  return null;
}

export function getR2ConfigStatus(): {
  bucketName: string;
  accountId: string;
  authMode: 's3-sigv4' | 'cf-api-token' | 'worker-binding' | 'r2-local-gateway';
  remoteConfigured: boolean;
  cdnBaseUrl: string;
} {
  const bucketName = getR2BucketName();
  const accountId = getR2AccountId();
  const cdnBaseUrl = getR2CdnBaseUrl();
  if (getWorkerR2Binding()) {
    return {
      bucketName,
      accountId,
      authMode: 'worker-binding',
      remoteConfigured: true,
      cdnBaseUrl,
    };
  }
  if (getS3Credentials()) {
    return {
      bucketName,
      accountId,
      authMode: 's3-sigv4',
      remoteConfigured: true,
      cdnBaseUrl,
    };
  }
  if (getApiToken()) {
    return {
      bucketName,
      accountId,
      authMode: 'cf-api-token',
      remoteConfigured: true,
      cdnBaseUrl,
    };
  }
  return {
    bucketName,
    accountId,
    authMode: 'r2-local-gateway',
    remoteConfigured: false,
    cdnBaseUrl,
  };
}

export function getR2CdnBaseUrl(): string {
  const customPublic = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
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
  const customBase = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
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
  const bucketName = getR2BucketName();
  try {
    const raw = await fs.readFile(R2_INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw) as R2IndexFile;
    return {
      bucketName: parsed.bucketName || bucketName,
      objects: parsed.objects || {},
      deletedMediaKeys: Array.isArray(parsed.deletedMediaKeys) ? parsed.deletedMediaKeys : [],
    };
  } catch {
    return {
      bucketName,
      objects: {},
      deletedMediaKeys: [],
    };
  }
}

export async function saveR2Index(index: R2IndexFile): Promise<void> {
  await fs.mkdir(R2_LOCAL_DIR, { recursive: true });
  await fs.writeFile(R2_INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
}

// --- AWS Signature V4 Helper for Cloudflare R2 S3 API ---
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encodeRfc3986Path(pathStr: string): string {
  return pathStr
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      )
    )
    .join('/');
}

async function callR2S3Api(options: {
  method: 'PUT' | 'GET' | 'DELETE';
  r2Key: string;
  body?: Buffer;
  contentType?: string;
}): Promise<Response | null> {
  const creds = getS3Credentials();
  if (!creds) return null;

  const accountId = getR2AccountId();
  const bucketName = getR2BucketName();
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = `/${encodeRfc3986Path(bucketName)}/${encodeRfc3986Path(options.r2Key)}`;
  const payloadHash = options.body ? sha256Hex(options.body) : sha256Hex('');

  const headersMap: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (options.contentType && options.method === 'PUT') {
    headersMap['content-type'] = options.contentType;
  }

  const sortedHeaderKeys = Object.keys(headersMap).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headersMap[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    options.method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${creds.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorizationHeader = `${algorithm} Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = {
    Authorization: authorizationHeader,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (options.contentType && options.method === 'PUT') {
    fetchHeaders['Content-Type'] = options.contentType;
  }

  const url = `https://${host}${canonicalUri}`;
  return fetch(url, {
    method: options.method,
    headers: fetchHeaders,
    body: options.body ? new Uint8Array(options.body) : undefined,
  });
}

async function pushToRemoteCloudflareR2(
  r2Key: string,
  buffer: Buffer,
  mimeType: string
): Promise<boolean> {
  let pushed = false;

  // 1. Worker R2 Binding (when running inside Cloudflare Workers / Pages)
  const binding = getWorkerR2Binding();
  if (binding) {
    try {
      await binding.put(r2Key, new Uint8Array(buffer), {
        httpMetadata: { contentType: mimeType },
      });
      pushed = true;
    } catch (err) {
      console.warn('Cloudflare R2 Worker binding PUT warning:', err);
    }
  }

  // 2. S3-compatible R2 API Keys (R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY)
  if (getS3Credentials()) {
    try {
      const res = await callR2S3Api({
        method: 'PUT',
        r2Key,
        body: buffer,
        contentType: mimeType,
      });
      if (res && res.ok) {
        pushed = true;
      }
    } catch (err) {
      console.warn('Cloudflare R2 S3 PUT warning:', err);
    }
  }

  // 3. Cloudflare REST API v4 Token (R2_API_TOKEN)
  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const accountId = getR2AccountId();
      const bucketName = getR2BucketName();
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(r2Key)}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': mimeType,
        },
        body: new Uint8Array(buffer),
      });
      if (res.ok) {
        pushed = true;
      }
    } catch (err) {
      console.warn('Cloudflare R2 REST API PUT warning:', err);
    }
  }

  return pushed;
}

async function deleteFromRemoteCloudflareR2(r2Key: string): Promise<void> {
  // 1. Worker R2 Binding
  const binding = getWorkerR2Binding();
  if (binding) {
    try {
      await binding.delete(r2Key);
    } catch (err) {
      console.warn('Cloudflare R2 Worker binding DELETE warning:', err);
    }
  }

  // 2. S3-compatible R2 API Keys
  if (getS3Credentials()) {
    try {
      await callR2S3Api({
        method: 'DELETE',
        r2Key,
      });
    } catch (err) {
      console.warn('Cloudflare R2 S3 DELETE warning:', err);
    }
  }

  // 3. Cloudflare REST API v4 Token
  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const accountId = getR2AccountId();
      const bucketName = getR2BucketName();
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(r2Key)}`;
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
}

async function fetchFromRemoteCloudflareR2(
  r2Key: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const { mimeType: fallbackMime } = detectMimeType(r2Key);

  // 1. Worker R2 Binding
  const binding = getWorkerR2Binding();
  if (binding) {
    try {
      const obj = await binding.get(r2Key);
      if (obj) {
        const arr = await obj.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: obj.httpMetadata?.contentType || fallbackMime,
        };
      }
    } catch {
      // continue
    }
  }

  // 2. S3-compatible R2 API Keys
  if (getS3Credentials()) {
    try {
      const res = await callR2S3Api({
        method: 'GET',
        r2Key,
      });
      if (res && res.ok) {
        const arr = await res.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: res.headers.get('content-type') || fallbackMime,
        };
      }
    } catch {
      // continue
    }
  }

  // 3. Cloudflare REST API v4 Token
  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const accountId = getR2AccountId();
      const bucketName = getR2BucketName();
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodeURIComponent(r2Key)}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: res.headers.get('content-type') || fallbackMime,
        };
      }
    } catch {
      // continue
    }
  }

  return null;
}

export async function listR2Objects(): Promise<R2ObjectRecord[]> {
  const index = await loadR2Index();
  const bucketName = getR2BucketName();
  const deletedSet = new Set(index.deletedMediaKeys);
  const resultsMap = new Map<string, R2ObjectRecord>();

  // 1. Load indexed R2 bucket objects (skipping any deleted keys)
  for (const [key, record] of Object.entries(index.objects)) {
    if (deletedSet.has(key)) continue;
    resultsMap.set(key, {
      ...record,
      cdnUrl: buildR2CdnUrl(key),
      bucketName,
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
        bucketName,
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
  const bucketName = getR2BucketName();
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
    const cleanReplace = sanitizeR2Key(options.replaceKey);
    const existingExt = path.extname(cleanReplace);
    r2Key = existingExt ? cleanReplace : `${cleanReplace}.${ext}`;
  } else {
    const folder = options.page
      ? options.page.replace('.html', '').replace(/[^a-z0-9_-]/gi, '-')
      : 'uploads';
    r2Key = `${folder}/${Date.now()}-${baseSlug}.${ext}`;
  }

  if (options.replaceKey && sanitizeR2Key(options.replaceKey) !== r2Key) {
    await deleteR2Object(options.replaceKey);
  }

  // Write binary into local R2 bucket storage directory
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

  // Push directly to remote Cloudflare R2 bucket (via S3 SigV4, REST API Token, or Worker Binding)
  await pushToRemoteCloudflareR2(r2Key, options.buffer, mimeType);

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
    bucketName,
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
  const bucketName = getR2BucketName();
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
      await pushToRemoteCloudflareR2(targetKey, existingBinary.buffer, existingBinary.mimeType);
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
    bucketName,
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

  await deleteFromRemoteCloudflareR2(cleanKey);
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

  // 1. Check local R2 bucket storage folder first
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

  // 2. Check remote Cloudflare R2 bucket (Worker Binding, S3 SigV4, or REST API Token)
  const remoteResult = await fetchFromRemoteCloudflareR2(cleanKey);
  if (remoteResult) {
    try {
      await fs.mkdir(path.dirname(r2FilePath), { recursive: true });
      await fs.writeFile(r2FilePath, remoteResult.buffer);
    } catch {
      // ignore if read-only fs
    }
    return {
      buffer: remoteResult.buffer,
      mimeType: remoteResult.mimeType,
      r2Key: cleanKey,
    };
  }

  // 3. Check if indexed R2 object has an originUrl to materialize into R2 bucket storage
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
        await pushToRemoteCloudflareR2(cleanKey, buffer, mimeType);
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
          await fs.mkdir(path.dirname(r2FilePath), { recursive: true });
          await fs.writeFile(r2FilePath, buffer);
          await pushToRemoteCloudflareR2(cleanKey, buffer, contentType);
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

  // 4. If key starts with media/, check public/assets/media/
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

  // 5. Fallback check in public/assets/media/
  const fallbackMediaPath = path.join(MEDIA_DIR, path.basename(cleanKey));
  try {
    const buffer = await fs.readFile(fallbackMediaPath);
    const { mimeType } = detectMimeType(cleanKey);
    return { buffer, mimeType, r2Key: cleanKey };
  } catch {
    // continue
  }

  return null;
}

export async function syncAllObjectsToRemoteR2(): Promise<{
  total: number;
  pushed: number;
  authMode: string;
}> {
  const status = getR2ConfigStatus();
  const objects = await listR2Objects();
  let pushed = 0;

  const chunkSize = 10;
  for (let i = 0; i < objects.length; i += chunkSize) {
    const batch = objects.slice(i, i + chunkSize);
    const results = await Promise.all(
      batch.map(async (obj) => {
        const bin = await getR2ObjectBinary(obj.r2Key);
        if (!bin) return false;
        return pushToRemoteCloudflareR2(obj.r2Key, bin.buffer, bin.mimeType);
      })
    );
    pushed += results.filter(Boolean).length;
  }

  return {
    total: objects.length,
    pushed,
    authMode: status.authMode,
  };
}
