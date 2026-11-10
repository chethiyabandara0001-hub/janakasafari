import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSiteTexts,
  getCmsState,
  saveCmsState,
  makeTextSlotId,
} from '@/lib/text-manager';
import {
  INITIAL_FIREBASE_SECTION_IMAGES,
  INITIAL_FIREBASE_SLOT_UPGRADES,
} from '@/lib/section-seed-data';
import { updatePageSlotImage } from '@/lib/image-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAllSiteTexts();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load CMS state';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;
    const state = await getCmsState();

    if (action === 'save-text') {
      const page = String(body.page || 'index.html');
      const isCustomAdded = Boolean(body.isCustomAdded);
      const textIndex = typeof body.textIndex === 'number' ? body.textIndex : -1;
      const textId = String(
        body.textId ||
          (isCustomAdded
            ? `${page.replace(/[^a-zA-Z0-9_-]/g, '_')}__custom_${Date.now()}`
            : makeTextSlotId(page, textIndex))
      );

      state.textOverrides[textId] = {
        textId,
        page,
        textIndex,
        tagName: body.tagName || (isCustomAdded ? 'CUSTOM' : 'P'),
        sectionContext: String(body.sectionContext || 'Page Content'),
        content: String(body.content ?? ''),
        isDeleted: Boolean(body.isDeleted),
        isCustomAdded,
        updatedAt: new Date().toISOString(),
      };

      await saveCmsState(state);
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, textId, ...updated });
    }

    if (action === 'delete-text') {
      const textId = String(body.textId || '');
      const restoreDefault = Boolean(body.restoreDefault);

      if (restoreDefault) {
        delete state.textOverrides[textId];
      } else if (state.textOverrides[textId]?.isCustomAdded) {
        delete state.textOverrides[textId];
      } else {
        const page = String(body.page || 'index.html');
        const textIndex = typeof body.textIndex === 'number' ? body.textIndex : 0;
        state.textOverrides[textId] = {
          textId,
          page,
          textIndex,
          tagName: body.tagName || 'P',
          sectionContext: String(body.sectionContext || 'Page Content'),
          content: String(body.content ?? ''),
          isDeleted: true,
          isCustomAdded: false,
          updatedAt: new Date().toISOString(),
        };
      }

      await saveCmsState(state);
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'save-section-image') {
      const itemId = String(body.itemId || `sec_img_${Date.now()}`);
      const newItem = {
        itemId,
        page: String(body.page || 'index.html'),
        sectionKey: String(body.sectionKey || 'general_section'),
        sectionTitle: String(body.sectionTitle || 'Featured Safari Gallery'),
        title: String(body.title || 'Safari Wildlife Moment'),
        caption: String(body.caption || ''),
        src: String(body.src || ''),
        alt: String(body.alt || body.title || 'Safari photo'),
        order: typeof body.order === 'number' ? body.order : state.sectionGalleryItems.length + 1,
      };

      const existingIdx = state.sectionGalleryItems.findIndex((i) => i.itemId === itemId);
      if (existingIdx >= 0) {
        state.sectionGalleryItems[existingIdx] = newItem;
      } else {
        state.sectionGalleryItems.push(newItem);
      }

      await saveCmsState(state);
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, item: newItem, ...updated });
    }

    if (action === 'delete-section-image') {
      const itemId = String(body.itemId || '');
      state.sectionGalleryItems = state.sectionGalleryItems.filter((i) => i.itemId !== itemId);
      await saveCmsState(state);
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'save-slot-override') {
      const slotId = String(body.slotId || '');
      const page = String(body.page || 'index.html');
      const slotIndex = Number(body.slotIndex || 0);
      const src = String(body.src || '');
      const alt = String(body.alt ?? '');

      if (slotId && src) {
        state.imageOverrides[slotId] = {
          slotId,
          page,
          slotIndex,
          type: body.type || 'img',
          label: String(body.label || 'Image Slot'),
          sectionContext: String(body.sectionContext || 'Page Section'),
          src,
          lightboxHref: body.lightboxHref ? String(body.lightboxHref) : undefined,
          alt,
          updatedAt: new Date().toISOString(),
        };
        await saveCmsState(state);

        // If src is a standard URL (not a multi-hundred-KB data URI), also update the HTML file on disk
        if (!src.startsWith('data:')) {
          try {
            await updatePageSlotImage({
              page,
              slotIndex,
              externalUrl: src,
              altText: alt,
              scope: 'slot',
            });
          } catch {
            // ignore if slot index is dynamic
          }
        }
      }
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'delete-slot-override') {
      const slotId = String(body.slotId || '');
      if (slotId) {
        delete state.imageOverrides[slotId];
        await saveCmsState(state);
      }
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'seed-defaults') {
      state.sectionGalleryItems = [...INITIAL_FIREBASE_SECTION_IMAGES];
      for (const item of INITIAL_FIREBASE_SLOT_UPGRADES) {
        state.imageOverrides[item.slotId] = {
          ...item,
          updatedAt: new Date().toISOString(),
        };
      }
      state.seededToFirestore = true;
      await saveCmsState(state);
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    return NextResponse.json({ error: 'Unsupported CMS action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process CMS update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
