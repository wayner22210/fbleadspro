import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function safeStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function isDemoExpired(): boolean {
  const raw = safeStr(process.env.DEMO_EXPIRES_AT);
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() >= d.getTime();
}

function unauthorized() {
  const res = new NextResponse('Auth required', { status: 401 });
  res.headers.set('WWW-Authenticate', 'Basic realm="FBLeadsPro"');
  return res;
}

function decodeBasic(header: string): { user: string; pass: string } | null {
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  try {
    const decoded = atob(m[1]);
    const idx = decoded.indexOf(':');
    if (idx < 0) return { user: decoded, pass: '' };
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Demo expiry: block both dashboard + API (this is your "move off my hosting" lever)
  if (isDemoExpired()) {
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: 'Demo expired. Deploy your own copy.' },
        { status: 410 }
      );
    }
    return new NextResponse('Demo expired. Deploy your own copy.', { status: 410 });
  }

  // Basic Auth: ONLY protect dashboard pages (do NOT break extension sync)
  const authUser = safeStr(process.env.BASIC_AUTH_USER);
  const authPass = safeStr(process.env.BASIC_AUTH_PASS);
  if (!authUser || !authPass) return NextResponse.next();

  if (!path.startsWith('/dashboard')) return NextResponse.next();

  const header = safeStr(req.headers.get('authorization'));
  if (!header) return unauthorized();

  const creds = decodeBasic(header);
  if (!creds) return unauthorized();

  if (creds.user !== authUser || creds.pass !== authPass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
