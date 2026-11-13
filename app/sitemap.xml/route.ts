import { NextRequest, NextResponse } from 'next/server';
import { PAGE_SEO_CONFIG, SITE_BASE_URL } from '@/lib/seo-config';

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

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(req: NextRequest) {
  const baseUrl = resolveBaseDomain(req);
  const lastMod = new Date().toISOString();

  const entries: string[] = [];

  for (const cfg of Object.values(PAGE_SEO_CONFIG)) {
    const loc = cfg.path === '/' ? `${baseUrl}/` : `${baseUrl}${cfg.path}`;
    entries.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${cfg.changeFrequency}</changefreq>
    <priority>${cfg.priority.toFixed(1)}</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
