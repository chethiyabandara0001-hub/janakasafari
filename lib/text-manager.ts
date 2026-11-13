import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE_PAGES } from './image-manager';

export interface SiteTextSlot {
  textId: string; // e.g. "index_html__text_0"
  page: string; // e.g. "index.html"
  pageTitle: string; // e.g. "Home"
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
  sectionName: string;
  subSectionName?: string;
  fieldLabel?: string;
  content: string;
  defaultContent: string;
  isDeleted: boolean;
  isCustomAdded: boolean;
  isModified: boolean;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');

function decodeHtmlEntities(str: string): string {
  return str
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

export function splitTextSectionContext(ctx: string): {
  sectionName: string;
  subSectionName?: string;
} {
  const clean = (ctx || 'Page Content').trim();
  const sepIdx = clean.indexOf(' · ');
  if (sepIdx !== -1) {
    return {
      sectionName: clean.slice(0, sepIdx).trim(),
      subSectionName: clean.slice(sepIdx + 3).trim() || undefined,
    };
  }
  return { sectionName: clean };
}

export function makeTextSlotId(page: string, textIndex: number): string {
  const safePage = page.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safePage}__text_${textIndex}`;
}

export function makeImageSlotId(page: string, slotIndex: number): string {
  const safePage = page.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safePage}__slot_${slotIndex}`;
}

interface ParsedTextMatch {
  textIndex: number;
  tagName: SiteTextSlot['tagName'];
  sectionContext: string;
  sectionName: string;
  subSectionName?: string;
  fieldLabel: string;
  content: string;
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

interface RawCandidate {
  tag: string;
  clsList: string[];
  start: number;
  inner: string;
}

function collectRegionCandidates(regionHtml: string, isFooterRegion: boolean): RawCandidate[] {
  const tagRe = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  const stack: {
    tag: string;
    clsList: string[];
    start: number;
    innerStart: number;
    isCand: boolean;
    insideExcluded: boolean;
  }[] = [];
  const candidates: RawCandidate[] = [];

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRe.exec(regionHtml)) !== null) {
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
            const inner = regionHtml.slice(node.innerStart, tagMatch.index);
            if (!/<(p|div|ul|ol|table|h1|h2|h3|h4)\b/i.test(inner)) {
              const cleanText = decodeHtmlEntities(inner);
              if (cleanText && cleanText.length >= 2) {
                // Skip multi-link Explore navigation list in footer so links aren't flattened
                const linkMatches = inner.match(/<a\b/gi);
                if (isFooterRegion && linkMatches && linkMatches.length >= 2) {
                  break;
                }
                candidates.push({
                  tag: node.tag,
                  clsList: node.clsList,
                  start: node.start,
                  inner,
                });
              }
            }
          }
          break;
        }
      }
    } else {
      const clsMatch = attrs.match(/\bclass\s*=\s*"([^"]*)"/i);
      const clsList = (clsMatch ? clsMatch[1] : '').trim().split(/\s+/).filter(Boolean);
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
          clsList,
          start: tagMatch.index,
          innerStart: tagMatch.index + full.length,
          isCand,
          insideExcluded: inExcludedParent || isExcludedNode,
        });
      }
    }
  }

  candidates.sort((a, b) => a.start - b.start);
  return candidates;
}

const EYEBROW_RE =
  /^(OUR (?:SAFARI|TAXI SERVICE) EXPERIENCES|SAFARI PARKS|TAXI DESTINATIONS|EXPLORE|TESTIMONIALS|FOR CRUISE VISITORS)$/i;

interface BodySectionRange {
  start: number;
  end: number;
  headingH2s: { pos: number; text: string }[];
  defaultSectionName: string;
}

function buildBodySectionRanges(targetRegion: string): BodySectionRange[] {
  const starts: number[] = [];
  const secRe = /<div\b[^>]*class="[^"]*\bwsite-body-section\b[^"]*"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = secRe.exec(targetRegion)) !== null) {
    starts.push(m.index);
  }

  const ranges: BodySectionRange[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : targetRegion.length;
    const slice = targetRegion.slice(start, end);

    const headingH2s: { pos: number; text: string }[] = [];
    for (const hMatch of slice.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)) {
      const text = decodeHtmlEntities(hMatch[1]);
      if (text && !EYEBROW_RE.test(text)) {
        headingH2s.push({
          pos: start + (hMatch.index ?? 0),
          text: text.slice(0, 120),
        });
      }
    }

    let defaultSectionName = headingH2s[0]?.text || '';
    if (!defaultSectionName) {
      const h3Match = slice.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
      if (h3Match) defaultSectionName = decodeHtmlEntities(h3Match[1]).slice(0, 120);
    }
    if (!defaultSectionName) {
      const strongMatch = slice.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
      if (strongMatch) defaultSectionName = decodeHtmlEntities(strongMatch[1]).slice(0, 80);
    }
    ranges.push({
      start,
      end,
      headingH2s,
      defaultSectionName: defaultSectionName || 'Page Section',
    });
  }
  return ranges;
}

interface BlockRange {
  start: number;
  end: number;
  title: string;
}

function extractArticleRanges(targetRegion: string): BlockRange[] {
  const ranges: BlockRange[] = [];
  const artRe = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let m: RegExpExecArray | null;
  while ((m = artRe.exec(targetRegion)) !== null) {
    const slice = m[1];
    const titleMatch =
      slice.match(/<div\b[^>]*class="[^"]*\b(?:home-safari-title|wildlife-card-title)\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      slice.match(/<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).slice(0, 90) : '';
    ranges.push({
      start: m.index,
      end: m.index + m[0].length,
      title,
    });
  }
  return ranges;
}

function extractTdColumnRanges(targetRegion: string): BlockRange[] {
  const ranges: BlockRange[] = [];
  const tdRe = /<td\b[^>]*class="[^"]*\bwsite-multicol-col\b[^"]*"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tdRe.exec(targetRegion)) !== null) {
    const start = m.index;
    const closeIdx = targetRegion.indexOf('</td>', start);
    const end = closeIdx !== -1 ? closeIdx + 5 : targetRegion.length;
    const slice = targetRegion.slice(start, end);

    let title = '';
    const benefitTitle = slice.match(
      /<div\b[^>]*class="[^"]*\bbenefit-title\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (benefitTitle) {
      title = decodeHtmlEntities(benefitTitle[1]).slice(0, 90);
    } else {
      const hMatch = slice.match(/<(?:h3|h4)\b[^>]*>([\s\S]*?)<\/(?:h3|h4)>/i);
      if (hMatch) {
        title = decodeHtmlEntities(hMatch[1]).slice(0, 90);
      } else {
        // Standalone short strong title paragraph (e.g. Taxi Service, My Resort Yala, Travelers' Choice)
        for (const pMatch of slice.matchAll(/<div\b[^>]*class="[^"]*\bparagraph\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)) {
          const pInner = pMatch[1];
          const strongMatch = pInner.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
          if (strongMatch) {
            const fullTxt = decodeHtmlEntities(pInner);
            const strongTxt = decodeHtmlEntities(strongMatch[1]);
            if (
              strongTxt.length >= 3 &&
              strongTxt.length <= 65 &&
              fullTxt.length <= strongTxt.length + 4
            ) {
              title = strongTxt;
              break;
            }
          }
        }
        if (!title && slice.includes('TA_selfserveprop')) {
          const taTitle = slice.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
          if (taTitle) title = decodeHtmlEntities(taTitle[1]).slice(0, 90);
        }
      }
    }

    ranges.push({ start, end, title });
  }
  return ranges;
}

function getReadableFieldLabel(
  rawTag: string,
  clsList: string[],
  cleanText: string,
  ctx: { inHero: boolean; inCrossBridge: boolean; inFooter: boolean }
): string {
  if (clsList.includes('hero-editorial-kicker')) return 'Hero Eyebrow / Kicker';
  if (clsList.includes('wsite-button-inner')) return ctx.inHero ? 'Hero Button CTA' : 'Button CTA';
  if (clsList.includes('cross-score') || clsList.includes('cross-metric')) return 'Trust Metric';
  if (clsList.includes('cross-title')) return 'Badge Title';
  if (clsList.includes('cross-caption')) return 'Badge Caption';
  if (clsList.includes('benefit-title') || clsList.includes('home-safari-title') || clsList.includes('wildlife-card-title')) {
    return 'Card Title';
  }
  if (clsList.includes('footer-contact-row')) return 'Footer Contact Item';
  if (ctx.inHero && (rawTag === 'H1' || rawTag === 'H2')) return 'Hero Headline';
  if (ctx.inHero) return 'Hero Copy';
  if (rawTag === 'H1' || rawTag === 'H2') {
    return EYEBROW_RE.test(cleanText) ? 'Section Eyebrow' : 'Section Heading';
  }
  if (EYEBROW_RE.test(cleanText)) return 'Section Eyebrow';
  if (rawTag === 'H3' || rawTag === 'H4') return 'Sub-Heading';
  if (rawTag === 'LI') return 'List Item';
  if (rawTag === 'BLOCKQUOTE') return 'Quote';
  if (ctx.inFooter) {
    if (cleanText.includes('©')) return 'Copyright Notice';
    return 'Footer Text';
  }
  return 'Body Copy';
}

export function parsePageTextSlots(html: string): ParsedTextMatch[] {
  const results: ParsedTextMatch[] = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const targetRegion = mainMatch ? mainMatch[1] : html;
  const mainCandidates = collectRegionCandidates(targetRegion, false);

  const crossBridgeStart = targetRegion.indexOf('hero-cross-bridge-wrap');
  const mainWrapStart = targetRegion.indexOf('class="main-wrap"');
  const bodyRanges = buildBodySectionRanges(targetRegion);
  const articleRanges = extractArticleRanges(targetRegion);
  const tdRanges = extractTdColumnRanges(targetRegion);

  let textIndex = 0;

  for (const cand of mainCandidates) {
    const cleanText = decodeHtmlEntities(cand.inner);
    if (!cleanText || cleanText.length < 2) continue;

    const rawTag = cand.tag.toUpperCase();
    const tagName = (
      ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'LI', 'DIV', 'BLOCKQUOTE'].includes(rawTag)
        ? rawTag
        : 'DIV'
    ) as SiteTextSlot['tagName'];

    const pos = cand.start;
    const inCrossBridge =
      crossBridgeStart !== -1 &&
      pos > crossBridgeStart &&
      (mainWrapStart === -1 || pos < mainWrapStart);
    const inHero = !inCrossBridge && (mainWrapStart === -1 || pos < mainWrapStart);

    let sectionName = 'Hero Banner';
    let subSectionName: string | undefined;

    if (inHero) {
      sectionName = 'Hero Banner';
      if (cand.clsList.includes('hero-editorial-kicker')) {
        subSectionName = 'Hero Kicker';
      } else if (rawTag === 'H1' || rawTag === 'H2') {
        subSectionName = 'Hero Headline';
      } else if (cand.clsList.includes('wsite-button-inner')) {
        subSectionName = 'Hero CTA Button';
      } else {
        subSectionName = 'Hero Copy';
      }
    } else if (inCrossBridge) {
      sectionName = 'Hero Bottom Cross-Section';
      const sliceBefore = targetRegion.slice(crossBridgeStart, pos);
      if (sliceBefore.includes('cross-sub-right')) {
        subSectionName = 'Happy Safari Explorers';
      } else if (sliceBefore.includes('cross-sub-center')) {
        subSectionName = 'TripAdvisor Winner';
      } else {
        subSectionName = 'Google Reviews';
      }
    } else {
      const sec = bodyRanges.find((r) => pos >= r.start && pos < r.end);
      if (sec) {
        const activeH2 = sec.headingH2s.filter((h) => h.pos <= pos).pop();
        sectionName = activeH2 ? activeH2.text : sec.defaultSectionName;
      } else {
        sectionName = 'Page Content';
      }

      const art = articleRanges.find((a) => pos >= a.start && pos <= a.end);
      if (art && art.title && art.title !== sectionName) {
        subSectionName = art.title;
      } else {
        const td = tdRanges.find((t) => pos >= t.start && pos <= t.end);
        if (td && td.title && td.title !== sectionName) {
          subSectionName = td.title;
        } else if (rawTag === 'H3' && cleanText !== sectionName) {
          subSectionName = cleanText.slice(0, 90);
        } else {
          // If inside a sub-grouped widget (e.g. reviews.html), inspect nearest preceding <h3>
          const recentH3s = [
            ...targetRegion
              .slice(sec ? sec.start : mainWrapStart, pos)
              .matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi),
          ];
          if (recentH3s.length > 0) {
            const h3Text = decodeHtmlEntities(recentH3s[recentH3s.length - 1][1]).slice(0, 90);
            if (h3Text && h3Text !== sectionName) {
              subSectionName = h3Text;
            }
          }
        }
      }
    }

    const sectionContext = subSectionName ? `${sectionName} · ${subSectionName}` : sectionName;
    const fieldLabel = getReadableFieldLabel(rawTag, cand.clsList, cleanText, {
      inHero,
      inCrossBridge,
      inFooter: false,
    });

    results.push({
      textIndex: textIndex++,
      tagName,
      sectionContext,
      sectionName,
      subSectionName,
      fieldLabel,
      content: cleanText,
    });
  }

  // Footer editable texts (appended after <main> so all existing <main> textIds remain stable)
  const footerMatch = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) {
    const footerRegion = footerMatch[1];
    const footerCandidates = collectRegionCandidates(footerRegion, true);
    const footerTdRanges = extractTdColumnRanges(footerRegion);

    for (const cand of footerCandidates) {
      const cleanText = decodeHtmlEntities(cand.inner);
      if (!cleanText || cleanText.length < 2) continue;

      const rawTag = cand.tag.toUpperCase();
      const tagName = (
        ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'LI', 'DIV', 'BLOCKQUOTE'].includes(rawTag)
          ? rawTag
          : 'DIV'
      ) as SiteTextSlot['tagName'];

      const sectionName = 'Site Footer';
      const tdIdx = footerTdRanges.findIndex((t) => cand.start >= t.start && cand.start <= t.end);
      let subSectionName = 'Copyright & Links';
      if (tdIdx === 0) subSectionName = 'Footer Brand Intro';
      else if (tdIdx === 1) subSectionName = 'Explore Column Heading';
      else if (tdIdx === 2) subSectionName = 'Get in Touch & CTA';
      else if (cleanText.includes('©')) subSectionName = 'Copyright Notice';

      const fieldLabel = getReadableFieldLabel(rawTag, cand.clsList, cleanText, {
        inHero: false,
        inCrossBridge: false,
        inFooter: true,
      });

      results.push({
        textIndex: textIndex++,
        tagName,
        sectionContext: `${sectionName} · ${subSectionName}`,
        sectionName,
        subSectionName,
        fieldLabel,
        content: cleanText,
      });
    }
  }

  return results;
}

export async function getAllSiteTexts(): Promise<{
  textSlots: SiteTextSlot[];
  pages: { file: string; title: string; textCount: number }[];
}> {
  const textSlots: SiteTextSlot[] = [];
  const pagesSummary: { file: string; title: string; textCount: number }[] = [];

  for (const page of SITE_PAGES) {
    let defaultHtml = '';
    try {
      defaultHtml = await fs.readFile(path.join(PUBLIC_DIR, page.file), 'utf8');
    } catch {
      continue;
    }

    const parsedDefaults = parsePageTextSlots(defaultHtml);
    pagesSummary.push({
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
        fieldLabel: item.fieldLabel,
        content: item.content,
        defaultContent: item.content,
        isDeleted: false,
        isCustomAdded: false,
        isModified: false,
      });
    }
  }

  return {
    textSlots,
    pages: pagesSummary,
  };
}
