import { NextRequest, NextResponse } from 'next/server';
import { getAllSiteImages } from '@/lib/image-manager';
import { makeImageSlotId } from '@/lib/text-manager';
import {
  DEFAULT_R2_BUCKET_NAME,
  getR2ConfigStatus,
  listR2Objects,
  putR2Object,
  putR2ObjectFromDataUrl,
  deleteR2Object,
} from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [{ slots, pages }, r2Objects] = await Promise.all([
      getAllSiteImages(),
      listR2Objects(),
    ]);
    const r2Status = getR2ConfigStatus();

    return NextResponse.json(
      {
        bucketName: DEFAULT_R2_BUCKET_NAME,
        r2Status,
        slots,
        r2Objects,
        pages,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load site images schema';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const page = String(formData.get('page') || 'index.html');
      const slotIndex = Number(formData.get('slotIndex') || 0);
      const slotId = makeImageSlotId(page, slotIndex);
      const altText =
        formData.get('altText') !== null ? String(formData.get('altText')) : undefined;
      const replaceKey = formData.get('replaceKey')
        ? String(formData.get('replaceKey'))
        : undefined;
      const file = formData.get('file') as File | null;

      if (!file || file.size === 0) {
        return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const record = await putR2Object({
        buffer,
        originalFilename: file.name,
        mimeType: file.type || undefined,
        replaceKey: replaceKey || `slots/${slotId}`,
        alt: altText,
        title: altText || file.name,
        page,
      });

      const [{ slots, pages }, r2Objects] = await Promise.all([
        getAllSiteImages(),
        listR2Objects(),
      ]);

      return NextResponse.json({
        ok: true,
        slotId,
        r2Key: record.r2Key,
        cdnUrl: record.cdnUrl,
        sizeBytes: record.sizeBytes,
        mimeType: record.mimeType,
        slots,
        r2Objects,
        pages,
      });
    }

    const body = await req.json();

    if (body.action === 'delete-r2-key' && body.r2Key) {
      const res = await deleteR2Object(String(body.r2Key));
      const r2Objects = await listR2Objects();
      return NextResponse.json({ ok: true, deletedKey: res.deletedKey, r2Objects });
    }

    if (body.action === 'upload-data-url' && typeof body.dataUrl === 'string') {
      const page = String(body.page || 'index.html');
      const slotId = body.slotId ? String(body.slotId) : `slot_${Date.now()}`;
      const record = await putR2ObjectFromDataUrl({
        dataUrl: body.dataUrl,
        filenameHint: slotId,
        alt: body.altText ? String(body.altText) : undefined,
        title: body.altText ? String(body.altText) : slotId,
        page,
      });
      const r2Objects = await listR2Objects();
      return NextResponse.json({
        ok: true,
        r2Key: record.r2Key,
        cdnUrl: record.cdnUrl,
        r2Objects,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process image action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
