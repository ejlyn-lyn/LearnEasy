alter table public.profiles
  add column if not exists friend_code text,
  add column if not exists theme text not null default 'dark',
  add column if not exists accent text not null default 'violet';

create unique index if not exists profiles_friend_code_unique
  on public.profiles(friend_code)
  where friend_code is not null;

update public.profiles
set friend_code = upper(substr(replace(id::text, '-', ''), 1, 8))
where friend_code is null;

alter table public.profiles
  alter column friend_code set not null;

create or replace function public.ensure_profile_friend_code()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.friend_code is null then
    new.friend_code := upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_profile_friend_code_trigger on public.profiles;
create trigger ensure_profile_friend_code_trigger
  before insert or update on public.profiles
  for each row execute function public.ensure_profile_friend_code();

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

drop policy if exists "Users read own friendships" on public.friendships;
create policy "Users read own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists clans_join_code_unique on public.clans(join_code);

create table if not exists public.clan_memberships (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

alter table public.clans enable row level security;
alter table public.clan_memberships enable row level security;

drop policy if exists "Members read clans" on public.clans;
create policy "Members read clans"
  on public.clans for select to authenticated
  using (exists (
    select 1 from public.clan_memberships m
    where m.clan_id = clans.id and m.user_id = auth.uid()
  ));

drop policy if exists "Authenticated read clan leaderboard" on public.clans;
create policy "Authenticated read clan leaderboard"
  on public.clans for select to authenticated
  using (true);

drop policy if exists "Members read memberships" on public.clan_memberships;
create policy "Members read memberships"
  on public.clan_memberships for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.clan_memberships self
      where self.clan_id = clan_memberships.clan_id and self.user_id = auth.uid()
    )
  );

create or replace function public.add_friend(p_friend_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_target uuid;
begin
  select id into v_target
  from public.profiles
  where upper(friend_code) = upper(trim(p_friend_code));

  if v_target is null then
    return 'UNBEKANNT';
  end if;
  if v_target = auth.uid() then
    return 'SELBST';
  end if;

  insert into public.friendships(requester_id, addressee_id, status)
  values (auth.uid(), v_target, 'accepted')
  on conflict (requester_id, addressee_id) do nothing;

  insert into public.friendships(requester_id, addressee_id, status)
  values (v_target, auth.uid(), 'accepted')
  on conflict (requester_id, addressee_id) do nothing;

  return 'OK';
end;
$$;

create or replace function public.create_clan(p_name text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_clan public.clans%rowtype;
  v_code text;
begin
  if exists (select 1 from public.clan_memberships where user_id = auth.uid()) then
    return jsonb_build_object('error', 'Du bist bereits in einem Clan.');
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.clans where join_code = v_code);
  end loop;

  insert into public.clans(name, join_code, owner_id)
  values (trim(p_name), v_code, auth.uid())
  returning * into v_clan;

  insert into public.clan_memberships(clan_id, user_id, role)
  values (v_clan.id, auth.uid(), 'owner');

  return jsonb_build_object('id', v_clan.id, 'name', v_clan.name, 'join_code', v_clan.join_code);
end;
$$;

create or replace function public.join_clan(p_join_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_clan uuid;
begin
  if exists (select 1 from public.clan_memberships where user_id = auth.uid()) then
    return 'BEREITS';
  end if;

  select id into v_clan
  from public.clans
  where upper(join_code) = upper(trim(p_join_code));

  if v_clan is null then
    return 'UNBEKANNT';
  end if;

  insert into public.clan_memberships(clan_id, user_id, role)
  values (v_clan, auth.uid(), 'member');

  return 'OK';
end;
$$;

create or replace function public.award_xp(p_amount integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_xp integer;
  v_clan uuid;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 500 then
    return 0;
  end if;

  update public.profiles
  set xp = xp + p_amount, updated_at = now()
  where id = auth.uid()
  returning xp into v_xp;

  select clan_id into v_clan
  from public.clan_memberships
  where user_id = auth.uid()
  limit 1;

  if v_clan is not null then
    update public.clans set xp = xp + p_amount where id = v_clan;
  end if;

  return coalesce(v_xp, 0);
end;
$$;

grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.create_clan(text) to authenticated;
grant execute on function public.join_clan(text) to authenticated;
grant execute on function public.award_xp(integer) to authenticated;

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  translation text not null,
  source text not null default 'Manuell',
  created_at timestamptz not null default now()
);

alter table public.vocabulary enable row level security;

drop policy if exists "Users manage own vocabulary" on public.vocabulary;
create policy "Users manage own vocabulary"
  on public.vocabulary for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select, insert, update, delete on public.vocabulary to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    upper(substr(replace(new.id::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
