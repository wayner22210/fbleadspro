// Wayne — FBLeadsPro — Basic Auth v1
import type { IncomingMessage, ServerResponse } from 'http';

function safeStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  // Avoid importing crypto in edge-ish contexts; simple equal is OK for this use,
  // but we keep a tiny constant-time-ish compare for good hygiene.
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function requireBasicAuth(
  req: IncomingMessage,
  res: ServerResponse,
  opts: { userEnv?: string; passEnv?: string } = {}
): { ok: boolean } {
  const user = safeStr(process.env[opts.userEnv || 'BASIC_AUTH_USER']);
  const pass = safeStr(process.env[opts.passEnv || 'BASIC_AUTH_PASS']);

  // If not configured, do not block (keeps dev friction low)
  if (!user || !pass) return { ok: true };

  const header = safeStr(req.headers.authorization);
  if (!header || !header.toLowerCase().startsWith('basic ')) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="FBLeadsPro"');
    res.end('Auth required');
    return { ok: false };
  }

  const encoded = header.slice(6).trim();
  let decoded = '';
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="FBLeadsPro"');
    res.end('Auth required');
    return { ok: false };
  }

  const idx = decoded.indexOf(':');
  const u = idx >= 0 ? decoded.slice(0, idx) : decoded;
  const p = idx >= 0 ? decoded.slice(idx + 1) : '';

  if (!timingSafeEqual(u, user) || !timingSafeEqual(p, pass)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="FBLeadsPro"');
    res.end('Invalid credentials');
    return { ok: false };
  }

  return { ok: true };
}
