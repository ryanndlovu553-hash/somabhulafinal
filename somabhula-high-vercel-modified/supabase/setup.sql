-- Run this once in the Supabase SQL Editor for the school's project.

create table if not exists public.school_content (
  id integer primary key check (id = 1),
  content jsonb not null default '{"news":[],"events":[],"leaders":[],"photos":[],"videos":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.school_content enable row level security;
revoke all on public.school_content from anon, authenticated;
grant all on public.school_content to service_role;

-- Private uploads are only accessed by the server after the school's own login check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-media',
  'school-media',
  false,
  3145728,
  array['image/jpeg','image/png','image/gif','image/webp','image/avif','video/mp4','video/webm','video/quicktime','video/x-msvideo','video/x-matroska']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
