create table if not exists public.flashcard_completions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  card_count integer not null,
  earned_xp numeric(12,1) not null,
  created_at timestamptz not null default now()
);

alter table public.profiles alter column xp type numeric(12,1) using xp::numeric(12,1);
alter table public.clans alter column xp type numeric(12,1) using xp::numeric(12,1);

alter table public.flashcard_completions enable row level security;

drop function if exists public.award_flashcard_xp(integer);
drop function if exists public.award_xp(integer);

drop policy if exists "Users read own flashcard completions" on public.flashcard_completions;
create policy "Users read own flashcard completions"
  on public.flashcard_completions for select to authenticated
  using (auth.uid() = owner_id);

grant select, insert on public.flashcard_completions to authenticated;

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
  set xp = coalesce(xp, 0) + p_amount,
      updated_at = now()
  where id = auth.uid()
  returning xp into v_xp;

  select clan_id into v_clan
  from public.clan_memberships
  where user_id = auth.uid()
  limit 1;

  if v_clan is not null then
    update public.clans
    set xp = coalesce(xp, 0) + p_amount
    where id = v_clan;
  end if;

  return coalesce(v_xp, 0);
end;
$$;

create or replace function public.award_flashcard_xp(p_deck_id uuid, p_card_count integer)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  v_earned numeric(12,1);
  v_new_xp numeric(12,1);
begin
  if p_card_count is null or p_card_count < 5 then
    return 0;
  end if;

  if not exists (
    select 1
    from public.flashcard_decks
    where id = p_deck_id and owner_id = auth.uid()
  ) then
    return 0;
  end if;

  v_earned := p_card_count::numeric * 0.5;
  v_new_xp := public.award_xp(v_earned);

  insert into public.flashcard_completions(deck_id, owner_id, card_count, earned_xp)
  values (p_deck_id, auth.uid(), p_card_count, v_earned);

  return v_new_xp;
end;
$$;

grant execute on function public.award_xp(numeric) to authenticated;
grant execute on function public.award_flashcard_xp(uuid, integer) to authenticated;
