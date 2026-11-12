import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import {
  getAllSiteImages,
  updatePageSlotImage,
  replaceGlobalAssetFile,
  resetImageOrSlot,
} from '@/lib/image-manager';
import { getCmsState, makeImageSlotId, saveCmsState } from '@/lib/text-manager';
import {
  INITIAL_FIREBASE_SLOT_UPGRADES,
  INITIAL_FIREBASE_SECTION_IMAGES,
} from '@/lib/section-seed-data';
import {
  DEFAULT_R2_BUCKET_NAME,
  listR2Objects,
  putR2Object,
  putR2ObjectFromDataUrl,
  deleteR2Object,
  extractR2KeyFromCdnUrl,
  loadR2Index,
  saveR2Index,
} from '@/lib/r2-storage';
import {
  saveSiteImageInFirestore,
  deleteSiteImageInFirestore,
} from '@/lib/firebase';

export const dynamic = 'force-dynamic';

async function buildEnrichedImageInventory() {
  const [raw, cmsState, r2Objects] = await Promise.all([
    getAllSiteImages(),
    getCmsState(),
    listR2Objects(),
  ]);

  const seedMetaMap = new Map(
    INITIAL_FIREBASE_SLOT_UPGRADES.map((u) => [u.slotId, u])
  );

  const enrichedSlots = raw.slots.map((s) => {
    const firestoreSlotId = makeImageSlotId(s.page, s.slotIndex);
    const override = cmsState.imageOverrides[firestoreSlotId];
    const seedMeta = seedMetaMap.get(firestoreSlotId);
    const mappedType: 'hero-bg' | 'img' | 'lightbox-img' | 'logo' =
      s.kind === 'gallery-img' ? 'lightbox-img' : s.kind;
    const rawSrcCandidate =
      override && !override.isDeleted ? override.src : s.src;
    const isSlotEmpty =
      !rawSrcCandidate ||
      rawSrcCandidate === '/deleted' ||
      rawSrcCandidate.includes('empty-slot.svg');
    const isDeleted = isSlotEmpty || Boolean(override?.isDeleted);
    const effectiveSrc = isDeleted ? '' : rawSrcCandidate;
    const effectiveAlt =
      override?.alt !== undefined
        ? override.alt
        : seedMeta?.alt || s.alt;
    const cleanFile = (effectiveSrc || '').split('?')[0].replace(/^\/+/, '');
    const assetFilename = cleanFile ? path.basename(cleanFile) : '';
    const effectiveR2Key = isDeleted
      ? undefined
      : override?.r2Key || extractR2KeyFromCdnUrl(effectiveSrc) || undefined;

    return {
      ...s,
      id: firestoreSlotId,
      slotId: firestoreSlotId,
      type: mappedType,
      label:
        override?.label ||
        seedMeta?.label ||
        s.alt ||
        s.sectionContext ||
        `Slot #${s.slotIndex + 1}`,
      sectionContext:
        override?.sectionContext ||
        seedMeta?.sectionContext ||
        s.sectionContext,
      src: effectiveSrc,
      lightboxHref: isDeleted
        ? ''
        : override?.lightboxHref || effectiveSrc || s.lightboxHref || '',
      r2Key: effectiveR2Key,
      alt: effectiveAlt,
      assetFilename,
      isSharedAsset: false,
      isDeleted,
      isModified: !isDeleted && Boolean(effectiveSrc),
      updatedAt: override?.updatedAt,
    };
  });

  const enrichedAssets = raw.mediaAssets.map((a) => {
    const r2Key = `media/${a.filename}`;
    return {
      ...a,
      r2Key,
      cdnUrl: `/api/r2/file/${r2Key}`,
      url: `/${a.mediaPath}`,
      mimeType: `image/${a.format.toLowerCase() === 'svg' ? 'svg+xml' : a.format.toLowerCase()}`,
      hasDefaultBackup: !a.filename.startsWith('custom-'),
    };
  });

  return {
    bucketName: DEFAULT_R2_BUCKET_NAME,
    slots: enrichedSlots,
    mediaAssets: enrichedAssets,
    r2Objects,
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
        const baseName = path.basename(assetFilename);
        const mediaPath = assetFilename.startsWith('assets/media/')
          ? assetFilename
          : `assets/media/${baseName}`;
        const file = formData.get('file') as File | null;
        if (!assetFilename || !file) {
          return NextResponse.json(
            { error: 'assetFilename and file are required' },
            { status: 400 }
          );
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await replaceGlobalAssetFile(mediaPath, buffer);
        const r2Record = await putR2Object({
          buffer,
          originalFilename: baseName,
          mimeType: file.type || undefined,
          replaceKey: `media/${baseName}`,
          customKey: `media/${baseName}`,
          title: baseName,
        });
        const data = await buildEnrichedImageInventory();
        return NextResponse.json({
          ok: true,
          r2Key: r2Record.r2Key,
          cdnUrl: r2Record.cdnUrl,
          ...data,
        });
      }

      // Default: update-slot — upload directly to R2 bucket and save R2 CDN link
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

      const cmsState = await getCmsState();
      const slotId = makeImageSlotId(page, slotIndex);
      const existingOverride = cmsState.imageOverrides[slotId];

      let updatedSrc = externalUrl;
      let r2Key: string | undefined = existingOverride?.r2Key;

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const r2Record = await putR2Object({
          buffer,
          originalFilename: file.name,
          mimeType: file.type || undefined,
          replaceKey: existingOverride?.r2Key || `slots/${slotId}`,
          alt: altText,
          title: altText || file.name,
          page,
        });
        updatedSrc = `${r2Record.cdnUrl}?v=${Date.now()}`;
        r2Key = r2Record.r2Key;
      }

      if (updatedSrc && !updatedSrc.startsWith('data:')) {
        try {
          await updatePageSlotImage({
            page,
            slotIndex,
            externalUrl: updatedSrc,
            altText,
            scope,
            updateLightbox,
          });
        } catch {
          // ignore if dynamic slot
        }
      }

      const slotType = (existingOverride?.type || 'img') as 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
      const slotLabel = altText || existingOverride?.label || `Slot #${slotIndex + 1}`;
      const slotContext = existingOverride?.sectionContext || 'Updated Slot';
      const slotAlt = altText || existingOverride?.alt || '';

      cmsState.imageOverrides[slotId] = {
        slotId,
        page,
        slotIndex,
        type: slotType,
        label: slotLabel,
        sectionContext: slotContext,
        src: updatedSrc,
        lightboxHref: updatedSrc,
        r2Key,
        alt: slotAlt,
        isDeleted: false,
        updatedAt: new Date().toISOString(),
      };
      await saveCmsState(cmsState);
      if (updatedSrc) {
        await saveSiteImageInFirestore({
          slotId,
          page,
          slotIndex,
          type: slotType,
          label: slotLabel,
          sectionContext: slotContext,
          src: updatedSrc,
          lightboxHref: updatedSrc,
          r2Key,
          alt: slotAlt,
        }).catch(() => {});
      }

      const data = await buildEnrichedImageInventory();
      const updatedSlot = data.slots.find((s) => s.page === page && s.slotIndex === slotIndex);
      return NextResponse.json({
        ok: true,
        updatedSrc,
        cdnUrl: updatedSrc,
        r2Key,
        slot: updatedSlot,
        ...data,
      });
    }

    // JSON body actions (delete-slot, reset, update-slot-meta)
    const body = await req.json();

    if (body.action === 'delete-slot') {
      const page = String(body.page || 'index.html');
      const slotIndex = Number(body.slotIndex || 0);
      const slotId = body.slotId ? String(body.slotId) : makeImageSlotId(page, slotIndex);
      const cmsState = await getCmsState();
      const prevOv = cmsState.imageOverrides[slotId];
      const rawKeyCandidate =
        body.r2Key ||
        prevOv?.r2Key ||
        (prevOv?.src ? extractR2KeyFromCdnUrl(prevOv.src) : undefined);
      const keyToDelete = rawKeyCandidate
        ? extractR2KeyFromCdnUrl(String(rawKeyCandidate)) || String(rawKeyCandidate)
        : undefined;

      cmsState.imageOverrides[slotId] = {
        slotId,
        page,
        slotIndex,
        type: prevOv?.type || body.type || 'img',
        label: prevOv?.label || body.label || `Slot #${slotIndex + 1}`,
        sectionContext: prevOv?.sectionContext || body.sectionContext || 'Page Section',
        src: '',
        lightboxHref: '',
        r2Key: undefined,
        alt: prevOv?.alt || '',
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      };
      await saveCmsState(cmsState);
      await deleteSiteImageInFirestore(slotId).catch(() => {});

      if (keyToDelete && !keyToDelete.startsWith('media/')) {
        const usedByOtherSlot = Object.values(cmsState.imageOverrides).some(
          (ov) =>
            ov &&
            ov.slotId !== slotId &&
            !ov.isDeleted &&
            (ov.r2Key === keyToDelete || (ov.src && ov.src.includes(keyToDelete)))
        );
        const usedBySection = cmsState.sectionGalleryItems.some(
          (sec) => sec.r2Key === keyToDelete || (sec.src && sec.src.includes(keyToDelete))
        );
        if (!usedByOtherSlot && !usedBySection) {
          await deleteR2Object(keyToDelete);
        }
      }

      const data = await buildEnrichedImageInventory();
      return NextResponse.json({ ok: true, slotId, deletedKey: keyToDelete, ...data });
    }

    if (body.action === 'reset') {
      const target = body.target || body.mode || 'slot';
      const cmsState = await getCmsState();
      const r2Index = await loadR2Index();

      if (target === 'all') {
        await resetImageOrSlot({ mode: 'all' });
        cmsState.sectionGalleryItems = [];
        cmsState.imageOverrides = {};
        for (const seedSlot of INITIAL_FIREBASE_SLOT_UPGRADES) {
          cmsState.imageOverrides[seedSlot.slotId] = {
            ...seedSlot,
            src: '',
            lightboxHref: '',
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          };
        }
        r2Index.objects = {};
        await saveR2Index(r2Index);
        await saveCmsState(cmsState);
      } else if (target === 'asset' || target === 'media') {
        const filename = body.assetFilename || body.mediaPath || '';
        const mediaPath = filename.startsWith('assets/media/')
          ? filename
          : `assets/media/${path.basename(filename)}`;
        await resetImageOrSlot({ mode: 'media', mediaPath });
      } else if (target === 'page' && body.page) {
        cmsState.sectionGalleryItems = cmsState.sectionGalleryItems.filter(
          (item) => item.page !== body.page
        );
        for (const [k, ov] of Object.entries(cmsState.imageOverrides)) {
          if (ov && ov.page === body.page) {
            cmsState.imageOverrides[k] = {
              ...ov,
              src: '',
              lightboxHref: '',
              r2Key: undefined,
              isDeleted: true,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        await saveR2Index(r2Index);
        await saveCmsState(cmsState);
      } else if (body.page && typeof body.slotIndex === 'number') {
        const slotId = makeImageSlotId(body.page, body.slotIndex);
        const seedSlot = INITIAL_FIREBASE_SLOT_UPGRADES.find((s) => s.slotId === slotId);
        const existingOv = cmsState.imageOverrides[slotId];
        cmsState.imageOverrides[slotId] = {
          slotId,
          page: body.page,
          slotIndex: body.slotIndex,
          type: existingOv?.type || seedSlot?.type || 'img',
          label: existingOv?.label || seedSlot?.label || `Slot #${body.slotIndex + 1}`,
          sectionContext: existingOv?.sectionContext || seedSlot?.sectionContext || 'Page Section',
          src: '',
          lightboxHref: '',
          r2Key: undefined,
          alt: existingOv?.alt || seedSlot?.alt || '',
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        };
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
      const rawExternalUrl = body.externalUrl ? String(body.externalUrl) : undefined;
      const altText = body.altText !== undefined ? String(body.altText) : undefined;

      const cmsState = await getCmsState();
      const slotId = makeImageSlotId(page, slotIndex);
      const existing = cmsState.imageOverrides[slotId];

      let updatedSrc = rawExternalUrl || existing?.src || '';
      let r2Key = body.r2Key
        ? String(body.r2Key)
        : extractR2KeyFromCdnUrl(updatedSrc) || existing?.r2Key;

      // Never save data: URLs; convert any data: URL to an R2 object and use its R2 CDN link
      if (updatedSrc.startsWith('data:')) {
        const migrated = await putR2ObjectFromDataUrl({
          dataUrl: updatedSrc,
          filenameHint: slotId,
          alt: altText,
          title: altText || slotId,
          page,
        });
        updatedSrc = migrated.cdnUrl;
        r2Key = migrated.r2Key;
      }

      if (updatedSrc && !updatedSrc.startsWith('data:')) {
        try {
          const result = await updatePageSlotImage({
            page,
            slotIndex,
            externalUrl: updatedSrc,
            altText,
            scope: body.scope === 'global' ? 'global' : 'slot',
            updateLightbox: body.updateLightbox !== false,
          });
          updatedSrc = result.updatedSrc || updatedSrc;
        } catch {
          // ignore if dynamic
        }
      }

      const slotType = (body.type || existing?.type || 'img') as 'hero-bg' | 'img' | 'lightbox-img' | 'logo';
      const slotLabel = body.label || existing?.label || altText || `Slot #${slotIndex + 1}`;
      const slotContext = body.sectionContext || existing?.sectionContext || 'Page Section';
      const slotAlt = altText !== undefined ? altText : existing?.alt || '';

      cmsState.imageOverrides[slotId] = {
        slotId,
        page,
        slotIndex,
        type: slotType,
        label: slotLabel,
        sectionContext: slotContext,
        src: updatedSrc,
        lightboxHref: updatedSrc,
        r2Key,
        alt: slotAlt,
        isDeleted: false,
        updatedAt: new Date().toISOString(),
      };
      await saveCmsState(cmsState);
      if (updatedSrc) {
        await saveSiteImageInFirestore({
          slotId,
          page,
          slotIndex,
          type: slotType,
          label: slotLabel,
          sectionContext: slotContext,
          src: updatedSrc,
          lightboxHref: updatedSrc,
          r2Key,
          alt: slotAlt,
        }).catch(() => {});
      }

      const data = await buildEnrichedImageInventory();
      return NextResponse.json({ ok: true, updatedSrc, cdnUrl: updatedSrc, r2Key, ...data });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
