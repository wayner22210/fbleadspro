import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Closed' | 'Ignored';

export type FbContact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  profile?: string | null;
  created_at: string; // ISO
  status?: LeadStatus | string | null;
  notes?: string | null;
};

type Store = { items: FbContact[] };

const DATA_DIR = path.join(process.cwd(), 'demo-data');
const DATA_FILE = path.join(DATA_DIR, 'fb-contacts.json');

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ items: [] }, null, 2), 'utf8');
}
function readStore(): Store {
  ensureStoreFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) return parsed as Store;
  } catch {}
  return { items: [] };
}
function writeStore(store: Store) {
  ensureStoreFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function asIso(s: any): string {
  if (typeof s === 'string' && s.length > 10) return s;
  return new Date().toISOString();
}

/**
 * CSV (Google Sheets-safe):
 * - UTF-8 BOM
 * - CRLF endings
 * - Proper quoting
 * - Strip newlines inside cells
 * - Phone/email excluded from CSV headers
 */
function toCsv(items: FbContact[]): string {
  const header = ['id', 'name', 'profile', 'created_at', 'status', 'notes'];

  const cleanCell = (v: any) => {
    let s = (v ?? '').toString();
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ');
    s = s.trim();
    if (/[",]/.test(s) || s.includes(' ')) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows = items.map((x) => header.map((k) => cleanCell((x as any)[k])).join(','));
  const bom = '\ufeff';
  return bom + [header.join(','), ...rows, ''].join('\r\n');
}

function safeJsonParse(input: any) {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function normalizeContact(input: any): FbContact {
  const now = new Date().toISOString();
  const id = (typeof input?.id === 'string' && input.id.trim()) || crypto.randomUUID();

  return {
    id,
    name: (input?.name ?? '').toString().trim() || 'Unknown',
    phone: input?.phone ? input.phone.toString() : null,
    email: input?.email ? input.email.toString() : null,
    profile: input?.profile ? input.profile.toString() : null,
    created_at: asIso(input?.created_at ?? now),
    status: (input?.status ?? 'New') as any,
    notes: input?.notes ? input.notes.toString() : null,
  };
}

function upsertByIdOrProfile(store: Store, incoming: FbContact) {
  const idxById = store.items.findIndex((x) => x.id === incoming.id);
  const idxByProfile =
    idxById === -1 && incoming.profile
      ? store.items.findIndex((x) => x.profile && x.profile === incoming.profile)
      : -1;

  const idx = idxById !== -1 ? idxById : idxByProfile;

  if (idx === -1) {
    store.items.push(incoming);
    return { inserted: 1, updated: 0 };
  }

  const existing = store.items[idx];
  store.items[idx] = {
    ...existing,
    ...incoming,
    created_at: incoming.created_at || existing.created_at,
    id: existing.id,
  };
  return { inserted: 0, updated: 1 };
}

function getListFromBody(rawBody: any): any[] {
  const body = safeJsonParse(rawBody);
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.items)) return body.items;
  if (body && typeof body === 'object') return [body];
  return [];
}

function setCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = (req.headers.origin || '').toString();
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function listFromSupabase(): Promise<FbContact[]> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase admin not configured');

  const { data, error } = await sb
    .from('fb_contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name ?? 'Unknown',
    phone: r.phone ?? null,
    email: r.email ?? null,
    profile: r.profile ?? null,
    created_at: asIso(r.created_at),
    status: r.status ?? 'New',
    notes: r.notes ?? null,
  }));
}

async function upsertManySupabase(items: FbContact[]): Promise<{ inserted: number; updated: number }> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase admin not configured');

  const ids = items.map((x) => x.id);
  const { data: existing, error: exErr } = await sb.from('fb_contacts').select('id').in('id', ids);
  if (exErr) throw exErr;

  const existingSet = new Set((existing ?? []).map((x: any) => x.id));
  const inserted = ids.filter((id) => !existingSet.has(id)).length;
  const updated = ids.length - inserted;

  const rows = items.map((x) => ({
    id: x.id,
    name: x.name,
    phone: x.phone ?? null,
    email: x.email ?? null,
    profile: x.profile ?? null,
    created_at: x.created_at,
    status: x.status ?? 'New',
    notes: x.notes ?? null,
  }));

  const { error } = await sb.from('fb_contacts').upsert(rows, { onConflict: 'id' });
  if (error) throw error;

  return { inserted, updated };
}

async function patchOneSupabase(id: string, patch: any) {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase admin not configured');

  const update: any = {};
  if (patch?.name != null) update.name = patch.name.toString();
  if (patch?.profile !== undefined) update.profile = patch.profile ? patch.profile.toString() : null;
  if (patch?.status !== undefined) update.status = patch.status ? patch.status.toString() : null;
  if (patch?.notes !== undefined) update.notes = patch.notes ? patch.notes.toString() : null;
  if (patch?.phone !== undefined) update.phone = patch.phone ? patch.phone.toString() : null;
  if (patch?.email !== undefined) update.email = patch.email ? patch.email.toString() : null;

  const { error } = await sb.from('fb_contacts').update(update).eq('id', id);
  if (error) throw error;
}

async function deleteOneSupabase(id: string) {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase admin not configured');
  const { error } = await sb.from('fb_contacts').delete().eq('id', id);
  if (error) throw error;
}

async function clearAllSupabase() {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase admin not configured');
  const { error } = await sb.from('fb_contacts').delete().neq('id', '__never__');
  if (error) throw error;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    setCors(req, res);

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const useSupabase = !!getSupabaseAdmin();

    // CSV export
    if (req.method === 'GET' && req.query?.format === 'csv') {
      const items = useSupabase
        ? await listFromSupabase()
        : [...readStore().items].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const csv = toCsv(items);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="fb-contacts.csv"');
      res.status(200).send(csv);
      return;
    }

    if (req.method === 'GET') {
      const items = useSupabase
        ? await listFromSupabase()
        : [...readStore().items].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      res.status(200).json({ items });
      return;
    }

    if (req.method === 'POST') {
      const list = getListFromBody(req.body);
      if (!list.length) {
        res.status(400).json({ ok: false, error: 'Empty body (expected items array or object)' });
        return;
      }

      const normalized = list.map(normalizeContact);

      if (useSupabase) {
        const r = await upsertManySupabase(normalized);
        res.status(200).json({ ok: true, inserted: r.inserted, updated: r.updated });
        return;
      }

      const store = readStore();
      let inserted = 0;
      let updated = 0;

      for (const incoming of normalized) {
        const r = upsertByIdOrProfile(store, incoming);
        inserted += r.inserted;
        updated += r.updated;
      }

      writeStore(store);
      res.status(200).json({ ok: true, inserted, updated });
      return;
    }

    if (req.method === 'PATCH') {
      const body = safeJsonParse(req.body) ?? {};
      const id = (body?.id ?? '').toString();
      const patch = body?.patch ?? body;

      if (!id) {
        res.status(400).json({ ok: false, error: 'Missing id' });
        return;
      }

      if (useSupabase) {
        await patchOneSupabase(id, patch);
        res.status(200).json({ ok: true });
        return;
      }

      const store = readStore();
      const idx = store.items.findIndex((x) => x.id === id);
      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'Not found' });
        return;
      }

      store.items[idx] = { ...store.items[idx], ...patch, id };
      writeStore(store);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const all = req.query?.all?.toString() === '1';
      const id = (req.query?.id ?? '').toString();

      if (useSupabase) {
        if (all) {
          await clearAllSupabase();
          res.status(200).json({ ok: true, cleared: true });
          return;
        }
        if (!id) {
          res.status(400).json({ ok: false, error: 'Missing id' });
          return;
        }
        await deleteOneSupabase(id);
        res.status(200).json({ ok: true, deleted: true });
        return;
      }

      const store = readStore();

      if (all) {
        store.items = [];
        writeStore(store);
        res.status(200).json({ ok: true, cleared: true });
        return;
      }

      if (!id) {
        res.status(400).json({ ok: false, error: 'Missing id' });
        return;
      }

      const before = store.items.length;
      store.items = store.items.filter((x) => x.id !== id);
      writeStore(store);

      res.status(200).json({ ok: true, deleted: before !== store.items.length });
      return;
    }

    res.status(405).json({ ok: false, error: `Method not allowed: ${req.method}` });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
