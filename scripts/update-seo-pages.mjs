import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://srilankabestsafari.com';
const EMPTY_SLOT_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

const COMMON_KEYWORDS = [
  'Nisha Travelling',
  'Nisha Travelling Sri Lanka',
  'Sri Lanka Travelling',
  'Sri Lanka Private Tours',
  'Sri Lanka Wildlife Tours',
  'Sri Lanka National Park Tours',
  'Hambantota Shore Excursions',
  'Tissamaharama Tours',
];

const PAGE_SEO = {
  'index.html': {
    canonicalPath: '/',
    title: 'Nisha Travelling',
    description:
      'Nisha Travelling offers private Sri Lanka travel experiences, curated wildlife & nature tours, national park expeditions, scenic transfers, and shore excursions across Sri Lanka.',
    keywords: [
      ...COMMON_KEYWORDS,
      'Yala National Park',
      'Udawalawe National Park',
      'Bundala National Park',
      'Wilpattu National Park',
      'Minneriya National Park',
      'Kumana National Park',
    ],
    schemaType: 'TravelAgency',
  },
  'yala-safari.html': {
    canonicalPath: '/yala-safari.html',
    title: 'Nisha Travelling | Yala National Park Expeditions',
    description:
      'Explore Yala National Park with Nisha Travelling. Custom private & shared 4x4 journeys across Sri Lanka with experienced local guides.',
    keywords: [...COMMON_KEYWORDS, 'Yala National Park Tours', 'Yala Wildlife Tours'],
    schemaType: 'TouristTrip',
  },
  'udawalawe-safari.html': {
    canonicalPath: '/udawalawe-safari.html',
    title: 'Nisha Travelling | Udawalawe Elephant Expeditions',
    description:
      'Explore Udawalawe National Park with Nisha Travelling. Private wildlife tours, hotel pickups, and curated Sri Lanka travel itineraries.',
    keywords: [...COMMON_KEYWORDS, 'Udawalawe National Park', 'Udawalawe Tours'],
    schemaType: 'TouristTrip',
  },
  'bundala-birding-safari.html': {
    canonicalPath: '/bundala-birding-safari.html',
    title: 'Nisha Travelling | Bundala Birding & Wetland Tours',
    description:
      'Discover Bundala wetlands with Nisha Travelling. Guided coastal lagoon & bird watching tours across southern Sri Lanka.',
    keywords: [...COMMON_KEYWORDS, 'Bundala National Park', 'Bundala Bird Watching'],
    schemaType: 'TouristTrip',
  },
  'wilpattu-safari.html': {
    canonicalPath: '/wilpattu-safari.html',
    title: 'Nisha Travelling | Wilpattu National Park Tours',
    description:
      'Travel through Wilpattu National Park with Nisha Travelling. Private wildlife journeys across Sri Lanka’s northwest wilderness.',
    keywords: [...COMMON_KEYWORDS, 'Wilpattu National Park', 'Wilpattu Tours'],
    schemaType: 'TouristTrip',
  },
  'minneriya-safari.html': {
    canonicalPath: '/minneriya-safari.html',
    title: 'Nisha Travelling | Minneriya Elephant Gathering Tours',
    description:
      'Experience Minneriya National Park with Nisha Travelling. Private Sri Lanka wildlife and cultural triangle travel packages.',
    keywords: [...COMMON_KEYWORDS, 'Minneriya National Park', 'Minneriya Tours'],
    schemaType: 'TouristTrip',
  },
  'kumana-birding-safari.html': {
    canonicalPath: '/kumana-birding-safari.html',
    title: 'Nisha Travelling | Kumana Wildlife & Birding Tours',
    description:
      'Journey through Kumana National Park with Nisha Travelling. Guided east-coast Sri Lanka wildlife and bird watching expeditions.',
    keywords: [...COMMON_KEYWORDS, 'Kumana National Park', 'Kumana Birding'],
    schemaType: 'TouristTrip',
  },
  'safari-parks.html': {
    canonicalPath: '/safari-parks.html',
    title: 'Nisha Travelling | Sri Lanka Parks & Tour Destinations',
    description:
      'Compare Sri Lanka destinations and national park tours with Nisha Travelling — custom itineraries across the island.',
    keywords: COMMON_KEYWORDS,
    schemaType: 'CollectionPage',
  },
  'about.html': {
    canonicalPath: '/about.html',
    title: 'Nisha Travelling | About Our Sri Lanka Travel Team',
    description:
      'Meet Nisha Travelling — trusted Sri Lanka travel specialists and private 4x4 tour guides offering memorable island journeys since 2002.',
    keywords: [...COMMON_KEYWORDS, 'About Nisha Travelling'],
    schemaType: 'AboutPage',
  },
  'gallery.html': {
    canonicalPath: '/gallery.html',
    title: 'Nisha Travelling | Sri Lanka Travel & Wildlife Gallery',
    description:
      'Explore travel moments, landscapes, and wildlife photography captured with Nisha Travelling across Sri Lanka.',
    keywords: [...COMMON_KEYWORDS, 'Nisha Travelling Gallery'],
    schemaType: 'ImageGallery',
  },
  'reviews.html': {
    canonicalPath: '/reviews.html',
    title: 'Nisha Travelling | Guest Reviews & Stories',
    description:
      'Read verified guest reviews and travel stories from journeys across Sri Lanka with Nisha Travelling.',
    keywords: [...COMMON_KEYWORDS, 'Nisha Travelling Reviews'],
    schemaType: 'WebPage',
  },
  'contact.html': {
    canonicalPath: '/contact.html',
    title: 'Nisha Travelling | Contact & Tour Booking Enquiry',
    description:
      'Contact Nisha Travelling to plan private Sri Lanka tours, airport & port transfers, and custom national park expeditions.',
    keywords: [...COMMON_KEYWORDS, 'Contact Nisha Travelling', 'Nisha Travelling Booking'],
    schemaType: 'ContactPage',
  },
};

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildJsonLd(pageFile, cfg) {
  const canonicalUrl =
    cfg.canonicalPath === '/' ? SITE_URL : `${SITE_URL}${cfg.canonicalPath}`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TravelAgency',
        '@id': `${SITE_BASE_URL_FIX()}#organization`,
        name: 'Nisha Travelling',
        alternateName: ['Nisha Travelling Sri Lanka', 'Sri Lanka Best Safari'],
        url: SITE_URL,
        telephone: '+94717390327',
        email: 'safarinisha@gmail.com',
        foundingDate: '2002',
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'No. 1068/A, Gamunupura',
          addressLocality: 'Tissamaharama',
          addressRegion: 'Southern Province',
          addressCountry: 'LK',
        },
        areaServed: [
          { '@type': 'Place', name: 'Sri Lanka' },
          { '@type': 'Place', name: 'Yala National Park' },
          { '@type': 'Place', name: 'Udawalawe National Park' },
          { '@type': 'Place', name: 'Bundala National Park' },
          { '@type': 'Place', name: 'Wilpattu National Park' },
          { '@type': 'Place', name: 'Minneriya National Park' },
          { '@type': 'Place', name: 'Kumana National Park' },
          { '@type': 'Place', name: 'Tissamaharama' },
          { '@type': 'Place', name: 'Hambantota Port' },
        ],
        knowsAbout: cfg.keywords,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL_FIX()}#website`,
        url: SITE_URL,
        name: 'Nisha Travelling',
        publisher: { '@id': `${SITE_BASE_URL_FIX()}#organization` },
      },
      {
        '@type': cfg.schemaType === 'TouristTrip' ? 'WebPage' : cfg.schemaType,
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: cfg.title,
        description: cfg.description,
        isPartOf: { '@id': `${SITE_BASE_URL_FIX()}#website` },
        about: { '@id': `${SITE_BASE_URL_FIX()}#organization` },
        keywords: cfg.keywords.join(', '),
      },
    ],
  };

  if (cfg.schemaType === 'TouristTrip' || pageFile === 'index.html' || pageFile === 'safari-parks.html') {
    schema['@graph'].push({
      '@type': 'TouristTrip',
      '@id': `${canonicalUrl}#trip`,
      name: cfg.title,
      description: cfg.description,
      touristType: ['Sri Lanka Travel', 'Private Guided Tours', 'Wildlife & Nature Tours', 'Shore Excursions'],
      provider: { '@id': `${SITE_BASE_URL_FIX()}#organization` },
      url: canonicalUrl,
    });
  }

  return JSON.stringify(schema);
}

function SITE_BASE_URL_FIX() {
  return `${SITE_URL}/`;
}

function enrichAndCleanHtmlFile(filePath, pageFile) {
  const cfg = PAGE_SEO[pageFile];
  if (!cfg || !fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf8');

  const canonicalUrl =
    cfg.canonicalPath === '/' ? SITE_URL : `${SITE_URL}${cfg.canonicalPath}`;
  const keywordsStr = cfg.keywords.join(', ');
  const jsonLd = buildJsonLd(pageFile, cfg);

  // 1. Remove any previous injected SEO block
  html = html.replace(/<!-- START_SAFARI_SEO_META -->[\s\S]*?<!-- END_SAFARI_SEO_META -->\n?/g, '');

  // 2. Replace <title>...</title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(cfg.title)}</title>`);

  // 3. Remove legacy meta/icon/preload-image tags
  html = html.replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']keywords["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']sitemap["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["'](?:shortcut\s+)?icon["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']preload["'][^>]*as=["']image["'][^>]*>\s*/gi, '');

  const seoMetaBlock = `<!-- START_SAFARI_SEO_META -->
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png">
<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="96x96" href="/favicon-96x96.png">
<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
<meta name="description" content="${escapeAttr(cfg.description)}">
<meta name="keywords" content="${escapeAttr(keywordsStr)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nisha Travelling">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${escapeAttr(cfg.title)}">
<meta property="og:description" content="${escapeAttr(cfg.description)}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(cfg.title)}">
<meta name="twitter:description" content="${escapeAttr(cfg.description)}">
<script type="application/ld+json" id="safari-seo-schema">${jsonLd}</script>
<!-- END_SAFARI_SEO_META -->`;

  html = html.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n${seoMetaBlock}`);

  // 4. Strip all saved local image paths (/assets/media/..., /assets/aistudio/..., /assets/r2-bucket/...)
  html = html.replace(
    /background-image:\s*url\((?:&quot;|"|')?\/?assets\/(?:media|aistudio|r2-bucket)\/[^"')&\s]+(?:&quot;|"|')?\)/gi,
    'background-image: url(data:image/svg+xml,%3Csvg/%3E)'
  );
  html = html.replace(
    /(\bsrc=)(["'])\/?assets\/(?:media|aistudio|r2-bucket)\/[^"']+\2/gi,
    `$1"${EMPTY_SLOT_DATA_URI}"`
  );
  html = html.replace(
    /(\bhref=)(["'])\/?assets\/(?:media|aistudio|r2-bucket)\/[^"']+\2/gi,
    `$1"${EMPTY_SLOT_DATA_URI}"`
  );
  // Clean stale alt="... - Nisha Safari Sri Lanka" on empty slots
  html = html.replace(
    /<img\b([^>]*\bsrc="data:image\/svg\+xml[^"]*"[^>]*)>/gi,
    (tag) => tag.replace(/\balt=(["'])[^"']*\1/i, 'alt=""')
  );

  fs.writeFileSync(filePath, html, 'utf8');
}

const publicDir = path.join(process.cwd(), 'public');
for (const pageFile of Object.keys(PAGE_SEO)) {
  enrichAndCleanHtmlFile(path.join(publicDir, pageFile), pageFile);
}

console.log('Updated Nisha Travelling SEO meta & stripped all saved image paths across all 12 public HTML files.');
