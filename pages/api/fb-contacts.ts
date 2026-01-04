import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Demo data for now. Replace with Supabase later.
  return res.status(200).json([
    {
      id: '1',
      name: 'Juan Dela Cruz',
      phone: '0917-555-1234',
      email: 'juan@example.com',
      profile: 'https://facebook.com/juan.dc',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Maria Santos',
      phone: '0918-888-5678',
      email: 'maria@example.com',
      profile: 'https://facebook.com/maria.santos',
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ]);
}
