import { NextRequest, NextResponse } from 'next/server';
import { SITE_BASE_URL } from '@/lib/seo-config';

export const dynamic = 'force-dynamic';

function resolveBaseDomain(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = (forwardedHost || req.headers.get('host') || '').split(',')[0].trim();
  if (!host || host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return SITE_BASE_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const scheme = proto === 'http' && !host.includes('srilankabestsafari.com') ? 'http' : 'https';
  return `${scheme}://${host}`.replace(/\/+$/, '');
}

export async function GET(req: NextRequest) {
  const baseUrl = resolveBaseDomain(req);

  const robotsTxt = `User-agent: *
Allow: /
Allow: /assets/
Allow: /api/r2/file/
Allow: /api/media/
Disallow: /admin
Disallow: /api/admin/

User-agent: Googlebot
Allow: /
Allow: /assets/
Allow: /api/r2/file/
Allow: /api/media/
Disallow: /admin
Disallow: /api/admin/

User-agent: Googlebot-Image
Allow: /
Allow: /assets/
Allow: /api/r2/file/
Allow: /api/media/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
