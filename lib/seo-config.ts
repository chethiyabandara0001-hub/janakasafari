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
export const BRAND_NAME = 'Nisha Travelling';

export const PRIORITY_SEO_KEYWORDS = [
  { rank: 1, keyword: 'Nisha Travelling', priority: 'Very High' },
  { rank: 2, keyword: 'Nisha Travelling Sri Lanka', priority: 'Very High' },
  { rank: 3, keyword: 'Sri Lanka Travelling Tours', priority: 'Very High' },
  { rank: 4, keyword: 'Sri Lanka Safari Tours', priority: 'Very High' },
  { rank: 5, keyword: 'Sri Lanka Wildlife Tours', priority: 'Very High' },
  { rank: 6, keyword: 'Private Sri Lanka Tours', priority: 'High' },
  { rank: 7, keyword: 'Sri Lanka National Park Tours', priority: 'High' },
  { rank: 8, keyword: 'Yala National Park Safari', priority: 'High' },
  { rank: 9, keyword: 'Udawalawe National Park Safari', priority: 'High' },
  { rank: 10, keyword: 'Bundala Bird Watching Safari', priority: 'High' },
  { rank: 11, keyword: 'Wilpattu National Park Safari', priority: 'High' },
  { rank: 12, keyword: 'Minneriya Elephant Safari', priority: 'High' },
  { rank: 13, keyword: 'Kumana National Park Safari', priority: 'High' },
  { rank: 14, keyword: 'Hambantota Shore Excursions', priority: 'High' },
  { rank: 15, keyword: 'Sri Lanka Chauffeur & Jeep Tours', priority: 'High' },
] as const;

export const PARK_SEO_CLUSTERS = {
  yala: [
    'Nisha Travelling Yala Safari',
    'Yala National Park Safari',
    'Yala Safari Tours',
    'Yala Jeep Safari',
    'Yala Leopard Safari',
    'Private Yala Safari',
  ],
  udawalawe: [
    'Nisha Travelling Udawalawe',
    'Udawalawe National Park Safari',
    'Udawalawe Elephant Safari',
    'Udawalawe Private Safari',
  ],
  bundala: [
    'Nisha Travelling Bundala',
    'Bundala National Park Safari',
    'Bundala Bird Watching Safari',
    'Bundala Wildlife Tours',
  ],
  wilpattu: [
    'Nisha Travelling Wilpattu',
    'Wilpattu National Park Safari',
    'Wilpattu Leopard Safari',
    'Wilpattu Private Safari',
  ],
  minneriya: [
    'Nisha Travelling Minneriya',
    'Minneriya National Park Safari',
    'Minneriya Elephant Gathering',
    'Minneriya Private Safari',
  ],
  kumana: [
    'Nisha Travelling Kumana',
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
  name: 'Nisha Travelling',
  alternateName: 'Nisha Travelling Sri Lanka',
  url: SITE_BASE_URL,
  logo: `${SITE_BASE_URL}/favicon-96x96.png`,
  description:
    'Nisha Travelling offers private Sri Lanka travel experiences, curated wildlife & nature tours, national park expeditions, scenic transfers, and shore excursions across Sri Lanka.',
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
    title: 'Nisha Travelling',
    description:
      'Nisha Travelling offers private Sri Lanka travel experiences, curated wildlife & nature tours, national park expeditions, scenic transfers, and shore excursions across Sri Lanka.',
    keywords: ALL_SEO_KEYWORDS_LIST,
    h1Label: 'Nisha Travelling — Discover Sri Lanka',
    priority: 1.0,
    changeFrequency: 'daily',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL}/#website`,
        url: SITE_BASE_URL,
        name: 'Nisha Travelling',
        keywords: ALL_SEO_KEYWORDS_LIST.join(', '),
        publisher: { '@id': `${SITE_BASE_URL}/#organization` },
      },
    ],
  },
  'yala-safari.html': {
    file: 'yala-safari.html',
    path: '/yala-safari.html',
    title: 'Nisha Travelling | Yala National Park Expeditions',
    description:
      'Explore Yala National Park with Nisha Travelling. Custom private & shared 4x4 journeys across Sri Lanka with experienced local guides.',
    keywords: [...PARK_SEO_CLUSTERS.yala, 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Yala National Park Expeditions',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'udawalawe-safari.html': {
    file: 'udawalawe-safari.html',
    path: '/udawalawe-safari.html',
    title: 'Nisha Travelling | Udawalawe Elephant Expeditions',
    description:
      'Explore Udawalawe National Park with Nisha Travelling. Private wildlife tours, hotel pickups, and curated Sri Lanka travel itineraries.',
    keywords: [...PARK_SEO_CLUSTERS.udawalawe, 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Udawalawe Expeditions',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'bundala-birding-safari.html': {
    file: 'bundala-birding-safari.html',
    path: '/bundala-birding-safari.html',
    title: 'Nisha Travelling | Bundala Birding & Wetland Tours',
    description:
      'Discover Bundala wetlands with Nisha Travelling. Guided coastal lagoon & bird watching tours across southern Sri Lanka.',
    keywords: [...PARK_SEO_CLUSTERS.bundala, 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Bundala Birding Tours',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'wilpattu-safari.html': {
    file: 'wilpattu-safari.html',
    path: '/wilpattu-safari.html',
    title: 'Nisha Travelling | Wilpattu National Park Tours',
    description:
      'Travel through Wilpattu National Park with Nisha Travelling. Private wildlife journeys across Sri Lanka’s northwest wilderness.',
    keywords: [...PARK_SEO_CLUSTERS.wilpattu, 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Wilpattu Expeditions',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'minneriya-safari.html': {
    file: 'minneriya-safari.html',
    path: '/minneriya-safari.html',
    title: 'Nisha Travelling | Minneriya Elephant Gathering Tours',
    description:
      'Experience Minneriya National Park with Nisha Travelling. Private Sri Lanka wildlife and cultural triangle travel packages.',
    keywords: [...PARK_SEO_CLUSTERS.minneriya, 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Minneriya Expeditions',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'kumana-birding-safari.html': {
    file: 'kumana-birding-safari.html',
    path: '/kumana-birding-safari.html',
    title: 'Nisha Travelling | Kumana Wildlife & Birding Tours',
    description:
      'Journey through Kumana National Park with Nisha Travelling. Guided east-coast Sri Lanka wildlife and bird watching expeditions.',
    keywords: [...PARK_SEO_CLUSTERS.kumana, 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Kumana Expeditions',
    priority: 0.85,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'safari-parks.html': {
    file: 'safari-parks.html',
    path: '/safari-parks.html',
    title: 'Nisha Travelling | Sri Lanka Parks & Tour Destinations',
    description:
      'Compare Sri Lanka destinations and national park tours with Nisha Travelling — custom itineraries across the island.',
    keywords: ALL_SEO_KEYWORDS_LIST,
    h1Label: 'Nisha Travelling — Sri Lanka Destinations',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'about.html': {
    file: 'about.html',
    path: '/about.html',
    title: 'Nisha Travelling | About Our Sri Lanka Travel Team',
    description:
      'Meet Nisha Travelling — trusted Sri Lanka travel specialists and private 4x4 tour guides offering memorable island journeys since 2002.',
    keywords: ['Nisha Travelling', 'About Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'About Nisha Travelling',
    priority: 0.8,
    changeFrequency: 'monthly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'gallery.html': {
    file: 'gallery.html',
    path: '/gallery.html',
    title: 'Nisha Travelling | Sri Lanka Travel & Wildlife Gallery',
    description:
      'Explore travel moments, landscapes, and wildlife photography captured with Nisha Travelling across Sri Lanka.',
    keywords: ['Nisha Travelling', 'Sri Lanka Travel Gallery', 'Sri Lanka Wildlife Tours'],
    h1Label: 'Nisha Travelling — Gallery',
    priority: 0.8,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'reviews.html': {
    file: 'reviews.html',
    path: '/reviews.html',
    title: 'Nisha Travelling | Guest Reviews & Stories',
    description:
      'Read verified guest reviews and travel stories from journeys across Sri Lanka with Nisha Travelling.',
    keywords: ['Nisha Travelling Reviews', 'Nisha Travelling', 'Sri Lanka Travelling Tours'],
    h1Label: 'Nisha Travelling — Guest Reviews',
    priority: 0.82,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'contact.html': {
    file: 'contact.html',
    path: '/contact.html',
    title: 'Nisha Travelling | Contact & Tour Booking Enquiry',
    description:
      'Contact Nisha Travelling to plan private Sri Lanka tours, airport & port transfers, and custom national park expeditions.',
    keywords: ['Nisha Travelling', 'Nisha Travelling Booking', 'Sri Lanka Travelling Enquiries'],
    h1Label: 'Contact Nisha Travelling',
    priority: 0.85,
    changeFrequency: 'monthly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
};
