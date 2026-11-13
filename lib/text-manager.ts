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
  content: string;
}

function detectTextLocation(
  targetRegion: string,
  matchIndex: number,
  rawTag: string,
  cleanText: string,
  state: { sectionName: string; subSectionName?: string; inCrossBridge: boolean }
): { sectionContext: string; sectionName: string; subSectionName?: string } {
  const before = targetRegion.slice(Math.max(0, matchIndex - 2200), matchIndex);

  if (before.includes('hero-cross-bridge-wrap') && !before.includes('<div class="main-wrap"')) {
    state.inCrossBridge = true;
    state.sectionName = 'Hero Bottom Cross-Section';
    if (
      before.includes('cross-sub-right') &&
      !before.slice(before.lastIndexOf('cross-sub-right')).includes('</section>')
    ) {
      state.subSectionName = 'Happy Safari Explorers';
    } else if (
      before.includes('cross-sub-center') &&
      !before.slice(before.lastIndexOf('cross-sub-center')).includes('cross-sub-right')
    ) {
      state.subSectionName = 'TripAdvisor Winner';
    } else {
      state.subSectionName = 'Google Reviews';
    }
    return {
      sectionContext: `${state.sectionName} · ${state.subSectionName}`,
      sectionName: state.sectionName,
      subSectionName: state.subSectionName,
    };
  }

  if (
    state.inCrossBridge &&
    (before.includes('class="main-wrap"') || before.includes('wsite-body-section'))
  ) {
    state.inCrossBridge = false;
    state.subSectionName = undefined;
  }

  if (
    before.includes('class="wsite-body-section') &&
    before.lastIndexOf('class="wsite-body-section') > before.lastIndexOf('hero-cross-bridge-wrap')
  ) {
    const recentArticleIdx = before.lastIndexOf('<article');
    const recentArticleCloseIdx = before.lastIndexOf('</article>');
    if (recentArticleIdx > recentArticleCloseIdx) {
      const cardSlice = targetRegion.slice(
        Math.max(0, matchIndex - 2200) + recentArticleIdx,
        Math.min(targetRegion.length, matchIndex + 700)
      );
      const cardStrong = cardSlice.match(
        /<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i
      );
      const cardTitle = cardStrong ? decodeHtmlEntities(cardStrong[1]) : '';
      if (cardTitle && cardTitle.length < 70 && cardTitle !== state.sectionName) {
        state.subSectionName = cardTitle;
      }
    }
  }

  if (rawTag === 'H1' || rawTag === 'H2') {
    const isSmallEyebrow =
      cleanText.length <= 30 &&
      /^(OUR SAFARI EXPERIENCES|SAFARI PARKS|EXPLORE|TESTIMONIALS)$/i.test(cleanText);
    if (!isSmallEyebrow) {
      state.sectionName = cleanText.slice(0, 120);
      state.subSectionName = undefined;
    }
  } else if (rawTag === 'H3' || rawTag === 'H4') {
    state.subSectionName = cleanText.slice(0, 90);
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
      const cellSlice = before.slice(recentCardOpen);
      const cellHeadingMatch = cellSlice.match(
        /<(?:h3|h4|strong)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|strong)>/i
      );
      const candidateSub = cellHeadingMatch ? decodeHtmlEntities(cellHeadingMatch[1]) : '';
      if (
        candidateSub &&
        candidateSub.length >= 3 &&
        candidateSub.length <= 70 &&
        candidateSub !== state.sectionName
      ) {
        state.subSectionName = candidateSub;
      }
    }
  }

  const sectionContext = state.subSectionName
    ? `${state.sectionName} · ${state.subSectionName}`
    : state.sectionName;
  return {
    sectionContext,
    sectionName: state.sectionName,
    subSectionName: state.subSectionName,
  };
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

export function parsePageTextSlots(html: string): ParsedTextMatch[] {
  const results: ParsedTextMatch[] = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const targetRegion = mainMatch ? mainMatch[1] : html;

  const tagRe = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  const stack: {
    tag: string;
    start: number;
    innerStart: number;
    isCand: boolean;
    insideExcluded: boolean;
  }[] = [];
  const candidates: {
    tag: string;
    start: number;
    inner: string;
  }[] = [];

  let tagMatch: RegExpExecArray | null;
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

  const locState = {
    sectionName: 'Hero Banner',
    subSectionName: undefined as string | undefined,
    inCrossBridge: false,
  };
  let textIndex = 0;

  for (const cand of candidates) {
    if (/<(p|div|ul|ol|table|h1|h2|h3|h4)\b/i.test(cand.inner)) {
      continue;
    }

    const cleanText = decodeHtmlEntities(cand.inner);
    if (!cleanText || cleanText.length < 2) {
      continue;
    }

    const rawTag = cand.tag.toUpperCase();
    const tagName = (
      ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'LI', 'DIV', 'BLOCKQUOTE'].includes(rawTag)
        ? rawTag
        : 'DIV'
    ) as SiteTextSlot['tagName'];

    const loc = detectTextLocation(targetRegion, cand.start, rawTag, cleanText, locState);

    results.push({
      textIndex: textIndex++,
      tagName,
      sectionContext: loc.sectionContext,
      sectionName: loc.sectionName,
      subSectionName: loc.subSectionName,
      content: cleanText,
    });
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
