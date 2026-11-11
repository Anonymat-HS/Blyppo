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

create policy "Users can delete quizzes for own courses"
  on quizzes for delete
  using (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

-- flashcards: accessible via course ownership
create policy "Users can view flashcards for own courses"
  on flashcards for select
  using (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

create policy "Users can delete flashcards for own courses"
  on flashcards for delete
  using (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

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
  created_at timestamptz not null default now(),
  check (kind <> 'question' or quiz_id is not null),
  check (kind <> 'flashcard' or flashcard_id is not null)
);

create index if not exists idx_feedback_created_at on feedback (created_at desc);

alter table feedback enable row level security;
drop policy if exists "Users can send feedback" on feedback;
create policy "Users can send feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- At most 30 messages per user per day, so a script cannot flood the table
create or replace function feedback_daily_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from feedback
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many messages today, please try again tomorrow.';
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_daily_limit on feedback;
create trigger feedback_daily_limit before insert on feedback
  for each row execute function feedback_daily_limit();
