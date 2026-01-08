import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';

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

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Closed', 'Ignored'] as const;

function normalizeItems(payload: any): Contact[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function formatLocal(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safeStr(v: any) {
  return (v ?? '').toString();
}

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('All');

  // Draft edits keyed by contact id
  const [draft, setDraft] = useState<Record<string, { status?: string; notes?: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/fb-contacts', { cache: 'no-store' });
      const data = await res.json();
      setItems(normalizeItems(data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function patchContact(id: string, patch: Partial<Contact>) {
    const res = await fetch('/api/fb-contacts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, patch }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `PATCH failed (${res.status})`);
    }
    const data = await res.json().catch(() => ({}));
    return data;
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact?')) return;
    try {
      setSavingId(id);
      const res = await fetch(`/api/fb-contacts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`DELETE failed (${res.status})`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    } finally {
      setSavingId(null);
    }
  }

  async function clearAll() {
    if (!confirm('Clear ALL contacts? This cannot be undone.')) return;
    try {
      setSavingId('__all__');
      const res = await fetch(`/api/fb-contacts?all=1`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Clear all failed (${res.status})`);
      setItems([]);
      setDraft({});
    } catch (e: any) {
      alert(e?.message || 'Clear all failed');
    } finally {
      setSavingId(null);
    }
  }

  async function saveRow(c: Contact) {
    const d = draft[c.id] || {};
    const nextStatus = d.status !== undefined ? d.status : (c.status || 'New');
    const nextNotes = d.notes !== undefined ? d.notes : (c.notes || '');

    try {
      setSavingId(c.id);
      await patchContact(c.id, { status: nextStatus, notes: nextNotes });

      // Update local list immediately
      setItems((prev) =>
        prev.map((x) =>
          x.id !== c.id
            ? x
            : {
                ...x,
                status: nextStatus,
                notes: nextNotes,
              }
        )
      );

      // Clear draft for this row
      setDraft((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  const right = (
    <Link
      href="/"
      aria-label="Go to Dashboard"
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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((c) => {
      // 🔒 phone/email intentionally excluded from search
      const hay = `${c.name || ''} ${c.profile || ''} ${c.notes || ''}`.toLowerCase();
      const okQ = qq ? hay.includes(qq) : true;
      const okS = status === 'All' ? true : (c.status || '') === status;
      return okQ && okS;
    });
  }, [items, q, status]);

  const statusCounts = useMemo(() => {
    const base: Record<string, number> = { New: 0, Contacted: 0, Qualified: 0, Closed: 0, Ignored: 0 };
    for (const c of items) {
      const s = (c.status || '').trim();
      if (base[s] !== undefined) base[s] += 1;
    }
    return base;
  }, [items]);

  return (
    <AppShell title="Contacts" subtitle="Leads captured from Facebook groups (sync → view → follow up)" right={right}>
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 12px 30px rgba(2, 6, 23, 0.06)',
          padding: 18,
        }}
      >
        {/* Status summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          {(STATUS_OPTIONS as unknown as string[]).map((k) => (
            <div
              key={k}
              style={{
                borderRadius: 14,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                padding: 12,
                background: '#fbfcff',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>{k}</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{statusCounts[k] || 0}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Contacts</div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="/api/fb-contacts?format=csv"
              aria-label="Export CSV"
              style={{
                background: '#f1f5ff',
                color: '#0b2b6f',
                textDecoration: 'none',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                padding: '10px 14px',
                borderRadius: 14,
                fontWeight: 900,
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Export CSV
            </a>

            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh contacts"
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
              onClick={clearAll}
              aria-label="Clear all contacts"
              disabled={savingId === '__all__'}
              style={{
                background: '#fff',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '10px 14px',
                borderRadius: 14,
                fontWeight: 900,
                cursor: savingId === '__all__' ? 'not-allowed' : 'pointer',
                minHeight: 44,
                opacity: savingId === '__all__' ? 0.6 : 1,
              }}
            >
              {savingId === '__all__' ? 'Clearing…' : 'Clear All'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / profile / notes"
            aria-label="Search contacts"
            style={{
              flex: 1,
              minWidth: 260,
              borderRadius: 14,
              border: '1px solid rgba(15, 23, 42, 0.12)',
              padding: '12px 14px',
              outline: 'none',
              fontSize: 14,
              background: '#fff',
            }}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            style={{
              width: 220,
              borderRadius: 14,
              border: '1px solid rgba(15, 23, 42, 0.12)',
              padding: '12px 14px',
              outline: 'none',
              fontSize: 14,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            <option value="All">All</option>
            {(STATUS_OPTIONS as unknown as string[]).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
          {filtered.length} shown • {items.length} total
        </div>

        <div style={{ marginTop: 12, borderRadius: 16, border: '1px solid rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 1.8fr 1.1fr 1.2fr',
              gap: 0,
              background: '#f7f9ff',
              padding: '12px 12px',
              fontWeight: 900,
              fontSize: 13,
              color: '#0b2b6f',
            }}
          >
            <div>Name</div>
            <div>Status</div>
            <div>Notes</div>
            <div>Created</div>
            <div>Actions</div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 14, color: '#64748b' }}>No leads yet. Post via API or sync from the extension.</div>
          ) : (
            filtered.map((c) => {
              const currentStatus = (c.status || 'New').trim() || 'New';
              const currentNotes = safeStr(c.notes);

              const d = draft[c.id] || {};
              const draftStatus = d.status !== undefined ? d.status : currentStatus;
              const draftNotes = d.notes !== undefined ? d.notes : currentNotes;

              const dirty = draftStatus !== currentStatus || draftNotes !== currentNotes;

              return (
                <div
                  key={c.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr 1.8fr 1.1fr 1.2fr',
                    gap: 0,
                    padding: '12px 12px',
                    borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{c.name || '—'}</div>

                  <div>
                    <select
                      value={draftStatus}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [c.id]: { ...(prev[c.id] || {}), status: e.target.value },
                        }))
                      }
                      aria-label={`Status for ${c.name || 'contact'}`}
                      disabled={savingId === c.id}
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        padding: '10px 12px',
                        outline: 'none',
                        fontSize: 14,
                        background: '#fff',
                        cursor: savingId === c.id ? 'not-allowed' : 'pointer',
                        opacity: savingId === c.id ? 0.7 : 1,
                      }}
                    >
                      {/* preserve unknown statuses */}
                      {!STATUS_OPTIONS.includes(draftStatus as any) ? <option value={draftStatus}>{draftStatus}</option> : null}
                      {(STATUS_OPTIONS as unknown as string[]).map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      value={draftNotes}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [c.id]: { ...(prev[c.id] || {}), notes: e.target.value },
                        }))
                      }
                      placeholder="Add a note…"
                      aria-label={`Notes for ${c.name || 'contact'}`}
                      disabled={savingId === c.id}
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        padding: '10px 12px',
                        outline: 'none',
                        fontSize: 14,
                        background: '#fff',
                        opacity: savingId === c.id ? 0.7 : 1,
                      }}
                    />
                  </div>

                  <div style={{ color: '#334155' }}>{formatLocal(c.created_at)}</div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    {c.profile ? (
                      <a
                        href={c.profile}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontWeight: 900,
                          color: '#1d4ed8',
                          textDecoration: 'underline',
                          padding: '8px 6px',
                          borderRadius: 10,
                          minHeight: 36,
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        Open
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}

                    {dirty ? (
                      <button
                        type="button"
                        onClick={() => saveRow(c)}
                        aria-label={`Save changes for ${c.name || 'contact'}`}
                        disabled={savingId === c.id}
                        style={{
                          background: '#0b2b6f',
                          color: '#fff',
                          border: 0,
                          padding: '10px 12px',
                          borderRadius: 14,
                          fontWeight: 900,
                          cursor: savingId === c.id ? 'not-allowed' : 'pointer',
                          minHeight: 36,
                          opacity: savingId === c.id ? 0.7 : 1,
                        }}
                      >
                        {savingId === c.id ? 'Saving…' : 'Save'}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => deleteContact(c.id)}
                      aria-label={`Delete ${c.name || 'contact'}`}
                      disabled={savingId === c.id}
                      style={{
                        background: '#fff',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '10px 12px',
                        borderRadius: 14,
                        fontWeight: 900,
                        cursor: savingId === c.id ? 'not-allowed' : 'pointer',
                        minHeight: 36,
                        opacity: savingId === c.id ? 0.7 : 1,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

export async function getServerSideProps() {
  // Force this page to be dynamic on Vercel so proxy.ts auth runs.
  return { props: {} };
}
