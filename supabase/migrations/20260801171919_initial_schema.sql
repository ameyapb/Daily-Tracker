-- Daily Tracker: complete schema in one file.
-- Run against a fresh Supabase project to recreate lanes, cards, cards_archive,
-- RLS policies, and the two seeded system lanes.

create table lanes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null,
  is_system boolean not null default false,
  system_type text,
  created_at timestamptz not null default now(),
  constraint lanes_system_type_valid check (system_type = any (array['delayed', 'completed'])),
  constraint lanes_system_type_matches_is_system check (
    (is_system = true and system_type is not null) or
    (is_system = false and system_type is null)
  )
);

create unique index lanes_unique_system_type on lanes (system_type) where system_type is not null;

create table cards (
  id uuid primary key default gen_random_uuid(),
  lane_id uuid not null references lanes (id) on delete cascade,
  name text not null,
  description text,
  remind_at timestamptz,
  status text not null default 'TODO',
  position integer not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint cards_status_valid check (status = any (array['TODO', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']))
);

create index cards_lane_id_idx on cards (lane_id);
create index cards_remind_at_idx on cards (remind_at) where remind_at is not null;

create table cards_archive (
  id uuid primary key default gen_random_uuid(),
  original_card_id uuid not null,
  lane_id uuid references lanes (id) on delete set null,
  name text not null,
  description text,
  remind_at timestamptz,
  status text not null,
  position integer not null,
  created_at timestamptz not null,
  completed_at timestamptz,
  archived_at timestamptz not null default now(),
  constraint cards_archive_status_valid check (status = any (array['TODO', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']))
);

create index cards_archive_original_card_id_idx on cards_archive (original_card_id);

-- Row Level Security: single-user app, no auth, publishable key used directly by the client.
-- Permissive anon policies are intentional, not an oversight.

alter table lanes enable row level security;
alter table cards enable row level security;
alter table cards_archive enable row level security;

create policy "Allow anon full access to lanes" on lanes
  for all to anon using (true) with check (true);

create policy "Allow anon full access to cards" on cards
  for all to anon using (true) with check (true);

create policy "Allow anon full access to cards_archive" on cards_archive
  for all to anon using (true) with check (true);

-- Seed the two system lanes. The app looks these up by system_type at runtime,
-- never by a hardcoded id.

insert into lanes (name, position, is_system, system_type) values
  ('Delayed', -2, true, 'delayed'),
  ('Completed', -1, true, 'completed');
