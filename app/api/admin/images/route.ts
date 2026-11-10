import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import {
  getAllSiteImages,
  updatePageSlotImage,
  replaceGlobalAssetFile,
  resetImageOrSlot,
} from '@/lib/image-manager';
import { getCmsState, makeImageSlotId, saveCmsState } from '@/lib/text-manager';

export const dynamic = 'force-dynamic';

async function buildEnrichedImageInventory() {
  const [raw, cmsState] = await Promise.all([getAllSiteImages(), getCmsState()]);

  const enrichedSlots = raw.slots.map((s) => {
    const firestoreSlotId = makeImageSlotId(s.page, s.slotIndex);
    const override = cmsState.imageOverrides[firestoreSlotId];
    const mappedType: 'hero-bg' | 'img' | 'lightbox-img' | 'logo' =
      s.kind === 'gallery-img' ? 'lightbox-img' : s.kind;
    const effectiveSrc = override?.src || s.src;
    const effectiveAlt = override?.alt !== undefined ? override.alt : s.alt;
    const cleanFile = s.src.split('?')[0].replace(/^\/+/, '');
    const assetFilename = cleanFile.startsWith('assets/media/')
      ? path.basename(cleanFile)
      : cleanFile;

    return {
      ...s,
      id: firestoreSlotId,
      slotId: firestoreSlotId,
      type: mappedType,
      label: override?.label || s.alt || s.sectionContext || `Slot #${s.slotIndex + 1}`,
      src: effectiveSrc,
      lightboxHref: override?.lightboxHref || s.lightboxHref,
      alt: effectiveAlt,
      assetFilename,
      isSharedAsset: s.sharedCount > 1,
      isModified: Boolean(override) || s.isModified,
    };
  });

  const enrichedAssets = raw.mediaAssets.map((a) => ({
    ...a,
    url: `/${a.mediaPath}`,
    mimeType: `image/${a.format.toLowerCase() === 'svg' ? 'svg+xml' : a.format.toLowerCase()}`,
    hasDefaultBackup: !a.filename.startsWith('custom-'),
  }));

  return {
    slots: enrichedSlots,
    mediaAssets: enrichedAssets,
    pages: raw.pages,
  };
}

export async function GET() {
  try {
    const data = await buildEnrichedImageInventory();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load site images';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const mode = (formData.get('mode') || formData.get('action') || 'update-slot').toString();

      if (mode === 'replace-media') {
        const assetFilename = (
          formData.get('assetFilename') ||
          formData.get('mediaPath') ||
          ''
        ).toString();
        const mediaPath = assetFilename.startsWith('assets/media/')
          ? assetFilename
          : `assets/media/${path.basename(assetFilename)}`;
        const file = formData.get('file') as File | null;
        if (!assetFilename || !file) {
          return NextResponse.json({ error: 'assetFilename and file are required' }, { status: 400 });
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await replaceGlobalAssetFile(mediaPath, buffer);
        const data = await buildEnrichedImageInventory();
        return NextResponse.json({ ok: true, ...data });
      }

      // Default: update-slot
      const page = (formData.get('page') || '').toString();
      const slotIndex = Number(formData.get('slotIndex'));
      const scope = ((formData.get('scope') || 'slot').toString() === 'global'
        ? 'global'
        : 'slot') as 'slot' | 'global';
      const altTextRaw = formData.get('altText');
      const altText = altTextRaw !== null ? altTextRaw.toString() : undefined;
      const externalUrl = (formData.get('externalUrl') || '').toString();
      const updateLightbox = formData.get('updateLightbox') !== 'false';
      const file = formData.get('file') as File | null;

      let buffer: Buffer | undefined;
      let ext = 'png';
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        const origExt = path.extname(file.name).replace(/^\.+/, '').toLowerCase();
        if (origExt) ext = origExt;
      }

      const result = await updatePageSlotImage({
        page,
        slotIndex,
        buffer,
        ext,
        externalUrl: buffer ? undefined : externalUrl,
        altText,
        scope,
        updateLightbox,
      });

      // Also record in CMS state so Firestore & CMS stay in sync
      const cmsState = await getCmsState();
      const slotId = makeImageSlotId(page, slotIndex);
      cmsState.imageOverrides[slotId] = {
        slotId,
        page,
        slotIndex,
        type: 'img',
        label: altText || `Slot #${slotIndex + 1}`,
        sectionContext: 'Updated Slot',
        src: result.updatedSrc,
        alt: altText || '',
        updatedAt: new Date().toISOString(),
      };
      await saveCmsState(cmsState);

      const data = await buildEnrichedImageInventory();
      const updatedSlot = data.slots.find((s) => s.page === page && s.slotIndex === slotIndex);
      return NextResponse.json({
        ok: true,
        updatedSrc: result.updatedSrc,
        slot: updatedSlot,
        ...data,
      });
    }

    // JSON body actions (reset, url update, alt update)
    const body = await req.json();
    if (body.action === 'reset') {
      const target = body.target || body.mode || 'slot';
      const cmsState = await getCmsState();

      if (target === 'all') {
        await resetImageOrSlot({ mode: 'all' });
        cmsState.imageOverrides = {};
        await saveCmsState(cmsState);
      } else if (target === 'asset' || target === 'media') {
        const filename = body.assetFilename || body.mediaPath || '';
        const mediaPath = filename.startsWith('assets/media/')
          ? filename
          : `assets/media/${path.basename(filename)}`;
        await resetImageOrSlot({ mode: 'media', mediaPath });
      } else if (target === 'page' && body.page) {
        for (const key of Object.keys(cmsState.imageOverrides)) {
          if (cmsState.imageOverrides[key].page === body.page) {
            delete cmsState.imageOverrides[key];
          }
        }
        await saveCmsState(cmsState);
      } else if (body.page && typeof body.slotIndex === 'number') {
        const slotId = makeImageSlotId(body.page, body.slotIndex);
        delete cmsState.imageOverrides[slotId];
        await saveCmsState(cmsState);
        await resetImageOrSlot({
          mode: 'slot',
          page: body.page,
          slotIndex: body.slotIndex,
        });
      }

      const data = await buildEnrichedImageInventory();
      return NextResponse.json({ ok: true, ...data });
    }

    if (body.action === 'update-slot-meta') {
      const page = String(body.page || 'index.html');
      const slotIndex = Number(body.slotIndex);
      const externalUrl = body.externalUrl ? String(body.externalUrl) : undefined;
      const altText = body.altText !== undefined ? String(body.altText) : undefined;

      // If externalUrl is a data URL transferred via Firestore, store in cmsState without writing huge base64 into raw HTML on disk
      let updatedSrc = externalUrl || '';
      if (externalUrl && !externalUrl.startsWith('data:')) {
        const result = await updatePageSlotImage({
          page,
          slotIndex,
          externalUrl,
          altText,
          scope: body.scope === 'global' ? 'global' : 'slot',
          updateLightbox: body.updateLightbox !== false,
        });
        updatedSrc = result.updatedSrc;
      }

      const cmsState = await getCmsState();
      const slotId = makeImageSlotId(page, slotIndex);
      const existing = cmsState.imageOverrides[slotId];
      cmsState.imageOverrides[slotId] = {
        slotId,
        page,
        slotIndex,
        type: body.type || existing?.type || 'img',
        label: body.label || existing?.label || altText || `Slot #${slotIndex + 1}`,
        sectionContext: body.sectionContext || existing?.sectionContext || 'Page Section',
        src: updatedSrc || existing?.src || '',
        alt: altText !== undefined ? altText : existing?.alt || '',
        updatedAt: new Date().toISOString(),
      };
      await saveCmsState(cmsState);

      const data = await buildEnrichedImageInventory();
      return NextResponse.json({ ok: true, updatedSrc, ...data });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
