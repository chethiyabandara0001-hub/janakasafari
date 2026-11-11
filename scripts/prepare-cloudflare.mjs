import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DEFAULTS_HTML_DIR = path.join(PUBLIC_DIR, 'assets', 'html-defaults');
const CMS_STATE_PATH = path.join(PUBLIC_DIR, 'assets', 'firebase-cms-state.json');
const CF_DIR = path.join(ROOT_DIR, '.cloudflare');
const CF_ASSETS_DIR = path.join(CF_DIR, 'assets');

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
    const fullTag = match[0];

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
        alt: effectiveAlt,
        assetFilename,
        sharedCount,
        isSharedAsset: sharedCount > 1,
        isModified: Boolean(override),
      });
    }
  }

  const mediaAssets = [];
  const mediaDir = path.join(PUBLIC_DIR, 'assets', 'media');
  try {
    const files = await fs.readdir(mediaDir);
    for (const filename of files.sort()) {
      const fullPath = path.join(mediaDir, filename);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const { format, mimeType } = detectFormatFromExt(filename);
      const mediaPath = `assets/media/${filename}`;
      const pagesSet = usageMap.get(mediaPath);

      mediaAssets.push({
        mediaPath,
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
    }
  } catch {
    // ignore
  }

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
      slots: enrichedSlots,
      mediaAssets,
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

  // 4. Build inventories and generate .cloudflare/worker.mjs
  const { imagesPayload, cmsPayload } = await buildInventories();

  const workerCode = `// Auto-generated Cloudflare Worker for Nisha Safari (Next.js + Static Assets)
const IMAGES_INVENTORY = ${JSON.stringify(imagesPayload)};
const CMS_INVENTORY = ${JSON.stringify(cmsPayload)};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // API: /api/admin/images
    if (pathname === '/api/admin/images') {
      if (request.method === 'GET') {
        return new Response(JSON.stringify(IMAGES_INVENTORY), { status: 200, headers: JSON_HEADERS });
      }
      if (request.method === 'POST') {
        return new Response(JSON.stringify({ ok: true, ...IMAGES_INVENTORY }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
    }

    // API: /api/admin/cms
    if (pathname === '/api/admin/cms') {
      if (request.method === 'GET') {
        return new Response(JSON.stringify(CMS_INVENTORY), { status: 200, headers: JSON_HEADERS });
      }
      if (request.method === 'POST') {
        return new Response(JSON.stringify({ ok: true, ...CMS_INVENTORY }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      }
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

    return env.ASSETS.fetch(request);
  },
};

export default worker;
`;

  await fs.writeFile(path.join(CF_DIR, 'worker.mjs'), workerCode, 'utf8');
  console.log('Prepared Cloudflare bundle in .cloudflare/ successfully.');
}

main().catch((err) => {
  console.error('Failed to prepare Cloudflare bundle:', err);
  process.exit(1);
});
