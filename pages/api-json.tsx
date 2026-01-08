import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';

type Contact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  profile?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

function normalizeItems(payload: any): Contact[] {
  // Accept both formats:
  // 1) [] (raw array)
  // 2) { items: [] }
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function ApiJsonPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [raw, setRaw] = useState<any>({ items: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/fb-contacts', { cache: 'no-store' });
      const data = await res.json();
      const normalized = normalizeItems(data);

      setItems(normalized);
      setRaw(Array.isArray(data) ? { items: normalized } : data);
    } catch (e: any) {
      setErr('Failed to load JSON');
      setItems([]);
      setRaw({ items: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const pretty = useMemo(() => JSON.stringify(raw, null, 2), [raw]);

  const right = (
    <Link
      href="/dashboard/contacts"
      aria-label="Open Dashboard"
      style={{
        color: '#fff',
        textDecoration: 'none',
        padding: '10px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.22)',
        fontSize: 13,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Dashboard
    </Link>
  );

  return (
    <AppShell title="API JSON" subtitle="Live view of GET /api/fb-contacts (copyable + pretty)" right={right}>
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 12px 30px rgba(2, 6, 23, 0.06)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: '#334155', fontSize: 13 }}>
            <div style={{ fontWeight: 900 }}>{items.length} contact(s)</div>
            <div style={{ opacity: 0.85 }}>
              Source: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>GET /api/fb-contacts</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh API JSON"
              style={{
                background: '#0b2b6f',
                color: '#fff',
                border: 0,
                padding: '10px 14px',
                borderRadius: 14,
                fontWeight: 900,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(pretty);
                } catch {
                  // ignore
                }
              }}
              aria-label="Copy JSON to clipboard"
              style={{
                background: '#f1f5ff',
                color: '#0b2b6f',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                padding: '10px 14px',
                borderRadius: 14,
                fontWeight: 900,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Copy JSON
            </button>
          </div>
        </div>

        {err ? <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 800 }}>{err}</div> : null}

        <div
          style={{
            marginTop: 14,
            background: '#0b1220',
            color: '#e5e7eb',
            borderRadius: 14,
            padding: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13,
            lineHeight: 1.55,
            overflowX: 'auto',
            border: '1px solid rgba(255,255,255,0.08)',
            whiteSpace: 'pre',
          }}
        >
          {pretty}
        </div>
      </div>
    </AppShell>
  );
}
