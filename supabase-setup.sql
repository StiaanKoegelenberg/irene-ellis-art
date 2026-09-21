-- Workshop sign-ups — the table behind the form on the website.
--
-- HOW TO RUN THIS (once):
--   Supabase dashboard → SQL Editor → New query → paste this → Run.
--
-- The policies at the bottom are the entire security story for this table:
--   * ANYONE may ADD a sign-up. That is the public form; it has to work for
--     a stranger with no account.
--   * NOBODY may READ the list without signing in as the admin.
-- So one visitor can never see another visitor's name or phone number, even
-- though the key in the website's code is public and always will be. The key
-- is an address, not a password — these rules are the lock.

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  surname text not null,
  phone text not null,
  attendees integer not null default 1,
  -- which workshop they picked, as the website showed it to them
  workshop_month text,
  workshop_date text,
  workshop_topic text
);

alter table public.signups enable row level security;

-- Anyone visiting the site may sign up...
drop policy if exists "anyone can sign up" on public.signups;
create policy "anyone can sign up"
  on public.signups for insert
  to anon, authenticated
  with check (true);

-- ...but only a signed-in admin can see who did.
drop policy if exists "only signed-in can read" on public.signups;
create policy "only signed-in can read"
  on public.signups for select
  to authenticated
  using (true);

-- Deliberately NO update or delete policy: with row-level security on, that
-- means nobody can change or remove a sign-up through the website or the
-- admin page. Removing a cancellation is done in the Supabase table editor.
-- Say the word if you would rather Irene could delete them from /admin.


-- ---------------------------------------------------------------------------
-- Site content — the workshop dates and participant counts the admin editor
-- saves. This is here so the whole database can be rebuilt from one file if
-- the project is ever recreated. Running it against a project that already
-- has the table changes nothing.
-- ---------------------------------------------------------------------------

create table if not exists public.site_content (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- the single row the editor reads and writes
insert into public.site_content (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.site_content enable row level security;

-- Anyone may READ the site's content — it is what the website displays.
drop policy if exists "anyone can read content" on public.site_content;
create policy "anyone can read content"
  on public.site_content for select
  to anon, authenticated
  using (true);

-- Only the signed-in admin may change it.
drop policy if exists "only signed-in can write content" on public.site_content;
create policy "only signed-in can write content"
  on public.site_content for update
  to authenticated
  using (true)
  with check (true);
