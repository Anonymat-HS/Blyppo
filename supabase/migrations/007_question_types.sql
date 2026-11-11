-- Kwizo — migration 007 (question types and reading passages)
-- Run this after 006. Safe to run several times.
--
-- Questions can now be: single (one right option, as before), multiple (several
-- right options), true_false, short (typed answer), cloze (sentence with a blank)
-- or order (items to put in order). Some questions are about a passage (a short
-- text or case study) and are played together.
-- Existing questions stay "single" and keep working unchanged.

begin;

-- Passages: written by the Edge Functions only, read by the course owner
create table if not exists public.quiz_passages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  round int not null default 1 check (round > 0),
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_quiz_passages_course_id on public.quiz_passages (course_id);

alter table public.quiz_passages enable row level security;
drop policy if exists "Users can view passages of own courses" on public.quiz_passages;
create policy "Users can view passages of own courses"
  on public.quiz_passages for select
  to authenticated
  using (course_id in (select id from public.courses where user_id = auth.uid()));

alter table public.quizzes add column if not exists type text not null default 'single';
alter table public.quizzes drop constraint if exists quizzes_type_check;
alter table public.quizzes add constraint quizzes_type_check
  check (type in ('single', 'multiple', 'true_false', 'short', 'cloze', 'order'));

-- Right answers: [option] for single / true_false, the right options for multiple,
-- the accepted spellings for short / cloze, the items in order for order.
-- Null on questions created before this migration (bonne_reponse is used then).
alter table public.quizzes add column if not exists answers jsonb;

alter table public.quizzes add column if not exists passage_id uuid
  references public.quiz_passages on delete cascade;
create index if not exists idx_quizzes_passage_id on public.quizzes (passage_id);

commit;
