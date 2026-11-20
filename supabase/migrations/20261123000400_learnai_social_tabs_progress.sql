drop function if exists public.get_friend_overview();
create or replace function public.get_friend_overview()
returns table (
  friendship_id uuid,
  display_name text,
  xp numeric,
  status text,
  direction text,
  created_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select f.id,
    coalesce(nullif(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Lernende Person'),
    coalesce(p.xp, 0),
    f.status,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    f.created_at
  from public.friendships f
  left join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join auth.users u
    on u.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.requester_id = auth.uid() or f.addressee_id = auth.uid()
  order by f.created_at desc;
$$;

drop function if exists public.get_clan_members(uuid);
create or replace function public.get_clan_members(p_clan_id uuid)
returns table (
  user_id uuid,
  display_name text,
  xp numeric,
  role text,
  joined_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select m.user_id,
    coalesce(nullif(trim(p.display_name), ''), split_part(u.email, '@', 1), 'Lernende Person'),
    coalesce(p.xp, 0),
    m.role,
    m.joined_at
  from public.clan_memberships m
  left join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.clan_id = p_clan_id
    and exists (
      select 1 from public.clan_memberships viewer
      where viewer.clan_id = p_clan_id and viewer.user_id = auth.uid()
    )
  order by p.xp desc nulls last, m.joined_at;
$$;

grant execute on function public.get_friend_overview() to authenticated;
grant execute on function public.get_clan_members(uuid) to authenticated;

create or replace function public.get_my_clan()
returns table (id uuid, name text, join_code text, xp numeric)
language sql
security definer set search_path = public
as $$
  select c.id, c.name, c.join_code, c.xp
  from public.clans c
  join public.clan_memberships m on m.clan_id = c.id
  where m.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_clan() to authenticated;
