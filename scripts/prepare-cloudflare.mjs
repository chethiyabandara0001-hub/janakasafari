import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DEFAULTS_HTML_DIR = path.join(PUBLIC_DIR, 'assets', 'html-defaults');
const CMS_STATE_PATH = path.join(PUBLIC_DIR, 'assets', 'firebase-cms-state.json');
const R2_INDEX_PATH = path.join(PUBLIC_DIR, 'assets', 'r2-bucket', '_index.json');
const CF_DIR = path.join(ROOT_DIR, '.cloudflare');
const CF_ASSETS_DIR = path.join(CF_DIR, 'assets');
const DEFAULT_R2_BUCKET_NAME =
  process.env.R2_BUCKET_NAME || 'nishatravels';

const SITE_PAGES = [
  { file: 'index.html', title: 'Home' },
  { file: 'about.html', title: 'About' },
  { file: 'safari-parks.html', title: 'Safari Parks' },
  { file: 'yala-safari.html', title: 'Yala Safari' },
  { file: 'udawalawe-safari.html', title: 'Udawalawe Safari' },
  { file: 'bundala-birding-safari.html', title: 'Bundala Safari' },
  { file: 'wilpattu-safari.html', title: 'Wilpattu Safari' },
  { file: 'minneriya-safari.html', title: 'Minneriya Safari' },
  { file: 'kumana-birding-safari.html', title: 'Kumana Safari' },
  { file: 'gallery.html', title: 'Gallery' },
  { file: 'reviews.html', title: 'Reviews' },
  { file: 'contact.html', title: 'Contact' },
];

function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function findSectionContext(htmlBefore, isHeaderLogo, isFooterLogo) {
  if (isHeaderLogo) return 'Header Navigation Logo';
  if (isFooterLogo) return 'Footer Brand Logo';

  const h2Matches = [...htmlBefore.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const lastH2 = h2Matches.length > 0 ? stripTags(h2Matches[h2Matches.length - 1][1]) : '';

  const strongMatches = [...htmlBefore.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)];
  const lastStrong =
    strongMatches.length > 0 ? stripTags(strongMatches[strongMatches.length - 1][1]) : '';

  if (lastH2 && lastStrong && lastH2 !== lastStrong && lastStrong.length < 60) {
    return `${lastH2} · ${lastStrong}`;
  }
  return lastH2 || lastStrong || 'Page Content';
}

function parsePageSlots(html) {
  const results = [];
  let slotIndex = 0;
  const tokenRegex =
    /(<div[^>]+style="[^"]*background-image:\s*url\((?:&quot;|"|')?([^"')&]+)(?:&quot;|"|')?\)[^"]*"[^>]*>)|(<img\b[^>]*>)/gi;

  let match;
  while ((match = tokenRegex.exec(html)) !== null) {
    const startIndex = match.index;

    if (match[1]) {
      const bgUrl = match[2].trim();
      const afterSlice = html.slice(startIndex, startIndex + 900);
      const bannerH2 = afterSlice.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const bannerTitle = bannerH2 ? stripTags(bannerH2[1]) : 'Hero Banner';

      results.push({
        slotIndex: slotIndex++,
        kind: 'hero-bg',
        sectionContext: `Hero Banner (${bannerTitle})`,
        src: bgUrl,
        alt: bannerTitle,
      });
    } else if (match[3]) {
      const imgTag = match[3];
      if (imgTag.includes('photo-full') || imgTag.includes('cross-top-img')) {
        continue;
      }
      const srcMatch = imgTag.match(/\bsrc="([^"]*)"/i);
      if (!srcMatch || !srcMatch[1]) continue;

      const src = srcMatch[1];
      const altMatch = imgTag.match(/\balt="([^"]*)"/i);
      const alt = altMatch ? altMatch[1] : '';

      const htmlBefore = html.slice(0, startIndex);
      const isHeaderLogo = htmlBefore.includes('<header') && !htmlBefore.includes('</header>');
      const isFooterLogo = htmlBefore.includes('<footer') && !htmlBefore.includes('</footer>');

      const recentAnchorIndex = htmlBefore.lastIndexOf('<a ');
      const recentAnchorClose = htmlBefore.lastIndexOf('</a>');
      let lightboxHref;

      if (recentAnchorIndex !== -1 && recentAnchorIndex > recentAnchorClose) {
        const anchorOpenSlice = html.slice(recentAnchorIndex, startIndex);
        const anchorTagMatch = anchorOpenSlice.match(/^<a\b[^>]*>/i);
        if (anchorTagMatch && /data-lightbox=/i.test(anchorTagMatch[0])) {
          const hrefMatch = anchorTagMatch[0].match(/\bhref="([^"]*)"/i);
          if (hrefMatch && hrefMatch[1]) {
            lightboxHref = hrefMatch[1];
          }
        }
      }

      const kind =
        isHeaderLogo || isFooterLogo ? 'logo' : lightboxHref ? 'gallery-img' : 'img';
      const sectionContext = findSectionContext(htmlBefore, isHeaderLogo, isFooterLogo);

      results.push({
        slotIndex: slotIndex++,
        kind,
        sectionContext,
        src,
        lightboxHref,
        alt,
      });
    }
  }
  return results;
}

function parsePageTextSlots(html) {
  const results = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const targetRegion = mainMatch ? mainMatch[1] : html;
  const regex =
    /<(h1|h2|h3|h4|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>|<span\b[^>]*class="[^"]*wsite-button-inner[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  let currentSection = 'Hero Banner';
  let textIndex = 0;
  let match;

  while ((match = regex.exec(targetRegion)) !== null) {
    const rawTag = match[1] ? match[1].toUpperCase() : 'SPAN';
    const innerHtml = match[1] ? match[2] : match[3];
    if (/<(p|div|ul|ol|table|h1|h2|h3|h4)\b/i.test(innerHtml)) {
      continue;
    }
    const cleanText = stripTags(innerHtml);
    if (!cleanText || cleanText.length < 2) {
      continue;
    }
    if (rawTag === 'H1' || rawTag === 'H2') {
      currentSection = cleanText.slice(0, 120);
    }
    const tagName = ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'LI', 'BLOCKQUOTE'].includes(rawTag)
      ? rawTag
      : 'P';

    results.push({
      textIndex: textIndex++,
      tagName,
      sectionContext: currentSection,
      content: cleanText,
    });
  }
  return results;
}

function makeTextSlotId(page, textIndex) {
  const safePage = page.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safePage}__text_${textIndex}`;
}

function makeImageSlotId(page, slotIndex) {
  const safePage = page.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safePage}__slot_${slotIndex}`;
}

function detectFormatFromExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return { format: 'JPEG', mimeType: 'image/jpeg' };
  if (ext === '.png') return { format: 'PNG', mimeType: 'image/png' };
  if (ext === '.webp') return { format: 'WEBP', mimeType: 'image/webp' };
  if (ext === '.gif') return { format: 'GIF', mimeType: 'image/gif' };
  return { format: 'SVG', mimeType: 'image/svg+xml' };
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function buildInventories() {
  let cmsState = {
    seededToFirestore: false,
    sectionGalleryItems: [],
    textOverrides: {},
    imageOverrides: {},
  };

  try {
    const raw = await fs.readFile(CMS_STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cmsState = {
      seededToFirestore: Boolean(parsed.seededToFirestore),
      sectionGalleryItems: Array.isArray(parsed.sectionGalleryItems)
        ? parsed.sectionGalleryItems
        : [],
      textOverrides: parsed.textOverrides || {},
      imageOverrides: parsed.imageOverrides || {},
    };
  } catch {
    // use default empty state if file missing
  }

  let r2Index = { objects: {}, deletedMediaKeys: [] };
  try {
    const rawIdx = await fs.readFile(R2_INDEX_PATH, 'utf8');
    const parsedIdx = JSON.parse(rawIdx);
    r2Index = {
      objects: parsedIdx.objects || {},
      deletedMediaKeys: Array.isArray(parsedIdx.deletedMediaKeys) ? parsedIdx.deletedMediaKeys : [],
    };
  } catch {
    // ignore if _index.json does not exist yet
  }

  const slotCountBySrc = new Map();
  const usageMap = new Map();
  const allRawByPage = new Map();

  for (const page of SITE_PAGES) {
    try {
      const html = await fs.readFile(path.join(PUBLIC_DIR, page.file), 'utf8');
      const matches = parsePageSlots(html);
      allRawByPage.set(page.file, { title: page.title, matches });

      for (const m of matches) {
        const cleanSrc = m.src.split('?')[0];
        slotCountBySrc.set(cleanSrc, (slotCountBySrc.get(cleanSrc) || 0) + 1);
        if (!usageMap.has(cleanSrc)) usageMap.set(cleanSrc, new Set());
        usageMap.get(cleanSrc).add(page.title);

        if (m.lightboxHref) {
          const cleanLb = m.lightboxHref.split('?')[0];
          if (!usageMap.has(cleanLb)) usageMap.set(cleanLb, new Set());
          usageMap.get(cleanLb).add(page.title);
        }
      }
    } catch {
      // ignore missing page
    }
  }

  const enrichedSlots = [];
  const imagePagesSummary = [];

  for (const page of SITE_PAGES) {
    const entry = allRawByPage.get(page.file);
    if (!entry) continue;
    imagePagesSummary.push({
      file: page.file,
      title: page.title,
      slotCount: entry.matches.length,
    });

    for (const m of entry.matches) {
      const firestoreSlotId = makeImageSlotId(page.file, m.slotIndex);
      const override = cmsState.imageOverrides[firestoreSlotId];
      const mappedType = m.kind === 'gallery-img' ? 'lightbox-img' : m.kind;
      const effectiveSrc = override?.src || m.src;
      const effectiveAlt = override?.alt !== undefined ? override.alt : m.alt;
      const cleanFile = m.src.split('?')[0].replace(/^\/+/, '');
      const assetFilename = cleanFile.startsWith('assets/media/')
        ? path.basename(cleanFile)
        : cleanFile;
      const sharedCount = slotCountBySrc.get(m.src.split('?')[0]) || 1;

      enrichedSlots.push({
        id: firestoreSlotId,
        slotId: firestoreSlotId,
        page: page.file,
        pageTitle: entry.title,
        slotIndex: m.slotIndex,
        kind: m.kind,
        type: mappedType,
        label: override?.label || m.alt || m.sectionContext || `Slot #${m.slotIndex + 1}`,
        sectionContext: m.sectionContext,
        src: effectiveSrc,
        lightboxHref: override?.lightboxHref || m.lightboxHref,
        r2Key: override?.r2Key,
        alt: effectiveAlt,
        assetFilename,
        sharedCount,
        isSharedAsset: sharedCount > 1,
        isModified: Boolean(override),
      });
    }
  }

  const mediaAssets = [];
  const r2ObjectsMap = new Map();

  for (const [k, obj] of Object.entries(r2Index.objects)) {
    r2ObjectsMap.set(k, {
      ...obj,
      cdnUrl: `/api/r2/file/${k}`,
      bucketName: DEFAULT_R2_BUCKET_NAME,
    });
  }

  const mediaDir = path.join(PUBLIC_DIR, 'assets', 'media');
  try {
    const files = await fs.readdir(mediaDir);
    for (const filename of files.sort()) {
      const fullPath = path.join(mediaDir, filename);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const { format, mimeType } = detectFormatFromExt(filename);
      const mediaPath = `assets/media/${filename}`;
      const r2Key = `media/${filename}`;
      const pagesSet = usageMap.get(mediaPath);

      mediaAssets.push({
        mediaPath,
        r2Key,
        cdnUrl: `/api/r2/file/${r2Key}`,
        filename,
        format,
        url: `/${mediaPath}`,
        mimeType,
        sizeBytes: stat.size,
        isModified: false,
        usedInPages: pagesSet ? Array.from(pagesSet) : [],
        usageCount: slotCountBySrc.get(mediaPath) || (pagesSet ? pagesSet.size : 0),
        hasDefaultBackup: !filename.startsWith('custom-'),
      });

      if (!r2ObjectsMap.has(r2Key) && !r2Index.deletedMediaKeys.includes(r2Key)) {
        const cleanTitle = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
        r2ObjectsMap.set(r2Key, {
          r2Key,
          filename,
          cdnUrl: `/api/r2/file/${r2Key}`,
          mimeType,
          sizeBytes: stat.size,
          alt: cleanTitle,
          title: cleanTitle,
          updatedAt: stat.mtime.toISOString(),
          bucketName: DEFAULT_R2_BUCKET_NAME,
        });
      }
    }
  } catch {
    // ignore
  }

  const r2Objects = Array.from(r2ObjectsMap.values());

  const textSlots = [];
  const customTexts = [];
  const textPagesSummary = [];

  for (const page of SITE_PAGES) {
    let html = '';
    try {
      html = await fs.readFile(path.join(DEFAULTS_HTML_DIR, page.file), 'utf8');
    } catch {
      try {
        html = await fs.readFile(path.join(PUBLIC_DIR, page.file), 'utf8');
      } catch {
        continue;
      }
    }

    const parsedDefaults = parsePageTextSlots(html);
    textPagesSummary.push({
      file: page.file,
      title: page.title,
      textCount: parsedDefaults.length,
    });

    for (const item of parsedDefaults) {
      const textId = makeTextSlotId(page.file, item.textIndex);
      const override = cmsState.textOverrides[textId];
      textSlots.push({
        textId,
        page: page.file,
        pageTitle: page.title,
        textIndex: item.textIndex,
        tagName: item.tagName,
        sectionContext: override?.sectionContext || item.sectionContext,
        content: override !== undefined ? override.content : item.content,
        defaultContent: item.content,
        isDeleted: Boolean(override?.isDeleted),
        isCustomAdded: false,
        isModified:
          override !== undefined &&
          (override.content !== item.content || Boolean(override.isDeleted)),
      });
    }
  }

  for (const [key, val] of Object.entries(cmsState.textOverrides)) {
    if (val && val.isCustomAdded) {
      const pageMeta = SITE_PAGES.find((p) => p.file === val.page);
      customTexts.push({
        textId: key,
        page: val.page,
        pageTitle: pageMeta ? pageMeta.title : val.page,
        textIndex: -1,
        tagName: val.tagName || 'CUSTOM',
        sectionContext: val.sectionContext || 'Custom Section Text',
        content: val.content,
        defaultContent: '',
        isDeleted: Boolean(val.isDeleted),
        isCustomAdded: true,
        isModified: true,
      });
    }
  }

  return {
    imagesPayload: {
      bucketName: DEFAULT_R2_BUCKET_NAME,
      slots: enrichedSlots,
      mediaAssets,
      r2Objects,
      pages: imagePagesSummary,
    },
    cmsPayload: {
      textSlots,
      customTexts,
      sectionGalleryItems: cmsState.sectionGalleryItems,
      imageOverrides: cmsState.imageOverrides,
      pages: textPagesSummary,
    },
  };
}

async function findPrerenderedFile(filename) {
  const candidates = [
    path.join(ROOT_DIR, '.next', 'server', 'app', filename),
    path.join(ROOT_DIR, '.next', 'standalone', '.next', 'server', 'app', filename),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function main() {
  await fs.rm(CF_DIR, { recursive: true, force: true });
  await fs.mkdir(CF_ASSETS_DIR, { recursive: true });

  // 1. Copy public/ into .cloudflare/assets/ (excluding internal backup/paste folders)
  await fs.cp(PUBLIC_DIR, CF_ASSETS_DIR, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(PUBLIC_DIR, src).replace(/\\/g, '/');
      if (rel === 'assets/aistudio' || rel.startsWith('assets/aistudio/')) return false;
      if (rel === 'assets/html-defaults' || rel.startsWith('assets/html-defaults/')) return false;
      return true;
    },
  });

  // 2. Copy .next/static into .cloudflare/assets/_next/static
  const nextStaticDir = path.join(ROOT_DIR, '.next', 'static');
  if (await pathExists(nextStaticDir)) {
    const destNextStatic = path.join(CF_ASSETS_DIR, '_next', 'static');
    await fs.mkdir(destNextStatic, { recursive: true });
    await fs.cp(nextStaticDir, destNextStatic, { recursive: true });
  }

  // 3. Copy prerendered /admin HTML into .cloudflare/assets/admin.html and /admin/index.html
  const adminHtmlPath = await findPrerenderedFile('admin.html');
  if (adminHtmlPath) {
    await fs.copyFile(adminHtmlPath, path.join(CF_ASSETS_DIR, 'admin.html'));
    await fs.mkdir(path.join(CF_ASSETS_DIR, 'admin'), { recursive: true });
    await fs.copyFile(adminHtmlPath, path.join(CF_ASSETS_DIR, 'admin', 'index.html'));
  }

  const notFoundHtmlPath = await findPrerenderedFile('_not-found.html');
  if (notFoundHtmlPath) {
    await fs.copyFile(notFoundHtmlPath, path.join(CF_ASSETS_DIR, '404.html'));
  }

  // 4. Build inventories and generate .cloudflare/worker.mjs with native Cloudflare R2_BUCKET support
  const { imagesPayload, cmsPayload } = await buildInventories();

  const workerCode = `// Auto-generated Cloudflare Worker for Nisha Safari (Next.js + Cloudflare R2 Bucket + Static Assets)
const IMAGES_INVENTORY = ${JSON.stringify(imagesPayload)};
const CMS_INVENTORY = ${JSON.stringify(cmsPayload)};
const BUCKET_NAME = ${JSON.stringify(DEFAULT_R2_BUCKET_NAME)};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function guessMimeType(key) {
  const lower = (key || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

function sanitizeKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/\\\\/g, '/')
    .replace(/^\\/+/, '')
    .replace(/\\.\\.+/, '')
    .replace(/[^a-zA-Z0-9._/-]/g, '-');
}

function getR2BucketBinding(env) {
  if (!env) return null;
  if (env.R2_BUCKET && typeof env.R2_BUCKET.put === 'function') return env.R2_BUCKET;
  if (env.nishatravels && typeof env.nishatravels.put === 'function') return env.nishatravels;
  if (env.BUCKET && typeof env.BUCKET.put === 'function') return env.BUCKET;
  if (env.ai_studio_applet_opennext_cache && typeof env.ai_studio_applet_opennext_cache.put === 'function') return env.ai_studio_applet_opennext_cache;
  for (const k of Object.keys(env)) {
    if (env[k] && typeof env[k].put === 'function' && typeof env[k].get === 'function') {
      return env[k];
    }
  }
  return null;
}

const UPLOADED_BLOBS = new Map();

function getWorkerCdnBase(env) {
  const explicitUrl = env && (env.R2_PUBLIC_URL || env.NEXT_PUBLIC_R2_PUBLIC_URL);
  if (explicitUrl && String(explicitUrl).trim()) {
    const trimmed = String(explicitUrl).trim().replace(/\\/+$/, '');
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : 'https://' + trimmed;
  }
  if (getR2BucketBinding(env)) {
    return 'https://cdn.srilankabestsafari.com';
  }
  return '/api/r2/file';
}

const DELETED_R2_KEYS = new Set();

function extractWorkerR2Key(raw) {
  if (!raw) return '';
  const clean = String(raw).split('?')[0].trim();
  const marker = '/api/r2/file/';
  const idx = clean.indexOf(marker);
  if (idx !== -1) return sanitizeKey(clean.slice(idx + marker.length));
  const assetMarker = '/assets/r2-bucket/';
  const assetIdx = clean.indexOf(assetMarker);
  if (assetIdx !== -1) return sanitizeKey(clean.slice(assetIdx + assetMarker.length));
  const folderMatch = clean.match(/^https?:\\/\\/[^/]+\\/((?:slots|sections|media|uploads|index|yala-safari|udawalawe-safari|bundala-birding-safari|wilpattu-safari|minneriya-safari|kumana-birding-safari|safari-parks|about|gallery|reviews|contact)\\/.+)$/i);
  if (folderMatch && folderMatch[1]) return sanitizeKey(folderMatch[1]);
  return sanitizeKey(clean);
}

async function listLiveR2Objects(env) {
  const map = new Map();
  const cdnBase = getWorkerCdnBase(env);
  const r2Bucket = getR2BucketBinding(env);
  const activeBucketName = (env && (env.R2_BUCKET_NAME || env.BUCKET_NAME)) || BUCKET_NAME;

  for (const item of IMAGES_INVENTORY.r2Objects || []) {
    if (DELETED_R2_KEYS.has(item.r2Key)) continue;
    map.set(item.r2Key, {
      ...item,
      cdnUrl: cdnBase + '/' + item.r2Key,
      bucketName: activeBucketName,
    });
  }

  if (r2Bucket && typeof r2Bucket.list === 'function') {
    try {
      const listed = await r2Bucket.list({ include: ['httpMetadata', 'customMetadata'] });
      for (const obj of listed.objects || []) {
        const r2Key = obj.key;
        if (DELETED_R2_KEYS.has(r2Key)) continue;
        const filename = r2Key.split('/').pop() || r2Key;
        const meta = obj.customMetadata || {};
        map.set(r2Key, {
          r2Key,
          filename,
          cdnUrl: cdnBase + '/' + r2Key,
          mimeType: (obj.httpMetadata && obj.httpMetadata.contentType) || guessMimeType(r2Key),
          sizeBytes: obj.size || 0,
          alt: meta.alt || filename,
          title: meta.title || filename,
          page: meta.page || undefined,
          updatedAt: obj.uploaded ? new Date(obj.uploaded).toISOString() : new Date().toISOString(),
          bucketName: activeBucketName,
        });
      }
    } catch (e) {
      // fallback to static inventory if list fails
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

async function uploadFileToWorkerR2(env, { bytes, originalFilename, mimeType, customKey, replaceKey, alt, title, page }) {
  const extMatch = String(originalFilename || customKey || 'image.jpg').match(/\\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const baseSlug = String(originalFilename || 'safari-photo')
    .replace(/\\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'safari-photo';

  let r2Key;
  if (customKey && String(customKey).trim()) {
    r2Key = sanitizeKey(customKey);
    if (!/\\.[a-z0-9]+$/i.test(r2Key)) r2Key += '.' + ext;
  } else if (replaceKey && String(replaceKey).startsWith('media/')) {
    r2Key = sanitizeKey(replaceKey);
  } else {
    const folder = page ? String(page).replace('.html', '').replace(/[^a-z0-9_-]/gi, '-') : 'uploads';
    r2Key = folder + '/' + Date.now() + '-' + baseSlug + '.' + ext;
  }

  const finalMime = mimeType || guessMimeType(r2Key);
  const now = new Date().toISOString();
  const r2Bucket = getR2BucketBinding(env);
  const cdnBase = getWorkerCdnBase(env);
  const activeBucketName = (env && (env.R2_BUCKET_NAME || env.BUCKET_NAME)) || BUCKET_NAME;

  UPLOADED_BLOBS.set(r2Key, { bytes, mimeType: finalMime });

  if (r2Bucket) {
    if (replaceKey && replaceKey !== r2Key) {
      try {
        await r2Bucket.delete(sanitizeKey(replaceKey));
      } catch (e) {}
    }
    await r2Bucket.put(r2Key, bytes, {
      httpMetadata: { contentType: finalMime },
      customMetadata: {
        alt: String(alt || baseSlug),
        title: String(title || originalFilename || r2Key),
        page: String(page || ''),
        updatedAt: now,
      },
    });
  }

  DELETED_R2_KEYS.delete(r2Key);
  const newRecord = {
    r2Key,
    filename: r2Key.split('/').pop() || r2Key,
    cdnUrl: cdnBase + '/' + r2Key,
    mimeType: finalMime,
    sizeBytes: bytes.byteLength || 0,
    alt: String(alt || baseSlug),
    title: String(title || originalFilename || r2Key),
    page: page || undefined,
    updatedAt: now,
    bucketName: activeBucketName,
  };
  if (Array.isArray(IMAGES_INVENTORY.r2Objects)) {
    IMAGES_INVENTORY.r2Objects = IMAGES_INVENTORY.r2Objects.filter((o) => o.r2Key !== r2Key);
    IMAGES_INVENTORY.r2Objects.unshift(newRecord);
  }
  return newRecord;
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const r2Bucket = getR2BucketBinding(env);
    const cdnBase = getWorkerCdnBase(env);
    const activeBucketName = (env && (env.R2_BUCKET_NAME || env.BUCKET_NAME)) || BUCKET_NAME;

    // 1. Serve R2 Bucket Object via CDN URL: /api/r2/file/:key*
    if (pathname.startsWith('/api/r2/file/')) {
      const rawKey = decodeURIComponent(pathname.slice('/api/r2/file/'.length));
      const r2Key = sanitizeKey(rawKey);
      if (!r2Key || DELETED_R2_KEYS.has(r2Key)) {
        return new Response('R2 object not found', { status: 404 });
      }

      if (UPLOADED_BLOBS.has(r2Key)) {
        const cached = UPLOADED_BLOBS.get(r2Key);
        return new Response(cached.bytes, {
          status: 200,
          headers: {
            'Content-Type': cached.mimeType || guessMimeType(r2Key),
            'Cache-Control': 'public, max-age=31536000',
            'X-R2-Key': r2Key,
          },
        });
      }

      if (r2Bucket) {
        try {
          const obj = await r2Bucket.get(r2Key);
          if (obj) {
            const headers = new Headers();
            if (typeof obj.writeHttpMetadata === 'function') {
              obj.writeHttpMetadata(headers);
            }
            if (!headers.has('Content-Type')) {
              headers.set('Content-Type', guessMimeType(r2Key));
            }
            headers.set('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400');
            if (obj.httpEtag) headers.set('ETag', obj.httpEtag);
            headers.set('X-R2-Key', r2Key);
            return new Response(obj.body, { status: 200, headers });
          }
        } catch (e) {
          // fallback to static assets
        }
      }

      // Fallback 1: check /assets/r2-bucket/<r2Key>
      const r2AssetRes = await env.ASSETS.fetch(new Request(new URL('/assets/r2-bucket/' + r2Key, url.origin), request));
      if (r2AssetRes.ok) return r2AssetRes;

      // Fallback 2: if media/<filename>, check /assets/media/<filename>
      const fileNameOnly = r2Key.split('/').pop();
      if (fileNameOnly) {
        return env.ASSETS.fetch(new Request(new URL('/assets/media/' + fileNameOnly, url.origin), request));
      }
      return new Response('R2 object not found', { status: 404 });
    }

    // 2. Cloudflare R2 Bucket Management API: /api/r2
    if (pathname === '/api/r2') {
      if (request.method === 'GET') {
        const objects = await listLiveR2Objects(env);
        return new Response(
          JSON.stringify({
            ok: true,
            bucketName: activeBucketName,
            cdnBase,
            remoteSyncEnabled: Boolean(r2Bucket),
            remoteMode: r2Bucket ? 'worker-binding' : 'static-fallback',
            objects,
          }),
          {
            status: 200,
            headers: JSON_HEADERS,
          }
        );
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        const ct = request.headers.get('content-type') || '';
        if (ct.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = formData.get('file');
          if (!file || typeof file.arrayBuffer !== 'function') {
            return new Response(JSON.stringify({ error: 'Image file is required' }), { status: 400, headers: JSON_HEADERS });
          }
          const bytes = await file.arrayBuffer();
          const record = await uploadFileToWorkerR2(env, {
            bytes,
            originalFilename: file.name || 'upload.jpg',
            mimeType: file.type || undefined,
            customKey: formData.get('customKey') ? String(formData.get('customKey')) : undefined,
            replaceKey: formData.get('replaceKey') ? String(formData.get('replaceKey')) : undefined,
            alt: formData.get('alt') !== null ? String(formData.get('alt')) : undefined,
            title: formData.get('title') !== null ? String(formData.get('title')) : undefined,
            page: formData.get('page') ? String(formData.get('page')) : undefined,
          });
          const objects = await listLiveR2Objects(env);
          return new Response(
            JSON.stringify({
              ok: true,
              object: record,
              r2Key: record.r2Key,
              cdnUrl: record.cdnUrl,
              sizeBytes: record.sizeBytes,
              mimeType: record.mimeType,
              objects,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        const body = await request.json();
        if (body.action === 'test-connection' || body.action === 'save-credentials') {
          const objects = await listLiveR2Objects(env);
          return new Response(
            JSON.stringify({
              ok: true,
              mode: r2Bucket ? 'worker-binding' : 'static-fallback',
              bucketName: activeBucketName,
              cdnBase,
              remoteSyncEnabled: Boolean(r2Bucket),
              remoteMode: r2Bucket ? 'worker-binding' : 'static-fallback',
              objects,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        if (body.action === 'sync-remote-r2') {
          let synced = 0;
          let failed = 0;
          const errors = [];
          if (r2Bucket) {
            for (const item of IMAGES_INVENTORY.r2Objects || []) {
              if (DELETED_R2_KEYS.has(item.r2Key)) continue;
              try {
                const existing = await r2Bucket.head(item.r2Key);
                if (!existing) {
                  const assetRes = await env.ASSETS.fetch(new Request(new URL('/assets/r2-bucket/' + item.r2Key, url.origin)));
                  if (assetRes.ok) {
                    const buf = await assetRes.arrayBuffer();
                    await r2Bucket.put(item.r2Key, buf, {
                      httpMetadata: { contentType: item.mimeType || guessMimeType(item.r2Key) },
                      customMetadata: {
                        alt: String(item.alt || ''),
                        title: String(item.title || item.filename || item.r2Key),
                        page: String(item.page || ''),
                      },
                    });
                  }
                }
                synced++;
              } catch (e) {
                failed++;
                errors.push(item.r2Key + ': ' + (e && e.message ? e.message : String(e)));
              }
            }
          }
          const objects = await listLiveR2Objects(env);
          return new Response(
            JSON.stringify({
              ok: failed === 0,
              synced,
              failed,
              total: (IMAGES_INVENTORY.r2Objects || []).length,
              mode: r2Bucket ? 'worker-binding' : 'static-fallback',
              errors: errors.slice(0, 10),
              bucketName: activeBucketName,
              cdnBase,
              objects,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        if (body.action === 'upload-data-url' && typeof body.dataUrl === 'string') {
          const match = body.dataUrl.match(/^data:([^;,]+)?(?:;base64)?,([\\s\\S]*)$/i);
          if (!match) {
            return new Response(JSON.stringify({ error: 'Invalid data URL' }), { status: 400, headers: JSON_HEADERS });
          }
          const mimeType = (match[1] || 'image/jpeg').trim();
          const binStr = atob(match[2].trim());
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
          const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : mimeType.includes('svg') ? 'svg' : 'jpg';
          const record = await uploadFileToWorkerR2(env, {
            bytes: bytes.buffer,
            originalFilename: (body.filenameHint || 'migrated') + '.' + ext,
            mimeType,
            alt: body.alt,
            title: body.title,
            page: body.page,
          });
          const objects = await listLiveR2Objects(env);
          return new Response(JSON.stringify({ ok: true, object: record, r2Key: record.r2Key, cdnUrl: record.cdnUrl, objects }), {
            status: 200,
            headers: JSON_HEADERS,
          });
        }

        if (body.action === 'update-meta' && body.r2Key) {
          const oldKey = extractWorkerR2Key(body.r2Key);
          const newKey = body.newKey ? extractWorkerR2Key(body.newKey) : oldKey;
          if (r2Bucket) {
            const existingObj = await r2Bucket.get(oldKey);
            if (existingObj) {
              const buf = await existingObj.arrayBuffer();
              const mime = (existingObj.httpMetadata && existingObj.httpMetadata.contentType) || guessMimeType(newKey);
              await r2Bucket.put(newKey, buf, {
                httpMetadata: { contentType: mime },
                customMetadata: {
                  alt: String(body.alt ?? ''),
                  title: String(body.title ?? newKey),
                  page: String(body.page ?? ''),
                  updatedAt: new Date().toISOString(),
                },
              });
              if (newKey !== oldKey) {
                await r2Bucket.delete(oldKey);
                DELETED_R2_KEYS.add(oldKey);
              }
            }
          }
          const objects = await listLiveR2Objects(env);
          return new Response(
            JSON.stringify({
              ok: true,
              r2Key: newKey,
              cdnUrl: cdnBase + '/' + newKey,
              objects,
            }),
            { status: 200, headers: JSON_HEADERS }
          );
        }

        if (body.action === 'delete' && (body.r2Key || body.cdnUrl)) {
          const cleanTarget = extractWorkerR2Key(body.r2Key || body.cdnUrl);
          if (cleanTarget) {
            DELETED_R2_KEYS.add(cleanTarget);
            if (Array.isArray(IMAGES_INVENTORY.r2Objects)) {
              IMAGES_INVENTORY.r2Objects = IMAGES_INVENTORY.r2Objects.filter((o) => o.r2Key !== cleanTarget);
            }
            if (r2Bucket) {
              try {
                await r2Bucket.delete(cleanTarget);
              } catch (e) {}
            }
          }
          const objects = await listLiveR2Objects(env);
          return new Response(JSON.stringify({ ok: true, deletedKey: cleanTarget, objects }), {
            status: 200,
            headers: JSON_HEADERS,
          });
        }
      }

      if (request.method === 'PATCH') {
        const body = await request.json();
        const oldKey = extractWorkerR2Key(body.r2Key || '');
        const newKey = body.newKey ? extractWorkerR2Key(body.newKey) : oldKey;
        if (r2Bucket && oldKey) {
          const existingObj = await r2Bucket.get(oldKey);
          if (existingObj) {
            const buf = await existingObj.arrayBuffer();
            const mime = (existingObj.httpMetadata && existingObj.httpMetadata.contentType) || guessMimeType(newKey);
            await r2Bucket.put(newKey, buf, {
              httpMetadata: { contentType: mime },
              customMetadata: {
                alt: String(body.alt ?? ''),
                title: String(body.title ?? newKey),
                page: String(body.page ?? ''),
                updatedAt: new Date().toISOString(),
              },
            });
            if (newKey !== oldKey) {
              await r2Bucket.delete(oldKey);
              DELETED_R2_KEYS.add(oldKey);
            }
          }
        }
        const objects = await listLiveR2Objects(env);
        return new Response(
          JSON.stringify({
            ok: true,
            r2Key: newKey,
            cdnUrl: cdnBase + '/' + newKey,
            objects,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      if (request.method === 'DELETE') {
        let keyParam = url.searchParams.get('key') || url.searchParams.get('r2Key') || '';
        if (!keyParam) {
          try {
            const body = await request.json();
            keyParam = String(body.r2Key || body.key || body.cdnUrl || '');
          } catch (e) {}
        }
        const cleanTarget = extractWorkerR2Key(keyParam);
        if (cleanTarget) {
          DELETED_R2_KEYS.add(cleanTarget);
          if (Array.isArray(IMAGES_INVENTORY.r2Objects)) {
            IMAGES_INVENTORY.r2Objects = IMAGES_INVENTORY.r2Objects.filter((o) => o.r2Key !== cleanTarget);
          }
          if (r2Bucket) {
            try {
              await r2Bucket.delete(cleanTarget);
            } catch (e) {}
          }
        }
        const objects = await listLiveR2Objects(env);
        return new Response(JSON.stringify({ ok: true, deletedKey: cleanTarget, objects }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
    }

    // API: /api/admin/images
    if (pathname === '/api/admin/images') {
      if (request.method === 'GET') {
        const r2Objects = await listLiveR2Objects(env);
        return new Response(JSON.stringify({ ...IMAGES_INVENTORY, r2Objects }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
      if (request.method === 'POST') {
        const ct = request.headers.get('content-type') || '';
        if (ct.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = formData.get('file');
          if (file && typeof file.arrayBuffer === 'function') {
            const bytes = await file.arrayBuffer();
            const mode = String(formData.get('mode') || 'update-slot');
            const assetFilename = String(formData.get('assetFilename') || '');
            const record = await uploadFileToWorkerR2(env, {
              bytes,
              originalFilename: assetFilename || file.name || 'upload.jpg',
              mimeType: file.type || undefined,
              customKey: mode === 'replace-media' && assetFilename ? 'media/' + assetFilename.split('/').pop() : undefined,
              replaceKey: mode === 'replace-media' && assetFilename ? 'media/' + assetFilename.split('/').pop() : undefined,
              alt: formData.get('altText') ? String(formData.get('altText')) : undefined,
              page: formData.get('page') ? String(formData.get('page')) : undefined,
            });
            const r2Objects = await listLiveR2Objects(env);
            return new Response(
              JSON.stringify({
                ok: true,
                updatedSrc: record.cdnUrl,
                cdnUrl: record.cdnUrl,
                r2Key: record.r2Key,
                ...IMAGES_INVENTORY,
                r2Objects,
              }),
              { status: 200, headers: JSON_HEADERS }
            );
          }
        } else {
          try {
            const body = await request.json();
            const action = String(body.action || '');
            const page = String(body.page || 'index.html');
            const slotIndex = Number(body.slotIndex || 0);
            const slotId = body.slotId ? String(body.slotId) : page.replace(/[^a-zA-Z0-9_-]/g, '_') + '__slot_' + slotIndex;

            if (action === 'delete-slot') {
              const targetSlot = (IMAGES_INVENTORY.slots || []).find((s) => s.slotId === slotId || (s.page === page && s.slotIndex === slotIndex));
              const keyToDelete = extractWorkerR2Key(body.r2Key || (targetSlot && (targetSlot.r2Key || targetSlot.src)) || '');
              if (targetSlot) {
                targetSlot.src = '';
                targetSlot.lightboxHref = '';
                targetSlot.r2Key = undefined;
                targetSlot.isDeleted = true;
                targetSlot.isModified = true;
              }
              if (!CMS_INVENTORY.imageOverrides) CMS_INVENTORY.imageOverrides = {};
              CMS_INVENTORY.imageOverrides[slotId] = {
                slotId,
                page,
                slotIndex,
                type: (targetSlot && targetSlot.type) || body.type || 'img',
                label: (targetSlot && targetSlot.label) || body.label || ('Slot #' + (slotIndex + 1)),
                sectionContext: (targetSlot && targetSlot.sectionContext) || body.sectionContext || 'Page Section',
                src: '',
                lightboxHref: '',
                r2Key: undefined,
                alt: (targetSlot && targetSlot.alt) || '',
                isDeleted: true,
                updatedAt: new Date().toISOString(),
              };
              if (keyToDelete && !keyToDelete.startsWith('media/')) {
                const usedElsewhere =
                  (IMAGES_INVENTORY.slots || []).some((s) => s.slotId !== slotId && !s.isDeleted && (s.r2Key === keyToDelete || (s.src && s.src.includes(keyToDelete)))) ||
                  (CMS_INVENTORY.sectionGalleryItems || []).some((sec) => sec.r2Key === keyToDelete || (sec.src && sec.src.includes(keyToDelete)));
                if (!usedElsewhere) {
                  DELETED_R2_KEYS.add(keyToDelete);
                  if (Array.isArray(IMAGES_INVENTORY.r2Objects)) {
                    IMAGES_INVENTORY.r2Objects = IMAGES_INVENTORY.r2Objects.filter((o) => o.r2Key !== keyToDelete);
                  }
                  if (r2Bucket) {
                    try {
                      await r2Bucket.delete(keyToDelete);
                    } catch (e) {}
                  }
                }
              }
            } else if (action === 'update-slot-meta') {
              const updatedSrc = String(body.externalUrl || '');
              const r2Key = body.r2Key ? String(body.r2Key) : extractWorkerR2Key(updatedSrc);
              const targetSlot = (IMAGES_INVENTORY.slots || []).find((s) => s.slotId === slotId || (s.page === page && s.slotIndex === slotIndex));
              if (targetSlot && updatedSrc) {
                targetSlot.src = updatedSrc;
                targetSlot.lightboxHref = updatedSrc;
                targetSlot.r2Key = r2Key || targetSlot.r2Key;
                if (body.altText !== undefined) targetSlot.alt = String(body.altText);
                targetSlot.isDeleted = false;
                targetSlot.isModified = true;
              }
              if (!CMS_INVENTORY.imageOverrides) CMS_INVENTORY.imageOverrides = {};
              CMS_INVENTORY.imageOverrides[slotId] = {
                slotId,
                page,
                slotIndex,
                type: (targetSlot && targetSlot.type) || body.type || 'img',
                label: body.label || (targetSlot && targetSlot.label) || ('Slot #' + (slotIndex + 1)),
                sectionContext: body.sectionContext || (targetSlot && targetSlot.sectionContext) || 'Page Section',
                src: updatedSrc,
                lightboxHref: updatedSrc,
                r2Key,
                alt: body.altText !== undefined ? String(body.altText) : (targetSlot && targetSlot.alt) || '',
                isDeleted: false,
                updatedAt: new Date().toISOString(),
              };
            }
          } catch (e) {}
        }
        const r2Objects = await listLiveR2Objects(env);
        return new Response(JSON.stringify({ ok: true, ...IMAGES_INVENTORY, r2Objects }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
    }

    // API: /api/admin/auth
    if (pathname === '/api/admin/auth') {
      const COOKIE_NAME = 'nisha_admin_session';
      const toSha256Hex = async (str) => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      };
      const expectedEmailHash = await toSha256Hex('nishasafari@gmail.com');
      const expectedPassHash = await toSha256Hex('g2jabB80');
      const sessionToken = await toSha256Hex(
        expectedEmailHash + ':' + expectedPassHash + ':nisha_safari_admin_v1'
      );

      if (request.method === 'GET') {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/(?:^|;\s*)nisha_admin_session=([^;]+)/);
        const token = match ? match[1].trim() : '';
        return new Response(
          JSON.stringify({ authenticated: Boolean(token && token === sessionToken) }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      if (request.method === 'POST') {
        let body = {};
        try {
          body = await request.json();
        } catch (e) {}
        const action = String(body.action || 'login');
        if (action === 'logout') {
          return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: {
              ...JSON_HEADERS,
              'Set-Cookie':
                COOKIE_NAME + '=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
            },
          });
        }

        const emailHash = await toSha256Hex(String(body.email || '').trim().toLowerCase());
        const passHash = await toSha256Hex(String(body.password || ''));
        if (emailHash !== expectedEmailHash || passHash !== expectedPassHash) {
          return new Response(
            JSON.stringify({ authenticated: false, error: 'Invalid email or password.' }),
            { status: 401, headers: JSON_HEADERS }
          );
        }

        return new Response(JSON.stringify({ authenticated: true }), {
          status: 200,
          headers: {
            ...JSON_HEADERS,
            'Set-Cookie':
              COOKIE_NAME +
              '=' +
              sessionToken +
              '; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800',
          },
        });
      }
    }

    // API: /api/admin/cms
    if (pathname === '/api/admin/cms') {
      if (request.method === 'GET') {
        return new Response(JSON.stringify(CMS_INVENTORY), { status: 200, headers: JSON_HEADERS });
      }
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const action = String(body.action || '');
          if (action === 'delete-section-image') {
            const itemId = String(body.itemId || '');
            const targetItem = (CMS_INVENTORY.sectionGalleryItems || []).find((i) => i.itemId === itemId);
            const keyToDelete = extractWorkerR2Key(body.r2Key || (targetItem && (targetItem.r2Key || targetItem.src)) || '');
            CMS_INVENTORY.sectionGalleryItems = (CMS_INVENTORY.sectionGalleryItems || []).filter((i) => i.itemId !== itemId);
            if (keyToDelete && !keyToDelete.startsWith('media/')) {
              const usedElsewhere =
                (CMS_INVENTORY.sectionGalleryItems || []).some((sec) => sec.r2Key === keyToDelete || (sec.src && sec.src.includes(keyToDelete))) ||
                (IMAGES_INVENTORY.slots || []).some((s) => !s.isDeleted && (s.r2Key === keyToDelete || (s.src && s.src.includes(keyToDelete))));
              if (!usedElsewhere) {
                DELETED_R2_KEYS.add(keyToDelete);
                if (Array.isArray(IMAGES_INVENTORY.r2Objects)) {
                  IMAGES_INVENTORY.r2Objects = IMAGES_INVENTORY.r2Objects.filter((o) => o.r2Key !== keyToDelete);
                }
                if (r2Bucket) {
                  try {
                    await r2Bucket.delete(keyToDelete);
                  } catch (e) {}
                }
              }
            }
          } else if (action === 'save-section-image') {
            const itemId = String(body.itemId || ('sec_img_' + Date.now()));
            const newItem = {
              itemId,
              page: String(body.page || 'index.html'),
              sectionKey: String(body.sectionKey || 'general_section'),
              sectionTitle: String(body.sectionTitle || 'Featured Safari Gallery'),
              title: String(body.title || 'Safari Wildlife Moment'),
              caption: String(body.caption || ''),
              src: String(body.src || ''),
              r2Key: body.r2Key ? String(body.r2Key) : extractWorkerR2Key(body.src || ''),
              alt: String(body.alt || body.title || 'Safari photo'),
              order: typeof body.order === 'number' ? body.order : ((CMS_INVENTORY.sectionGalleryItems || []).length + 1),
            };
            if (!Array.isArray(CMS_INVENTORY.sectionGalleryItems)) CMS_INVENTORY.sectionGalleryItems = [];
            const idx = CMS_INVENTORY.sectionGalleryItems.findIndex((i) => i.itemId === itemId);
            if (idx >= 0) {
              CMS_INVENTORY.sectionGalleryItems[idx] = newItem;
            } else {
              CMS_INVENTORY.sectionGalleryItems.push(newItem);
            }
          } else if (action === 'delete-slot-override') {
            const slotId = String(body.slotId || '');
            if (slotId) {
              if (!CMS_INVENTORY.imageOverrides) CMS_INVENTORY.imageOverrides = {};
              CMS_INVENTORY.imageOverrides[slotId] = {
                ...(CMS_INVENTORY.imageOverrides[slotId] || {}),
                slotId,
                src: '',
                lightboxHref: '',
                r2Key: undefined,
                isDeleted: true,
                updatedAt: new Date().toISOString(),
              };
              const targetSlot = (IMAGES_INVENTORY.slots || []).find((s) => s.slotId === slotId);
              if (targetSlot) {
                targetSlot.src = '';
                targetSlot.lightboxHref = '';
                targetSlot.r2Key = undefined;
                targetSlot.isDeleted = true;
                targetSlot.isModified = true;
              }
            }
          }
        } catch (e) {}
        return new Response(JSON.stringify({ ok: true, ...CMS_INVENTORY }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
    }

    // Sitemap XML: /sitemap.xml and /sitemap_index.xml
    if (pathname === '/sitemap.xml' || pathname === '/sitemap_index.xml') {
      const origin =
        url.hostname === 'localhost' || url.hostname === '127.0.0.1'
          ? 'https://srilankabestsafari.com'
          : 'https://' + url.host;
      const nowIso = new Date().toISOString();
      const pagesMeta = [
        { path: '/', file: 'index.html', priority: '1.0', title: 'Yala Safari & Sri Lanka Safari Tours' },
        { path: '/yala-safari.html', file: 'yala-safari.html', priority: '1.0', title: 'Yala National Park Safari & Leopard Jeep Tours' },
        { path: '/udawalawe-safari.html', file: 'udawalawe-safari.html', priority: '0.9', title: 'Udawalawe National Park Elephant Safari' },
        { path: '/bundala-birding-safari.html', file: 'bundala-birding-safari.html', priority: '0.9', title: 'Bundala National Park Bird Watching Safari' },
        { path: '/wilpattu-safari.html', file: 'wilpattu-safari.html', priority: '0.9', title: 'Wilpattu National Park Leopard Safari' },
        { path: '/minneriya-safari.html', file: 'minneriya-safari.html', priority: '0.9', title: 'Minneriya National Park Elephant Gathering Safari' },
        { path: '/kumana-birding-safari.html', file: 'kumana-birding-safari.html', priority: '0.9', title: 'Kumana National Park Bird Watching Safari' },
        { path: '/safari-parks.html', file: 'safari-parks.html', priority: '0.9', title: 'Sri Lanka National Park Safari Tours' },
        { path: '/about.html', file: 'about.html', priority: '0.8', title: 'About Nisha Safari Jeep Tours' },
        { path: '/gallery.html', file: 'gallery.html', priority: '0.8', title: 'Sri Lanka Wildlife Safari Photo Gallery' },
        { path: '/reviews.html', file: 'reviews.html', priority: '0.8', title: 'Yala Safari Guest Reviews' },
        { path: '/contact.html', file: 'contact.html', priority: '0.8', title: 'Yala Safari Booking & Contact' },
      ];
      const urlsXml = pagesMeta
        .map((p) => {
          const loc = p.path === '/' ? origin + '/' : origin + p.path;
          const imgLoc =
            origin + '/api/r2/file/slots/' + p.file.replace('.', '_') + '__slot_1.jpg';
          return (
            '  <url>\\n' +
            '    <loc>' + loc + '</loc>\\n' +
            '    <lastmod>' + nowIso + '</lastmod>\\n' +
            '    <changefreq>weekly</changefreq>\\n' +
            '    <priority>' + p.priority + '</priority>\\n' +
            '    <image:image>\\n' +
            '      <image:loc>' + imgLoc + '</image:loc>\\n' +
            '      <image:title>' + p.title.replace(/&/g, '&amp;') + '</image:title>\\n' +
            '    </image:image>\\n' +
            '  </url>'
          );
        })
        .join('\\n');
      const sitemapXml =
        '<?xml version="1.0" encoding="UTF-8"?>\\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\\n' +
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\\n' +
        urlsXml +
        '\\n</urlset>\\n';
      return new Response(sitemapXml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // Robots.txt for Google Search Console & Crawlers: /robots.txt
    if (pathname === '/robots.txt') {
      const origin =
        url.hostname === 'localhost' || url.hostname === '127.0.0.1'
          ? 'https://srilankabestsafari.com'
          : 'https://' + url.host;
      const robotsTxt =
        'User-agent: *\\n' +
        'Allow: /\\n' +
        'Allow: /assets/\\n' +
        'Allow: /api/r2/file/\\n' +
        'Allow: /api/media/\\n' +
        'Disallow: /admin\\n' +
        'Disallow: /api/admin/\\n\\n' +
        'User-agent: Googlebot\\n' +
        'Allow: /\\n' +
        'Allow: /assets/\\n' +
        'Allow: /api/r2/file/\\n' +
        'Allow: /api/media/\\n' +
        'Disallow: /admin\\n' +
        'Disallow: /api/admin/\\n\\n' +
        'User-agent: Googlebot-Image\\n' +
        'Allow: /\\n' +
        'Allow: /assets/\\n' +
        'Allow: /api/r2/file/\\n' +
        'Allow: /api/media/\\n\\n' +
        'Sitemap: ' + origin + '/sitemap.xml\\n';
      return new Response(robotsTxt, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // API: /api/pages/:page
    if (pathname.startsWith('/api/pages/')) {
      const page = pathname.slice('/api/pages/'.length);
      const target = page.endsWith('.html') ? '/' + page : '/' + page + '.html';
      return env.ASSETS.fetch(new Request(new URL(target, url.origin), request));
    }

    // API: /api/media/:path*
    if (pathname.startsWith('/api/media/')) {
      const mediaRel = pathname.slice('/api/media/'.length);
      return env.ASSETS.fetch(new Request(new URL('/assets/media/' + mediaRel, url.origin), request));
    }

    // Root route -> /index.html
    if (pathname === '/') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    }

    // Admin route -> /admin.html
    if (pathname === '/admin' || pathname === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url.origin), request));
    }

    // Clean slug routes without .html (e.g., /yala-safari -> /yala-safari.html)
    const cleanSlug = pathname.replace(/^\\/+|\\/+$/g, '');
    const knownHtmlPages = [
      'index',
      'about',
      'safari-parks',
      'yala-safari',
      'udawalawe-safari',
      'bundala-birding-safari',
      'wilpattu-safari',
      'minneriya-safari',
      'kumana-birding-safari',
      'gallery',
      'reviews',
      'contact',
    ];
    if (knownHtmlPages.includes(cleanSlug)) {
      return env.ASSETS.fetch(
        new Request(new URL('/' + cleanSlug + '.html', url.origin), request)
      );
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
`;

  await fs.writeFile(path.join(CF_DIR, 'worker.mjs'), workerCode, 'utf8');
  await fs.writeFile(path.join(CF_ASSETS_DIR, '_worker.js'), workerCode, 'utf8');
  console.log('Prepared Cloudflare bundle in .cloudflare/ (Workers + Pages _worker.js) successfully.');
}

main().catch((err) => {
  console.error('Failed to prepare Cloudflare bundle:', err);
  process.exit(1);
});
