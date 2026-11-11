-- StudyForge — migration 001 (bugfixes)
-- Run this in the Supabase SQL Editor on a database created with the previous
-- schema.sql. It is safe to run several times: steps already applied are skipped.
-- Fresh installs only need schema.sql + storage.sql.

begin;

-- =============================================
-- 1. Progress rows: one row per (user, item)
-- =============================================

-- Remove duplicates, keeping the most recent row
delete from user_progress a
  using user_progress b
  where a.user_id = b.user_id
    and a.quiz_id = b.quiz_id
    and (a.last_reviewed, a.id) < (b.last_reviewed, b.id);

delete from flashcard_progress a
  using flashcard_progress b
  where a.user_id = b.user_id
    and a.flashcard_id = b.flashcard_id
    and (a.last_reviewed, a.id) < (b.last_reviewed, b.id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_progress_user_quiz_key') then
    alter table user_progress
      add constraint user_progress_user_quiz_key unique (user_id, quiz_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'flashcard_progress_user_flashcard_key') then
    alter table flashcard_progress
      add constraint flashcard_progress_user_flashcard_key unique (user_id, flashcard_id);
  end if;
end $$;

-- Spaced repetition: current interval of the card, in days
alter table flashcard_progress
  add column if not exists intervalle_jours real not null default 0;

-- =============================================
-- 2. Deleting an account must cascade
-- =============================================

alter table courses drop constraint if exists courses_user_id_fkey;
alter table courses add constraint courses_user_id_fkey
  foreign key (user_id) references auth.users on delete cascade;

alter table user_progress drop constraint if exists user_progress_user_id_fkey;
alter table user_progress add constraint user_progress_user_id_fkey
  foreign key (user_id) references auth.users on delete cascade;

alter table flashcard_progress drop constraint if exists flashcard_progress_user_id_fkey;
alter table flashcard_progress add constraint flashcard_progress_user_id_fkey
  foreign key (user_id) references auth.users on delete cascade;

-- =============================================
-- 3. Orphan rows are not allowed
-- =============================================

delete from quizzes where course_id is null;
delete from flashcards where course_id is null;
delete from user_progress where quiz_id is null;
delete from flashcard_progress where flashcard_id is null;

alter table quizzes alter column course_id set not null;
alter table flashcards alter column course_id set not null;
alter table user_progress alter column quiz_id set not null;
alter table flashcard_progress alter column flashcard_id set not null;

-- =============================================
-- 4. Missing delete policies
-- =============================================

drop policy if exists "Users can delete own progress" on user_progress;
create policy "Users can delete own progress"
  on user_progress for delete
  using (user_id = auth.uid());

drop policy if exists "Users can delete own flashcard progress" on flashcard_progress;
create policy "Users can delete own flashcard progress"
  on flashcard_progress for delete
  using (user_id = auth.uid());

-- =============================================
-- 5. History: finished quizzes + daily activity
-- =============================================

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references courses on delete cascade,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);

create table if not exists study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('quiz_answer', 'flashcard_review')),
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_attempts_user_created on quiz_attempts(user_id, created_at);
create index if not exists idx_study_events_user_created on study_events(user_id, created_at);

alter table quiz_attempts enable row level security;
alter table study_events enable row level security;

drop policy if exists "Users can view own quiz attempts" on quiz_attempts;
create policy "Users can view own quiz attempts"
  on quiz_attempts for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own quiz attempts" on quiz_attempts;
create policy "Users can insert own quiz attempts"
  on quiz_attempts for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own quiz attempts" on quiz_attempts;
create policy "Users can delete own quiz attempts"
  on quiz_attempts for delete
  using (user_id = auth.uid());

drop policy if exists "Users can view own study events" on study_events;
create policy "Users can view own study events"
  on study_events for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own study events" on study_events;
create policy "Users can insert own study events"
  on study_events for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own study events" on study_events;
create policy "Users can delete own study events"
  on study_events for delete
  using (user_id = auth.uid());

-- Backfill: keep the activity that is still known (one event per existing row).
-- Only done while the log is empty, so running the migration again adds nothing.
do $$
begin
  if not exists (select 1 from study_events) then
    insert into study_events (user_id, kind, created_at)
      select user_id, 'quiz_answer', last_reviewed from user_progress
      where last_reviewed is not null;

    insert into study_events (user_id, kind, created_at)
      select user_id, 'flashcard_review', last_reviewed from flashcard_progress
      where last_reviewed is not null;
  end if;
end $$;

-- =============================================
-- 6. Avatars: allow removing own files
-- =============================================

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
