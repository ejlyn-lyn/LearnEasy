alter table public.flashcard_decks
  add column if not exists session_id uuid references public.sessions(id) on delete set null,
  add column if not exists card_count integer not null default 0,
  add column if not exists folder_name text not null default 'Meine Karteikarten';

alter table public.profiles alter column xp type numeric(12,1) using xp::numeric(12,1);
alter table public.clans alter column xp type numeric(12,1) using xp::numeric(12,1);

create or replace function public.award_xp(p_amount numeric)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_xp numeric(12,1);
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

create or replace function public.award_flashcard_xp(p_card_count integer)
returns numeric
language plpgsql
security definer set search_path = public
as $$
begin
  if p_card_count is null or p_card_count < 5 then
    return 0;
  end if;
  return public.award_xp(p_card_count::numeric * 0.5);
end;
$$;

grant execute on function public.award_xp(numeric) to authenticated;
grant execute on function public.award_flashcard_xp(integer) to authenticated;
