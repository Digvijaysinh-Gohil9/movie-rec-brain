-- ─── Ratings ──────────────────────────────────────────────────────────────────
create table if not exists public.ratings (
  id           text        not null,
  user_id      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  tmdb_id      integer     not null,
  media_type   text        not null check (media_type in ('movie', 'tv')),
  title        text        not null,
  poster_path  text,
  genre_ids    integer[]   not null default '{}',
  score        integer     not null check (score between 1 and 5),
  rated_at     timestamptz not null default now(),
  primary key (id, user_id)
);
alter table public.ratings enable row level security;
create policy "Own ratings" on public.ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Watchlist ────────────────────────────────────────────────────────────────
create table if not exists public.watchlist (
  id            text        not null,
  user_id       uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  tmdb_id       integer     not null,
  media_type    text        not null check (media_type in ('movie', 'tv')),
  title         text        not null,
  poster_path   text,
  overview      text        not null default '',
  release_year  text        not null default '',
  vote_average  float       not null default 0,
  genre_ids     integer[]   not null default '{}',
  added_at      timestamptz not null default now(),
  primary key (id, user_id)
);
alter table public.watchlist enable row level security;
create policy "Own watchlist" on public.watchlist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Seen ─────────────────────────────────────────────────────────────────────
create table if not exists public.seen (
  id       text not null,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (id, user_id)
);
alter table public.seen enable row level security;
create policy "Own seen" on public.seen for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Taste profile ────────────────────────────────────────────────────────────
create table if not exists public.taste_profile (
  user_id       uuid        not null default auth.uid() references auth.users(id) on delete cascade primary key,
  genre_weights jsonb       not null default '{}',
  updated_at    timestamptz not null default now()
);
alter table public.taste_profile enable row level security;
create policy "Own taste profile" on public.taste_profile for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
