import useSWR from 'swr';

type Contact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  profile?: string | null;
  created_at?: string | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function ContactsTable() {
  const { data, error, isLoading } = useSWR<Contact[]>('/api/fb-contacts', fetcher);

  if (isLoading) return <div>Loading contacts...</div>;
  if (error) return <div style={{ color: 'red' }}>Failed to load contacts</div>;

  const contacts = data || [];

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead style={{ background: '#f5f5f5' }}>
          <tr>
            <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd' }}>Name</th>
            <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd' }}>Phone</th>
            <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd' }}>Email</th>
            <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd' }}>Profile</th>
            <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id}>
              <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{c.name}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{c.phone || '-'}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>{c.email || '-'}</td>
              <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                {c.profile ? (
                  <a href={c.profile} target="_blank" rel="noreferrer">Open</a>
                ) : (
                  '-'
                )}
              </td>
              <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                {c.created_at ? new Date(c.created_at).toLocaleString() : '-'}
              </td>
            </tr>
          ))}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, color: '#666' }}>No contacts yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
