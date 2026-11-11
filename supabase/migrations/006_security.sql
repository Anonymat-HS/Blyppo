-- Kwizo — migration 006 (security hardening, from the November 2026 audit)
-- Run this after 005. Safe to run several times.
--
-- 1. Usage quotas that deleting content cannot reset (usage_events + claim_usage)
-- 2. Questions and cards can no longer be deleted one by one (only with their course)
-- 3. Feedback: no longer blocks course / account deletion; server-set user, date,
--    ownership check and an atomic daily limit
-- 4. Study history dates are set by the server
-- 5. Avatars: a user can only list their own folder

begin;

-- ── 1. Usage quotas ────────────────────────────────────────────────────────
-- Append-only log of costly actions. Not linked to courses, so deleting a course
-- does not give its quota back. Service role only (no policy).
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('course_upload', 'generation')),
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_events_user_kind_time
  on public.usage_events (user_id, kind, created_at desc);
alter table public.usage_events enable row level security;

-- Courses uploaded in the last 24 hours keep counting after the switch
insert into public.usage_events (user_id, kind, created_at)
select c.user_id, 'course_upload', c.created_at
from public.courses c
where c.created_at > now() - interval '1 day'
  and not exists (select 1 from public.usage_events u where u.user_id = c.user_id and u.kind = 'course_upload');

-- Records one use if the user is under the limit for the window, atomically
-- (a per-user lock serialises parallel requests). Returns the number of uses in
-- the window including this one, or -1 when the limit is reached.
create or replace function public.claim_usage(
  p_user uuid,
  p_kind text,
  p_limit int,
  p_window_seconds int
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  used int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text || ':' || p_kind));
  select count(*) into used
  from public.usage_events
  where user_id = p_user
    and kind = p_kind
    and created_at > now() - make_interval(secs => p_window_seconds);
  if used >= p_limit then
    return -1;
  end if;
  insert into public.usage_events (user_id, kind) values (p_user, p_kind);
  return used + 1;
end;
$$;

-- Only the Edge Functions (service role) may call it
revoke all on function public.claim_usage(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.claim_usage(uuid, text, int, int) to service_role;

-- ── 2. Questions and cards are deleted only with their course ─────────────
-- Deleting rows directly lowered the generation round and bypassed max_rounds.
drop policy if exists "Users can delete quizzes for own courses" on public.quizzes;
drop policy if exists "Users can delete flashcards for own courses" on public.flashcards;

-- ── 3. Feedback ────────────────────────────────────────────────────────────
-- The "question needs quiz_id" checks made ON DELETE SET NULL fail, so a user who
-- had reported a question could not delete the course or their account.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.feedback'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) like '%quiz_id IS NOT NULL%'
        or pg_get_constraintdef(oid) like '%flashcard_id IS NOT NULL%')
  loop
    execute format('alter table public.feedback drop constraint %I', c.conname);
  end loop;
end;
$$;

-- Server-side rules on every new feedback row: the sender and the date come from
-- the session, a report must target the sender's own question / card, and the
-- 30-per-day limit is counted under a per-user lock.
create or replace function public.feedback_before_insert() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  if new.user_id is null then
    raise exception 'Not signed in';
  end if;

  if new.kind = 'question' then
    new.flashcard_id := null;
    if new.quiz_id is null or not exists (
      select 1 from public.quizzes q join public.courses c on c.id = q.course_id
      where q.id = new.quiz_id and c.user_id = new.user_id
    ) then
      raise exception 'Unknown question';
    end if;
  elsif new.kind = 'flashcard' then
    new.quiz_id := null;
    if new.flashcard_id is null or not exists (
      select 1 from public.flashcards f join public.courses c on c.id = f.course_id
      where f.id = new.flashcard_id and c.user_id = new.user_id
    ) then
      raise exception 'Unknown flashcard';
    end if;
  else
    new.quiz_id := null;
    new.flashcard_id := null;
  end if;

  perform pg_advisory_xact_lock(hashtext('feedback:' || new.user_id::text));
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many messages today, please try again tomorrow.';
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_daily_limit on public.feedback;
drop function if exists public.feedback_daily_limit();
drop trigger if exists feedback_before_insert on public.feedback;
create trigger feedback_before_insert before insert on public.feedback
  for each row execute function public.feedback_before_insert();

-- ── 4. Study history dates come from the server ───────────────────────────
-- Backdated events could fake a streak.
create or replace function public.set_created_at_now() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists study_events_created_at on public.study_events;
create trigger study_events_created_at before insert on public.study_events
  for each row execute function public.set_created_at_now();

drop trigger if exists quiz_attempts_created_at on public.quiz_attempts;
create trigger quiz_attempts_created_at before insert on public.quiz_attempts
  for each row execute function public.set_created_at_now();

-- ── 5. Avatars: list only your own folder ─────────────────────────────────
-- The bucket stays public, so avatar URLs keep working without any select policy.
-- The old policy let anyone list every user's folder (and so every user id).
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Users can view their own avatar files" on storage.objects;
create policy "Users can view their own avatar files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
