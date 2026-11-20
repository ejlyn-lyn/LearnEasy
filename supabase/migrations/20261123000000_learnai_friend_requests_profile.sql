alter table public.profiles
  add column if not exists birthday date;

alter table public.profiles
  drop constraint if exists profiles_theme_check,
  drop constraint if exists profiles_accent_check,
  add constraint profiles_theme_check check (theme in ('dark', 'light', 'midnight', 'forest', 'sunset')),
  add constraint profiles_accent_check check (accent in ('violet', 'cyan', 'blue', 'rose', 'amber', 'green', 'orange'));

alter table public.profiles
  drop constraint if exists profiles_display_name_length_check,
  add constraint profiles_display_name_length_check
    check (display_name is null or char_length(trim(display_name)) between 1 and 50);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('friend_request', 'friend_request_accepted')),
  friendship_id uuid references public.friendships(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);

create or replace function public.add_friend(p_friend_code text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_target uuid;
  v_code text := regexp_replace(upper(coalesce(p_friend_code, '')), '[^A-Z0-9]', '', 'g');
begin
  if auth.uid() is null or length(v_code) <> 8 then
    return 'UNBEKANNT';
  end if;

  select id into v_target
  from public.profiles
  where upper(friend_code) = v_code;

  if v_target is null then
    return 'UNBEKANNT';
  end if;
  if v_target = auth.uid() then
    return 'SELBST';
  end if;
  if exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = v_target)
        or (requester_id = v_target and addressee_id = auth.uid()))
  ) then
    return 'BEREITS';
  end if;
  if exists (
    select 1 from public.friendships
    where status = 'pending'
      and requester_id = v_target and addressee_id = auth.uid()
  ) then
    return 'ANFRAGE_VORHANDEN';
  end if;
  if exists (
    select 1 from public.friendships
    where status = 'pending'
      and requester_id = auth.uid() and addressee_id = v_target
  ) then
    return 'BEREITS_ANGEFRAGT';
  end if;

  insert into public.friendships(requester_id, addressee_id, status)
  values (auth.uid(), v_target, 'pending');
  return 'OK';
end;
$$;

create or replace function public.accept_friend_request(p_friendship_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_requester uuid;
begin
  update public.friendships
  set status = 'accepted'
  where id = p_friendship_id
    and addressee_id = auth.uid()
    and status = 'pending'
  returning requester_id into v_requester;

  if v_requester is null then
    return 'UNBEKANNT';
  end if;

  insert into public.notifications(recipient_id, actor_id, kind, friendship_id, message)
  values (v_requester, auth.uid(), 'friend_request_accepted', p_friendship_id, 'Deine Freundschaftsanfrage wurde angenommen.');
  return 'OK';
end;
$$;

create or replace function public.reject_friend_request(p_friendship_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.friendships
  where id = p_friendship_id
    and addressee_id = auth.uid()
    and status = 'pending';
  return case when found then 'OK' else 'UNBEKANNT' end;
end;
$$;

create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
begin
  if new.status = 'pending' then
    select coalesce(display_name, 'Jemand') into v_name
    from public.profiles where id = new.requester_id;
    insert into public.notifications(recipient_id, actor_id, kind, friendship_id, message)
    values (new.addressee_id, new.requester_id, 'friend_request', new.id,
      coalesce(v_name, 'Jemand') || ' möchte dich als Freund hinzufügen.');
  end if;
  return new;
end;
$$;

drop trigger if exists friendship_request_notification on public.friendships;
create trigger friendship_request_notification
  after insert on public.friendships
  for each row execute function public.notify_friend_request();

grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.reject_friend_request(uuid) to authenticated;
