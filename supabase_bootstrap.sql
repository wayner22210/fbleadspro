-- Extensions
create extension if not exists pgcrypto;

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- fb_contacts table
create table if not exists public.fb_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  profile text,
  status text not null default 'New',
  notes text
);

drop trigger if exists trg_set_updated_at on public.fb_contacts;
create trigger trg_set_updated_at
before update on public.fb_contacts
for each row execute function public.set_updated_at();

-- offer_leads table (if you’re using it)
create table if not exists public.offer_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  name text,
  phone text,
  email text,
  notes text,
  status text not null default 'New'
);

drop trigger if exists trg_set_updated_at on public.offer_leads;
create trigger trg_set_updated_at
before update on public.offer_leads
for each row execute function public.set_updated_at();

-- Optional: stop duplicate contacts by profile URL
create unique index if not exists fb_contacts_profile_unique
on public.fb_contacts (profile)
where profile is not null;

-- Clear Supabase “RLS Disabled” critical warnings
alter table public.fb_contacts enable row level security;
alter table public.offer_leads enable row level security;

-- NOTE:
-- If your app only reads/writes via server API using SUPABASE_SERVICE_ROLE_KEY,
-- this is safe (service role bypasses RLS).
-- If you later query directly from the browser with anon, you’ll need RLS policies.
