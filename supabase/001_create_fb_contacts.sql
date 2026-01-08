-- FBLeadsPro: fb_contacts table (matches /api/fb-contacts contract)

create table if not exists public.fb_contacts (
  id text primary key,
  name text not null,
  phone text,
  email text,
  profile text,
  created_at timestamptz not null default now(),
  status text default 'New',
  notes text
);

create index if not exists fb_contacts_created_at_idx
  on public.fb_contacts (created_at desc);

-- Optional profile-based dedupe (safe even if profile is null)
create unique index if not exists fb_contacts_profile_uniq
  on public.fb_contacts (profile)
  where profile is not null;
