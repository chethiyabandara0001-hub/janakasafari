import fs from 'node:fs/promises';
import path from 'node:path';

export interface ImageSlot {
  id: string; // e.g. "index_html__slot_0"
  slotId: string;
  page: string; // e.g. "index.html"
  pageTitle: string; // e.g. "Home"
  slotIndex: number;
  kind: 'hero-bg' | 'img' | 'gallery-img' | 'logo';
  type: 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
  label: string;
  sectionContext: string;
  sectionName: string;
  subSectionName?: string;
  src: string;
  lightboxHref?: string;
  alt: string;
  isModified: boolean;
  isDeleted: boolean;
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

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isEmptySlotSrc(src: string | undefined | null): boolean {
  if (!src) return true;
  const s = src.trim().toLowerCase();
  return (
    !s ||
    s === '/deleted' ||
    s.startsWith('data:') ||
    s.includes('empty-slot.svg') ||
    s.includes('/assets/media/') ||
    s.includes('/assets/aistudio/') ||
    s.includes('/assets/r2-bucket/')
  );
}

export function splitSectionContext(sectionContext: string): {
  sectionName: string;
  subSectionName?: string;
} {
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

function findSectionContext(
  html: string,
  startIndex: number,
  isHeaderLogo: boolean,
  isFooterLogo: boolean,
  imgTag?: string
): string {
  if (isHeaderLogo) return 'Header Navigation Logo';
  if (isFooterLogo) return 'Footer Brand Logo';

  const htmlBefore = html.slice(0, startIndex);

  if (imgTag) {
    if (imgTag.includes('cross-top-google')) {
      return 'Hero Bottom Cross-Section · Google Reviews';
    }
    if (imgTag.includes('cross-top-tripadvisor')) {
      return 'Hero Bottom Cross-Section · TripAdvisor Winner';
    }
    if (imgTag.includes('cross-top-traveler')) {
      return 'Hero Bottom Cross-Section · Happy Safari Explorers';
    }
    if (imgTag.includes('cross-top-img')) {
      return 'Hero Bottom Cross-Section · Trust Badge';
    }
  }
  if (
    htmlBefore.includes('hero-cross-bridge-wrap') &&
    !htmlBefore.slice(htmlBefore.lastIndexOf('hero-cross-bridge-wrap')).includes('</section>')
  ) {
    return 'Hero Bottom Cross-Section · Trust Badge';
  }

  const secStart = Math.max(
    htmlBefore.lastIndexOf('wsite-body-section'),
    htmlBefore.lastIndexOf('wsite-header-section')
  );
  const nextSec = html.indexOf('wsite-body-section', startIndex);
  const secEnd = nextSec !== -1 ? nextSec : Math.min(html.length, startIndex + 5000);
  const sectionSlice = secStart !== -1 ? html.slice(secStart, secEnd) : htmlBefore;
  const beforeInSection = secStart !== -1 ? html.slice(secStart, startIndex) : htmlBefore;

  const h2Before = [...beforeInSection.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(
      (t) =>
        t &&
        !/^(OUR (?:SAFARI|TAXI SERVICE|SAFARI TRIP) EXPERIENCES|SAFARI PARKS|SAFARI DESTINATIONS|TAXI DESTINATIONS|EXPLORE)$/i.test(t)
    );
  const h2InSec =
    h2Before.length > 0
      ? h2Before[h2Before.length - 1]
      : [...sectionSlice.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
          .map((m) => stripTags(m[1]))
          .find(
            (t) =>
              t &&
              !/^(OUR (?:SAFARI|TAXI SERVICE|SAFARI TRIP) EXPERIENCES|SAFARI PARKS|SAFARI DESTINATIONS|TAXI DESTINATIONS|EXPLORE)$/i.test(
                t
              )
          ) || '';

  const articleOpen = beforeInSection.lastIndexOf('<article');
  const articleClose = beforeInSection.lastIndexOf('</article>');
  let cardSub = '';
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
      const colEnd = html.indexOf('</td>', startIndex);
      const colSlice = html.slice(
        (secStart !== -1 ? secStart : 0) + colOpen,
        colEnd !== -1 ? colEnd : Math.min(html.length, startIndex + 900)
      );
      const colStrong = colSlice.match(/<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i);
      if (colStrong) cardSub = stripTags(colStrong[1]);
    }
  }

  if (sectionSlice.includes('home-why-choose')) {
    const altM = imgTag?.match(/\balt="([^"]*)"/i);
    if (altM?.[1]) {
      cardSub = altM[1].trim();
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

interface RawMatch {
  slotIndex: number;
  kind: 'hero-bg' | 'img' | 'gallery-img' | 'logo';
  sectionContext: string;
  src: string;
  lightboxHref?: string;
  alt: string;
}

export function parsePageSlots(html: string): RawMatch[] {
  const results: RawMatch[] = [];
  let slotIndex = 0;

  const tokenRegex =
    /(<div[^>]+style="[^"]*background-image:\s*url\((?:&quot;|"|')?([^"')&]+)(?:&quot;|"|')?\)[^"]*"[^>]*>)|(<img\b[^>]*>)/gi;

  let match: RegExpExecArray | null;
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
        src: isEmptySlotSrc(bgUrl) ? '' : bgUrl,
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
      let lightboxHref: string | undefined;

      if (recentAnchorIndex !== -1 && recentAnchorIndex > recentAnchorClose) {
        const anchorOpenSlice = html.slice(recentAnchorIndex, startIndex);
        const anchorTagMatch = anchorOpenSlice.match(/^<a\b[^>]*>/i);
        if (anchorTagMatch && /data-lightbox=/i.test(anchorTagMatch[0])) {
          const hrefMatch = anchorTagMatch[0].match(/\bhref="([^"]*)"/i);
          if (hrefMatch && hrefMatch[1]) {
            lightboxHref = isEmptySlotSrc(hrefMatch[1]) ? '' : hrefMatch[1];
          }
        }
      }

      const kind: RawMatch['kind'] =
        isHeaderLogo || isFooterLogo || isCrossBadge
          ? 'logo'
          : lightboxHref !== undefined
          ? 'gallery-img'
          : 'img';

      const sectionContext = findSectionContext(html, startIndex, isHeaderLogo, isFooterLogo, imgTag);
      const explicitIdxMatch = imgTag.match(/\bdata-slot-index="(\d+)"/i);
      const resolvedSlotIndex = explicitIdxMatch ? Number(explicitIdxMatch[1]) : slotIndex++;

      results.push({
        slotIndex: resolvedSlotIndex,
        kind,
        sectionContext,
        src: isEmptySlotSrc(src) ? '' : src,
        lightboxHref,
        alt,
      });
    }
  }

  return results;
}

export async function getAllSiteImages(): Promise<{
  slots: ImageSlot[];
  pages: { file: string; title: string; slotCount: number }[];
}> {
  const slots: ImageSlot[] = [];
  const pagesSummary: { file: string; title: string; slotCount: number }[] = [];

  for (const page of SITE_PAGES) {
    const filePath = path.join(PUBLIC_DIR, page.file);
    let html = '';
    try {
      html = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const matches = parsePageSlots(html);
    pagesSummary.push({
      file: page.file,
      title: page.title,
      slotCount: matches.length,
    });

    const safePage = page.file.replace(/[^a-zA-Z0-9_-]/g, '_');
    for (const m of matches) {
      const slotId = `${safePage}__slot_${m.slotIndex}`;
      const splitCtx = splitSectionContext(m.sectionContext);
      const mappedType: ImageSlot['type'] =
        m.kind === 'gallery-img' ? 'lightbox-img' : m.kind;

      slots.push({
        id: slotId,
        slotId,
        page: page.file,
        pageTitle: page.title,
        slotIndex: m.slotIndex,
        kind: m.kind,
        type: mappedType,
        label:
          splitCtx.subSectionName ||
          m.alt ||
          splitCtx.sectionName ||
          `Slot #${m.slotIndex + 1}`,
        sectionContext: m.sectionContext,
        sectionName: splitCtx.sectionName,
        subSectionName: splitCtx.subSectionName,
        src: m.src,
        lightboxHref: m.lightboxHref || m.src || '',
        alt: m.alt,
        isModified: Boolean(m.src),
        isDeleted: !m.src,
      });
    }
  }

  return { slots, pages: pagesSummary };
}
