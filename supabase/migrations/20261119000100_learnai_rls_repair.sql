do $$
begin
  alter table public.profiles enable row level security;
  alter table public.modules enable row level security;
  alter table public.sessions enable row level security;
  alter table public.materials enable row level security;

  grant usage on schema public to authenticated;
  grant select, insert, update, delete on public.profiles to authenticated;
  grant select, insert, update, delete on public.modules to authenticated;
  grant select, insert, update, delete on public.sessions to authenticated;
  grant select, insert, update, delete on public.materials to authenticated;

  execute 'drop policy if exists "Users manage own modules" on public.modules';
  execute 'create policy "Users manage own modules" on public.modules for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';

  execute 'drop policy if exists "Users manage own sessions" on public.sessions';
  execute 'create policy "Users manage own sessions" on public.sessions for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';

  execute 'drop policy if exists "Users manage own materials" on public.materials';
  execute 'create policy "Users manage own materials" on public.materials for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)';

  execute 'drop policy if exists "Users read own profile" on public.profiles';
  execute 'drop policy if exists "Users update own profile" on public.profiles';
  execute 'drop policy if exists "Users insert own profile" on public.profiles';
  execute 'create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id)';
  execute 'create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)';
  execute 'create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id)';
end;
$$;
