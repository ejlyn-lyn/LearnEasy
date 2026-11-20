create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  title text not null,
  source_type text not null default 'material',
  session_id uuid references public.sessions(id) on delete set null,
  card_count integer not null default 0,
  folder_name text not null default 'Meine Karteikarten',
  created_at timestamptz not null default now()
);

alter table public.flashcard_decks
  add column if not exists session_id uuid references public.sessions(id) on delete set null,
  add column if not exists card_count integer not null default 0,
  add column if not exists folder_name text not null default 'Meine Karteikarten';

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;

drop policy if exists "Users manage own flashcard decks" on public.flashcard_decks;
create policy "Users manage own flashcard decks"
  on public.flashcard_decks for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users manage own flashcards" on public.flashcards;
create policy "Users manage own flashcards"
  on public.flashcards for all to authenticated
  using (exists (
    select 1 from public.flashcard_decks deck
    where deck.id = flashcards.deck_id and deck.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.flashcard_decks deck
    where deck.id = flashcards.deck_id and deck.owner_id = auth.uid()
  ));

grant select, insert, update, delete on public.flashcard_decks to authenticated;
grant select, insert, update, delete on public.flashcards to authenticated;
