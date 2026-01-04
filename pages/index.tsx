import { useEffect, useState } from 'react';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile?: string;
  created_at: string;
};

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/leads`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_KEY!}`,
          },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setLeads(json);
      } catch (e: any) {
        setError(e.message);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>📋 FB Leads Viewer</h1>
      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {!leads.length && !error && <p>Loading...</p>}
      {leads.length > 0 && (
        <table border={1} cellPadding={8} style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Phone</th><th>Profile</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.email}</td>
                <td>{l.phone}</td>
                <td><a href={l.profile} target="_blank">{l.profile}</a></td>
                <td>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
