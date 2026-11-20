create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  subject text,
  is_it_module boolean not null default false,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  name text not null,
  activity_type text not null default 'lesen',
  privacy text not null default 'private' check (privacy in ('private', 'public')),
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  name text not null,
  file_path text,
  file_type text,
  size_bytes bigint not null default 0,
  ai_status text not null default 'bereit',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.sessions enable row level security;
alter table public.materials enable row level security;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users manage own modules" on public.modules for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users manage own sessions" on public.sessions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users manage own materials" on public.materials for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('learnai-materials', 'learnai-materials', false)
on conflict (id) do nothing;

create policy "Users upload own materials"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'learnai-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users read own materials"
on storage.objects for select
to authenticated
using (
  bucket_id = 'learnai-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete own materials"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'learnai-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
