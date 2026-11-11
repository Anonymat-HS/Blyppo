-- StudyForge — Supabase schema
-- Run this in the Supabase SQL Editor (fresh install).
-- Existing databases: run supabase/migrations/*.sql instead.

-- =============================================
-- TABLES
-- =============================================

create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  titre text not null,
  texte_extrait text not null,
  created_at timestamptz default now()
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  question text not null,
  options jsonb not null,
  bonne_reponse text not null,
  explication text,
  -- Generation round that created it (1 at upload, +1 per "new questions")
  round int not null default 1 check (round > 0),
  created_at timestamptz default now()
);

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  recto text not null,
  verso text not null,
  round int not null default 1 check (round > 0),
  created_at timestamptz default now()
);

create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  quiz_id uuid not null references quizzes on delete cascade,
  correct boolean,
  tentatives int default 0,
  last_reviewed timestamptz default now(),
  unique (user_id, quiz_id)
);

create table flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  flashcard_id uuid not null references flashcards on delete cascade,
  niveau text default 'nouveau' check (niveau in ('nouveau', 'difficile', 'bien', 'facile')),
  last_reviewed timestamptz default now(),
  next_review timestamptz,
  intervalle_jours real not null default 0 check (intervalle_jours >= 0),
  unique (user_id, flashcard_id)
);

-- One row per finished quiz (history, never overwritten)
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references courses on delete cascade,
  score int not null,
  total int not null,
  check (total > 0 and score >= 0 and score <= total),
  created_at timestamptz not null default now()
);

-- Claims the generation of a course's quiz or flashcards, so that concurrent
-- requests cannot generate the same content twice. Used by the Edge Functions only.
create table course_generations (
  course_id uuid not null references courses on delete cascade,
  kind text not null check (kind in ('quiz', 'flashcards')),
  round int not null default 1 check (round > 0),
  created_at timestamptz not null default now(),
  primary key (course_id, kind, round)
);

-- Append-only activity log (streak + activity grid)
create table study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('quiz_answer', 'flashcard_review')),
  created_at timestamptz not null default now()
);

-- Plan limits. The free row is the historical baseline; paid rows are tuned
-- with a plain UPDATE (see migrations/003_plans.sql).
create table plans (
  id text primary key,
  max_file_mb int not null check (max_file_mb > 0),
  daily_courses int not null check (daily_courses > 0),
  max_questions int not null check (max_questions > 0),
  max_cards int not null check (max_cards > 0),
  -- Generation rounds per course and per kind (quiz / flashcards)
  max_rounds int not null default 3 check (max_rounds > 0)
);

insert into plans (id, max_file_mb, daily_courses, max_questions, max_cards, max_rounds) values
  ('free',      20,  10, 20, 30,  3),
  ('premium',   50,  50, 30, 60, 10),
  ('business', 100, 200, 40, 80, 25),
  ('bold',     200, 500, 50, 100, 50);

-- No row means the free plan. Written by the service role only.
create table user_plans (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' references plans (id),
  updated_at timestamptz not null default now()
);

-- =============================================
-- INDEXES
-- =============================================

create index idx_courses_user_id on courses(user_id);
create index idx_quizzes_course_id on quizzes(course_id);
create index idx_flashcards_course_id on flashcards(course_id);
create index idx_user_progress_user_id on user_progress(user_id);
create index idx_user_progress_quiz_id on user_progress(quiz_id);
create index idx_flashcard_progress_user_id on flashcard_progress(user_id);
create index idx_flashcard_progress_flashcard_id on flashcard_progress(flashcard_id);
create index idx_quiz_attempts_user_created on quiz_attempts(user_id, created_at);
create index idx_study_events_user_created on study_events(user_id, created_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table courses enable row level security;
alter table quizzes enable row level security;
alter table flashcards enable row level security;
alter table user_progress enable row level security;
alter table flashcard_progress enable row level security;
alter table quiz_attempts enable row level security;
alter table study_events enable row level security;
alter table plans enable row level security;
alter table user_plans enable row level security;
-- No policy: only the service role can use it
alter table course_generations enable row level security;

create policy "Plans are readable by signed-in users"
  on plans for select
  to authenticated
  using (true);

create policy "Users can read own plan"
  on user_plans for select
  using (user_id = auth.uid());

-- Courses, questions and cards are written by the Edge Functions only (service role),
-- where size limits, quotas and validation apply. The app reads and deletes them.

-- courses: user can only see/delete their own
create policy "Users can view own courses"
  on courses for select
  using (user_id = auth.uid());

create policy "Users can delete own courses"
  on courses for delete
  using (user_id = auth.uid());

-- quizzes: accessible via course ownership
create policy "Users can view quizzes for own courses"
  on quizzes for select
  using (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

-- No delete policy: questions / cards go only with their course (migration 006)

-- flashcards: accessible via course ownership
create policy "Users can view flashcards for own courses"
  on flashcards for select
  using (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

-- No delete policy: questions / cards go only with their course (migration 006)

-- user_progress: user can only see/modify their own
create policy "Users can view own progress"
  on user_progress for select
  using (user_id = auth.uid());

create policy "Users can insert own progress"
  on user_progress for insert
  with check (
    user_id = auth.uid()
    and quiz_id in (
      select q.id from quizzes q join courses c on c.id = q.course_id
      where c.user_id = auth.uid()
    )
  );

create policy "Users can update own progress"
  on user_progress for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and quiz_id in (
      select q.id from quizzes q join courses c on c.id = q.course_id
      where c.user_id = auth.uid()
    )
  );

create policy "Users can delete own progress"
  on user_progress for delete
  using (user_id = auth.uid());

-- flashcard_progress: user can only see/modify their own
create policy "Users can view own flashcard progress"
  on flashcard_progress for select
  using (user_id = auth.uid());

create policy "Users can insert own flashcard progress"
  on flashcard_progress for insert
  with check (
    user_id = auth.uid()
    and flashcard_id in (
      select f.id from flashcards f join courses c on c.id = f.course_id
      where c.user_id = auth.uid()
    )
  );

create policy "Users can update own flashcard progress"
  on flashcard_progress for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and flashcard_id in (
      select f.id from flashcards f join courses c on c.id = f.course_id
      where c.user_id = auth.uid()
    )
  );

create policy "Users can delete own flashcard progress"
  on flashcard_progress for delete
  using (user_id = auth.uid());

-- quiz_attempts: user can only see/add/delete their own
create policy "Users can view own quiz attempts"
  on quiz_attempts for select
  using (user_id = auth.uid());

create policy "Users can insert own quiz attempts"
  on quiz_attempts for insert
  with check (
    user_id = auth.uid()
    and course_id in (select id from courses where user_id = auth.uid())
  );

create policy "Users can delete own quiz attempts"
  on quiz_attempts for delete
  using (user_id = auth.uid());

-- study_events: user can only see/add/delete their own
create policy "Users can view own study events"
  on study_events for select
  using (user_id = auth.uid());

create policy "Users can insert own study events"
  on study_events for insert
  with check (user_id = auth.uid());

create policy "Users can delete own study events"
  on study_events for delete
  using (user_id = auth.uid());

-- Reports about a question / card, and general feedback (migration 005).
-- Users can only insert their own rows; the team reads them with the service role.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- 'question' / 'flashcard': a report about one item; 'general': free feedback
  kind text not null check (kind in ('question', 'flashcard', 'general')),
  quiz_id uuid references quizzes on delete set null,
  flashcard_id uuid references flashcards on delete set null,
  reason text check (reason in ('wrong_answer', 'unclear', 'off_topic', 'typo', 'other')),
  rating smallint check (rating between 1 and 5),
  message text check (char_length(message) <= 2000),
  -- Screen the feedback was sent from, e.g. "quiz"
  page text check (char_length(page) <= 50),
  -- Item text at the time of the report, so it stays readable if regenerated
  snapshot text check (char_length(snapshot) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created_at on feedback (created_at desc);

alter table feedback enable row level security;
drop policy if exists "Users can send feedback" on feedback;
create policy "Users can send feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- Security hardening (migration 006)
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

-- ── 3. Feedback ────────────────────────────────────────────────────────────
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
