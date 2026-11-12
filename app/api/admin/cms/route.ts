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
import {
  putR2ObjectFromDataUrl,
  deleteR2Object,
  extractR2KeyFromCdnUrl,
} from '@/lib/r2-storage';
import {
  saveSiteTextInFirestore,
  deleteSiteTextInFirestore,
  saveSectionGalleryItemInFirestore,
  deleteSectionGalleryItemInFirestore,
  saveSiteImageInFirestore,
  deleteSiteImageInFirestore,
} from '@/lib/firebase';

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

      const tagName = (body.tagName || (isCustomAdded ? 'CUSTOM' : 'P')) as
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

      state.textOverrides[textId] = {
        textId,
        page,
        textIndex,
        tagName,
        sectionContext: String(body.sectionContext || 'Page Content'),
        content: String(body.content ?? ''),
        isDeleted: Boolean(body.isDeleted),
        isCustomAdded,
        updatedAt: new Date().toISOString(),
      };

      await saveCmsState(state);
      await saveSiteTextInFirestore({
        textId,
        page,
        textIndex,
        tagName,
        sectionContext: String(body.sectionContext || 'Page Content'),
        content: String(body.content ?? ''),
        isDeleted: Boolean(body.isDeleted),
        isCustomAdded,
      }).catch(() => {});

      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, textId, ...updated });
    }

    if (action === 'delete-text') {
      const textId = String(body.textId || '');
      const restoreDefault = Boolean(body.restoreDefault);
      const wasCustom = Boolean(state.textOverrides[textId]?.isCustomAdded);

      if (restoreDefault) {
        delete state.textOverrides[textId];
        await deleteSiteTextInFirestore(textId).catch(() => {});
      } else if (wasCustom) {
        delete state.textOverrides[textId];
        await deleteSiteTextInFirestore(textId).catch(() => {});
      } else {
        const page = String(body.page || 'index.html');
        const textIndex = typeof body.textIndex === 'number' ? body.textIndex : 0;
        const tagName = (body.tagName || 'P') as
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
        state.textOverrides[textId] = {
          textId,
          page,
          textIndex,
          tagName,
          sectionContext: String(body.sectionContext || 'Page Content'),
          content: String(body.content ?? ''),
          isDeleted: true,
          isCustomAdded: false,
          updatedAt: new Date().toISOString(),
        };
        await saveSiteTextInFirestore({
          textId,
          page,
          textIndex,
          tagName,
          sectionContext: String(body.sectionContext || 'Page Content'),
          content: String(body.content ?? ''),
          isDeleted: true,
          isCustomAdded: false,
        }).catch(() => {});
      }

      await saveCmsState(state);
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'save-section-image') {
      const itemId = String(body.itemId || `sec_img_${Date.now()}`);
      const page = String(body.page || 'index.html');
      let src = String(body.src || '');
      let r2Key = body.r2Key
        ? String(body.r2Key)
        : extractR2KeyFromCdnUrl(src) || undefined;

      // Never store data: URLs; if one is sent, push it to R2 and use its CDN link
      if (src.startsWith('data:')) {
        const migrated = await putR2ObjectFromDataUrl({
          dataUrl: src,
          filenameHint: itemId,
          alt: String(body.alt || body.title || 'Safari photo'),
          title: String(body.title || 'Safari Wildlife Moment'),
          page,
        });
        src = migrated.cdnUrl;
        r2Key = migrated.r2Key;
      }

      const newItem = {
        itemId,
        page,
        sectionKey: String(body.sectionKey || 'general_section'),
        sectionTitle: String(body.sectionTitle || 'Featured Safari Gallery'),
        title: String(body.title || 'Safari Wildlife Moment'),
        caption: String(body.caption || ''),
        src,
        r2Key,
        alt: String(body.alt || body.title || 'Safari photo'),
        order: typeof body.order === 'number' ? body.order : state.sectionGalleryItems.length + 1,
      };

      const existingIdx = state.sectionGalleryItems.findIndex((i) => i.itemId === itemId);
      if (existingIdx >= 0) {
        const prevItem = state.sectionGalleryItems[existingIdx];
        if (
          prevItem.r2Key &&
          prevItem.r2Key !== r2Key &&
          !prevItem.r2Key.startsWith('media/')
        ) {
          await deleteR2Object(prevItem.r2Key);
        }
        state.sectionGalleryItems[existingIdx] = newItem;
      } else {
        state.sectionGalleryItems.push(newItem);
      }

      await saveCmsState(state);
      await saveSectionGalleryItemInFirestore(newItem).catch(() => {});
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, item: newItem, ...updated });
    }

    if (action === 'delete-section-image') {
      const itemId = String(body.itemId || '');
      const targetItem = state.sectionGalleryItems.find((i) => i.itemId === itemId);
      const keyToDelete =
        body.r2Key ||
        targetItem?.r2Key ||
        (targetItem?.src ? extractR2KeyFromCdnUrl(targetItem.src) : null);
      if (keyToDelete) {
        await deleteR2Object(String(keyToDelete));
      }
      state.sectionGalleryItems = state.sectionGalleryItems.filter((i) => i.itemId !== itemId);
      await saveCmsState(state);
      await deleteSectionGalleryItemInFirestore(itemId).catch(() => {});
      const updated = await getAllSiteTexts();
      return NextResponse.json({ ok: true, ...updated });
    }

    if (action === 'save-slot-override') {
      const slotId = String(body.slotId || '');
      const page = String(body.page || 'index.html');
      const slotIndex = Number(body.slotIndex || 0);
      let src = String(body.src || '');
      const alt = String(body.alt ?? '');
      let r2Key = body.r2Key
        ? String(body.r2Key)
        : extractR2KeyFromCdnUrl(src) || undefined;

      if (src.startsWith('data:')) {
        const migrated = await putR2ObjectFromDataUrl({
          dataUrl: src,
          filenameHint: slotId,
          alt,
          title: String(body.label || alt || slotId),
          page,
        });
        src = migrated.cdnUrl;
        r2Key = migrated.r2Key;
      }

      if (slotId && src) {
        const prevOv = state.imageOverrides[slotId];
        if (prevOv?.r2Key && prevOv.r2Key !== r2Key && !prevOv.r2Key.startsWith('media/')) {
          await deleteR2Object(prevOv.r2Key);
        }
        const slotType = (body.type || 'img') as 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
        state.imageOverrides[slotId] = {
          slotId,
          page,
          slotIndex,
          type: slotType,
          label: String(body.label || 'Image Slot'),
          sectionContext: String(body.sectionContext || 'Page Section'),
          src,
          lightboxHref: body.lightboxHref ? String(body.lightboxHref) : src,
          r2Key,
          alt,
          isDeleted: false,
          updatedAt: new Date().toISOString(),
        };
        await saveCmsState(state);
        await saveSiteImageInFirestore({
          slotId,
          page,
          slotIndex,
          type: slotType,
          label: String(body.label || 'Image Slot'),
          sectionContext: String(body.sectionContext || 'Page Section'),
          src,
          lightboxHref: body.lightboxHref ? String(body.lightboxHref) : src,
          r2Key,
          alt,
        }).catch(() => {});

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
      return NextResponse.json({ ok: true, src, r2Key, ...updated });
    }

    if (action === 'delete-slot-override') {
      const slotId = String(body.slotId || '');
      if (slotId) {
        const prevOv = state.imageOverrides[slotId];
        const keyToDelete =
          body.r2Key ||
          prevOv?.r2Key ||
          (prevOv?.src ? extractR2KeyFromCdnUrl(prevOv.src) : null);
        if (keyToDelete) {
          await deleteR2Object(String(keyToDelete));
        }
        state.imageOverrides[slotId] = {
          slotId,
          page: String(body.page || prevOv?.page || 'index.html'),
          slotIndex: typeof body.slotIndex === 'number' ? body.slotIndex : prevOv?.slotIndex || 0,
          type: prevOv?.type || body.type || 'img',
          label: prevOv?.label || String(body.label || 'Image Slot'),
          sectionContext: prevOv?.sectionContext || String(body.sectionContext || 'Page Section'),
          src: '',
          lightboxHref: '',
          r2Key: undefined,
          alt: prevOv?.alt || '',
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        };
        await saveCmsState(state);
        await deleteSiteImageInFirestore(slotId).catch(() => {});
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
