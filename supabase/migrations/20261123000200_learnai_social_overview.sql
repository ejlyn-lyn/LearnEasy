create or replace function public.get_friend_overview()
returns table (
  friendship_id uuid,
  display_name text,
  status text,
  direction text,
  created_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select f.id,
    coalesce(p.display_name, 'Lernende Person'),
    f.status,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    f.created_at
  from public.friendships f
  left join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.requester_id = auth.uid() or f.addressee_id = auth.uid()
  order by f.created_at desc;
$$;

create or replace function public.get_clan_members(p_clan_id uuid)
returns table (
  user_id uuid,
  display_name text,
  role text,
  joined_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select m.user_id, coalesce(p.display_name, 'Lernende Person'), m.role, m.joined_at
  from public.clan_memberships m
  left join public.profiles p on p.id = m.user_id
  where m.clan_id = p_clan_id
    and exists (
      select 1 from public.clan_memberships viewer
      where viewer.clan_id = p_clan_id and viewer.user_id = auth.uid()
    )
  order by m.role desc, m.joined_at;
$$;

grant execute on function public.get_friend_overview() to authenticated;
grant execute on function public.get_clan_members(uuid) to authenticated;
