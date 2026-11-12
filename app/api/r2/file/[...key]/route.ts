import { NextRequest, NextResponse } from 'next/server';
import { getR2ObjectBinary } from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await context.params;
    const r2Key = Array.isArray(key) ? key.join('/') : String(key || '');
    if (!r2Key) {
      return new NextResponse('Missing R2 object key', { status: 400 });
    }

    const found = await getR2ObjectBinary(r2Key);
    if (!found) {
      return new NextResponse('R2 object not found', { status: 404 });
    }

    return new NextResponse(new Uint8Array(found.buffer), {
      status: 200,
      headers: {
        'Content-Type': found.mimeType,
        'Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
        'X-R2-Key': found.r2Key,
      },
    });
  } catch {
    return new NextResponse('Failed to serve R2 object', { status: 500 });
  }
}
