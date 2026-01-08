// Wayne — FBLeadsPro — Store Selector v1
import type { ContactsStore } from './types';
import { createFileStore } from './fileStore';
import { createSupabaseStore } from './supabaseStore';

function hasEnv(name: string): boolean {
  const v = process.env[name];
  return !!(v && v.trim());
}

export function getContactsStore(): ContactsStore {
  // If Supabase env vars exist, use Supabase. Otherwise fall back to file storage.
  if (hasEnv('SUPABASE_URL') && hasEnv('SUPABASE_SERVICE_ROLE_KEY')) {
    return createSupabaseStore();
  }
  return createFileStore();
}
