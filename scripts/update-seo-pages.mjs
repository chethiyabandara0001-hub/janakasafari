import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://srilankabestsafari.com';

const PRIORITY_KEYWORDS = [
  'Yala Safari',
  'Yala National Park Safari',
  'Yala Safari Tours',
  'Sri Lanka Safari Tours',
  'Yala Safari Booking',
  'Yala National Park Jeep Safari',
  'Best Yala Safari Tour',
  'Yala Safari Price',
  'Yala Safari Packages',
  'Yala Leopard Safari',
  'Private Yala Safari',
  'Yala Morning Safari',
  'Yala Afternoon Safari',
  'Yala Full Day Safari',
  'Yala Safari from Tissamaharama',
  'Yala Safari from Kataragama',
  'Hambantota Port Yala Safari',
  'Yala Safari Shore Excursion',
  'Udawalawe National Park Safari',
  'Bundala National Park Safari',
  'Wilpattu National Park Safari',
  'Minneriya Elephant Safari',
  'Sri Lanka Wildlife Safari',
  'Yala Safari Jeep Tour',
  'Hambantota Shore Excursion',
];

const PARK_CLUSTERS = {
  yala: [
    'Yala National Park',
    'Yala National Park Safari',
    'Yala Safari Tours',
    'Yala Jeep Safari',
    'Yala Leopard Safari',
    'Yala Safari Price',
    'Yala Morning Safari',
    'Yala Full Day Safari',
    'Yala share safari',
    'Yala national park share safari',
  ],
  udawalawe: [
    'Udawalawe National Park',
    'Udawalawe National Park Safari',
    'Udawalawe Safari Tours',
    'Udawalawe Elephant Safari',
    'Udawalawe Jeep Safari',
    'Udawalawe Safari Price',
    'Udawalawe Private Safari',
    'Udawalawe Safari Booking',
  ],
  bundala: [
    'Bundala National Park',
    'Bundala National Park Safari',
    'Bundala Safari Tours',
    'Bundala Bird Watching Safari',
    'Bundala Jeep Safari',
    'Bundala Wildlife Safari',
    'Bundala Private Safari',
  ],
  wilpattu: [
    'Wilpattu National Park',
    'Wilpattu National Park Safari',
    'Wilpattu Safari Tours',
    'Wilpattu Leopard Safari',
    'Wilpattu Jeep Safari',
    'Wilpattu Safari Price',
    'Wilpattu Private Safari',
  ],
  minneriya: [
    'Minneriya National Park',
    'Minneriya National Park Safari',
    'Minneriya Elephant Safari',
    'Minneriya Safari Tours',
    'Minneriya Jeep Safari',
    'Minneriya Elephant Gathering',
    'Minneriya Safari Price',
    'Minneriya Private Safari',
  ],
  kumana: [
    'Kumana National Park',
    'Kumana National Park Safari',
    'Kumana Safari Tours',
    'Kumana Bird Watching Safari',
    'Kumana Jeep Safari',
    'Kumana Wildlife Safari',
    'Kumana Private Safari',
  ],
};

const ALL_PARK_KEYWORDS = Object.values(PARK_CLUSTERS).flat();

function uniq(arr) {
  return Array.from(new Set(arr));
}

const PAGE_SEO = {
  'index.html': {
    canonicalPath: '/',
    title: 'Yala Safari | Yala National Park Safari & Sri Lanka Safari Tours | Nisha Safari',
    description:
      'Book your Yala Safari & Yala National Park Jeep Safari with Nisha Safari. Private Yala Safari, Yala Morning Safari, Yala Full Day Safari, Udawalawe, Wilpattu, Minneriya, Bundala & Hambantota Shore Excursions.',
    keywords: uniq([...PRIORITY_KEYWORDS, ...ALL_PARK_KEYWORDS]),
    ogImage: `${SITE_URL}/api/r2/file/slots/index_html__slot_1.jpg`,
    schemaType: 'TravelAgency',
  },
  'yala-safari.html': {
    canonicalPath: '/yala-safari.html',
    title:
      'Yala National Park Safari | Yala Safari Tours, Price & Jeep Booking | Nisha Safari',
    description:
      'Official Yala National Park Safari & Yala Leopard Safari tours from Tissamaharama, Kataragama & Hambantota Port. Private Yala Safari, Yala Morning Safari, Afternoon, Full Day & Yala Share Safari packages.',
    keywords: uniq([...PARK_CLUSTERS.yala, ...PRIORITY_KEYWORDS]),
    ogImage: `${SITE_URL}/api/r2/file/slots/yala-safari_html__slot_1.jpg`,
    schemaType: 'TouristTrip',
  },
  'udawalawe-safari.html': {
    canonicalPath: '/udawalawe-safari.html',
    title:
      'Udawalawe National Park Safari | Udawalawe Elephant & Jeep Safari Tours | Nisha Safari',
    description:
      'Experience Udawalawe National Park Safari with Nisha Safari. Private Udawalawe Elephant Safari, Udawalawe Jeep Safari, transparent Udawalawe Safari Price, and online Udawalawe Safari Booking.',
    keywords: uniq([
      ...PARK_CLUSTERS.udawalawe,
      'Udawalawe National Park Safari',
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
      'Yala Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/udawalawe-safari_html__slot_1.jpg`,
    schemaType: 'TouristTrip',
  },
  'bundala-birding-safari.html': {
    canonicalPath: '/bundala-birding-safari.html',
    title:
      'Bundala National Park Safari | Bundala Bird Watching & Jeep Safari Tours | Nisha Safari',
    description:
      'Book a guided Bundala National Park Safari & Bundala Bird Watching Safari near Tissamaharama and Hambantota Port. Private Bundala Jeep Safari and wetland wildlife tours.',
    keywords: uniq([
      ...PARK_CLUSTERS.bundala,
      'Bundala National Park Safari',
      'Hambantota Shore Excursion',
      'Sri Lanka Wildlife Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/bundala-birding-safari_html__slot_1.jpg`,
    schemaType: 'TouristTrip',
  },
  'wilpattu-safari.html': {
    canonicalPath: '/wilpattu-safari.html',
    title:
      'Wilpattu National Park Safari | Wilpattu Leopard & Private Jeep Safari | Nisha Safari',
    description:
      'Explore Sri Lanka’s largest park with our Wilpattu National Park Safari. Private Wilpattu Leopard Safari, Wilpattu Jeep Safari, transparent Wilpattu Safari Price & full-day tours.',
    keywords: uniq([
      ...PARK_CLUSTERS.wilpattu,
      'Wilpattu National Park Safari',
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/wilpattu-safari_html__slot_1.jpg`,
    schemaType: 'TouristTrip',
  },
  'minneriya-safari.html': {
    canonicalPath: '/minneriya-safari.html',
    title:
      'Minneriya Elephant Safari | Minneriya National Park Jeep Safari & Gathering | Nisha Safari',
    description:
      'Witness the famous Minneriya Elephant Gathering on a Minneriya National Park Safari. Book Private Minneriya Jeep Safari tours with transparent Minneriya Safari Price.',
    keywords: uniq([
      ...PARK_CLUSTERS.minneriya,
      'Minneriya Elephant Safari',
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/minneriya-safari_html__slot_1.jpg`,
    schemaType: 'TouristTrip',
  },
  'kumana-birding-safari.html': {
    canonicalPath: '/kumana-birding-safari.html',
    title:
      'Kumana National Park Safari | Kumana Bird Watching & Wildlife Jeep Safari | Nisha Safari',
    description:
      'Discover Yala East on a Kumana National Park Safari. Guided Kumana Bird Watching Safari, Kumana Jeep Safari, and Kumana Private Safari tours in Sri Lanka.',
    keywords: uniq([
      ...PARK_CLUSTERS.kumana,
      'Sri Lanka Wildlife Safari',
      'Sri Lanka Safari Tours',
      'Yala Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/kumana-birding-safari_html__slot_1.jpg`,
    schemaType: 'TouristTrip',
  },
  'safari-parks.html': {
    canonicalPath: '/safari-parks.html',
    title:
      'Sri Lanka Safari Tours | Yala, Udawalawe, Wilpattu, Minneriya, Bundala & Kumana | Nisha Safari',
    description:
      'Compare and book Sri Lanka Safari Tours across Yala National Park, Udawalawe National Park, Bundala National Park, Wilpattu National Park, Minneriya National Park & Kumana National Park.',
    keywords: uniq([...PRIORITY_KEYWORDS, ...ALL_PARK_KEYWORDS]),
    ogImage: `${SITE_URL}/api/r2/file/slots/safari-parks_html__slot_1.jpg`,
    schemaType: 'CollectionPage',
  },
  'about.html': {
    canonicalPath: '/about.html',
    title: 'Best Yala Safari Tour Operator Since 2002 | About Nisha Safari Jeep Tours',
    description:
      'Meet Nisha Safari — trusted local trackers for Yala National Park Jeep Safari, Private Yala Safari, Yala Leopard Safari, and Sri Lanka Wildlife Safari tours since 2002.',
    keywords: uniq([
      'Best Yala Safari Tour',
      'Yala Safari',
      'Yala National Park Jeep Safari',
      'Private Yala Safari',
      'Yala Leopard Safari',
      'Yala Safari from Tissamaharama',
      'Yala Safari from Kataragama',
      'Hambantota Port Yala Safari',
      'Sri Lanka Wildlife Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/about_html__slot_1.jpg`,
    schemaType: 'AboutPage',
  },
  'gallery.html': {
    canonicalPath: '/gallery.html',
    title: 'Yala Leopard Safari & Sri Lanka Wildlife Safari Photo Gallery | Nisha Safari',
    description:
      'Authentic wildlife photography from our Yala Leopard Safari, Udawalawe Elephant Safari, Minneriya Elephant Gathering, Wilpattu National Park Safari & Bundala Bird Watching Safari.',
    keywords: uniq([
      'Yala Leopard Safari',
      'Sri Lanka Wildlife Safari',
      'Yala National Park Safari',
      'Udawalawe Elephant Safari',
      'Minneriya Elephant Gathering',
      'Bundala Bird Watching Safari',
      'Wilpattu Leopard Safari',
      'Kumana Bird Watching Safari',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/gallery_html__slot_1.jpg`,
    schemaType: 'ImageGallery',
  },
  'reviews.html': {
    canonicalPath: '/reviews.html',
    title: 'Best Yala Safari Tour Reviews | Private Yala Safari & Shore Excursion Guests',
    description:
      'Read verified guest reviews for our Yala National Park Jeep Safari, Private Yala Safari, Yala Full Day Safari, Hambantota Port Yala Safari & Sri Lanka Safari Tours.',
    keywords: uniq([
      'Best Yala Safari Tour',
      'Yala Safari Tours',
      'Yala National Park Safari',
      'Private Yala Safari',
      'Hambantota Port Yala Safari',
      'Yala Safari Shore Excursion',
      'Sri Lanka Safari Tours',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/reviews_html__slot_1.jpg`,
    schemaType: 'WebPage',
  },
  'contact.html': {
    canonicalPath: '/contact.html',
    title:
      'Yala Safari Booking & Price Enquiry | Tissamaharama, Kataragama & Hambantota Port | Nisha Safari',
    description:
      'Contact Nisha Safari for Yala Safari Booking, Yala Safari Price, Yala Share Safari, Yala Safari from Tissamaharama, Kataragama, and Hambantota Shore Excursion pickups.',
    keywords: uniq([
      'Yala Safari Booking',
      'Yala Safari Price',
      'Yala Safari Packages',
      'Yala Safari from Tissamaharama',
      'Yala Safari from Kataragama',
      'Hambantota Port Yala Safari',
      'Yala Safari Shore Excursion',
      'Hambantota Shore Excursion',
      'Yala share safari',
      'Yala national park share safari',
      'Udawalawe Safari Booking',
    ]),
    ogImage: `${SITE_URL}/api/r2/file/slots/contact_html__slot_1.jpg`,
    schemaType: 'ContactPage',
  },
};

const LINK_TITLES = {
  'index.html': 'Yala Safari & Sri Lanka Safari Tours Home',
  'yala-safari.html':
    'Yala National Park Safari · Yala Leopard Safari · Yala Morning, Afternoon, Full Day & Share Safari',
  'udawalawe-safari.html':
    'Udawalawe National Park Safari · Udawalawe Elephant Safari & Private Jeep Tours',
  'bundala-birding-safari.html':
    'Bundala National Park Safari · Bundala Bird Watching Safari & Jeep Tours',
  'wilpattu-safari.html':
    'Wilpattu National Park Safari · Wilpattu Leopard Safari & Private Jeep Tours',
  'minneriya-safari.html':
    'Minneriya National Park Safari · Minneriya Elephant Safari & Gathering',
  'kumana-birding-safari.html':
    'Kumana National Park Safari · Kumana Bird Watching & Wildlife Jeep Safari',
  'safari-parks.html':
    'Sri Lanka Safari Tours · Yala, Udawalawe, Bundala, Wilpattu, Minneriya & Kumana National Parks',
  'about.html': 'Best Yala Safari Tour Operator Since 2002 · About Nisha Safari',
  'gallery.html': 'Yala Leopard Safari & Sri Lanka Wildlife Safari Photo Gallery',
  'reviews.html': 'Best Yala Safari Tour Reviews & Guest Testimonials',
  'contact.html':
    'Yala Safari Booking & Price · Tissamaharama, Kataragama & Hambantota Shore Excursion',
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
        '@id': `${SITE_URL}/#organization`,
        name: 'Nisha Safari Jeep Tours',
        alternateName: [
          'Sri Lanka Best Safari',
          'Yala National Park Safari Tours',
          'Nisha Safari Yala',
        ],
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
          { '@type': 'Place', name: 'Yala National Park' },
          { '@type': 'Place', name: 'Udawalawe National Park' },
          { '@type': 'Place', name: 'Bundala National Park' },
          { '@type': 'Place', name: 'Wilpattu National Park' },
          { '@type': 'Place', name: 'Minneriya National Park' },
          { '@type': 'Place', name: 'Kumana National Park' },
          { '@type': 'Place', name: 'Tissamaharama' },
          { '@type': 'Place', name: 'Kataragama' },
          { '@type': 'Place', name: 'Hambantota Port' },
        ],
        knowsAbout: cfg.keywords,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Nisha Safari - Yala National Park Safari & Sri Lanka Safari Tours',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': cfg.schemaType === 'TouristTrip' ? 'WebPage' : cfg.schemaType,
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: cfg.title,
        description: cfg.description,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#organization` },
        keywords: cfg.keywords.join(', '),
      },
    ],
  };

  if (cfg.schemaType === 'TouristTrip' || pageFile === 'index.html' || pageFile === 'safari-parks.html') {
    schema['@graph'].push({
      '@type': 'TouristTrip',
      '@id': `${canonicalUrl}#safari-trip`,
      name: cfg.title.split('|')[0].trim(),
      description: cfg.description,
      touristType: [
        'Wildlife Safari',
        'Private Jeep Safari',
        'Shared Safari',
        'Shore Excursion',
        'Leopard & Elephant Photography Safari',
      ],
      provider: { '@id': `${SITE_URL}/#organization` },
      url: canonicalUrl,
    });
  }

  return JSON.stringify(schema);
}

function enrichHtmlFile(filePath, pageFile) {
  const cfg = PAGE_SEO[pageFile];
  if (!cfg || !fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf8');

  const canonicalUrl =
    cfg.canonicalPath === '/' ? SITE_URL : `${SITE_URL}${cfg.canonicalPath}`;
  const keywordsStr = cfg.keywords.join(', ');
  const jsonLd = buildJsonLd(pageFile, cfg);

  // 1. Remove any previous injected SEO block so running this script is idempotent
  html = html.replace(/<!-- START_SAFARI_SEO_META -->[\s\S]*?<!-- END_SAFARI_SEO_META -->\n?/g, '');

  // 2. Replace <title>...</title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(cfg.title)}</title>`);

  // 3. Remove any standalone legacy description/keywords/favicon tags outside our block
  html = html.replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']keywords["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']sitemap["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["'](?:shortcut\s+)?icon["'][^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>\s*/gi, '');

  const faviconPath = '/assets/aistudio/images__8_-removebg-preview__1__c2145e28.png';

  const seoMetaBlock = `<!-- START_SAFARI_SEO_META -->
<link rel="icon" type="image/png" sizes="96x96" href="${faviconPath}">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png">
<link rel="shortcut icon" type="image/png" href="${faviconPath}">
<link rel="apple-touch-icon" sizes="96x96" href="${faviconPath}">
<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
<meta name="description" content="${escapeAttr(cfg.description)}">
<meta name="keywords" content="${escapeAttr(keywordsStr)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nisha Safari - Yala &amp; Sri Lanka Safari Tours">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${escapeAttr(cfg.title)}">
<meta property="og:description" content="${escapeAttr(cfg.description)}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta property="og:image" content="${escapeAttr(cfg.ogImage)}">
<meta property="og:image:alt" content="${escapeAttr(cfg.title.split('|')[0].trim())}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(cfg.title)}">
<meta name="twitter:description" content="${escapeAttr(cfg.description)}">
<meta name="twitter:image" content="${escapeAttr(cfg.ogImage)}">
<script type="application/ld+json" id="safari-seo-schema">${jsonLd}</script>
<!-- END_SAFARI_SEO_META -->`;

  // Inject right after <title>...</title>
  html = html.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n${seoMetaBlock}`);

  // 4. Enrich generic alt="Picture" or empty alt="" on <img> elements with priority SEO keywords
  // (Does NOT add or remove any <img> tags, preserving 100% of slot indices)
  let imgCounter = 0;
  html = html.replace(/<img\b([^>]*?)>/gi, (fullTag, attrs) => {
    const altMatch = attrs.match(/\balt=(["'])(.*?)\1/i);
    const currentAlt = altMatch ? altMatch[2].trim() : '';
    if (!currentAlt || currentAlt.toLowerCase() === 'picture' || currentAlt.toLowerCase() === 'image') {
      const kw = cfg.keywords[imgCounter % cfg.keywords.length] || 'Yala National Park Safari';
      imgCounter++;
      const seoAlt = `${kw} - Nisha Safari Sri Lanka`;
      if (altMatch) {
        return fullTag.replace(/\balt=(["'])(.*?)\1/i, `alt="${escapeAttr(seoAlt)}"`);
      } else {
        return `<img alt="${escapeAttr(seoAlt)}"${attrs}>`;
      }
    }
    return fullTag;
  });

  // 5. Add descriptive title attributes to internal links for in-page SEO
  html = html.replace(/<a\b([^>]*?\bhref=(["'])([^"']+\.html)\2[^>]*)>/gi, (fullTag, attrs, _q, hrefVal) => {
    if (/\btitle=/i.test(attrs)) return fullTag;
    const cleanHref = hrefVal.replace(/^\/+/, '');
    const linkTitle = LINK_TITLES[cleanHref];
    if (!linkTitle) return fullTag;
    return `<a title="${escapeAttr(linkTitle)}"${attrs}>`;
  });

  fs.writeFileSync(filePath, html, 'utf8');
}

const publicDir = path.join(process.cwd(), 'public');
const defaultsDir = path.join(publicDir, 'assets', 'html-defaults');
const uploadedFavicon = path.join(
  publicDir,
  'assets',
  'aistudio',
  'images__8_-removebg-preview__1__c2145e28.png'
);

if (fs.existsSync(uploadedFavicon)) {
  fs.copyFileSync(uploadedFavicon, path.join(publicDir, 'favicon.png'));
  fs.copyFileSync(uploadedFavicon, path.join(publicDir, 'favicon-96x96.png'));
  fs.copyFileSync(uploadedFavicon, path.join(publicDir, 'favicon.ico'));
}

for (const pageFile of Object.keys(PAGE_SEO)) {
  enrichHtmlFile(path.join(publicDir, pageFile), pageFile);
  enrichHtmlFile(path.join(defaultsDir, pageFile), pageFile);
}

console.log('Successfully updated 96x96 favicon, <link rel="sitemap">, SEO meta tags, JSON-LD, and alt/title attributes across all 12 pages.');
