-- StudyForge — migration 003 (plans and quotas)
-- Run this after 002. Safe to run several times.
--
-- The free plan keeps the limits the app had until now. Paid plans are rows in
-- `plans`: change a number with a simple UPDATE, no redeploy needed.
-- A user gets a paid plan by inserting a row in `user_plans` (service role only).
-- No row means the free plan.

begin;

create table if not exists plans (
  id text primary key,
  max_file_mb int not null check (max_file_mb > 0),
  daily_courses int not null check (daily_courses > 0),
  max_questions int not null check (max_questions > 0),
  max_cards int not null check (max_cards > 0)
);

-- Placeholder values: tune them here, they are the single source of truth.
insert into plans (id, max_file_mb, daily_courses, max_questions, max_cards) values
  ('free',      20,  10, 20, 30),
  ('premium',   50,  50, 30, 60),
  ('business', 100, 200, 40, 80),
  ('bold',     200, 500, 50, 100)
on conflict (id) do nothing;

alter table plans enable row level security;
drop policy if exists "Plans are readable by signed-in users" on plans;
create policy "Plans are readable by signed-in users"
  on plans for select
  to authenticated
  using (true);

create table if not exists user_plans (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' references plans (id),
  updated_at timestamptz not null default now()
);

-- Read own plan only. No insert/update policy: billing or an admin sets it
-- with the service role, so a user cannot grant themselves a paid plan.
alter table user_plans enable row level security;
drop policy if exists "Users can read own plan" on user_plans;
create policy "Users can read own plan"
  on user_plans for select
  using (user_id = auth.uid());

commit;
