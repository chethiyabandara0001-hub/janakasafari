import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'nisha_admin_session';
// Expected SHA-256 hashes for normalized email ("nishasafari@gmail.com") and password ("g2jabB80")
const EXPECTED_EMAIL_HASH = crypto
  .createHash('sha256')
  .update('nishasafari@gmail.com')
  .digest('hex');
const EXPECTED_PASS_HASH = crypto
  .createHash('sha256')
  .update('g2jabB80')
  .digest('hex');
const SESSION_TOKEN = crypto
  .createHash('sha256')
  .update(`${EXPECTED_EMAIL_HASH}:${EXPECTED_PASS_HASH}:nisha_safari_admin_v1`)
  .digest('hex');

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || '';
  const authenticated = Boolean(token && timingSafeEqualHex(token, SESSION_TOKEN));
  return NextResponse.json({
    authenticated,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'login');

    if (action === 'logout') {
      const res = NextResponse.json({ authenticated: false });
      res.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return res;
    }

    const rawEmail = String(body.email || '')
      .trim()
      .toLowerCase();
    const rawPassword = String(body.password || '');

    const emailHash = sha256Hex(rawEmail);
    const passHash = sha256Hex(rawPassword);

    const emailValid = timingSafeEqualHex(emailHash, EXPECTED_EMAIL_HASH);
    const passValid = timingSafeEqualHex(passHash, EXPECTED_PASS_HASH);

    if (!emailValid || !passValid) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      authenticated: true,
    });

    res.cookies.set(COOKIE_NAME, SESSION_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json(
      { authenticated: false, error: 'Authentication request failed.' },
      { status: 400 }
    );
  }
}
