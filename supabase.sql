-- Run this once in the Supabase SQL Editor (dashboard -> SQL Editor -> New query)

create table if not exists kv (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table kv enable row level security;

create policy "users read own rows"
  on kv for select using (auth.uid() = user_id);

create policy "users insert own rows"
  on kv for insert with check (auth.uid() = user_id);

create policy "users update own rows"
  on kv for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own rows"
  on kv for delete using (auth.uid() = user_id);
