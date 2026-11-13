import { NextResponse } from 'next/server';
import { getAllSiteTexts } from '@/lib/text-manager';

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
    const message = err instanceof Error ? err.message : 'Failed to load page text templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
