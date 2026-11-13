import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
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

function isEmptySlotSrc(raw) {
  if (!raw) return true;
  const s = raw.trim();
  if (!s || s === '/deleted' || s === 'none') return true;
  if (s.startsWith('data:')) return true;
  if (s.includes('empty-slot.svg')) return true;
  if (
    s.startsWith('/assets/media/') ||
    s.startsWith('assets/media/') ||
    s.startsWith('/assets/aistudio/') ||
    s.startsWith('assets/aistudio/') ||
    s.startsWith('/assets/r2-bucket/') ||
    s.startsWith('assets/r2-bucket/')
  ) {
    return true;
  }
  return false;
}

function splitSectionContext(sectionContext) {
  const clean = (sectionContext || 'Page Content').trim();
  if (clean === 'Header Navigation Logo') {
    return { sectionName: 'Site Header', subSectionName: 'Navigation Brand Logo' };
  }
  if (clean === 'Footer Brand Logo') {
    return { sectionName: 'Site Footer', subSectionName: 'Footer Brand Logo' };
  }
  const heroMatch = clean.match(/^Hero Banner\s*\(([\s\S]+)\)$/i);
  if (heroMatch) {
    return { sectionName: 'Hero Banner', subSectionName: heroMatch[1].trim() };
  }
  const sepIdx = clean.indexOf(' · ');
  if (sepIdx !== -1) {
    return {
      sectionName: clean.slice(0, sepIdx).trim(),
      subSectionName: clean.slice(sepIdx + 3).trim() || undefined,
    };
  }
  return { sectionName: clean };
}

function findSectionContext(html, startIndex, isHeaderLogo, isFooterLogo, imgTag) {
  if (isHeaderLogo) return 'Header Navigation Logo';
  if (isFooterLogo) return 'Footer Brand Logo';

  const htmlBefore = html.slice(0, startIndex);

  if (imgTag) {
    if (imgTag.includes('cross-top-google')) return 'Hero Bottom Cross-Section · Google Reviews';
    if (imgTag.includes('cross-top-tripadvisor')) return 'Hero Bottom Cross-Section · TripAdvisor Winner';
    if (imgTag.includes('cross-top-traveler')) return 'Hero Bottom Cross-Section · Happy Safari Explorers';
    if (imgTag.includes('cross-top-img')) return 'Hero Bottom Cross-Section · Trust Badge';
  }
  if (
    htmlBefore.includes('hero-cross-bridge-wrap') &&
    !htmlBefore.slice(htmlBefore.lastIndexOf('hero-cross-bridge-wrap')).includes('</section>')
  ) {
    return 'Hero Bottom Cross-Section · Trust Badge';
  }

  const secStart = Math.max(
    htmlBefore.lastIndexOf('class="wsite-body-section'),
    htmlBefore.lastIndexOf('class="wsite-header-section')
  );
  const nextSec = html.indexOf('class="wsite-body-section', startIndex);
  const secEnd = nextSec !== -1 ? nextSec : Math.min(html.length, startIndex + 5000);
  const sectionSlice = secStart !== -1 ? html.slice(secStart, secEnd) : htmlBefore;
  const beforeInSection = secStart !== -1 ? html.slice(secStart, startIndex) : htmlBefore;

  const h2Before = [...beforeInSection.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t && !/^(OUR SAFARI EXPERIENCES|SAFARI PARKS|EXPLORE)$/i.test(t));
  const h2InSec =
    h2Before.length > 0
      ? h2Before[h2Before.length - 1]
      : [...sectionSlice.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
          .map((m) => stripTags(m[1]))
          .find((t) => t && !/^(OUR SAFARI EXPERIENCES|SAFARI PARKS|EXPLORE)$/i.test(t)) || '';

  let cardSub = '';
  const articleOpen = beforeInSection.lastIndexOf('<article');
  const articleClose = beforeInSection.lastIndexOf('</article>');
  if (articleOpen !== -1 && articleOpen > articleClose) {
    const articleEnd = html.indexOf('</article>', startIndex);
    const articleSlice = html.slice(
      (secStart !== -1 ? secStart : 0) + articleOpen,
      articleEnd !== -1 ? articleEnd : startIndex + 700
    );
    const cardStrong = articleSlice.match(/<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i);
    if (cardStrong) cardSub = stripTags(cardStrong[1]);
  }

  if (!cardSub) {
    const colOpen = beforeInSection.lastIndexOf('wsite-multicol-col');
    const colClose = beforeInSection.lastIndexOf('</td>');
    if (colOpen !== -1 && colOpen > colClose) {
      const colSlice = html.slice(
        (secStart !== -1 ? secStart : 0) + colOpen,
        Math.min(html.length, startIndex + 900)
      );
      const colStrong = colSlice.match(/<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i);
      if (colStrong) cardSub = stripTags(colStrong[1]);
    }
  }

  if (htmlBefore.slice(-300).includes('janaka-payment')) {
    const altM = imgTag?.match(/\balt="([^"]*)"/i);
    cardSub = altM?.[1] ? `Payment Badge (${altM[1]})` : 'Payment Badge';
  }

  const strongBefore = [...beforeInSection.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)];
  const lastStrong =
    strongBefore.length > 0 ? stripTags(strongBefore[strongBefore.length - 1][1]) : '';

  const parentHeading = h2InSec || lastStrong || 'Page Content';
  const subHeading = cardSub || (lastStrong && lastStrong !== parentHeading ? lastStrong : '');

  if (parentHeading && subHeading && parentHeading !== subHeading && subHeading.length < 70) {
    return `${parentHeading} · ${subHeading}`;
  }
  return parentHeading;
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
        sectionContext: 'Hero Banner · Hero Banner Background',
        src: bgUrl,
        alt: bannerTitle,
      });
    } else if (match[3]) {
      const imgTag = match[3];
      if (imgTag.includes('photo-full')) {
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
      const isCrossBadge =
        imgTag.includes('cross-top-img') ||
        (htmlBefore.includes('hero-cross-bridge-wrap') && !htmlBefore.includes('</section>'));

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
        isHeaderLogo || isFooterLogo || isCrossBadge ? 'logo' : lightboxHref ? 'gallery-img' : 'img';
      const sectionContext = findSectionContext(html, startIndex, isHeaderLogo, isFooterLogo, imgTag);

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

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const EDITABLE_TEXT_BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'blockquote', 'li']);
const EDITABLE_TEXT_CLASS_TOKENS = new Set([
  'paragraph',
  'hero-editorial-kicker',
  'cross-score',
  'cross-metric',
  'cross-title',
  'cross-caption',
]);

function parsePageTextSlots(html) {
  const results = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const targetRegion = mainMatch ? mainMatch[1] : html;

  const tagRe = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  const stack = [];
  const candidates = [];
  let tagMatch;

  while ((tagMatch = tagRe.exec(targetRegion)) !== null) {
    const full = tagMatch[0];
    const tag = tagMatch[1].toLowerCase();
    const attrs = tagMatch[2] || '';
    const isClose = full.startsWith('</');
    const selfClose = full.endsWith('/>') || VOID_HTML_TAGS.has(tag);

    if (isClose) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          const node = stack.splice(i)[0];
          if (node.isCand && !node.insideExcluded) {
            candidates.push({
              tag: node.tag,
              start: node.start,
              inner: targetRegion.slice(node.innerStart, tagMatch.index),
            });
          }
          break;
        }
      }
    } else {
      const clsMatch = attrs.match(/\bclass\s*=\s*"([^"]*)"/i);
      const clsList = (clsMatch ? clsMatch[1] : '').trim().split(/\s+/);
      const inExcludedParent = stack.some((s) => s.insideExcluded);
      const isExcludedNode =
        tag === 'dialog' ||
        clsList.includes('firebase-section-showcase') ||
        clsList.includes('firebase-custom-texts-wrap');

      const isCand =
        EDITABLE_TEXT_BLOCK_TAGS.has(tag) ||
        (tag === 'span' && clsList.includes('wsite-button-inner')) ||
        ((tag === 'div' || tag === 'span') &&
          clsList.some((cls) => EDITABLE_TEXT_CLASS_TOKENS.has(cls)));

      if (!selfClose) {
        stack.push({
          tag,
          start: tagMatch.index,
          innerStart: tagMatch.index + full.length,
          isCand,
          insideExcluded: inExcludedParent || isExcludedNode,
        });
      }
    }
  }

  candidates.sort((a, b) => a.start - b.start);

  let sectionName = 'Hero Banner';
  let subSectionName;
  let inCrossBridge = false;
  let textIndex = 0;

  for (const cand of candidates) {
    if (/<(p|div|ul|ol|table|h1|h2|h3|h4)\b/i.test(cand.inner)) {
      continue;
    }
    const cleanText = stripTags(cand.inner);
    if (!cleanText || cleanText.length < 2) {
      continue;
    }

    const rawTag = cand.tag.toUpperCase();
    const before = targetRegion.slice(Math.max(0, cand.start - 2200), cand.start);
    if (before.includes('hero-cross-bridge-wrap') && !before.includes('<div class="main-wrap"')) {
      inCrossBridge = true;
      sectionName = 'Hero Bottom Cross-Section';
      if (before.includes('cross-sub-right') && !before.slice(before.lastIndexOf('cross-sub-right')).includes('</section>')) {
        subSectionName = 'Happy Safari Explorers';
      } else if (before.includes('cross-sub-center') && !before.slice(before.lastIndexOf('cross-sub-center')).includes('cross-sub-right')) {
        subSectionName = 'TripAdvisor Winner';
      } else {
        subSectionName = 'Google Reviews';
      }
    } else {
      if (inCrossBridge && (before.includes('class="main-wrap"') || before.includes('wsite-body-section'))) {
        inCrossBridge = false;
        subSectionName = undefined;
      }
      if (rawTag === 'H1' || rawTag === 'H2') {
        const isSmallEyebrow =
          cleanText.length <= 30 &&
          /^(OUR SAFARI EXPERIENCES|SAFARI PARKS|EXPLORE|TESTIMONIALS)$/i.test(cleanText);
        if (!isSmallEyebrow) {
          sectionName = cleanText.slice(0, 120);
          subSectionName = undefined;
        }
      } else if (rawTag === 'H3' || rawTag === 'H4') {
        subSectionName = cleanText.slice(0, 90);
      } else {
        const lastSecOpen = Math.max(
          before.lastIndexOf('class="wsite-section '),
          before.lastIndexOf('class="wsite-body-section')
        );
        const recentCardOpen = Math.max(
          before.lastIndexOf('<td class="wsite-multicol-col'),
          before.lastIndexOf('<article ')
        );
        if (recentCardOpen > lastSecOpen && recentCardOpen !== -1) {
          const cellHeadingMatch = before
            .slice(recentCardOpen)
            .match(/<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i);
          const candidateSub = cellHeadingMatch ? stripTags(cellHeadingMatch[1]) : '';
          if (candidateSub && candidateSub.length >= 3 && candidateSub.length <= 70 && candidateSub !== sectionName) {
            subSectionName = candidateSub;
          }
        }
      }
    }

    const tagName = ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'LI', 'DIV', 'BLOCKQUOTE'].includes(rawTag)
      ? rawTag
      : 'DIV';

    const sectionContext = subSectionName ? `${sectionName} · ${subSectionName}` : sectionName;
    results.push({
      textIndex: textIndex++,
      tagName,
      sectionContext,
      sectionName,
      subSectionName,
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

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function buildInventories() {
  const allRawByPage = new Map();

  for (const page of SITE_PAGES) {
    try {
      const html = await fs.readFile(path.join(PUBLIC_DIR, page.file), 'utf8');
      const matches = parsePageSlots(html);
      allRawByPage.set(page.file, { title: page.title, matches });
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
      const mappedType = m.kind === 'gallery-img' ? 'lightbox-img' : m.kind;
      const isEmptyOrDeleted = isEmptySlotSrc(m.src);
      const effectiveSrc = isEmptyOrDeleted ? '' : m.src;
      const splitCtx = splitSectionContext(m.sectionContext);

      enrichedSlots.push({
        id: firestoreSlotId,
        slotId: firestoreSlotId,
        page: page.file,
        pageTitle: entry.title,
        slotIndex: m.slotIndex,
        type: mappedType,
        label: m.alt || m.sectionContext || `Slot #${m.slotIndex + 1}`,
        sectionContext: m.sectionContext,
        sectionName: splitCtx.sectionName,
        subSectionName: splitCtx.subSectionName,
        src: effectiveSrc,
        lightboxHref: isEmptyOrDeleted ? '' : m.lightboxHref || effectiveSrc,
        alt: m.alt,
        isModified: false,
        isDeleted: isEmptyOrDeleted,
      });
    }
  }

  const textSlots = [];
  const textPagesSummary = [];

  for (const page of SITE_PAGES) {
    let html = '';
    try {
      html = await fs.readFile(path.join(PUBLIC_DIR, page.file), 'utf8');
    } catch {
      continue;
    }

    const parsedDefaults = parsePageTextSlots(html);
    textPagesSummary.push({
      file: page.file,
      title: page.title,
      textCount: parsedDefaults.length,
    });

    for (const item of parsedDefaults) {
      const textId = makeTextSlotId(page.file, item.textIndex);
      textSlots.push({
        textId,
        page: page.file,
        pageTitle: page.title,
        textIndex: item.textIndex,
        tagName: item.tagName,
        sectionContext: item.sectionContext,
        sectionName: item.sectionName,
        subSectionName: item.subSectionName,
        content: item.content,
        defaultContent: item.content,
        isDeleted: false,
        isCustomAdded: false,
        isModified: false,
      });
    }
  }

  return {
    imagesPayload: {
      bucketName: DEFAULT_R2_BUCKET_NAME,
      slots: enrichedSlots,
      pages: imagePagesSummary,
    },
    cmsPayload: {
      textSlots,
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

  // 1. Copy public/ into .cloudflare/assets/
  await fs.cp(PUBLIC_DIR, CF_ASSETS_DIR, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(PUBLIC_DIR, src).replace(/\\/g, '/');
      if (rel === 'assets/aistudio' || rel.startsWith('assets/aistudio/')) return false;
      if (rel === 'assets/html-defaults' || rel.startsWith('assets/html-defaults/')) return false;
      if (rel === 'assets/media' || rel.startsWith('assets/media/')) return false;
      if (rel === 'assets/r2-bucket' || rel.startsWith('assets/r2-bucket/')) return false;
      if (rel === 'assets/firebase-cms-state.json') return false;
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

  // 4. Build clean HTML template schemas & generate .cloudflare/worker.mjs with pure Cloudflare R2_BUCKET binding
  const { imagesPayload, cmsPayload } = await buildInventories();

  const workerCode = `// Auto-generated Cloudflare Worker for Nisha Travelling (Next.js + Cloudflare R2 Bucket + Static Assets)
const IMAGES_SCHEMA = ${JSON.stringify(imagesPayload)};
const CMS_SCHEMA = ${JSON.stringify(cmsPayload)};
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
  for (const k of Object.keys(env)) {
    if (env[k] && typeof env[k].put === 'function' && typeof env[k].get === 'function') {
      return env[k];
    }
  }
  return null;
}

function getWorkerCdnBase(env) {
  const explicitUrl = env && (env.R2_PUBLIC_URL || env.NEXT_PUBLIC_R2_PUBLIC_URL);
  if (explicitUrl && String(explicitUrl).trim()) {
    const trimmed = String(explicitUrl).trim().replace(/\\/+$/, '');
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : 'https://' + trimmed;
  }
  return 'https://cdn.srilankabestsafari.com';
}

function extractWorkerR2Key(raw) {
  if (!raw) return '';
  const clean = String(raw).split('?')[0].trim();
  const marker = '/api/r2/file/';
  const idx = clean.indexOf(marker);
  if (idx !== -1) return sanitizeKey(clean.slice(idx + marker.length));
  const cdnMatch = clean.match(/^https?:\\/\\/cdn\\.[^/]+\\/(.+)$/i);
  if (cdnMatch && cdnMatch[1]) return sanitizeKey(cdnMatch[1]);
  const folderMatch = clean.match(/^https?:\\/\\/[^/]+\\/(.+)$/i);
  if (folderMatch && folderMatch[1]) return sanitizeKey(folderMatch[1]);
  return sanitizeKey(clean);
}

async function listLiveR2Objects(env) {
  const cdnBase = getWorkerCdnBase(env);
  const r2Bucket = getR2BucketBinding(env);
  if (!r2Bucket || typeof r2Bucket.list !== 'function') {
    return [];
  }

  const objects = [];
  let cursor;
  let truncated = true;
  while (truncated) {
    const listed = await r2Bucket.list({
      cursor,
      limit: 1000,
      include: ['httpMetadata', 'customMetadata'],
    });
    for (const obj of listed.objects || []) {
      const r2Key = obj.key;
      const filename = r2Key.split('/').pop() || r2Key;
      const meta = obj.customMetadata || {};
      objects.push({
        r2Key,
        filename,
        cdnUrl: cdnBase + '/' + r2Key,
        mimeType: (obj.httpMetadata && obj.httpMetadata.contentType) || guessMimeType(r2Key),
        sizeBytes: obj.size || 0,
        alt: meta.alt || filename,
        title: meta.title || filename,
        page: meta.page || undefined,
        remotePushed: true,
        updatedAt: obj.uploaded ? new Date(obj.uploaded).toISOString() : new Date().toISOString(),
      });
    }
    truncated = Boolean(listed.truncated);
    cursor = listed.cursor;
  }

  return objects.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

async function uploadFileToWorkerR2(env, { bytes, originalFilename, mimeType, customKey, replaceKey, alt, title, page }) {
  const r2Bucket = getR2BucketBinding(env);
  if (!r2Bucket) {
    throw new Error('Cloudflare R2 bucket binding (R2_BUCKET) is not configured.');
  }

  const extMatch = String(originalFilename || customKey || 'image.jpg').match(/\\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const baseSlug = String(originalFilename || 'photo')
    .replace(/\\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'photo';

  let r2Key;
  if (customKey && String(customKey).trim()) {
    r2Key = sanitizeKey(customKey);
    if (!/\\.[a-z0-9]+$/i.test(r2Key)) r2Key += '.' + ext;
  } else {
    const folder = page ? String(page).replace('.html', '').replace(/[^a-z0-9_-]/gi, '-') : 'uploads';
    r2Key = folder + '/' + Date.now() + '-' + baseSlug + '.' + ext;
  }

  const finalMime = mimeType || guessMimeType(r2Key);
  const now = new Date().toISOString();
  const cdnBase = getWorkerCdnBase(env);

  if (replaceKey && sanitizeKey(replaceKey) !== r2Key) {
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

  return {
    r2Key,
    filename: r2Key.split('/').pop() || r2Key,
    cdnUrl: cdnBase + '/' + r2Key,
    mimeType: finalMime,
    sizeBytes: bytes.byteLength || 0,
    alt: String(alt || baseSlug),
    title: String(title || originalFilename || r2Key),
    page: page || undefined,
    remotePushed: true,
    updatedAt: now,
  };
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const r2Bucket = getR2BucketBinding(env);
    const cdnBase = getWorkerCdnBase(env);
    const activeBucketName = (env && (env.R2_BUCKET_NAME || env.BUCKET_NAME)) || BUCKET_NAME;

    // 1. Serve R2 Bucket Object via /api/r2/file/:key*
    if (pathname.startsWith('/api/r2/file/')) {
      const rawKey = decodeURIComponent(pathname.slice('/api/r2/file/'.length));
      const r2Key = sanitizeKey(rawKey);
      if (!r2Key || !r2Bucket) {
        return new Response('R2 object not found', { status: 404 });
      }

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
      } catch (e) {}

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
            accountId: (env && env.R2_ACCOUNT_ID) || '',
            authMode: r2Bucket ? 'worker-binding' : 'none',
            remoteConfigured: Boolean(r2Bucket),
            cdnBaseUrl: cdnBase,
            testResult: {
              ok: Boolean(r2Bucket),
              message: r2Bucket
                ? 'Connected to Cloudflare R2 Bucket binding (' + activeBucketName + ').'
                : 'R2_BUCKET binding missing in Cloudflare Worker.',
            },
            objects,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      if (request.method === 'POST' || request.method === 'PUT') {
        try {
          const ct = request.headers.get('content-type') || '';
          if (ct.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');
            if (!file || typeof file.arrayBuffer !== 'function') {
              return new Response(JSON.stringify({ error: 'Image file is required' }), {
                status: 400,
                headers: JSON_HEADERS,
              });
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
                remotePushed: true,
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
                testResult: {
                  ok: Boolean(r2Bucket),
                  message: r2Bucket
                    ? 'Connected to Cloudflare R2 Bucket binding (' + activeBucketName + ').'
                    : 'R2_BUCKET binding missing.',
                },
                status: {
                  bucketName: activeBucketName,
                  accountId: (env && env.R2_ACCOUNT_ID) || '',
                  authMode: r2Bucket ? 'worker-binding' : 'none',
                  remoteConfigured: Boolean(r2Bucket),
                  cdnBaseUrl: cdnBase,
                },
                objects,
              }),
              { status: 200, headers: JSON_HEADERS }
            );
          }

          if (body.action === 'upload-data-url' && typeof body.dataUrl === 'string') {
            const match = body.dataUrl.match(/^data:([^;,]+)?(?:;base64)?,([\\s\\S]*)$/i);
            if (!match) {
              return new Response(JSON.stringify({ error: 'Invalid data URL' }), {
                status: 400,
                headers: JSON_HEADERS,
              });
            }
            const mimeType = (match[1] || 'image/jpeg').trim();
            const binStr = atob(match[2].trim());
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            const ext = mimeType.includes('png')
              ? 'png'
              : mimeType.includes('webp')
                ? 'webp'
                : mimeType.includes('svg')
                  ? 'svg'
                  : 'jpg';
            const record = await uploadFileToWorkerR2(env, {
              bytes: bytes.buffer,
              originalFilename: (body.filenameHint || 'migrated') + '.' + ext,
              mimeType,
              alt: body.alt,
              title: body.title,
              page: body.page,
            });
            const objects = await listLiveR2Objects(env);
            return new Response(
              JSON.stringify({
                ok: true,
                object: record,
                r2Key: record.r2Key,
                cdnUrl: record.cdnUrl,
                remotePushed: true,
                objects,
              }),
              { status: 200, headers: JSON_HEADERS }
            );
          }

          if (body.action === 'update-meta' && body.r2Key) {
            if (!r2Bucket) {
              return new Response(JSON.stringify({ error: 'R2_BUCKET binding missing' }), {
                status: 500,
                headers: JSON_HEADERS,
              });
            }
            const oldKey = extractWorkerR2Key(body.r2Key);
            const newKey = body.newKey ? extractWorkerR2Key(body.newKey) : oldKey;
            const existingObj = await r2Bucket.get(oldKey);
            if (!existingObj) {
              return new Response(JSON.stringify({ error: 'R2 object not found' }), {
                status: 404,
                headers: JSON_HEADERS,
              });
            }
            const buf = await existingObj.arrayBuffer();
            const mime =
              (existingObj.httpMetadata && existingObj.httpMetadata.contentType) ||
              guessMimeType(newKey);
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
            if (r2Bucket && cleanTarget) {
              await r2Bucket.delete(cleanTarget);
            }
            const objects = await listLiveR2Objects(env);
            return new Response(JSON.stringify({ ok: true, deletedKey: cleanTarget, objects }), {
              status: 200,
              headers: JSON_HEADERS,
            });
          }

          return new Response(JSON.stringify({ error: 'Unsupported action' }), {
            status: 400,
            headers: JSON_HEADERS,
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err && err.message ? err.message : 'R2 operation failed' }),
            { status: 500, headers: JSON_HEADERS }
          );
        }
      }

      if (request.method === 'PATCH') {
        try {
          if (!r2Bucket) {
            return new Response(JSON.stringify({ error: 'R2_BUCKET binding missing' }), {
              status: 500,
              headers: JSON_HEADERS,
            });
          }
          const body = await request.json();
          const oldKey = extractWorkerR2Key(body.r2Key || '');
          const newKey = body.newKey ? extractWorkerR2Key(body.newKey) : oldKey;
          const existingObj = oldKey ? await r2Bucket.get(oldKey) : null;
          if (!existingObj) {
            return new Response(JSON.stringify({ error: 'R2 object not found' }), {
              status: 404,
              headers: JSON_HEADERS,
            });
          }
          const buf = await existingObj.arrayBuffer();
          const mime =
            (existingObj.httpMetadata && existingObj.httpMetadata.contentType) ||
            guessMimeType(newKey);
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
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err && err.message ? err.message : 'Failed to update R2 metadata' }),
            { status: 500, headers: JSON_HEADERS }
          );
        }
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
        if (r2Bucket && cleanTarget) {
          await r2Bucket.delete(cleanTarget);
        }
        const objects = await listLiveR2Objects(env);
        return new Response(JSON.stringify({ ok: true, deletedKey: cleanTarget, objects }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
    }

    // API: /api/admin/images (HTML schema + direct R2 uploads)
    if (pathname === '/api/admin/images') {
      if (request.method === 'GET') {
        const r2Objects = await listLiveR2Objects(env);
        return new Response(
          JSON.stringify({
            bucketName: activeBucketName,
            r2Status: {
              bucketName: activeBucketName,
              authMode: r2Bucket ? 'worker-binding' : 'none',
              remoteConfigured: Boolean(r2Bucket),
              cdnBaseUrl: cdnBase,
            },
            slots: IMAGES_SCHEMA.slots,
            r2Objects,
            pages: IMAGES_SCHEMA.pages,
          }),
          { status: 200, headers: JSON_HEADERS }
        );
      }

      if (request.method === 'POST') {
        try {
          const ct = request.headers.get('content-type') || '';
          if (ct.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');
            if (!file || typeof file.arrayBuffer !== 'function') {
              return new Response(JSON.stringify({ error: 'Image file is required' }), {
                status: 400,
                headers: JSON_HEADERS,
              });
            }
            const bytes = await file.arrayBuffer();
            const page = String(formData.get('page') || 'index.html');
            const slotIndex = Number(formData.get('slotIndex') || 0);
            const slotId = page.replace(/[^a-zA-Z0-9_-]/g, '_') + '__slot_' + slotIndex;
            const replaceKey = formData.get('replaceKey') ? String(formData.get('replaceKey')) : undefined;
            const altText = formData.get('altText') !== null ? String(formData.get('altText')) : undefined;
            const record = await uploadFileToWorkerR2(env, {
              bytes,
              originalFilename: file.name || 'upload.jpg',
              mimeType: file.type || undefined,
              replaceKey: replaceKey || 'slots/' + slotId,
              alt: altText,
              title: altText || file.name,
              page,
            });
            const r2Objects = await listLiveR2Objects(env);
            return new Response(
              JSON.stringify({
                ok: true,
                slotId,
                cdnUrl: record.cdnUrl,
                r2Key: record.r2Key,
                sizeBytes: record.sizeBytes,
                mimeType: record.mimeType,
                slots: IMAGES_SCHEMA.slots,
                r2Objects,
                pages: IMAGES_SCHEMA.pages,
              }),
              { status: 200, headers: JSON_HEADERS }
            );
          }

          const body = await request.json();
          if (body.action === 'delete-r2-key' && body.r2Key) {
            const cleanTarget = extractWorkerR2Key(body.r2Key);
            if (r2Bucket && cleanTarget) {
              await r2Bucket.delete(cleanTarget);
            }
            const r2Objects = await listLiveR2Objects(env);
            return new Response(JSON.stringify({ ok: true, deletedKey: cleanTarget, r2Objects }), {
              status: 200,
              headers: JSON_HEADERS,
            });
          }

          return new Response(JSON.stringify({ error: 'Unsupported action' }), {
            status: 400,
            headers: JSON_HEADERS,
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err && err.message ? err.message : 'Image action failed' }),
            { status: 500, headers: JSON_HEADERS }
          );
        }
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
        const match = cookieHeader.match(/(?:^|;\\s*)nisha_admin_session=([^;]+)/);
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

    // API: /api/admin/cms (HTML text template schema reader; persistence is in Firestore)
    if (pathname === '/api/admin/cms') {
      if (request.method === 'GET') {
        return new Response(JSON.stringify(CMS_SCHEMA), { status: 200, headers: JSON_HEADERS });
      }
      return new Response(
        JSON.stringify({ error: 'Text and image edits persist directly in Firestore + Cloudflare R2.' }),
        { status: 405, headers: JSON_HEADERS }
      );
    }

    // Sitemap XML: /sitemap.xml and /sitemap_index.xml
    if (pathname === '/sitemap.xml' || pathname === '/sitemap_index.xml') {
      const origin =
        url.hostname === 'localhost' || url.hostname === '127.0.0.1'
          ? 'https://srilankabestsafari.com'
          : 'https://' + url.host;
      const nowIso = new Date().toISOString();
      const pagesMeta = [
        { path: '/', priority: '1.0' },
        { path: '/yala-safari.html', priority: '0.9' },
        { path: '/udawalawe-safari.html', priority: '0.9' },
        { path: '/bundala-birding-safari.html', priority: '0.9' },
        { path: '/wilpattu-safari.html', priority: '0.9' },
        { path: '/minneriya-safari.html', priority: '0.9' },
        { path: '/kumana-birding-safari.html', priority: '0.9' },
        { path: '/safari-parks.html', priority: '0.9' },
        { path: '/about.html', priority: '0.8' },
        { path: '/gallery.html', priority: '0.8' },
        { path: '/reviews.html', priority: '0.8' },
        { path: '/contact.html', priority: '0.8' },
      ];
      const urlsXml = pagesMeta
        .map((p) => {
          const loc = p.path === '/' ? origin + '/' : origin + p.path;
          return (
            '  <url>\\n' +
            '    <loc>' + loc + '</loc>\\n' +
            '    <lastmod>' + nowIso + '</lastmod>\\n' +
            '    <changefreq>weekly</changefreq>\\n' +
            '    <priority>' + p.priority + '</priority>\\n' +
            '  </url>'
          );
        })
        .join('\\n');
      const sitemapXml =
        '<?xml version="1.0" encoding="UTF-8"?>\\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n' +
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

    // Robots.txt: /robots.txt
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
        'Disallow: /admin\\n' +
        'Disallow: /api/admin/\\n\\n' +
        'User-agent: Googlebot\\n' +
        'Allow: /\\n' +
        'Allow: /assets/\\n' +
        'Allow: /api/r2/file/\\n' +
        'Disallow: /admin\\n' +
        'Disallow: /api/admin/\\n\\n' +
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

    // Root route -> /index.html
    if (pathname === '/') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    }

    // Admin route -> /admin.html
    if (pathname === '/admin' || pathname === '/admin/') {
      return env.ASSETS.fetch(new Request(new URL('/admin.html', url.origin), request));
    }

    // Clean slug routes without .html
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
  await fs.writeFile(path.join(CF_ASSETS_DIR, '.assetsignore'), '_worker.js\n', 'utf8');
  console.log('Prepared Cloudflare bundle in .cloudflare/ (Workers + Pages _worker.js) successfully.');
}

main().catch((err) => {
  console.error('Failed to prepare Cloudflare bundle:', err);
  process.exit(1);
});
