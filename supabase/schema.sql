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
  created_at timestamptz default now()
);

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  recto text not null,
  verso text not null,
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
  niveau text default 'nouveau',
  last_reviewed timestamptz default now(),
  next_review timestamptz,
  intervalle_jours real not null default 0,
  unique (user_id, flashcard_id)
);

-- One row per finished quiz (history, never overwritten)
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references courses on delete cascade,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);

-- Append-only activity log (streak + activity grid)
create table study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('quiz_answer', 'flashcard_review')),
  created_at timestamptz not null default now()
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

-- courses: user can only see/modify their own
create policy "Users can view own courses"
  on courses for select
  using (user_id = auth.uid());

create policy "Users can insert own courses"
  on courses for insert
  with check (user_id = auth.uid());

create policy "Users can update own courses"
  on courses for update
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

create policy "Users can insert quizzes for own courses"
  on quizzes for insert
  with check (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

create policy "Users can update quizzes for own courses"
  on quizzes for update
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

create policy "Users can insert flashcards for own courses"
  on flashcards for insert
  with check (
    course_id in (
      select id from courses where user_id = auth.uid()
    )
  );

create policy "Users can update flashcards for own courses"
  on flashcards for update
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
  with check (user_id = auth.uid());

create policy "Users can update own progress"
  on user_progress for update
  using (user_id = auth.uid());

create policy "Users can delete own progress"
  on user_progress for delete
  using (user_id = auth.uid());

-- flashcard_progress: user can only see/modify their own
create policy "Users can view own flashcard progress"
  on flashcard_progress for select
  using (user_id = auth.uid());

create policy "Users can insert own flashcard progress"
  on flashcard_progress for insert
  with check (user_id = auth.uid());

create policy "Users can update own flashcard progress"
  on flashcard_progress for update
  using (user_id = auth.uid());

create policy "Users can delete own flashcard progress"
  on flashcard_progress for delete
  using (user_id = auth.uid());

-- quiz_attempts: user can only see/add/delete their own
create policy "Users can view own quiz attempts"
  on quiz_attempts for select
  using (user_id = auth.uid());

create policy "Users can insert own quiz attempts"
  on quiz_attempts for insert
  with check (user_id = auth.uid());

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
