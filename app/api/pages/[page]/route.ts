import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE_PAGES } from '@/lib/image-manager';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ page: string }> }
) {
  try {
    const { page } = await context.params;
    const targetFile = page.endsWith('.html') ? page : `${page}.html`;
    const isKnown = SITE_PAGES.some((p) => p.file === targetFile);
    if (!isKnown) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'public', targetFile);
    const html = await fs.readFile(filePath, 'utf8');

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
