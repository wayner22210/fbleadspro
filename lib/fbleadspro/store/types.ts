// Wayne — FBLeadsPro — Store Types v1
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Closed' | 'Ignored';

export type FbContact = {
  id: string;
  name: string;
  profile?: string | null;
  created_at: string; // ISO
  status: LeadStatus;
  notes?: string | null;
};

export type FbContactUpsert = Partial<FbContact> & {
  name: string;
  id?: string;
  profile?: string | null;
};

export type FbContactPatch = Partial<Pick<FbContact, 'status' | 'notes' | 'name' | 'profile'>>;

export type ContactsStore = {
  getAll(): Promise<FbContact[]>;
  upsertMany(items: FbContactUpsert[]): Promise<{ upserted: number }>;
  patchById(id: string, patch: FbContactPatch): Promise<{ updated: boolean }>;
  deleteById(id: string): Promise<{ deleted: boolean }>;
  clearAll(): Promise<{ cleared: boolean }>;
};
