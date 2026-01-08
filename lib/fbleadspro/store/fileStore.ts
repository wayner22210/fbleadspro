// Wayne — FBLeadsPro — File Store v1
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ContactsStore, FbContact, FbContactPatch, FbContactUpsert, LeadStatus } from './types';

type FileShape = {
  items: FbContact[];
};

function nowIso() {
  return new Date().toISOString();
}

function safeStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function deriveId(input: { id?: string; profile?: string | null }): string {
  const given = safeStr(input.id);
  if (given) return given;
  const profile = safeStr(input.profile);
  if (profile) {
    return crypto.createHash('sha1').update(profile).digest('hex').slice(0, 16);
  }
  // Last resort: random stable enough for local
  return crypto.randomBytes(8).toString('hex');
}

function normalizeStatus(s: unknown): LeadStatus {
  const v = safeStr(s) as LeadStatus | null;
  if (!v) return 'New';
  if (v === 'New' || v === 'Contacted' || v === 'Qualified' || v === 'Closed' || v === 'Ignored') return v;
  return 'New';
}

/**
 * To avoid breaking your existing “working” store, we:
 * - Prefer FBLEADSPRO_STORE_PATH if set
 * - Otherwise, pick the first existing file among common candidates
 * - If none exist, create data/fb-contacts.json
 */
function resolveStorePath(): string {
  const envPath = safeStr(process.env.FBLEADSPRO_STORE_PATH);
  if (envPath) return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);

  const candidates = [
    path.join(process.cwd(), 'data', 'fb-contacts.json'),
    path.join(process.cwd(), 'data', 'fb_contacts.json'),
    path.join(process.cwd(), '.data', 'fb-contacts.json'),
    path.join(process.cwd(), '.data', 'fb_contacts.json'),
    path.join(process.cwd(), 'data', 'contacts.json'),
    path.join(process.cwd(), 'data', 'store.json'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }

  return path.join(process.cwd(), 'data', 'fb-contacts.json');
}

function ensureDirFor(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readFileShape(filePath: string): FileShape {
  try {
    if (!fs.existsSync(filePath)) return { items: [] };
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Back-compat: if old file was just an array
      return { items: parsed as FbContact[] };
    }
    if (parsed && Array.isArray(parsed.items)) return { items: parsed.items as FbContact[] };
    return { items: [] };
  } catch {
    return { items: [] };
  }
}

function writeFileShape(filePath: string, shape: FileShape) {
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, JSON.stringify(shape, null, 2), 'utf8');
}

export function createFileStore(): ContactsStore {
  const storePath = resolveStorePath();

  return {
    async getAll() {
      const shape = readFileShape(storePath);
      const items = (shape.items || []).filter(Boolean);
      // newest first
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return items;
    },

    async upsertMany(items: FbContactUpsert[]) {
      const shape = readFileShape(storePath);
      const map = new Map<string, FbContact>();

      for (const existing of shape.items || []) {
        if (existing?.id) map.set(existing.id, existing);
      }

      let upserted = 0;

      for (const raw of items || []) {
        if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) continue;

        const id = deriveId({ id: raw.id, profile: raw.profile ?? null });
        const prev = map.get(id);

        const merged: FbContact = {
          id,
          name: raw.name.trim(),
          profile: safeStr(raw.profile) ?? prev?.profile ?? null,
          created_at: prev?.created_at ?? safeStr(raw.created_at) ?? nowIso(),
          status: normalizeStatus(raw.status ?? prev?.status ?? 'New'),
          notes: safeStr(raw.notes) ?? prev?.notes ?? null,
        };

        map.set(id, merged);
        upserted += 1;
      }

      const out = Array.from(map.values());
      out.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      writeFileShape(storePath, { items: out });

      return { upserted };
    },

    async patchById(id: string, patch: FbContactPatch) {
      const shape = readFileShape(storePath);
      let updated = false;

      const out = (shape.items || []).map((c) => {
        if (!c || c.id !== id) return c;

        updated = true;
        const next: FbContact = {
          ...c,
          name: typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : c.name,
          profile: patch.profile !== undefined ? (safeStr(patch.profile) ?? null) : c.profile ?? null,
          status: patch.status !== undefined ? normalizeStatus(patch.status) : c.status,
          notes: patch.notes !== undefined ? (safeStr(patch.notes) ?? null) : c.notes ?? null,
        };
        return next;
      });

      out.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      writeFileShape(storePath, { items: out });

      return { updated };
    },

    async deleteById(id: string) {
      const shape = readFileShape(storePath);
      const before = (shape.items || []).length;
      const out = (shape.items || []).filter((c) => c?.id !== id);
      const after = out.length;

      writeFileShape(storePath, { items: out });
      return { deleted: after !== before };
    },

    async clearAll() {
      writeFileShape(storePath, { items: [] });
      return { cleared: true };
    },
  };
}
