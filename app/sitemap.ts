import type { MetadataRoute } from 'next';
import { PAGE_SEO_CONFIG, SITE_BASE_URL } from '@/lib/seo-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return Object.values(PAGE_SEO_CONFIG).map((entry) => ({
    url: `${SITE_BASE_URL}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
