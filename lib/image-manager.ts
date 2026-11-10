import fs from 'node:fs/promises';
import path from 'node:path';

export interface ImageSlot {
  id: string; // e.g. "index.html::slot-0"
  page: string; // e.g. "index.html"
  pageTitle: string; // e.g. "Home"
  slotIndex: number;
  kind: 'hero-bg' | 'img' | 'gallery-img' | 'logo';
  sectionContext: string;
  src: string;
  lightboxHref?: string;
  alt: string;
  isModified: boolean;
  sharedCount: number;
}

export interface MediaAssetInfo {
  mediaPath: string; // e.g. "assets/media/hero-784147703.jpg"
  filename: string;
  format: string;
  sizeBytes: number;
  isModified: boolean;
  usedInPages: string[];
  usageCount: number;
}

export const SITE_PAGES: { file: string; title: string }[] = [
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

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DEFAULTS_MEDIA_DIR = path.join(PUBLIC_DIR, 'assets', 'media-defaults');
const DEFAULTS_HTML_DIR = path.join(PUBLIC_DIR, 'assets', 'html-defaults');

export function detectMimeType(buf: Buffer, fallbackExt = '.svg'): { mime: string; format: string } {
  if (buf.length >= 4) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { mime: 'image/jpeg', format: 'JPEG' };
    }
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { mime: 'image/png', format: 'PNG' };
    }
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
      return { mime: 'image/gif', format: 'GIF' };
    }
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return { mime: 'image/webp', format: 'WEBP' };
    }
  }
  const head = buf.subarray(0, 256).toString('utf8').trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) {
    return { mime: 'image/svg+xml', format: 'SVG' };
  }
  const ext = fallbackExt.toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return { mime: 'image/jpeg', format: 'JPEG' };
  if (ext === '.png') return { mime: 'image/png', format: 'PNG' };
  if (ext === '.webp') return { mime: 'image/webp', format: 'WEBP' };
  if (ext === '.gif') return { mime: 'image/gif', format: 'GIF' };
  return { mime: 'image/svg+xml', format: 'SVG' };
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function findSectionContext(htmlBefore: string, isHeaderLogo: boolean, isFooterLogo: boolean): string {
  if (isHeaderLogo) return 'Header Navigation Logo';
  if (isFooterLogo) return 'Footer Brand Logo';

  // Find last h2 or strong title before this tag
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

interface RawMatch {
  slotIndex: number;
  kind: 'hero-bg' | 'img' | 'gallery-img' | 'logo';
  sectionContext: string;
  src: string;
  lightboxHref?: string;
  alt: string;
  startIndex: number;
  endIndex: number;
  fullTag: string;
  enclosingAnchorStart?: number;
  enclosingAnchorEnd?: number;
  enclosingAnchorTag?: string;
}

function parsePageSlots(html: string): RawMatch[] {
  const results: RawMatch[] = [];
  let slotIndex = 0;

  // Match either an element with background-image style OR an <img> tag (skipping #photo-viewer template img with empty src)
  const tokenRegex =
    /(<div[^>]+style="[^"]*background-image:\s*url\((?:&quot;|"|')?([^"')&]+)(?:&quot;|"|')?\)[^"]*"[^>]*>)|(<img\b[^>]*>)/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const startIndex = match.index;
    const fullTag = match[0];

    if (match[1]) {
      // Background image div (Hero banner)
      const bgUrl = match[2].trim();
      const htmlBefore = html.slice(0, startIndex);
      const afterSlice = html.slice(startIndex, startIndex + 900);
      const bannerH2 = afterSlice.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const bannerTitle = bannerH2 ? stripTags(bannerH2[1]) : 'Hero Banner';

      results.push({
        slotIndex: slotIndex++,
        kind: 'hero-bg',
        sectionContext: `Hero Banner (${bannerTitle})`,
        src: bgUrl,
        alt: bannerTitle,
        startIndex,
        endIndex: startIndex + fullTag.length,
        fullTag,
      });
    } else if (match[3]) {
      const imgTag = match[3];
      if (imgTag.includes('photo-full')) {
        // Skip empty lightbox dialog template <img class="photo-full">
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

      // Check if enclosed in <a ... data-lightbox ... href="...">
      const recentAnchorIndex = htmlBefore.lastIndexOf('<a ');
      const recentAnchorClose = htmlBefore.lastIndexOf('</a>');
      let lightboxHref: string | undefined;
      let enclosingAnchorStart: number | undefined;
      let enclosingAnchorEnd: number | undefined;
      let enclosingAnchorTag: string | undefined;

      if (recentAnchorIndex !== -1 && recentAnchorIndex > recentAnchorClose) {
        const anchorOpenSlice = html.slice(recentAnchorIndex, startIndex);
        const anchorTagMatch = anchorOpenSlice.match(/^<a\b[^>]*>/i);
        if (anchorTagMatch && /data-lightbox=/i.test(anchorTagMatch[0])) {
          const hrefMatch = anchorTagMatch[0].match(/\bhref="([^"]*)"/i);
          if (hrefMatch && hrefMatch[1]) {
            lightboxHref = hrefMatch[1];
            enclosingAnchorStart = recentAnchorIndex;
            enclosingAnchorEnd = recentAnchorIndex + anchorTagMatch[0].length;
            enclosingAnchorTag = anchorTagMatch[0];
          }
        }
      }

      const kind: RawMatch['kind'] =
        isHeaderLogo || isFooterLogo
          ? 'logo'
          : lightboxHref
          ? 'gallery-img'
          : 'img';

      const sectionContext = findSectionContext(htmlBefore, isHeaderLogo, isFooterLogo);

      results.push({
        slotIndex: slotIndex++,
        kind,
        sectionContext,
        src,
        lightboxHref,
        alt,
        startIndex,
        endIndex: startIndex + fullTag.length,
        fullTag,
        enclosingAnchorStart,
        enclosingAnchorEnd,
        enclosingAnchorTag,
      });
    }
  }

  return results;
}

async function isFileModified(mediaRelPath: string): Promise<boolean> {
  const cleanRel = mediaRelPath.split('?')[0].replace(/^\/+/, '');
  if (!cleanRel.startsWith('assets/media/')) return true;
  const filename = path.basename(cleanRel);
  if (filename.startsWith('custom-')) return true;

  try {
    const [curBuf, defBuf] = await Promise.all([
      fs.readFile(path.join(PUBLIC_DIR, cleanRel)),
      fs.readFile(path.join(DEFAULTS_MEDIA_DIR, filename)),
    ]);
    return !curBuf.equals(defBuf);
  } catch {
    return true;
  }
}

export async function getAllSiteImages(): Promise<{
  slots: ImageSlot[];
  mediaAssets: MediaAssetInfo[];
  pages: { file: string; title: string; slotCount: number }[];
}> {
  const allRawByPage = new Map<string, { title: string; matches: RawMatch[] }>();
  const usageMap = new Map<string, Set<string>>();
  const slotCountBySrc = new Map<string, number>();

  for (const page of SITE_PAGES) {
    const filePath = path.join(PUBLIC_DIR, page.file);
    let html = '';
    try {
      html = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    const matches = parsePageSlots(html);
    allRawByPage.set(page.file, { title: page.title, matches });

    for (const m of matches) {
      const cleanSrc = m.src.split('?')[0];
      slotCountBySrc.set(cleanSrc, (slotCountBySrc.get(cleanSrc) || 0) + 1);
      if (!usageMap.has(cleanSrc)) usageMap.set(cleanSrc, new Set());
      usageMap.get(cleanSrc)!.add(page.title);

      if (m.lightboxHref) {
        const cleanLb = m.lightboxHref.split('?')[0];
        if (!usageMap.has(cleanLb)) usageMap.set(cleanLb, new Set());
        usageMap.get(cleanLb)!.add(page.title);
      }
    }
  }

  // Check default HTML slots to see if a slot's src was changed from default
  const defaultRawByPage = new Map<string, RawMatch[]>();
  for (const page of SITE_PAGES) {
    try {
      const defHtml = await fs.readFile(path.join(DEFAULTS_HTML_DIR, page.file), 'utf8');
      defaultRawByPage.set(page.file, parsePageSlots(defHtml));
    } catch {
      defaultRawByPage.set(page.file, []);
    }
  }

  const modifiedCache = new Map<string, boolean>();
  async function checkMod(src: string): Promise<boolean> {
    const clean = src.split('?')[0];
    if (modifiedCache.has(clean)) return modifiedCache.get(clean)!;
    const mod = await isFileModified(clean);
    modifiedCache.set(clean, mod);
    return mod;
  }

  const slots: ImageSlot[] = [];
  const pagesSummary: { file: string; title: string; slotCount: number }[] = [];

  for (const page of SITE_PAGES) {
    const entry = allRawByPage.get(page.file);
    if (!entry) continue;
    const defMatches = defaultRawByPage.get(page.file) || [];
    pagesSummary.push({
      file: page.file,
      title: page.title,
      slotCount: entry.matches.length,
    });

    for (const m of entry.matches) {
      const cleanSrc = m.src.split('?')[0];
      const defSlot = defMatches[m.slotIndex];
      const srcChangedFromDefault = defSlot ? defSlot.src !== cleanSrc : false;
      const fileModified = await checkMod(cleanSrc);

      slots.push({
        id: `${page.file}::slot-${m.slotIndex}`,
        page: page.file,
        pageTitle: entry.title,
        slotIndex: m.slotIndex,
        kind: m.kind,
        sectionContext: m.sectionContext,
        src: m.src,
        lightboxHref: m.lightboxHref,
        alt: m.alt,
        isModified: srcChangedFromDefault || fileModified,
        sharedCount: slotCountBySrc.get(cleanSrc) || 1,
      });
    }
  }

  // Build mediaAssets list from public/assets/media
  const mediaDir = path.join(PUBLIC_DIR, 'assets', 'media');
  const mediaAssets: MediaAssetInfo[] = [];
  try {
    const files = await fs.readdir(mediaDir);
    for (const filename of files.sort()) {
      const fullPath = path.join(mediaDir, filename);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const buf = await fs.readFile(fullPath);
      const { format } = detectMimeType(buf, path.extname(filename));
      const mediaPath = `assets/media/${filename}`;
      const isMod = await checkMod(mediaPath);
      const pagesSet = usageMap.get(mediaPath);

      mediaAssets.push({
        mediaPath,
        filename,
        format,
        sizeBytes: stat.size,
        isModified: isMod,
        usedInPages: pagesSet ? Array.from(pagesSet) : [],
        usageCount: slotCountBySrc.get(mediaPath) || (pagesSet ? pagesSet.size : 0),
      });
    }
  } catch {
    // ignore
  }

  return { slots, mediaAssets, pages: pagesSummary };
}

async function syncHtmlFile(pageFile: string, newHtml: string) {
  await fs.writeFile(path.join(PUBLIC_DIR, pageFile), newHtml, 'utf8');
  try {
    await fs.writeFile(path.join(process.cwd(), pageFile), newHtml, 'utf8');
  } catch {
    // ignore if root copy not writable
  }
}

async function syncMediaFile(relMediaPath: string, buffer: Buffer) {
  const cleanRel = relMediaPath.split('?')[0].replace(/^\/+/, '');
  const pubTarget = path.join(PUBLIC_DIR, cleanRel);
  await fs.mkdir(path.dirname(pubTarget), { recursive: true });
  await fs.writeFile(pubTarget, buffer);

  try {
    const rootTarget = path.join(process.cwd(), cleanRel);
    await fs.mkdir(path.dirname(rootTarget), { recursive: true });
    await fs.writeFile(rootTarget, buffer);
  } catch {
    // ignore
  }
}

export async function updatePageSlotImage(options: {
  page: string;
  slotIndex: number;
  buffer?: Buffer;
  ext?: string;
  externalUrl?: string;
  altText?: string;
  scope: 'slot' | 'global';
  updateLightbox?: boolean;
}): Promise<{ updatedSrc: string }> {
  const { page, slotIndex, buffer, ext = 'png', externalUrl, altText, scope, updateLightbox = true } = options;
  const validPage = SITE_PAGES.find((p) => p.file === page);
  if (!validPage) throw new Error(`Invalid page: ${page}`);

  const htmlPath = path.join(PUBLIC_DIR, page);
  let html = await fs.readFile(htmlPath, 'utf8');
  const matches = parsePageSlots(html);
  const target = matches.find((m) => m.slotIndex === slotIndex);
  if (!target) throw new Error(`Slot ${slotIndex} not found on ${page}`);

  const timestamp = Date.now();
  const cleanCurrentSrc = target.src.split('?')[0];
  let newSrc = target.src;

  if (buffer) {
    if (scope === 'global' && cleanCurrentSrc.startsWith('assets/media/')) {
      // Overwrite the shared media file directly so all pages using it update
      await syncMediaFile(cleanCurrentSrc, buffer);
      if (updateLightbox && target.lightboxHref) {
        const cleanLb = target.lightboxHref.split('?')[0];
        if (cleanLb.startsWith('assets/media/')) {
          await syncMediaFile(cleanLb, buffer);
        }
      }
      newSrc = `${cleanCurrentSrc}?v=${timestamp}`;
    } else {
      // Create a dedicated file for this specific slot
      const safePage = page.replace('.html', '');
      const cleanExt = ext.replace(/^\.+/, '') || 'png';
      const dedicatedRel = `assets/media/custom-${safePage}-slot-${slotIndex}-${timestamp}.${cleanExt}`;
      await syncMediaFile(dedicatedRel, buffer);
      newSrc = dedicatedRel;
    }
  } else if (externalUrl && externalUrl.trim()) {
    newSrc = externalUrl.trim();
  }

  // Update the HTML for this slot (or all occurrences if global)
  if (target.kind === 'hero-bg') {
    const updatedTag = target.fullTag.replace(
      /background-image:\s*url\((?:&quot;|"|')?([^"')&]+)(?:&quot;|"|')?\)/i,
      `background-image: url(&quot;${newSrc}&quot;)`
    );
    html = html.slice(0, target.startIndex) + updatedTag + html.slice(target.endIndex);
    // Also update preload link if present
    html = html.replace(
      /(<link\s+rel="preload"\s+as="image"\s+href=")([^"]+)(")/i,
      `$1${newSrc}$3`
    );
  } else {
    let updatedImgTag = target.fullTag.replace(/\bsrc="([^"]*)"/i, `src="${newSrc}"`);
    if (typeof altText === 'string') {
      const escapedAlt = altText.replace(/"/g, '&quot;');
      if (/\balt="/i.test(updatedImgTag)) {
        updatedImgTag = updatedImgTag.replace(/\balt="([^"]*)"/i, `alt="${escapedAlt}"`);
      } else {
        updatedImgTag = updatedImgTag.replace(/<img\b/i, `<img alt="${escapedAlt}"`);
      }
    }

    if (
      updateLightbox &&
      target.enclosingAnchorStart !== undefined &&
      target.enclosingAnchorEnd !== undefined &&
      target.enclosingAnchorTag
    ) {
      const lbNewHref =
        scope === 'global' && target.lightboxHref && buffer
          ? `${target.lightboxHref.split('?')[0]}?v=${timestamp}`
          : newSrc;
      const updatedAnchorTag = target.enclosingAnchorTag.replace(
        /\bhref="([^"]*)"/i,
        `href="${lbNewHref}"`
      );
      html =
        html.slice(0, target.enclosingAnchorStart) +
        updatedAnchorTag +
        html.slice(target.enclosingAnchorEnd, target.startIndex) +
        updatedImgTag +
        html.slice(target.endIndex);
    } else {
      html = html.slice(0, target.startIndex) + updatedImgTag + html.slice(target.endIndex);
    }
  }

  await syncHtmlFile(page, html);
  return { updatedSrc: newSrc };
}

export async function replaceGlobalAssetFile(mediaPath: string, buffer: Buffer): Promise<void> {
  const cleanRel = mediaPath.split('?')[0].replace(/^\/+/, '');
  if (!cleanRel.startsWith('assets/media/') || cleanRel.includes('..')) {
    throw new Error('Invalid media path');
  }
  await syncMediaFile(cleanRel, buffer);
}

export async function resetImageOrSlot(options: {
  mode: 'slot' | 'media' | 'all';
  page?: string;
  slotIndex?: number;
  mediaPath?: string;
}): Promise<void> {
  const { mode, page, slotIndex, mediaPath } = options;

  if (mode === 'all') {
    // Restore all default HTML files
    try {
      const defMediaFiles = await fs.readdir(DEFAULTS_MEDIA_DIR);
      for (const f of defMediaFiles) {
        const buf = await fs.readFile(path.join(DEFAULTS_MEDIA_DIR, f));
        await syncMediaFile(`assets/media/${f}`, buf);
      }
    } catch {
      // No local default media files (all web-linked)
    }
    for (const p of SITE_PAGES) {
      const defHtml = await fs.readFile(path.join(DEFAULTS_HTML_DIR, p.file), 'utf8');
      await syncHtmlFile(p.file, defHtml);
    }
    return;
  }

  if (mode === 'media' && mediaPath) {
    const cleanRel = mediaPath.split('?')[0].replace(/^\/+/, '');
    const filename = path.basename(cleanRel);
    try {
      const defBuf = await fs.readFile(path.join(DEFAULTS_MEDIA_DIR, filename));
      await syncMediaFile(cleanRel, defBuf);
    } catch {
      // Ignore if no local media defaults exist
    }
    return;
  }

  if (mode === 'slot' && page && typeof slotIndex === 'number') {
    const defHtml = await fs.readFile(path.join(DEFAULTS_HTML_DIR, page), 'utf8');
    const defMatches = parsePageSlots(defHtml);
    const defTarget = defMatches.find((m) => m.slotIndex === slotIndex);
    if (!defTarget) throw new Error('Default slot not found');

    // Restore underlying default media file as well
    const defCleanSrc = defTarget.src.split('?')[0];
    if (defCleanSrc.startsWith('assets/media/')) {
      const filename = path.basename(defCleanSrc);
      try {
        const defBuf = await fs.readFile(path.join(DEFAULTS_MEDIA_DIR, filename));
        await syncMediaFile(defCleanSrc, defBuf);
      } catch {
        // ignore
      }
    }
    if (defTarget.lightboxHref) {
      const defCleanLb = defTarget.lightboxHref.split('?')[0];
      if (defCleanLb.startsWith('assets/media/')) {
        const lbFile = path.basename(defCleanLb);
        try {
          const defLbBuf = await fs.readFile(path.join(DEFAULTS_MEDIA_DIR, lbFile));
          await syncMediaFile(defCleanLb, defLbBuf);
        } catch {
          // ignore
        }
      }
    }

    // Update current HTML slot back to defTarget.src, defTarget.alt, defTarget.lightboxHref
    const curHtmlPath = path.join(PUBLIC_DIR, page);
    let curHtml = await fs.readFile(curHtmlPath, 'utf8');
    const curMatches = parsePageSlots(curHtml);
    const curTarget = curMatches.find((m) => m.slotIndex === slotIndex);
    if (!curTarget) return;

    if (curTarget.kind === 'hero-bg') {
      const updatedTag = curTarget.fullTag.replace(
        /background-image:\s*url\((?:&quot;|"|')?([^"')&]+)(?:&quot;|"|')?\)/i,
        `background-image: url(&quot;${defTarget.src}&quot;)`
      );
      curHtml = curHtml.slice(0, curTarget.startIndex) + updatedTag + curHtml.slice(curTarget.endIndex);
      curHtml = curHtml.replace(
        /(<link\s+rel="preload"\s+as="image"\s+href=")([^"]+)(")/i,
        `$1${defTarget.src}$3`
      );
    } else {
      let updatedImgTag = curTarget.fullTag
        .replace(/\bsrc="([^"]*)"/i, `src="${defTarget.src}"`)
        .replace(/\balt="([^"]*)"/i, `alt="${defTarget.alt}"`);

      if (
        curTarget.enclosingAnchorStart !== undefined &&
        curTarget.enclosingAnchorEnd !== undefined &&
        curTarget.enclosingAnchorTag &&
        defTarget.lightboxHref
      ) {
        const updatedAnchor = curTarget.enclosingAnchorTag.replace(
          /\bhref="([^"]*)"/i,
          `href="${defTarget.lightboxHref}"`
        );
        curHtml =
          curHtml.slice(0, curTarget.enclosingAnchorStart) +
          updatedAnchor +
          curHtml.slice(curTarget.enclosingAnchorEnd, curTarget.startIndex) +
          updatedImgTag +
          curHtml.slice(curTarget.endIndex);
      } else {
        curHtml = curHtml.slice(0, curTarget.startIndex) + updatedImgTag + curHtml.slice(curTarget.endIndex);
      }
    }

    await syncHtmlFile(page, curHtml);
  }
}
