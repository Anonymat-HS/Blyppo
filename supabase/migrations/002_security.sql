-- StudyForge — migration 002 (security hardening)
-- Run this in the Supabase SQL Editor after 001. Safe to run several times.

begin;

-- =============================================
-- 1. One generation per course and kind, even under concurrent requests
-- =============================================

create table if not exists course_generations (
  course_id uuid not null references courses on delete cascade,
  kind text not null check (kind in ('quiz', 'flashcards')),
  created_at timestamptz not null default now(),
  primary key (course_id, kind)
);

-- Only the Edge Functions (service role) use this table: RLS on, no policy.
alter table course_generations enable row level security;

insert into course_generations (course_id, kind)
  select distinct course_id, 'quiz' from quizzes
  on conflict do nothing;

insert into course_generations (course_id, kind)
  select distinct course_id, 'flashcards' from flashcards
  on conflict do nothing;

-- =============================================
-- 2. Content is written by the Edge Functions only
-- =============================================
-- Courses, questions and cards are created server-side, where size limits,
-- daily quotas and validation apply. The app only reads and deletes them.

drop policy if exists "Users can insert own courses" on courses;
drop policy if exists "Users can update own courses" on courses;
drop policy if exists "Users can insert quizzes for own courses" on quizzes;
drop policy if exists "Users can update quizzes for own courses" on quizzes;
drop policy if exists "Users can insert flashcards for own courses" on flashcards;
drop policy if exists "Users can update flashcards for own courses" on flashcards;

-- =============================================
-- 3. Progress rows can only point to the user's own content
-- =============================================

drop policy if exists "Users can insert own progress" on user_progress;
create policy "Users can insert own progress"
  on user_progress for insert
  with check (
    user_id = auth.uid()
    and quiz_id in (
      select q.id from quizzes q join courses c on c.id = q.course_id
      where c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own progress" on user_progress;
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

drop policy if exists "Users can insert own flashcard progress" on flashcard_progress;
create policy "Users can insert own flashcard progress"
  on flashcard_progress for insert
  with check (
    user_id = auth.uid()
    and flashcard_id in (
      select f.id from flashcards f join courses c on c.id = f.course_id
      where c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own flashcard progress" on flashcard_progress;
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

drop policy if exists "Users can insert own quiz attempts" on quiz_attempts;
create policy "Users can insert own quiz attempts"
  on quiz_attempts for insert
  with check (
    user_id = auth.uid()
    and course_id in (select id from courses where user_id = auth.uid())
  );

-- =============================================
-- 4. Sane values
-- =============================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_score_check') then
    alter table quiz_attempts
      add constraint quiz_attempts_score_check check (total > 0 and score >= 0 and score <= total);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'flashcard_progress_niveau_check') then
    alter table flashcard_progress
      add constraint flashcard_progress_niveau_check
      check (niveau in ('nouveau', 'difficile', 'bien', 'facile'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'flashcard_progress_intervalle_check') then
    alter table flashcard_progress
      add constraint flashcard_progress_intervalle_check check (intervalle_jours >= 0);
  end if;
end $$;

-- =============================================
-- 5. Avatars: images only, 2 MB max (enforced by storage itself)
-- =============================================

update storage.buckets
  set file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  where id = 'avatars';

commit;
