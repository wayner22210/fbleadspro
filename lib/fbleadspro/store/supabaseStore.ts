// Wayne — FBLeadsPro — Supabase Store v1
import { createClient } from '@supabase/supabase-js';
import type { ContactsStore, FbContact, FbContactPatch, FbContactUpsert, LeadStatus } from './types';

function safeStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normalizeStatus(s: unknown): LeadStatus {
  const v = safeStr(s) as LeadStatus | null;
  if (!v) return 'New';
  if (v === 'New' || v === 'Contacted' || v === 'Qualified' || v === 'Closed' || v === 'Ignored') return v;
  return 'New';
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env var: ${name}`);
  return v.trim();
}

type Row = {
  id: string;
  name: string;
  profile: string | null;
  created_at: string;
  status: LeadStatus;
  notes: string | null;
};

export function createSupabaseStore(): ContactsStore {
  const url = mustEnv('SUPABASE_URL');
  const key = mustEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const table = process.env.FBLEADSPRO_SUPABASE_TABLE?.trim() || 'fb_contacts';

  return {
    async getAll() {
      const { data, error } = await supabase
        .from(table)
        .select('id,name,profile,created_at,status,notes')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Supabase getAll error: ${error.message}`);
      const rows = (data || []) as Row[];

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        profile: r.profile ?? null,
        created_at: r.created_at,
        status: normalizeStatus(r.status),
        notes: r.notes ?? null,
      })) as FbContact[];
    },

    async upsertMany(items: FbContactUpsert[]) {
      const payload: Row[] = (items || [])
        .filter((x) => x && typeof x.name === 'string' && x.name.trim() && typeof x.id === 'string' && x.id.trim())
        .map((x) => ({
          id: x.id!.trim(),
          name: x.name.trim(),
          profile: safeStr(x.profile) ?? null,
          created_at: safeStr(x.created_at) ?? new Date().toISOString(),
          status: normalizeStatus(x.status),
          notes: safeStr(x.notes) ?? null,
        }));

      if (!payload.length) return { upserted: 0 };

      // Upsert by primary key id
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Supabase upsert error: ${error.message}`);

      return { upserted: payload.length };
    },

    async patchById(id: string, patch: FbContactPatch) {
      const update: Partial<Row> = {};
      if (patch.name !== undefined && typeof patch.name === 'string' && patch.name.trim()) update.name = patch.name.trim();
      if (patch.profile !== undefined) update.profile = safeStr(patch.profile) ?? null;
      if (patch.status !== undefined) update.status = normalizeStatus(patch.status);
      if (patch.notes !== undefined) update.notes = safeStr(patch.notes) ?? null;

      if (!Object.keys(update).length) return { updated: false };

      const { error } = await supabase.from(table).update(update).eq('id', id);
      if (error) throw new Error(`Supabase patch error: ${error.message}`);

      return { updated: true };
    },

    async deleteById(id: string) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(`Supabase delete error: ${error.message}`);
      return { deleted: true };
    },

    async clearAll() {
      // Safer than TRUNCATE in hosted DB; deletes all rows
      const { error } = await supabase.from(table).delete().neq('id', '__never__');
      if (error) throw new Error(`Supabase clearAll error: ${error.message}`);
      return { cleared: true };
    },
  };
}
