import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE_PAGES } from './image-manager';
import {
  INITIAL_FIREBASE_SECTION_IMAGES,
  INITIAL_FIREBASE_SLOT_UPGRADES,
  type SeedSectionGalleryItem,
} from './section-seed-data';

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
  content: string;
  defaultContent: string;
  isDeleted: boolean;
  isCustomAdded: boolean;
  isModified: boolean;
}

export interface CmsPersistedState {
  seededToFirestore: boolean;
  sectionGalleryItems: SeedSectionGalleryItem[];
  textOverrides: Record<
    string,
    {
      textId: string;
      page: string;
      textIndex: number;
      tagName: SiteTextSlot['tagName'];
      sectionContext: string;
      content: string;
      isDeleted: boolean;
      isCustomAdded: boolean;
      updatedAt: string;
    }
  >;
  imageOverrides: Record<
    string,
    {
      slotId: string;
      page: string;
      slotIndex: number;
      type: 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
      label: string;
      sectionContext: string;
      src: string;
      lightboxHref?: string;
      alt: string;
      updatedAt: string;
    }
  >;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DEFAULTS_HTML_DIR = path.join(PUBLIC_DIR, 'assets', 'html-defaults');
const CMS_STATE_PATH = path.join(PUBLIC_DIR, 'assets', 'firebase-cms-state.json');

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
  content: string;
}

/**
 * Extracts editable text elements from a page's <main> and hero banner in deterministic order.
 * Matches headings (h1-h4), paragraphs (p), blockquotes, list items (li), and CTA button labels (.wsite-button-inner).
 */
export function parsePageTextSlots(html: string): ParsedTextMatch[] {
  const results: ParsedTextMatch[] = [];
  // Extract the <main ...>...</main> region so we don't index nav chrome or hidden dialogs
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const targetRegion = mainMatch ? mainMatch[1] : html;

  const regex =
    /<(h1|h2|h3|h4|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>|<span\b[^>]*class="[^"]*wsite-button-inner[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  let currentSection = 'Hero Banner';
  let textIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(targetRegion)) !== null) {
    const rawTag = match[1] ? match[1].toUpperCase() : 'SPAN';
    const innerHtml = match[1] ? match[2] : match[3];
    // Skip elements that contain nested block elements to avoid duplicate parent/child matches
    if (/<(p|div|ul|ol|table|h1|h2|h3|h4)\b/i.test(innerHtml)) {
      continue;
    }

    const cleanText = decodeHtmlEntities(innerHtml);
    if (!cleanText || cleanText.length < 2) {
      continue;
    }

    if (rawTag === 'H1' || rawTag === 'H2') {
      currentSection = cleanText.slice(0, 120);
    }

    const tagName = (
      ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'LI', 'BLOCKQUOTE'].includes(rawTag)
        ? rawTag
        : 'P'
    ) as SiteTextSlot['tagName'];

    results.push({
      textIndex: textIndex++,
      tagName,
      sectionContext: currentSection,
      content: cleanText,
    });
  }

  return results;
}

export async function getCmsState(): Promise<CmsPersistedState> {
  try {
    const raw = await fs.readFile(CMS_STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as CmsPersistedState;
    if (!parsed.sectionGalleryItems || parsed.sectionGalleryItems.length === 0) {
      parsed.sectionGalleryItems = [...INITIAL_FIREBASE_SECTION_IMAGES];
    }
    if (!parsed.textOverrides) parsed.textOverrides = {};
    if (!parsed.imageOverrides) parsed.imageOverrides = {};
    return parsed;
  } catch {
    const initialImageOverrides: CmsPersistedState['imageOverrides'] = {};
    for (const item of INITIAL_FIREBASE_SLOT_UPGRADES) {
      initialImageOverrides[item.slotId] = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
    }

    const initial: CmsPersistedState = {
      seededToFirestore: false,
      sectionGalleryItems: [...INITIAL_FIREBASE_SECTION_IMAGES],
      textOverrides: {},
      imageOverrides: initialImageOverrides,
    };
    await saveCmsState(initial);
    return initial;
  }
}

export async function saveCmsState(state: CmsPersistedState): Promise<void> {
  await fs.mkdir(path.dirname(CMS_STATE_PATH), { recursive: true });
  await fs.writeFile(CMS_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export async function getAllSiteTexts(): Promise<{
  textSlots: SiteTextSlot[];
  customTexts: SiteTextSlot[];
  sectionGalleryItems: SeedSectionGalleryItem[];
  imageOverrides: CmsPersistedState['imageOverrides'];
  pages: { file: string; title: string; textCount: number }[];
}> {
  const cmsState = await getCmsState();
  const textSlots: SiteTextSlot[] = [];
  const customTexts: SiteTextSlot[] = [];
  const pagesSummary: { file: string; title: string; textCount: number }[] = [];

  for (const page of SITE_PAGES) {
    let defaultHtml = '';
    try {
      defaultHtml = await fs.readFile(path.join(DEFAULTS_HTML_DIR, page.file), 'utf8');
    } catch {
      try {
        defaultHtml = await fs.readFile(path.join(PUBLIC_DIR, page.file), 'utf8');
      } catch {
        continue;
      }
    }

    const parsedDefaults = parsePageTextSlots(defaultHtml);
    pagesSummary.push({
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
    if (val.isCustomAdded) {
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
    textSlots,
    customTexts,
    sectionGalleryItems: cmsState.sectionGalleryItems,
    imageOverrides: cmsState.imageOverrides,
    pages: pagesSummary,
  };
}
