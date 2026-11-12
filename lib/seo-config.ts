export interface PageSeoEntry {
  file: string;
  path: string;
  title: string;
  description: string;
  keywords: string[];
  h1Label: string;
  ogImage: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  jsonLd: Record<string, unknown>[];
}

export const SITE_BASE_URL = 'https://srilankabestsafari.com';

export const PRIORITY_SEO_KEYWORDS = [
  { rank: 1, keyword: 'Yala Safari', priority: 'Very High' },
  { rank: 2, keyword: 'Yala National Park Safari', priority: 'Very High' },
  { rank: 3, keyword: 'Yala Safari Tours', priority: 'Very High' },
  { rank: 4, keyword: 'Sri Lanka Safari Tours', priority: 'Very High' },
  { rank: 5, keyword: 'Yala Safari Booking', priority: 'Very High' },
  { rank: 6, keyword: 'Yala National Park Jeep Safari', priority: 'Very High' },
  { rank: 7, keyword: 'Best Yala Safari Tour', priority: 'High' },
  { rank: 8, keyword: 'Yala Safari Price', priority: 'High' },
  { rank: 9, keyword: 'Yala Safari Packages', priority: 'High' },
  { rank: 10, keyword: 'Yala Leopard Safari', priority: 'High' },
  { rank: 11, keyword: 'Private Yala Safari', priority: 'High' },
  { rank: 12, keyword: 'Yala Morning Safari', priority: 'High' },
  { rank: 13, keyword: 'Yala Afternoon Safari', priority: 'High' },
  { rank: 14, keyword: 'Yala Full Day Safari', priority: 'High' },
  { rank: 15, keyword: 'Yala Safari from Tissamaharama', priority: 'High' },
  { rank: 16, keyword: 'Yala Safari from Kataragama', priority: 'High' },
  { rank: 17, keyword: 'Hambantota Port Yala Safari', priority: 'High' },
  { rank: 18, keyword: 'Yala Safari Shore Excursion', priority: 'High' },
  { rank: 19, keyword: 'Udawalawe National Park Safari', priority: 'High' },
  { rank: 20, keyword: 'Bundala National Park Safari', priority: 'High' },
  { rank: 21, keyword: 'Wilpattu National Park Safari', priority: 'High' },
  { rank: 22, keyword: 'Minneriya Elephant Safari', priority: 'High' },
  { rank: 23, keyword: 'Sri Lanka Wildlife Safari', priority: 'High' },
  { rank: 24, keyword: 'Yala Safari Jeep Tour', priority: 'High' },
  { rank: 25, keyword: 'Hambantota Shore Excursion', priority: 'Brand' },
] as const;

export const PARK_SEO_CLUSTERS = {
  yala: [
    'Yala National Park Safari',
    'Yala Safari Tours',
    'Yala Jeep Safari',
    'Yala Leopard Safari',
    'Yala Safari Price',
    'Yala Morning Safari',
    'Yala Full Day Safari',
    'Yala Share Safari',
    'Yala National Park Share Safari',
    'Yala Safari Booking',
    'Yala National Park Jeep Safari',
    'Best Yala Safari Tour',
    'Yala Safari Packages',
    'Private Yala Safari',
    'Yala Afternoon Safari',
    'Yala Safari from Tissamaharama',
    'Yala Safari from Kataragama',
    'Hambantota Port Yala Safari',
    'Yala Safari Shore Excursion',
    'Yala Safari Jeep Tour',
  ],
  udawalawe: [
    'Udawalawe National Park Safari',
    'Udawalawe Safari Tours',
    'Udawalawe Elephant Safari',
    'Udawalawe Jeep Safari',
    'Udawalawe Safari Price',
    'Udawalawe Private Safari',
    'Udawalawe Safari Booking',
  ],
  bundala: [
    'Bundala National Park Safari',
    'Bundala Safari Tours',
    'Bundala Bird Watching Safari',
    'Bundala Jeep Safari',
    'Bundala Wildlife Safari',
    'Bundala Private Safari',
  ],
  wilpattu: [
    'Wilpattu National Park Safari',
    'Wilpattu Safari Tours',
    'Wilpattu Leopard Safari',
    'Wilpattu Jeep Safari',
    'Wilpattu Safari Price',
    'Wilpattu Private Safari',
  ],
  minneriya: [
    'Minneriya National Park Safari',
    'Minneriya Elephant Safari',
    'Minneriya Safari Tours',
    'Minneriya Jeep Safari',
    'Minneriya Elephant Gathering',
    'Minneriya Safari Price',
    'Minneriya Private Safari',
  ],
  kumana: [
    'Kumana National Park Safari',
    'Kumana Safari Tours',
    'Kumana Bird Watching Safari',
    'Kumana Jeep Safari',
    'Kumana Wildlife Safari',
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
  name: 'Nisha Safari Jeep Tours',
  alternateName: 'Sri Lanka Best Safari',
  url: SITE_BASE_URL,
  logo: 'https://cdn.srilankabestsafari.com/slots/index_html__slot_0.svg',
  image: 'https://cdn.srilankabestsafari.com/slots/index_html__slot_1.jpg',
  description:
    'Private & shared 4x4 Yala Safari, Yala National Park Safari, Udawalawe Elephant Safari, Bundala Bird Watching Safari, Wilpattu Leopard Safari, Minneriya Elephant Gathering, and Hambantota Shore Excursions.',
  telephone: '+94717390327',
  email: 'safarinisha@gmail.com',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Tissamaharama',
    addressRegion: 'Southern Province',
    addressCountry: 'LK',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 6.2792,
    longitude: 81.2877,
  },
  areaServed: [
    'Yala National Park',
    'Udawalawe National Park',
    'Bundala National Park',
    'Wilpattu National Park',
    'Minneriya National Park',
    'Kumana National Park',
    'Tissamaharama',
    'Kataragama',
    'Hambantota Port',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '380',
    bestRating: '5',
    worstRating: '1',
  },
};

export const PAGE_SEO_CONFIG: Record<string, PageSeoEntry> = {
  'index.html': {
    file: 'index.html',
    path: '/',
    title: 'Yala Safari & Sri Lanka Safari Tours | Yala National Park Jeep Safari',
    description:
      'Book private & shared Yala Safari Tours, Yala National Park Jeep Safari, Udawalawe, Bundala, Wilpattu, Minneriya & Hambantota Port Shore Excursions.',
    keywords: ALL_SEO_KEYWORDS_LIST,
    h1Label: 'Yala Safari & Sri Lanka Wildlife Safari Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/index_html__slot_1.jpg',
    priority: 1.0,
    changeFrequency: 'daily',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL}/#website`,
        url: SITE_BASE_URL,
        name: 'Yala Safari & Sri Lanka Safari Tours — Nisha Safari',
        keywords: ALL_SEO_KEYWORDS_LIST.join(', '),
        publisher: { '@id': `${SITE_BASE_URL}/#organization` },
      },
    ],
  },
  'yala-safari.html': {
    file: 'yala-safari.html',
    path: '/yala-safari.html',
    title: 'Yala National Park Safari | Yala Safari Tours, Price & Booking',
    description:
      'Yala National Park Safari & Yala Leopard Safari from Tissamaharama, Kataragama & Hambantota Port. Private, Morning, Afternoon, Full Day & Share Safari.',
    keywords: [
      ...PARK_SEO_CLUSTERS.yala,
      'Yala Safari',
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
      'Hambantota Shore Excursion',
    ],
    h1Label: 'Yala National Park Safari & Yala Leopard Jeep Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/yala-safari_html__slot_1.jpg',
    priority: 0.95,
    changeFrequency: 'daily',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Yala National Park Safari — Private, Morning, Full Day & Share Jeep Safari',
        description:
          'Guided 4x4 Yala National Park Jeep Safari for Sri Lankan leopards, elephants, and sloth bears with pickup from Tissamaharama, Kataragama, and Hambantota Port.',
        touristType: ['Wildlife Safari', 'Photography Safari', 'Shore Excursion'],
        provider: { '@id': `${SITE_BASE_URL}/#organization` },
        keywords: PARK_SEO_CLUSTERS.yala.join(', '),
      },
    ],
  },
  'udawalawe-safari.html': {
    file: 'udawalawe-safari.html',
    path: '/udawalawe-safari.html',
    title: 'Udawalawe National Park Safari | Udawalawe Elephant & Jeep Safari',
    description:
      'Book Udawalawe National Park Safari & Udawalawe Elephant Safari Tours. Private 4x4 Udawalawe Jeep Safari, transparent Udawalawe Safari Price & hotel pickup.',
    keywords: [
      ...PARK_SEO_CLUSTERS.udawalawe,
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
      'Hambantota Shore Excursion',
    ],
    h1Label: 'Udawalawe National Park Safari & Elephant Jeep Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/udawalawe-safari_html__slot_1.jpg',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Udawalawe National Park Elephant & Private Jeep Safari',
        description:
          'Private 4x4 Udawalawe National Park Safari Tours for wild Asian elephant herds with hotel and Hambantota Port pickup.',
        provider: { '@id': `${SITE_BASE_URL}/#organization` },
        keywords: PARK_SEO_CLUSTERS.udawalawe.join(', '),
      },
    ],
  },
  'bundala-birding-safari.html': {
    file: 'bundala-birding-safari.html',
    path: '/bundala-birding-safari.html',
    title: 'Bundala National Park Safari | Bundala Bird Watching & Jeep Safari',
    description:
      'Guided Bundala National Park Safari & Bundala Bird Watching Safari Tours. Private 4x4 Bundala Jeep Safari across Ramsar wetlands and coastal lagoons.',
    keywords: [
      ...PARK_SEO_CLUSTERS.bundala,
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
      'Hambantota Shore Excursion',
    ],
    h1Label: 'Bundala National Park Safari & Bird Watching Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/bundala-birding-safari_html__slot_1.jpg',
    priority: 0.88,
    changeFrequency: 'weekly',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Bundala National Park Bird Watching & Wildlife Jeep Safari',
        description:
          'Private Bundala National Park Safari Tours for migratory flamingos, waterbirds, and crocodiles.',
        provider: { '@id': `${SITE_BASE_URL}/#organization` },
        keywords: PARK_SEO_CLUSTERS.bundala.join(', '),
      },
    ],
  },
  'wilpattu-safari.html': {
    file: 'wilpattu-safari.html',
    path: '/wilpattu-safari.html',
    title: 'Wilpattu National Park Safari | Wilpattu Leopard & Jeep Safari Tours',
    description:
      'Explore Wilpattu National Park Safari & Wilpattu Leopard Safari Tours. Private 4x4 Wilpattu Jeep Safari with experienced trackers and transparent pricing.',
    keywords: [
      ...PARK_SEO_CLUSTERS.wilpattu,
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
    ],
    h1Label: 'Wilpattu National Park Safari & Leopard Jeep Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/wilpattu-safari_html__slot_1.jpg',
    priority: 0.88,
    changeFrequency: 'weekly',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Wilpattu National Park Leopard & Private Jeep Safari',
        description:
          'Private 4x4 Wilpattu National Park Safari across natural villu lakes tracking Sri Lankan leopards and sloth bears.',
        provider: { '@id': `${SITE_BASE_URL}/#organization` },
        keywords: PARK_SEO_CLUSTERS.wilpattu.join(', '),
      },
    ],
  },
  'minneriya-safari.html': {
    file: 'minneriya-safari.html',
    path: '/minneriya-safari.html',
    title: 'Minneriya National Park Safari | Minneriya Elephant Gathering Tours',
    description:
      'Witness the Minneriya Elephant Gathering on a private Minneriya National Park Safari & Minneriya Elephant Safari Tour in custom 4x4 safari jeeps.',
    keywords: [
      ...PARK_SEO_CLUSTERS.minneriya,
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
    ],
    h1Label: 'Minneriya National Park Safari & Elephant Gathering Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/minneriya-safari_html__slot_1.jpg',
    priority: 0.88,
    changeFrequency: 'weekly',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Minneriya National Park Elephant Gathering Jeep Safari',
        description:
          'Private 4x4 Minneriya Elephant Safari Tours to experience the world-famous Great Asian Elephant Gathering.',
        provider: { '@id': `${SITE_BASE_URL}/#organization` },
        keywords: PARK_SEO_CLUSTERS.minneriya.join(', '),
      },
    ],
  },
  'kumana-birding-safari.html': {
    file: 'kumana-birding-safari.html',
    path: '/kumana-birding-safari.html',
    title: 'Kumana National Park Safari | Kumana Bird Watching & Jeep Safari',
    description:
      'Book Kumana National Park Safari & Kumana Bird Watching Safari Tours. Private 4x4 Kumana Jeep Safari through Kumana Villu wetlands and leopard trails.',
    keywords: [
      ...PARK_SEO_CLUSTERS.kumana,
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
    ],
    h1Label: 'Kumana National Park Safari & Bird Watching Jeep Tours',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/kumana-birding-safari_html__slot_1.jpg',
    priority: 0.88,
    changeFrequency: 'weekly',
    jsonLd: [
      ORGANIZATION_JSON_LD,
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: 'Kumana National Park Bird Watching & Wildlife Jeep Safari',
        description:
          'Private 4x4 Kumana National Park Safari Tours across the Kumana Villu bird sanctuary and Yala East leopard habitats.',
        provider: { '@id': `${SITE_BASE_URL}/#organization` },
        keywords: PARK_SEO_CLUSTERS.kumana.join(', '),
      },
    ],
  },
  'safari-parks.html': {
    file: 'safari-parks.html',
    path: '/safari-parks.html',
    title: 'Sri Lanka Safari Tours | Yala, Udawalawe, Bundala, Wilpattu & Minneriya',
    description:
      'Compare Sri Lanka Safari Tours across Yala, Udawalawe, Bundala, Wilpattu, Minneriya, and Kumana National Parks. Private 4x4 Jeep Safari packages & booking.',
    keywords: ALL_SEO_KEYWORDS_LIST,
    h1Label: 'Sri Lanka Safari Parks — Yala, Udawalawe, Bundala, Wilpattu, Minneriya & Kumana',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/safari-parks_html__slot_1.jpg',
    priority: 0.9,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'about.html': {
    file: 'about.html',
    path: '/about.html',
    title: 'About Nisha Safari | Best Yala Safari Tour & Private 4x4 Jeep Trackers',
    description:
      'Meet our local wildlife trackers leading the Best Yala Safari Tour, Private Yala Safari, Udawalawe National Park Safari, and Sri Lanka Wildlife Safari tours.',
    keywords: [
      'Best Yala Safari Tour',
      'Private Yala Safari',
      'Yala Safari',
      'Yala National Park Jeep Safari',
      'Sri Lanka Safari Tours',
      'Sri Lanka Wildlife Safari',
      'Yala Safari Jeep Tour',
    ],
    h1Label: 'About Nisha Safari Jeep Tours — Yala & Sri Lanka Wildlife Safaris',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/about_html__slot_1.jpg',
    priority: 0.8,
    changeFrequency: 'monthly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'gallery.html': {
    file: 'gallery.html',
    path: '/gallery.html',
    title: 'Sri Lanka Wildlife Safari Gallery | Yala Leopard & Elephant Photos',
    description:
      'Photography from our Yala Leopard Safari, Udawalawe Elephant Safari, Bundala Bird Watching Safari, Wilpattu Leopard Safari & Minneriya Elephant Gathering.',
    keywords: [
      'Yala Leopard Safari',
      'Sri Lanka Wildlife Safari',
      'Yala National Park Safari',
      'Udawalawe Elephant Safari',
      'Bundala Bird Watching Safari',
      'Wilpattu Leopard Safari',
      'Minneriya Elephant Gathering',
      'Kumana Bird Watching Safari',
    ],
    h1Label: 'Sri Lanka Wildlife Safari Photography Gallery',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/gallery_html__slot_1.jpg',
    priority: 0.8,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'reviews.html': {
    file: 'reviews.html',
    path: '/reviews.html',
    title: 'Best Yala Safari Tour Reviews | TripAdvisor & Google 5-Star Safaris',
    description:
      'Read verified guest reviews for the Best Yala Safari Tour, Yala National Park Jeep Safari, Hambantota Port Yala Safari & Sri Lanka Safari Tours.',
    keywords: [
      'Best Yala Safari Tour',
      'Yala Safari Tours',
      'Yala National Park Safari',
      'Private Yala Safari',
      'Hambantota Port Yala Safari',
      'Yala Safari Shore Excursion',
      'Sri Lanka Safari Tours',
    ],
    h1Label: 'Verified Guest Reviews — Best Yala Safari Tour & Sri Lanka Safaris',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/reviews_html__slot_1.jpg',
    priority: 0.82,
    changeFrequency: 'weekly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
  'contact.html': {
    file: 'contact.html',
    path: '/contact.html',
    title: 'Yala Safari Booking & Price Enquiry | Tissamaharama, Kataragama & Port',
    description:
      'Direct Yala Safari Booking & Yala Safari Price enquiry. Free pickup for Yala Safari from Tissamaharama, Kataragama, and Hambantota Port Shore Excursions.',
    keywords: [
      'Yala Safari Booking',
      'Yala Safari Price',
      'Yala Safari Packages',
      'Yala Safari from Tissamaharama',
      'Yala Safari from Kataragama',
      'Hambantota Port Yala Safari',
      'Yala Safari Shore Excursion',
      'Hambantota Shore Excursion',
      'Udawalawe Safari Booking',
    ],
    h1Label: 'Yala Safari Booking & Private Sri Lanka Safari Enquiry',
    ogImage: 'https://cdn.srilankabestsafari.com/slots/index_html__slot_1.jpg',
    priority: 0.85,
    changeFrequency: 'monthly',
    jsonLd: [ORGANIZATION_JSON_LD],
  },
};
