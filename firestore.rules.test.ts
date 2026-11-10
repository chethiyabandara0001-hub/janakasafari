/**
 * Phase 0 Security Rules Verification Specification (Dirty Dozen Test Suite)
 * Verifies that all 12 adversarial payloads defined in security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated write to site_images',
    collection: 'site_images',
    docId: 'index_html__slot_0',
    operation: 'create',
    auth: null,
    payload: {
      slotId: 'index_html__slot_0',
      page: 'index.html',
      slotIndex: 0,
      type: 'hero-bg',
      label: 'Hero Banner',
      sectionContext: 'Hero',
      src: '/assets/media/hero.jpg',
      alt: 'Hero',
      visibility: 'public',
      authorId: 'anon',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified admin email spoof',
    collection: 'site_images',
    docId: 'index_html__slot_0',
    operation: 'create',
    auth: {
      uid: 'spoof1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: false,
    },
    payload: {
      slotId: 'index_html__slot_0',
      page: 'index.html',
      slotIndex: 0,
      type: 'hero-bg',
      label: 'Hero Banner',
      sectionContext: 'Hero',
      src: '/assets/media/hero.jpg',
      alt: 'Hero',
      visibility: 'public',
      authorId: 'spoof1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Non-admin authenticated user write to site_texts',
    collection: 'site_texts',
    docId: 'index_html__text_0',
    operation: 'create',
    auth: {
      uid: 'user2',
      email: 'attacker@example.com',
      email_verified: true,
    },
    payload: {
      textId: 'index_html__text_0',
      page: 'index.html',
      textIndex: 0,
      tagName: 'H1',
      sectionContext: 'Hero',
      content: 'Hacked Title',
      isDeleted: false,
      isCustomAdded: false,
      visibility: 'public',
      authorId: 'user2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow field injection on site_images',
    collection: 'site_images',
    docId: 'index_html__slot_0',
    operation: 'create',
    auth: {
      uid: 'admin1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: true,
    },
    payload: {
      slotId: 'index_html__slot_0',
      page: 'index.html',
      slotIndex: 0,
      type: 'hero-bg',
      label: 'Hero Banner',
      sectionContext: 'Hero',
      src: '/assets/media/hero.jpg',
      alt: 'Hero',
      visibility: 'public',
      authorId: 'admin1',
      ghostField: 'not_allowed',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Author UID spoofing on site_texts',
    collection: 'site_texts',
    docId: 'index_html__text_1',
    operation: 'create',
    auth: {
      uid: 'admin1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: true,
    },
    payload: {
      textId: 'index_html__text_1',
      page: 'index.html',
      textIndex: 1,
      tagName: 'P',
      sectionContext: 'Intro',
      content: 'Valid text',
      isDeleted: false,
      isCustomAdded: false,
      visibility: 'public',
      authorId: 'other_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client timestamp forgery on section_gallery_items',
    collection: 'section_gallery_items',
    docId: 'yala_section_1',
    operation: 'create',
    auth: {
      uid: 'admin1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: true,
    },
    payload: {
      itemId: 'yala_section_1',
      page: 'yala-safari.html',
      sectionKey: 'hero_gallery',
      sectionTitle: 'Yala Wildlife',
      title: 'Leopard',
      caption: 'Spotted in Block 1',
      src: '/assets/media/leopard.jpg',
      alt: 'Yala Leopard',
      order: 1,
      visibility: 'public',
      authorId: 'admin1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable field mutation on site_images update',
    collection: 'site_images',
    docId: 'index_html__slot_0',
    operation: 'update',
    auth: {
      uid: 'admin1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: true,
    },
    payload: {
      slotId: 'mutated_slot_id',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Value poisoning on site_texts update',
    collection: 'site_texts',
    docId: 'index_html__text_0',
    operation: 'update',
    auth: {
      uid: 'admin1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: true,
    },
    payload: {
      content: 999999,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID poisoning / regex violation',
    collection: 'site_images',
    docId: 'bad$id!@#',
    operation: 'create',
    auth: {
      uid: 'admin1',
      email: 'chethiyabandara0001@gmail.com',
      email_verified: true,
    },
    payload: {
      slotId: 'bad$id!@#',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'PII leak on /admins/{adminUid}',
    collection: 'admins',
    docId: 'admin1',
    operation: 'get',
    auth: {
      uid: 'user2',
      email: 'user2@example.com',
      email_verified: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unfiltered list query on non-public site_images',
    collection: 'site_images',
    docId: '*',
    operation: 'list',
    auth: null,
    payload: {
      visibility: 'private',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-assigned admin privilege escalation',
    collection: 'admins',
    docId: 'user2',
    operation: 'create',
    auth: {
      uid: 'user2',
      email: 'user2@example.com',
      email_verified: true,
    },
    payload: {
      uid: 'user2',
      email: 'user2@example.com',
      role: 'admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
