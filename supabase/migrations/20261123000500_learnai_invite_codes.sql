create table if not exists public.invite_codes (
  code text primary key,
  reserved_email text,
  reserved_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

create or replace function public.reserve_invite(p_code text, p_email text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Z0-9]', '', 'g'));
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(v_code) < 8 or v_email = '' or position('@' in v_email) = 0 then
    return 'UNGUELTIG';
  end if;

  if not exists (
    select 1
    from public.invite_codes
    where code = v_code
      and used_at is null
      and (reserved_email is null or reserved_email = v_email
        or reserved_at < now() - interval '30 minutes')
  ) then
    return 'UNGUELTIG';
  end if;

  update public.invite_codes
  set reserved_email = v_email,
      reserved_at = now()
  where code = v_code
    and used_at is null
    and (reserved_email is null or reserved_email = v_email
      or reserved_at < now() - interval '30 minutes');

  return 'OK';
end;
$$;

create or replace function public.consume_invite(p_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.invite_codes
  set used_by = auth.uid(),
      used_at = now(),
      reserved_email = lower(trim(p_email)),
      reserved_at = coalesce(reserved_at, now())
  where reserved_email = lower(trim(p_email))
    and used_at is null;
end;
$$;

grant execute on function public.reserve_invite(text, text) to anon, authenticated;
grant execute on function public.consume_invite(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(v_email, '@', 1)),
    upper(substr(replace(new.id::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;

  update public.invite_codes
  set used_by = new.id,
      used_at = now()
  where reserved_email = v_email
    and used_at is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
