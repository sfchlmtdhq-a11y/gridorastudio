create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled design',
  width integer not null check (width between 50 and 5000),
  height integer not null check (height between 50 and 5000),
  background text not null default '#ffffff',
  canvas_json jsonb,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_updated_at_idx on public.projects (user_id, updated_at desc);
alter table public.projects enable row level security;

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects" on public.projects for select using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects" on public.projects for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects" on public.projects for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects" on public.projects for delete using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('design-assets', 'design-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can upload their own design assets" on storage.objects;
create policy "Users can upload their own design assets" on storage.objects for insert to authenticated with check (bucket_id = 'design-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Users can update their own design assets" on storage.objects;
create policy "Users can update their own design assets" on storage.objects for update to authenticated using (bucket_id = 'design-assets' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'design-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Users can delete their own design assets" on storage.objects;
create policy "Users can delete their own design assets" on storage.objects for delete to authenticated using (bucket_id = 'design-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "Anyone can view design assets" on storage.objects;
create policy "Anyone can view design assets" on storage.objects for select to public using (bucket_id = 'design-assets');

create or replace function public.set_projects_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_projects_updated_at();
