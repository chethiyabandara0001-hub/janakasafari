import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import firebaseConfig from '../../../firebase-applet-config.json';

export const dynamic = 'force-dynamic';

export interface StoredEnquiry {
  enquiryId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  park: string;
  adults: string;
  kids: string;
  safariDate: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  sourcePage: string;
  adminScope: 'nisha-cms-admin';
  createdAt: string;
  updatedAt: string;
}

const CACHE_DIR = path.join(process.cwd(), '.r2-local-cache');
const ENQUIRIES_FILE = path.join(CACHE_DIR, 'enquiries.json');

const FIRESTORE_DOCUMENTS_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
const FIRESTORE_RESOURCE_PREFIX = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

async function readLocalEnquiries(): Promise<StoredEnquiry[]> {
  try {
    const raw = await fs.readFile(ENQUIRIES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalEnquiries(items: StoredEnquiry[]): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(ENQUIRIES_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.warn('Unable to write local enquiries cache:', err);
  }
}

function parseFirestoreDoc(docObj: {
  fields?: Record<
    string,
    {
      stringValue?: string;
      timestampValue?: string;
    }
  >;
}): StoredEnquiry | null {
  if (!docObj?.fields) return null;
  const f = docObj.fields;
  const str = (k: string, fallback = '') =>
    typeof f[k]?.stringValue === 'string' ? f[k].stringValue! : fallback;
  const ts = (k: string) =>
    typeof f[k]?.timestampValue === 'string'
      ? f[k].timestampValue!
      : typeof f[k]?.stringValue === 'string'
        ? f[k].stringValue!
        : new Date().toISOString();

  const enquiryId = str('enquiryId');
  if (!enquiryId) return null;

  const rawStatus = str('status', 'new');
  const status: 'new' | 'read' | 'replied' =
    rawStatus === 'read' || rawStatus === 'replied' ? rawStatus : 'new';

  return {
    enquiryId,
    firstName: str('firstName', 'Guest'),
    lastName: str('lastName', '-'),
    email: str('email', ''),
    whatsapp: str('whatsapp', ''),
    park: str('park', ''),
    adults: str('adults', '1'),
    kids: str('kids', '0'),
    safariDate: str('safariDate', ''),
    message: str('message', ''),
    status,
    sourcePage: str('sourcePage', 'contact.html'),
    adminScope: 'nisha-cms-admin',
    createdAt: ts('createdAt'),
    updatedAt: ts('updatedAt'),
  };
}

async function fetchFirestoreEnquiriesRest(): Promise<StoredEnquiry[]> {
  try {
    const res = await fetch(`${FIRESTORE_DOCUMENTS_BASE}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'enquiries' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'adminScope' },
              op: 'EQUAL',
              value: { stringValue: 'nisha-cms-admin' },
            },
          },
        },
      }),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    const out: StoredEnquiry[] = [];
    for (const row of rows) {
      if (row?.document) {
        const parsed = parseFirestoreDoc(row.document);
        if (parsed) out.push(parsed);
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function commitEnquiryToFirestoreRest(item: StoredEnquiry): Promise<void> {
  try {
    await fetch(`${FIRESTORE_DOCUMENTS_BASE}:commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `${FIRESTORE_RESOURCE_PREFIX}/enquiries/${item.enquiryId}`,
              fields: {
                enquiryId: { stringValue: item.enquiryId },
                firstName: { stringValue: item.firstName },
                lastName: { stringValue: item.lastName },
                email: { stringValue: item.email },
                whatsapp: { stringValue: item.whatsapp },
                park: { stringValue: item.park },
                adults: { stringValue: item.adults },
                kids: { stringValue: item.kids },
                safariDate: { stringValue: item.safariDate },
                message: { stringValue: item.message },
                status: { stringValue: item.status },
                sourcePage: { stringValue: item.sourcePage },
                adminScope: { stringValue: 'nisha-cms-admin' },
              },
            },
            updateTransforms: [
              { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Firestore REST commit enquiry warning:', err);
  }
}

export async function GET() {
  try {
    const [localItems, fbItems] = await Promise.all([
      readLocalEnquiries(),
      fetchFirestoreEnquiriesRest(),
    ]);

    const byId = new Map<string, StoredEnquiry>();
    for (const item of localItems) {
      if (item?.enquiryId) byId.set(item.enquiryId, item);
    }
    for (const item of fbItems) {
      if (item?.enquiryId) {
        const existing = byId.get(item.enquiryId);
        if (!existing || item.updatedAt >= existing.updatedAt) {
          byId.set(item.enquiryId, item);
        }
      }
    }

    const merged = Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );

    return NextResponse.json(
      { ok: true, enquiries: merged },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load enquiries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawId = String(
      body.enquiryId || `enq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    )
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 120);

    const firstName = String(body.firstName || '').trim().slice(0, 100);
    const lastName = String(body.lastName || '').trim().slice(0, 100);
    const email = String(body.email || '').trim().slice(0, 256);
    const whatsapp = String(body.whatsapp || '').trim().slice(0, 60);
    const park = String(body.park || '').trim().slice(0, 100);
    const adults = String(body.adults || '1').trim().slice(0, 20);
    const kids = String(body.kids || '0').trim().slice(0, 20);
    const safariDate = String(body.safariDate || '').trim().slice(0, 60);
    const message = String(body.message || '').trim().slice(0, 4000);
    const sourcePage = String(body.sourcePage || 'contact.html').trim().slice(0, 80);

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: 'First name, last name, email, and message are required.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const record: StoredEnquiry = {
      enquiryId: rawId,
      firstName,
      lastName,
      email,
      whatsapp,
      park,
      adults: adults || '1',
      kids: kids || '0',
      safariDate,
      message,
      status: 'new',
      sourcePage: sourcePage || 'contact.html',
      adminScope: 'nisha-cms-admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const existing = await readLocalEnquiries();
    const filtered = existing.filter((e) => e.enquiryId !== record.enquiryId);
    filtered.unshift(record);
    await Promise.all([writeLocalEnquiries(filtered), commitEnquiryToFirestoreRest(record)]);

    return NextResponse.json({ ok: true, enquiry: record });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save enquiry' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const enquiryId = String(body.enquiryId || '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 120);
    const rawStatus = String(body.status || 'read');
    const status: 'new' | 'read' | 'replied' =
      rawStatus === 'new' || rawStatus === 'replied' ? rawStatus : 'read';

    if (!enquiryId) {
      return NextResponse.json({ error: 'enquiryId is required' }, { status: 400 });
    }

    const existing = await readLocalEnquiries();
    const nowIso = new Date().toISOString();
    let updatedItem: StoredEnquiry | null = null;
    const nextList = existing.map((item) => {
      if (item.enquiryId === enquiryId) {
        updatedItem = { ...item, status, updatedAt: nowIso };
        return updatedItem;
      }
      return item;
    });

    await writeLocalEnquiries(nextList);

    return NextResponse.json({ ok: true, enquiryId, status, enquiry: updatedItem });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update enquiry status' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const enquiryId = String(searchParams.get('enquiryId') || '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 120);
    if (!enquiryId) {
      return NextResponse.json({ error: 'enquiryId is required' }, { status: 400 });
    }

    const existing = await readLocalEnquiries();
    const nextList = existing.filter((item) => item.enquiryId !== enquiryId);
    await writeLocalEnquiries(nextList);

    try {
      await fetch(`${FIRESTORE_DOCUMENTS_BASE}/enquiries/${enquiryId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore REST delete warning
    }

    return NextResponse.json({ ok: true, enquiryId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete enquiry' },
      { status: 500 }
    );
  }
}
