-- Wayne — FBLeadsPro — Supabase Schema v1
-- Run this in Supabase SQL Editor.

-- Enable pgcrypto for gen_random_uuid if you want it later (not required here)
-- create extension if not exists pgcrypto;

create table if not exists public.fb_contacts (
  id text primary key,
  name text not null,
  profile text null,
  created_at timestamptz not null default now(),
  status text not null default 'New',
  notes text null
);

create index if not exists fb_contacts_created_at_idx on public.fb_contacts (created_at desc);
create unique index if not exists fb_contacts_profile_uniq on public.fb_contacts (profile) where profile is not null;

-- Optional safety: enforce status values using a check constraint
alter table public.fb_contacts
  drop constraint if exists fb_contacts_status_check;

alter table public.fb_contacts
  add constraint fb_contacts_status_check
  check (status in ('New','Contacted','Qualified','Closed','Ignored'));
