import { useEffect, useMemo, useState } from 'react';

type FbContact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  profile?: string | null;
  created_at: string;
  status?: string | null;
  notes?: string | null;
};

const STATUSES = ['All', 'New', 'Contacted', 'Qualified', 'Won', 'Lost'] as const;

function badgeStyle(status: string) {
  const base = {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800 as const,
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  switch (status) {
    case 'Won':
      return { ...base, background: '#ecfdf3', color: '#027a48', borderColor: '#abefc6' };
    case 'Qualified':
      return { ...base, background: '#eff8ff', color: '#175cd3', borderColor: '#b2ddff' };
    case 'Contacted':
      return { ...base, background: '#fff7ed', color: '#c4320a', borderColor: '#fed7aa' };
    case 'Lost':
      return { ...base, background: '#fef2f2', color: '#b42318', borderColor: '#fecaca' };
    case 'New':
    default:
      return { ...base, background: '#f4f7ff', color: '#0b2b6f', borderColor: '#d6e7ff' };
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ContactsTable() {
  const [items, setItems] = useState<FbContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All');

  const [edit, setEdit] = useState<FbContact | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/fb-contacts', { method: 'GET' });
      const data = await res.json();
      const list = Array.isArray(data?.items) ? (data.items as FbContact[]) : Array.isArray(data) ? (data as FbContact[]) : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((x) => {
      const matchesQ =
        !qq ||
        (x.name || '').toLowerCase().includes(qq) ||
        (x.phone || '').toLowerCase().includes(qq) ||
        (x.email || '').toLowerCase().includes(qq) ||
        (x.profile || '').toLowerCase().includes(qq);

      const matchesStatus = status === 'All' ? true : (x.status || 'New') === status;
      return matchesQ && matchesStatus;
    });
  }, [items, q, status]);

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fb-contacts', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: edit.id,
          patch: {
            name: edit.name,
            phone: edit.phone,
            email: edit.email,
            profile: edit.profile,
            status: edit.status || 'New',
            notes: edit.notes,
          },
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Save failed');

      setItems((prev) => prev.map((x) => (x.id === edit.id ? data.item : x)));
      setEdit(null);
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Panel header */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e7e9f2',
          borderRadius: 16,
          boxShadow: '0 10px 26px rgba(11,43,111,0.06)',
          padding: 14,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0b2b6f' }}>Leads</div>
            <div style={{ fontSize: 13, color: '#56657d', marginTop: 4, lineHeight: 1.35 }}>
              Manage your Facebook leads: edit details, track status, add notes, export CSV.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => window.open('/api/fb-contacts?format=csv', '_blank')}
              style={{
                border: '1px solid #d6e7ff',
                background: '#f3f6ff',
                color: '#0b2b6f',
                padding: '10px 12px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Export CSV
            </button>

            <button
              onClick={() => load()}
              style={{
                border: '1px solid rgba(255,255,255,0.22)',
                background: '#0b2b6f',
                color: '#fff',
                padding: '10px 12px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, marginTop: 12 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / phone / email / profile…"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #e7e9f2',
              outline: 'none',
              fontSize: 13,
              background: '#fff',
            }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #e7e9f2',
              outline: 'none',
              fontSize: 13,
              background: '#fff',
              fontWeight: 800,
              color: '#0b2b6f',
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {err ? (
          <div style={{ marginTop: 12, padding: 12, background: '#fff2f2', border: '1px solid #ffb2b2', borderRadius: 12 }}>
            <b style={{ color: '#b42318' }}>Error:</b> <span style={{ color: '#7a2a2a' }}>{err}</span>
          </div>
        ) : null}
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e7e9f2',
          boxShadow: '0 10px 26px rgba(11,43,111,0.06)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #eef1fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#56657d' }}>
            {loading ? 'Loading…' : `${filtered.length} shown • ${items.length} total`}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#f7f9ff', color: '#0b2b6f' }}>
                {['Name', 'Phone', 'Status', 'Notes', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: 12, fontSize: 12, letterSpacing: 0.2, borderBottom: '1px solid #eef1fb' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: '#6b7280' }}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: '#6b7280' }}>
                    No leads yet. Post via API or sync from the extension.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f2fb' }}>
                    <td style={{ padding: 12, fontWeight: 900, color: '#0b2b6f' }}>
                      {c.profile ? (
                        <a href={c.profile} target="_blank" rel="noreferrer" style={{ color: '#0b2b6f', textDecoration: 'none' }}>
                          {c.name}
                        </a>
                      ) : (
                        c.name
                      )}
                      {c.email ? <div style={{ fontSize: 12, color: '#56657d', marginTop: 4 }}>{c.email}</div> : null}
                    </td>
                    <td style={{ padding: 12, color: '#1f2937' }}>{c.phone || '—'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={badgeStyle((c.status || 'New') as string)}>{c.status || 'New'}</span>
                    </td>
                    <td style={{ padding: 12, color: '#374151', maxWidth: 320 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</div>
                    </td>
                    <td style={{ padding: 12, color: '#6b7280', fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => setEdit({ ...c })}
                        style={{
                          border: '1px solid #d6e7ff',
                          background: '#f3f6ff',
                          color: '#0b2b6f',
                          padding: '8px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {edit ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 10, 28, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => (saving ? null : setEdit(null))}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e7e9f2',
              boxShadow: '0 18px 48px rgba(0,0,0,0.25)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0b2b6f' }}>Edit Lead</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Update status, notes, and contact details.</div>
              </div>
              <button
                disabled={saving}
                onClick={() => setEdit(null)}
                style={{
                  border: '1px solid #e7e9f2',
                  background: '#fff',
                  color: '#111827',
                  padding: '8px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>
                Name
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: '1px solid #e7e9f2' }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>
                Phone
                <input
                  value={edit.phone || ''}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: '1px solid #e7e9f2' }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>
                Email
                <input
                  value={edit.email || ''}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: '1px solid #e7e9f2' }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>
                Status
                <select
                  value={(edit.status || 'New') as string}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: '1px solid #e7e9f2', fontWeight: 900 }}
                >
                  {STATUSES.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>
                Profile URL
                <input
                  value={edit.profile || ''}
                  onChange={(e) => setEdit({ ...edit, profile: e.target.value })}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: '1px solid #e7e9f2' }}
                />
              </label>

              <label style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 900, color: '#0b2b6f' }}>
                Notes
                <textarea
                  value={edit.notes || ''}
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                  rows={4}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 12, border: '1px solid #e7e9f2' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button
                disabled={saving}
                onClick={() => setEdit(null)}
                style={{
                  border: '1px solid #e7e9f2',
                  background: '#fff',
                  color: '#111827',
                  padding: '10px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveEdit}
                style={{
                  border: '1px solid rgba(255,255,255,0.22)',
                  background: '#0b2b6f',
                  color: '#fff',
                  padding: '10px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
