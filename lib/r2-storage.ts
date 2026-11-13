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
  updatedAt: string;
  bucketName: string;
  remotePushed?: boolean;
  remoteError?: string;
}

export interface R2BindingObjectSummary {
  key: string;
  size: number;
  uploaded?: Date | string;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
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
    customMetadata?: Record<string, string>;
  } | null>;
  head?: (key: string) => Promise<R2BindingObjectSummary | null>;
  delete: (key: string | string[]) => Promise<unknown>;
  list?: (options?: {
    limit?: number;
    cursor?: string;
    prefix?: string;
    include?: Array<'httpMetadata' | 'customMetadata'>;
  }) => Promise<{
    objects: R2BindingObjectSummary[];
    truncated: boolean;
    cursor?: string;
  }>;
}

const R2_CONFIG_STORE_PATH = path.join(process.cwd(), '.r2-config.json');
export const DEFAULT_CDN_BASE_URL = 'https://cdn.srilankabestsafari.com';

export interface R2StoredCredentials {
  accountId?: string;
  bucketName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  apiToken?: string;
  cdnBaseUrl?: string;
  updatedAt?: string;
}

let cachedStoredCreds: R2StoredCredentials | null = null;

export function loadStoredCredentialsSync(): R2StoredCredentials {
  if (cachedStoredCreds) return cachedStoredCreds;
  try {
    const fsSync = require('node:fs');
    if (fsSync.existsSync(R2_CONFIG_STORE_PATH)) {
      const raw = fsSync.readFileSync(R2_CONFIG_STORE_PATH, 'utf8');
      cachedStoredCreds = JSON.parse(raw);
      return cachedStoredCreds || {};
    }
  } catch {
    // ignore
  }
  cachedStoredCreds = {};
  return {};
}

export async function saveStoredCredentials(
  creds: Partial<R2StoredCredentials>
): Promise<R2StoredCredentials> {
  const current = loadStoredCredentialsSync();
  const merged: R2StoredCredentials = {
    ...current,
    ...creds,
    updatedAt: new Date().toISOString(),
  };
  cachedStoredCreds = merged;
  await fs.writeFile(R2_CONFIG_STORE_PATH, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

export function isInvalidSecretKey(secret: string): boolean {
  if (!secret) return true;
  const s = secret.trim().toLowerCase();
  if (s.startsWith('http://') || s.startsWith('https://') || s.includes('cloudflarestorage.com')) {
    return true;
  }
  if (s.length < 16) return true;
  return false;
}

export function getR2BucketName(): string {
  const stored = loadStoredCredentialsSync().bucketName;
  if (stored && stored.trim()) return stored.trim();
  const envVal = (process.env.R2_BUCKET_NAME || '').trim();
  if (envVal) return envVal;
  return 'nishatravels';
}

export function getR2AccountId(): string {
  const stored = loadStoredCredentialsSync().accountId;
  if (stored && stored.trim()) return stored.trim();
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

function getApiToken(): string | null {
  const stored = loadStoredCredentialsSync();
  const token = (
    process.env.R2_API_TOKEN ||
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    stored.apiToken ||
    ''
  ).trim();
  if (token && !isInvalidSecretKey(token)) {
    return token;
  }
  return null;
}

function getS3Credentials(): { accessKeyId: string; secretAccessKey: string } | null {
  const stored = loadStoredCredentialsSync();
  const rawKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    stored.accessKeyId ||
    ''
  ).trim();

  const envSecret = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    ''
  ).trim();

  let secretAccessKey = '';
  if (envSecret && !isInvalidSecretKey(envSecret)) {
    secretAccessKey = envSecret;
  } else if (stored.secretAccessKey && !isInvalidSecretKey(stored.secretAccessKey)) {
    secretAccessKey = stored.secretAccessKey.trim();
  } else {
    const apiToken = getApiToken();
    if (apiToken) {
      secretAccessKey = crypto.createHash('sha256').update(apiToken, 'utf8').digest('hex');
    }
  }

  if (rawKeyId && secretAccessKey) {
    return { accessKeyId: rawKeyId, secretAccessKey };
  }
  return null;
}

function getWorkerR2Binding(): R2BindingLike | null {
  const g = globalThis as unknown as Record<string, unknown>;
  const candidates = [g.R2_BUCKET, g.nishatravels, g.BUCKET, g.r2_bucket];
  for (const c of candidates) {
    if (c && typeof (c as R2BindingLike).put === 'function') {
      return c as R2BindingLike;
    }
  }
  const envObj = process.env as unknown as Record<string, unknown>;
  const envCandidates = [envObj?.R2_BUCKET, envObj?.nishatravels, envObj?.BUCKET];
  for (const c of envCandidates) {
    if (c && typeof (c as R2BindingLike).put === 'function') {
      return c as R2BindingLike;
    }
  }
  return null;
}

export function getR2CdnBaseUrl(): string {
  const storedCdn = (loadStoredCredentialsSync().cdnBaseUrl || '').trim().replace(/\/+$/, '');
  const customPublic = (
    storedCdn ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    DEFAULT_CDN_BASE_URL
  )
    .trim()
    .replace(/\/+$/, '');

  if (customPublic) {
    if (
      !customPublic.startsWith('/') &&
      !customPublic.startsWith('http://') &&
      !customPublic.startsWith('https://')
    ) {
      return `https://${customPublic}`;
    }
    return customPublic;
  }
  return DEFAULT_CDN_BASE_URL;
}

export function getR2ConfigStatus(): {
  bucketName: string;
  accountId: string;
  authMode: 's3-sigv4' | 'cf-api-token' | 'worker-binding' | 'unconfigured';
  remoteConfigured: boolean;
  cdnBaseUrl: string;
  warning?: string;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  secretIsUrlEndpoint?: boolean;
} {
  const bucketName = getR2BucketName();
  const accountId = getR2AccountId();
  const cdnBaseUrl = getR2CdnBaseUrl();
  const s3Creds = getS3Credentials();
  const hasAccessKey = Boolean(s3Creds?.accessKeyId);
  const hasSecretKey = Boolean(s3Creds?.secretAccessKey);

  if (getWorkerR2Binding()) {
    return {
      bucketName,
      accountId,
      authMode: 'worker-binding',
      remoteConfigured: true,
      cdnBaseUrl,
      hasAccessKey,
      hasSecretKey,
      secretIsUrlEndpoint: false,
    };
  }
  if (s3Creds) {
    return {
      bucketName,
      accountId,
      authMode: 's3-sigv4',
      remoteConfigured: true,
      cdnBaseUrl,
      hasAccessKey,
      hasSecretKey,
      secretIsUrlEndpoint: false,
    };
  }
  if (getApiToken()) {
    return {
      bucketName,
      accountId,
      authMode: 'cf-api-token',
      remoteConfigured: true,
      cdnBaseUrl,
      hasAccessKey,
      hasSecretKey,
      secretIsUrlEndpoint: false,
    };
  }
  return {
    bucketName,
    accountId,
    authMode: 'unconfigured',
    remoteConfigured: false,
    cdnBaseUrl,
    hasAccessKey,
    hasSecretKey,
    secretIsUrlEndpoint: false,
    warning:
      'Cloudflare R2 credentials or Worker R2_BUCKET binding required. Enter your R2 API credentials in Sync & R2 Settings.',
  };
}

export function buildR2CdnUrl(r2Key: string): string {
  const cleanKey = r2Key.replace(/^\/+/, '');
  const base = getR2CdnBaseUrl();
  return `${base}/${cleanKey}`;
}

export function extractR2KeyFromCdnUrl(url: string): string | null {
  if (!url) return null;
  const withoutQuery = url.split('?')[0].trim();
  const marker = '/api/r2/file/';
  const idx = withoutQuery.indexOf(marker);
  if (idx !== -1) {
    return withoutQuery.slice(idx + marker.length).replace(/^\/+/, '');
  }

  const storedCdn = (loadStoredCredentialsSync().cdnBaseUrl || '').trim().replace(/\/+$/, '');
  const candidateBases = [
    storedCdn,
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '',
    process.env.R2_PUBLIC_URL || '',
    DEFAULT_CDN_BASE_URL,
  ]
    .map((b) => b.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  for (const customBase of candidateBases) {
    if (customBase.startsWith('/')) continue;
    const withProtocol =
      customBase.startsWith('http://') || customBase.startsWith('https://')
        ? customBase
        : `https://${customBase}`;
    const bareDomain = customBase.replace(/^https?:\/\//i, '');

    if (withoutQuery.startsWith(withProtocol + '/')) {
      return withoutQuery.slice(withProtocol.length + 1).replace(/^\/+/, '');
    }
    if (withoutQuery.startsWith(bareDomain + '/')) {
      return withoutQuery.slice(bareDomain.length + 1).replace(/^\/+/, '');
    }
    if (withoutQuery.startsWith('http://' + bareDomain + '/')) {
      return withoutQuery.slice(('http://' + bareDomain).length + 1).replace(/^\/+/, '');
    }
  }

  const r2FolderMatch = withoutQuery.match(
    /^https?:\/\/cdn\.[^/]+\/(.+)$/i
  );
  if (r2FolderMatch?.[1]) {
    return r2FolderMatch[1].replace(/^\/+/, '');
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

function titleFromR2Key(r2Key: string): string {
  const filename = path.basename(r2Key);
  return (
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/^\d{10,14}-/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || filename
  );
}

// --- AWS Signature V4 Helper for Cloudflare R2 S3 API ---
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeRfc3986Path(pathStr: string): string {
  if (!pathStr) return '';
  return pathStr
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');
}

async function callR2S3Api(options: {
  method: 'PUT' | 'GET' | 'DELETE' | 'HEAD';
  r2Key?: string;
  queryParams?: Record<string, string>;
  body?: Buffer;
  contentType?: string;
  extraHeaders?: Record<string, string>;
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

  const keyPart = options.r2Key ? `/${encodeRfc3986Path(options.r2Key)}` : '';
  const canonicalUri = `/${encodeRfc3986Path(bucketName)}${keyPart}`;

  const queryEntries = Object.entries(options.queryParams || {})
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonicalQueryString = queryEntries
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join('&');

  const payloadHash = options.body ? sha256Hex(options.body) : sha256Hex('');

  const headersMap: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (options.contentType && options.method === 'PUT') {
    headersMap['content-type'] = options.contentType;
  }
  if (options.extraHeaders) {
    for (const [hk, hv] of Object.entries(options.extraHeaders)) {
      if (hv !== undefined && hv !== '') {
        headersMap[hk.toLowerCase()] = hv;
      }
    }
  }

  const sortedHeaderKeys = Object.keys(headersMap).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headersMap[k]}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    options.method,
    canonicalUri,
    canonicalQueryString,
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
    fetchHeaders['content-type'] = options.contentType;
  }
  if (options.extraHeaders) {
    for (const [hk, hv] of Object.entries(options.extraHeaders)) {
      if (hv !== undefined && hv !== '') {
        fetchHeaders[hk.toLowerCase()] = hv;
      }
    }
  }

  const url = `https://${host}${canonicalUri}${canonicalQueryString ? `?${canonicalQueryString}` : ''}`;
  return fetch(url, {
    method: options.method,
    headers: fetchHeaders,
    body: options.body ? new Uint8Array(options.body) : undefined,
  });
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseS3ListXml(xml: string, bucketName: string): {
  items: R2ObjectRecord[];
  isTruncated: boolean;
  nextToken?: string;
} {
  const items: R2ObjectRecord[] = [];
  const contentsMatches = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/gi)];
  for (const m of contentsMatches) {
    const block = m[1];
    const keyM = block.match(/<Key>([\s\S]*?)<\/Key>/i);
    if (!keyM) continue;
    const r2Key = decodeXmlEntities(keyM[1].trim());
    if (!r2Key || r2Key.startsWith('diagnostics/') || r2Key.endsWith('/')) continue;

    const sizeM = block.match(/<Size>(\d+)<\/Size>/i);
    const modM = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/i);
    const filename = path.basename(r2Key);
    const { mimeType } = detectMimeType(filename);
    const cleanTitle = titleFromR2Key(r2Key);

    items.push({
      r2Key,
      filename,
      cdnUrl: buildR2CdnUrl(r2Key),
      mimeType,
      sizeBytes: sizeM ? Number(sizeM[1]) : 0,
      alt: cleanTitle,
      title: cleanTitle,
      updatedAt: modM ? modM[1].trim() : new Date().toISOString(),
      bucketName,
      remotePushed: true,
    });
  }

  const truncM = xml.match(/<IsTruncated>(true|false)<\/IsTruncated>/i);
  const nextM = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/i);
  return {
    items,
    isTruncated: truncM?.[1]?.toLowerCase() === 'true',
    nextToken: nextM ? decodeXmlEntities(nextM[1].trim()) : undefined,
  };
}

export interface R2PushResult {
  pushed: boolean;
  provider: 'worker-binding' | 's3-sigv4' | 'cf-api-token' | 'none';
  error?: string;
  status?: number;
}

export async function testR2Connection(): Promise<{
  connected: boolean;
  provider: string;
  message: string;
  status?: number;
  bucketName: string;
  accountId: string;
  authMode: string;
  details?: string;
}> {
  const status = getR2ConfigStatus();
  const bucketName = status.bucketName;
  const accountId = status.accountId;

  const binding = getWorkerR2Binding();
  if (binding) {
    try {
      if (binding.list) {
        await binding.list({ limit: 1 });
      } else {
        await binding.get('__test_ping__');
      }
      return {
        connected: true,
        provider: 'worker-binding',
        message: `Connected to Cloudflare R2 bucket "${bucketName}" via Cloudflare Worker Binding.`,
        bucketName,
        accountId,
        authMode: 'worker-binding',
      };
    } catch (err) {
      return {
        connected: false,
        provider: 'worker-binding',
        message: `Worker binding ping failed: ${err instanceof Error ? err.message : String(err)}`,
        bucketName,
        accountId,
        authMode: 'worker-binding',
      };
    }
  }

  const s3Creds = getS3Credentials();
  if (s3Creds) {
    try {
      const res = await callR2S3Api({
        method: 'GET',
        queryParams: { 'list-type': '2', 'max-keys': '1' },
      });
      if (res) {
        if (res.ok) {
          return {
            connected: true,
            provider: 's3-sigv4',
            message: `Connected to Cloudflare R2 bucket "${bucketName}" via S3 SigV4 API.`,
            status: res.status,
            bucketName,
            accountId,
            authMode: 's3-sigv4',
          };
        }
        const errText = await res.text();
        let code = `HTTP ${res.status}`;
        let msg = errText;
        const codeMatch = errText.match(/<Code>([^<]+)<\/Code>/);
        const msgMatch = errText.match(/<Message>([^<]+)<\/Message>/);
        if (codeMatch && msgMatch) {
          code = codeMatch[1];
          msg = msgMatch[1];
        }
        return {
          connected: false,
          provider: 's3-sigv4',
          message: `${code}: ${msg}`,
          status: res.status,
          bucketName,
          accountId,
          authMode: 's3-sigv4',
          details: errText.slice(0, 300),
        };
      }
    } catch (err) {
      return {
        connected: false,
        provider: 's3-sigv4',
        message: `Network error connecting to Cloudflare R2: ${err instanceof Error ? err.message : String(err)}`,
        bucketName,
        accountId,
        authMode: 's3-sigv4',
      };
    }
  }

  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (res.ok) {
        return {
          connected: true,
          provider: 'cf-api-token',
          message: `Verified Cloudflare R2 bucket "${bucketName}" via Cloudflare REST API Token.`,
          status: res.status,
          bucketName,
          accountId,
          authMode: 'cf-api-token',
        };
      }
      const errText = await res.text();
      return {
        connected: false,
        provider: 'cf-api-token',
        message: `Cloudflare REST API Error ${res.status}: ${errText.slice(0, 160)}`,
        status: res.status,
        bucketName,
        accountId,
        authMode: 'cf-api-token',
      };
    } catch (err) {
      return {
        connected: false,
        provider: 'cf-api-token',
        message: `Cloudflare REST API failed: ${err instanceof Error ? err.message : String(err)}`,
        bucketName,
        accountId,
        authMode: 'cf-api-token',
      };
    }
  }

  return {
    connected: false,
    provider: 'unconfigured',
    message: status.warning || 'No remote Cloudflare R2 credentials or Worker binding found.',
    bucketName,
    accountId,
    authMode: 'unconfigured',
  };
}

export async function pushToRemoteCloudflareR2(
  r2Key: string,
  buffer: Buffer,
  mimeType: string,
  customMeta?: { alt?: string; title?: string; page?: string }
): Promise<R2PushResult> {
  const safeCustomMeta: Record<string, string> = {};
  if (customMeta?.alt) safeCustomMeta.alt = customMeta.alt.replace(/[\r\n]/g, ' ').slice(0, 300);
  if (customMeta?.title) safeCustomMeta.title = customMeta.title.replace(/[\r\n]/g, ' ').slice(0, 200);
  if (customMeta?.page) safeCustomMeta.page = customMeta.page.replace(/[\r\n]/g, '').slice(0, 80);

  const binding = getWorkerR2Binding();
  if (binding) {
    try {
      await binding.put(r2Key, new Uint8Array(buffer), {
        httpMetadata: { contentType: mimeType },
        customMetadata: Object.keys(safeCustomMeta).length > 0 ? safeCustomMeta : undefined,
      });
      return { pushed: true, provider: 'worker-binding' };
    } catch (err) {
      return {
        pushed: false,
        provider: 'worker-binding',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const s3Creds = getS3Credentials();
  if (s3Creds) {
    try {
      const extraHeaders: Record<string, string> = {};
      if (safeCustomMeta.alt) extraHeaders['x-amz-meta-alt'] = safeCustomMeta.alt;
      if (safeCustomMeta.title) extraHeaders['x-amz-meta-title'] = safeCustomMeta.title;
      if (safeCustomMeta.page) extraHeaders['x-amz-meta-page'] = safeCustomMeta.page;

      const res = await callR2S3Api({
        method: 'PUT',
        r2Key,
        body: buffer,
        contentType: mimeType,
        extraHeaders,
      });
      if (res) {
        if (res.ok) {
          return { pushed: true, provider: 's3-sigv4', status: res.status };
        }
        const errText = await res.text();
        let parsedMsg = `HTTP ${res.status}`;
        const codeMatch = errText.match(/<Code>([^<]+)<\/Code>/);
        const msgMatch = errText.match(/<Message>([^<]+)<\/Message>/);
        if (codeMatch && msgMatch) {
          parsedMsg = `${codeMatch[1]}: ${msgMatch[1]}`;
        } else if (errText.length < 220) {
          parsedMsg = `${parsedMsg} - ${errText.trim()}`;
        }
        return { pushed: false, provider: 's3-sigv4', error: parsedMsg, status: res.status };
      }
    } catch (err) {
      return {
        pushed: false,
        provider: 's3-sigv4',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const accountId = getR2AccountId();
      const bucketName = getR2BucketName();
      const encodedKey = encodeRfc3986Path(r2Key);
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodedKey}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': mimeType,
        },
        body: new Uint8Array(buffer),
      });
      if (res.ok) {
        return { pushed: true, provider: 'cf-api-token', status: res.status };
      }
      const errText = await res.text();
      return {
        pushed: false,
        provider: 'cf-api-token',
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
        status: res.status,
      };
    } catch (err) {
      return {
        pushed: false,
        provider: 'cf-api-token',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    pushed: false,
    provider: 'none',
    error: getR2ConfigStatus().warning || 'No remote Cloudflare R2 credentials configured.',
  };
}

async function deleteFromRemoteCloudflareR2(r2Key: string): Promise<void> {
  const binding = getWorkerR2Binding();
  if (binding) {
    await binding.delete(r2Key);
    return;
  }

  if (getS3Credentials()) {
    const res = await callR2S3Api({
      method: 'DELETE',
      r2Key,
    });
    if (res && !res.ok && res.status !== 404) {
      const txt = await res.text().catch(() => '');
      throw new Error(`R2 S3 delete error ${res.status}: ${txt.slice(0, 160)}`);
    }
    return;
  }

  const apiToken = getApiToken();
  if (apiToken) {
    const accountId = getR2AccountId();
    const bucketName = getR2BucketName();
    const encodedKey = encodeRfc3986Path(r2Key);
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodedKey}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    if (!res.ok && res.status !== 404) {
      const txt = await res.text().catch(() => '');
      throw new Error(`R2 REST delete error ${res.status}: ${txt.slice(0, 160)}`);
    }
  }
}

export async function listR2Objects(): Promise<R2ObjectRecord[]> {
  const bucketName = getR2BucketName();
  const results: R2ObjectRecord[] = [];

  // 1. Worker Binding list()
  const binding = getWorkerR2Binding();
  if (binding?.list) {
    try {
      let cursor: string | undefined;
      for (let page = 0; page < 20; page++) {
        const listed = await binding.list({
          limit: 500,
          cursor,
          include: ['httpMetadata', 'customMetadata'],
        });
        for (const obj of listed.objects) {
          if (!obj.key || obj.key.startsWith('diagnostics/') || obj.key.endsWith('/')) continue;
          const filename = path.basename(obj.key);
          const { mimeType: fallbackMime } = detectMimeType(filename);
          const meta = obj.customMetadata || {};
          const fallbackTitle = titleFromR2Key(obj.key);
          results.push({
            r2Key: obj.key,
            filename,
            cdnUrl: buildR2CdnUrl(obj.key),
            mimeType: obj.httpMetadata?.contentType || fallbackMime,
            sizeBytes: obj.size,
            alt: meta.alt || meta.title || fallbackTitle,
            title: meta.title || fallbackTitle,
            page: meta.page,
            updatedAt:
              obj.uploaded instanceof Date
                ? obj.uploaded.toISOString()
                : typeof obj.uploaded === 'string'
                ? obj.uploaded
                : new Date().toISOString(),
            bucketName,
            remotePushed: true,
          });
        }
        if (!listed.truncated || !listed.cursor) break;
        cursor = listed.cursor;
      }
      return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (err) {
      console.warn('Worker R2 list warning:', err);
    }
  }

  // 2. S3 SigV4 ListObjectsV2
  if (getS3Credentials()) {
    try {
      let continuationToken: string | undefined;
      for (let page = 0; page < 20; page++) {
        const queryParams: Record<string, string> = {
          'list-type': '2',
          'max-keys': '500',
        };
        if (continuationToken) {
          queryParams['continuation-token'] = continuationToken;
        }
        const res = await callR2S3Api({ method: 'GET', queryParams });
        if (!res || !res.ok) break;
        const xml = await res.text();
        const parsed = parseS3ListXml(xml, bucketName);
        results.push(...parsed.items);
        if (!parsed.isTruncated || !parsed.nextToken) break;
        continuationToken = parsed.nextToken;
      }
      return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (err) {
      console.warn('R2 S3 list warning:', err);
    }
  }

  // 3. Cloudflare REST API v4 object list
  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const accountId = getR2AccountId();
      let cursor: string | undefined;
      for (let page = 0; page < 20; page++) {
        const qs = new URLSearchParams({ per_page: '100' });
        if (cursor) qs.set('cursor', cursor);
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects?${qs.toString()}`;
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (!res.ok) break;
        const json = (await res.json()) as {
          result?: Array<{
            key: string;
            size?: number;
            uploaded?: string;
            http_metadata?: { contentType?: string };
            custom_metadata?: Record<string, string>;
          }>;
          result_info?: { cursor?: string; is_truncated?: boolean };
        };
        const arr = Array.isArray(json.result) ? json.result : [];
        for (const item of arr) {
          if (!item.key || item.key.startsWith('diagnostics/') || item.key.endsWith('/')) continue;
          const filename = path.basename(item.key);
          const { mimeType: fallbackMime } = detectMimeType(filename);
          const meta = item.custom_metadata || {};
          const fallbackTitle = titleFromR2Key(item.key);
          results.push({
            r2Key: item.key,
            filename,
            cdnUrl: buildR2CdnUrl(item.key),
            mimeType: item.http_metadata?.contentType || fallbackMime,
            sizeBytes: Number(item.size || 0),
            alt: meta.alt || meta.title || fallbackTitle,
            title: meta.title || fallbackTitle,
            page: meta.page,
            updatedAt: item.uploaded || new Date().toISOString(),
            bucketName,
            remotePushed: true,
          });
        }
        if (!json.result_info?.is_truncated || !json.result_info?.cursor) break;
        cursor = json.result_info.cursor;
      }
      return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (err) {
      console.warn('R2 REST list warning:', err);
    }
  }

  return results;
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
    options.originalFilename || options.customKey || 'photo.jpg'
  );
  const mimeType = options.mimeType || detectedMime;

  const baseSlug =
    path
      .basename(
        options.originalFilename || 'nisha-travelling-photo',
        path.extname(options.originalFilename || '')
      )
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'nisha-travelling-photo';

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

  const pushResult = await pushToRemoteCloudflareR2(r2Key, options.buffer, mimeType, {
    alt: options.alt,
    title: options.title,
    page: options.page,
  });

  if (!pushResult.pushed) {
    throw new Error(pushResult.error || 'Failed to upload image directly to Cloudflare R2.');
  }

  if (options.replaceKey && sanitizeR2Key(options.replaceKey) !== r2Key) {
    await deleteR2Object(options.replaceKey).catch(() => {});
  }

  const now = new Date().toISOString();
  const filename = path.basename(r2Key);
  return {
    r2Key,
    filename,
    cdnUrl: buildR2CdnUrl(r2Key),
    mimeType,
    sizeBytes: options.buffer.length,
    alt: options.alt !== undefined ? options.alt : baseSlug.replace(/-/g, ' '),
    title: options.title !== undefined ? options.title : filename,
    page: options.page,
    updatedAt: now,
    bucketName,
    remotePushed: true,
  };
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
  const originalFilename = `${options.filenameHint || 'uploaded-image'}.${ext}`;

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
  const targetKey = options.newKey ? sanitizeR2Key(options.newKey) : cleanKey;

  const existingBinary = await getR2ObjectBinary(cleanKey);
  if (!existingBinary) {
    throw new Error(`R2 object "${cleanKey}" not found in Cloudflare R2 bucket.`);
  }

  const pushResult = await pushToRemoteCloudflareR2(
    targetKey,
    existingBinary.buffer,
    existingBinary.mimeType,
    {
      alt: options.alt,
      title: options.title,
      page: options.page,
    }
  );
  if (!pushResult.pushed) {
    throw new Error(pushResult.error || 'Failed to update object in Cloudflare R2 bucket.');
  }

  if (targetKey !== cleanKey) {
    await deleteFromRemoteCloudflareR2(cleanKey).catch(() => {});
  }

  const filename = path.basename(targetKey);
  return {
    r2Key: targetKey,
    filename,
    cdnUrl: buildR2CdnUrl(targetKey),
    mimeType: existingBinary.mimeType,
    sizeBytes: existingBinary.buffer.length,
    alt: options.alt !== undefined ? options.alt : titleFromR2Key(targetKey),
    title: options.title !== undefined ? options.title : filename,
    page: options.page,
    updatedAt: new Date().toISOString(),
    bucketName,
    remotePushed: true,
  };
}

export async function deleteR2Object(r2KeyOrUrl: string): Promise<{ deletedKey: string }> {
  const extracted = extractR2KeyFromCdnUrl(r2KeyOrUrl) || r2KeyOrUrl;
  const cleanKey = sanitizeR2Key(extracted);
  if (!cleanKey) {
    throw new Error('Valid R2 key is required to delete.');
  }
  await deleteFromRemoteCloudflareR2(cleanKey);
  return { deletedKey: cleanKey };
}

export async function getR2ObjectBinary(
  r2Key: string
): Promise<{ buffer: Buffer; mimeType: string; r2Key: string } | null> {
  const cleanKey = sanitizeR2Key(r2Key);
  if (!cleanKey) return null;
  const { mimeType: fallbackMime } = detectMimeType(cleanKey);

  // 1. Worker R2 Binding
  const binding = getWorkerR2Binding();
  if (binding) {
    try {
      const obj = await binding.get(cleanKey);
      if (obj) {
        const arr = await obj.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: obj.httpMetadata?.contentType || fallbackMime,
          r2Key: cleanKey,
        };
      }
    } catch {
      // continue
    }
  }

  // 2. S3 SigV4 GET
  if (getS3Credentials()) {
    try {
      const res = await callR2S3Api({ method: 'GET', r2Key: cleanKey });
      if (res && res.ok) {
        const arr = await res.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: res.headers.get('content-type') || fallbackMime,
          r2Key: cleanKey,
        };
      }
    } catch {
      // continue
    }
  }

  // 3. Cloudflare REST API v4 GET
  const apiToken = getApiToken();
  if (apiToken) {
    try {
      const accountId = getR2AccountId();
      const bucketName = getR2BucketName();
      const encodedKey = encodeRfc3986Path(cleanKey);
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects/${encodedKey}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        return {
          buffer: Buffer.from(arr),
          mimeType: res.headers.get('content-type') || fallbackMime,
          r2Key: cleanKey,
        };
      }
    } catch {
      // continue
    }
  }

  return null;
}
