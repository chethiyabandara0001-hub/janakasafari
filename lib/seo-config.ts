export interface PageSeoEntry {
  file: string;
  path: string;
  title: string;
  description: string;
  keywords: string[];
  h1Label: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  jsonLd: Record<string, unknown>[];
}

export const SITE_BASE_URL = 'https://srilankabestsafari.com';
export const BRAND_NAME = 'Nisha Safari';

export const PRIORITY_SEO_KEYWORDS = [
  { rank: 1, keyword: 'Nisha Safari', priority: 'Very High' },
  { rank: 2, keyword: 'Nisha Safari Sri Lanka', priority: 'Very High' },
  { rank: 3, keyword: 'Sri Lanka Safari Tours', priority: 'Very High' },
  { rank: 4, keyword: 'Yala National Park Safari', priority: 'Very High' },
  { rank: 5, keyword: 'Sri Lanka Wildlife Safaris', priority: 'Very High' },
  { rank: 6, keyword: 'Private Sri Lanka Safaris', priority: 'High' },
  { rank: 7, keyword: 'Sri Lanka National Park Tours', priority: 'High' },
  { rank: 8, keyword: 'Comfortable 4x4 Safari Jeeps', priority: 'High' },
  { rank: 9, keyword: 'Udawalawe National Park Safari', priority: 'High' },
  { rank: 10, keyword: 'Bundala Bird Watching Safari', priority: 'High' },
  { rank: 11, keyword: 'Wilpattu National Park Safari', priority: 'High' },
  { rank: 12, keyword: 'Minneriya Elephant Safari', priority: 'High' },
  { rank: 13, keyword: 'Kumana National Park Safari', priority: 'High' },
  { rank: 14, keyword: 'Hambantota Shore Excursions', priority: 'High' },
  { rank: 15, keyword: 'Nisha Taxi Service Sri Lanka', priority: 'High' },
] as const;

export const PARK_SEO_CLUSTERS = {
  yala: [
    'Nisha Safari Yala',
    'Yala National Park Safari',
    'Yala Safari Tours',
    'Yala Jeep Safari',
    'Yala Leopard Safari',
    'Private Yala Safari',
  ],
  udawalawe: [
    'Nisha Safari Udawalawe',
    'Udawalawe National Park Safari',
    'Udawalawe Elephant Safari',
    'Udawalawe Private Safari',
  ],
  bundala: [
    'Nisha Safari Bundala',
    'Bundala National Park Safari',
    'Bundala Bird Watching Safari',
    'Bundala Wildlife Safaris',
  ],
  wilpattu: [
    'Nisha Safari Wilpattu',
    'Wilpattu National Park Safari',
    'Wilpattu Leopard Safari',
    'Wilpattu Private Safari',
  ],
  minneriya: [
    'Nisha Safari Minneriya',
    'Minneriya National Park Safari',
    'Minneriya Elephant Gathering',
    'Minneriya Private Safari',
  ],
  kumana: [
    'Nisha Safari Kumana',
    'Kumana National Park Safari',
    'Kumana Bird Watching Safari',
    'Kumana Private Safari',
  ],
} as const;

export const ALL_SEO_KEYWORDS_LIST: string[] = Array.from(
  new Set([
    ...PRIORITY_SEO_KEYWORDS.map((k) => k.keyword),
    ...PARK_SEO_CLUSTERS.yala,
    ...PARK_SEO_CLUSTERS.udawalawe,
    ...PARK_SEO_CLUSTERS.bundala,
    ...PARK_SEO_CLUSTERS.wilpattu,
    ...PARK_SEO_CLUSTERS.minneriya,
    ...PARK_SEO_CLUSTERS.kumana,
  ])
);

const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': ['TravelAgency', 'LocalBusiness'],
  '@id': `${SITE_BASE_URL}/#organization`,
  name: 'Nisha Safari',
  alternateName: 'Nisha Safari Sri Lanka',
  url: SITE_BASE_URL,
  logo: `${SITE_BASE_URL}/favicon-96x96.png`,
  description:
    'Nisha Safari offers private Sri Lanka safaris in comfortable 4×4 safari jeeps, curated wildlife & nature tours, national park expeditions, Nisha Taxi Service transfers, and Hambantota shore excursions. Our own business since 2006.',
  telephone: '+94788729414',
  email: 'nishasafari@gmail.com',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Tissamaharama',
    addressRegion: 'Southern Province',
    addressCountry: 'LK',
  },
  areaServed: [
    'Sri Lanka',
    'Yala National Park',
    'Udawalawe National Park',
    'Bundala National Park',
    'Wilpattu National Park',
    'Minneriya National Park',
    'Kumana National Park',
    'Tissamaharama',
    'Hambantota Port',
  ],
};

export const PAGE_SEO_CONFIG: Record<string, PageSeoEntry> = {
  'index.html': {
    file: 'index.html',
    path: '/',
    title: 'Sri Lanka Safari Tours | Nisha Safari – Yala & Beyond',
    description:
      'Nisha Safari offers private Sri Lanka safaris in comfortable 4×4 safari jeeps across Yala, Udawalawe, Bundala, Wilpattu, Minneriya, and Kumana. Our own business since 2006.',
    keywords: ALL_SEO_KEYWORDS_LIST,
    h1Label: 'Nisha Safari — Sri Lanka Safari Tours',
    priority: 1.0,
    changeFrequency: 'daily',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL}/#website`,
        url: SITE_BASE_URL,
        name: 'Nisha Safari',
        keywords: ALL_SEO_KEYWORDS_LIST.join(', '),
        publisher: { '@id': `${SITE_BASE_URL}/#organization` },
      },
    ],
  },
  'yala-safari.html': {
    file: 'yala-safari.html',
    path: '/yala-safari.html',
    title: 'Nisha Safari | Yala National Park Expeditions',
    description:
      'Explore Yala National Park with Nisha Safari. Custom private & shared comfortable 4×4 safari jeeps across Sri Lanka with experienced local guides.',
    keywords: [...PARK_SEO_CLUSTERS.yala, 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Yala National Park Expeditions',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'udawalawe-safari.html': {
    file: 'udawalawe-safari.html',
    path: '/udawalawe-safari.html',
    title: 'Nisha Safari | Udawalawe Elephant Expeditions',
    description:
      'Explore Udawalawe National Park with Nisha Safari. Comfortable 4×4 safari jeeps, private wildlife tours, hotel pickups, and curated Sri Lanka itineraries.',
    keywords: [...PARK_SEO_CLUSTERS.udawalawe, 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Udawalawe Expeditions',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'bundala-birding-safari.html': {
    file: 'bundala-birding-safari.html',
    path: '/bundala-birding-safari.html',
    title: 'Nisha Safari | Bundala Birding & Wetland Tours',
    description:
      'Discover Bundala wetlands with Nisha Safari. Guided coastal lagoon & bird watching safaris in comfortable 4×4 safari jeeps across southern Sri Lanka.',
    keywords: [...PARK_SEO_CLUSTERS.bundala, 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Bundala Birding Tours',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'wilpattu-safari.html': {
    file: 'wilpattu-safari.html',
    path: '/wilpattu-safari.html',
    title: 'Nisha Safari | Wilpattu National Park Tours',
    description:
      'Explore Wilpattu National Park with Nisha Safari. Private wildlife safaris in comfortable 4×4 safari jeeps across Sri Lanka’s northwest wilderness.',
    keywords: [...PARK_SEO_CLUSTERS.wilpattu, 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Wilpattu Expeditions',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'minneriya-safari.html': {
    file: 'minneriya-safari.html',
    path: '/minneriya-safari.html',
    title: 'Nisha Safari | Minneriya Elephant Gathering Tours',
    description:
      'Experience Minneriya National Park with Nisha Safari. Private Sri Lanka wildlife safaris in comfortable 4×4 safari jeeps around Minneriya Reservoir.',
    keywords: [...PARK_SEO_CLUSTERS.minneriya, 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Minneriya Expeditions',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'kumana-birding-safari.html': {
    file: 'kumana-birding-safari.html',
    path: '/kumana-birding-safari.html',
    title: 'Nisha Safari | Kumana Wildlife & Birding Tours',
    description:
      'Journey through Kumana National Park with Nisha Safari. Guided east-coast Sri Lanka wildlife and bird watching safaris in comfortable 4×4 safari jeeps.',
    keywords: [...PARK_SEO_CLUSTERS.kumana, 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Kumana Expeditions',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'safari-parks.html': {
    file: 'safari-parks.html',
    path: '/safari-parks.html',
    title: 'Nisha Safari | Sri Lanka Parks & Tour Destinations',
    description:
      'Compare Sri Lanka destinations and national park safaris with Nisha Safari — comfortable 4×4 safari jeeps and custom itineraries across the island.',
    keywords: ALL_SEO_KEYWORDS_LIST,
    h1Label: 'Nisha Safari — Sri Lanka Destinations',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'about.html': {
    file: 'about.html',
    path: '/about.html',
    title: 'Nisha Safari | About Our Sri Lanka Safari Team',
    description:
      'Meet Nisha Safari — trusted Sri Lanka wildlife specialists and private 4×4 safari jeep guides. Our own business since 2006.',
    keywords: ['Nisha Safari', 'About Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'About Nisha Safari',
    priority: 0.8,
    changeFrequency: 'monthly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'gallery.html': {
    file: 'gallery.html',
    path: '/gallery.html',
    title: 'Nisha Safari | Sri Lanka Safari & Wildlife Gallery',
    description:
      'Explore guest moments, landscapes, and wildlife photography captured with Nisha Safari across Sri Lanka.',
    keywords: ['Nisha Safari', 'Sri Lanka Safari Gallery', 'Sri Lanka Wildlife Safaris'],
    h1Label: 'Nisha Safari — Gallery',
    priority: 0.8,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'reviews.html': {
    file: 'reviews.html',
    path: '/reviews.html',
    title: 'Nisha Safari | Guest Reviews & Stories',
    description:
      'Read verified guest reviews and safari stories from journeys across Sri Lanka with Nisha Safari.',
    keywords: ['Nisha Safari Reviews', 'Nisha Safari', 'Sri Lanka Safari Tours'],
    h1Label: 'Nisha Safari — Guest Reviews',
    priority: 0.82,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'contact.html': {
    file: 'contact.html',
    path: '/contact.html',
    title: 'Nisha Safari | Contact & Safari Booking Enquiry',
    description:
      'Contact Nisha Safari to plan private Sri Lanka safaris, Nisha Taxi Service transfers, and custom national park expeditions.',
    keywords: ['Nisha Safari', 'Nisha Safari Booking', 'Sri Lanka Safari Enquiries'],
    h1Label: 'Contact Nisha Safari',
    priority: 0.85,
    changeFrequency: 'monthly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
};
