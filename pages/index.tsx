import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function HomePage() {
  const [latest, setLatest] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadLatest() {
    setLoading(true);
    try {
      const res = await fetch('/api/fb-contacts', { cache: 'no-store' });
      const data = await res.json();
      const items = normalizeItems(data);

      // show latest 5
      const sorted = [...items].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setLatest(sorted.slice(0, 5));
    } catch {
      setLatest([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLatest();
  }, []);

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
    <AppShell title="FB Leads Viewer" subtitle="Ready — connect your extension to extract and sync leads" right={right}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 12px 30px rgba(2, 6, 23, 0.06)',
            padding: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Latest Contacts</div>
              <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>This shows the most recent synced leads.</div>
            </div>

            <Link
              href="/dashboard/contacts"
              aria-label="View all contacts"
              style={{
                background: '#0b2b6f',
                color: '#fff',
                textDecoration: 'none',
                padding: '10px 14px',
                borderRadius: 14,
                fontWeight: 900,
                fontSize: 13,
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              View All
            </Link>
          </div>

          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: '1px dashed rgba(15, 23, 42, 0.18)',
              padding: 14,
              color: '#334155',
              background: '#fbfcff',
            }}
          >
            {loading ? (
              <div style={{ opacity: 0.8 }}>Loading…</div>
            ) : latest.length === 0 ? (
              <div>No contacts yet. Use the extension to extract members, then Sync.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {latest.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 900 }}>{c.name || 'Untitled'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {(c.phone || '').trim() ? c.phone : '—'} • {(c.status || '').trim() ? c.status : '—'}
                      </div>
                    </div>

                    {c.profile ? (
                      <a
                        href={c.profile}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8' }}
                      >
                        Open
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>No profile</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 12px 30px rgba(2, 6, 23, 0.06)',
            padding: 18,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>Quick Start</div>
          <div style={{ marginTop: 10, color: '#334155', fontSize: 13, lineHeight: 1.6 }}>
            <div>1) Open a Facebook Group members page</div>
            <div>2) Click the extension → <b>Extract</b></div>
            <div>3) Click <b>Sync</b></div>
            <div>4) View results in the Dashboard</div>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <Link
              href="/dashboard/contacts"
              aria-label="Go to Dashboard"
              style={{
                background: '#2f80ed',
                color: '#fff',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: 14,
                fontWeight: 900,
                textAlign: 'center',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Go to Dashboard
            </Link>

            <Link
              href="/api-json"
              aria-label="Open API JSON page"
              style={{
                background: '#f1f5ff',
                color: '#0b2b6f',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: 14,
                fontWeight: 900,
                textAlign: 'center',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Open API JSON
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
