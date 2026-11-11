-- Kwizo — migration 004 (more questions per course)
-- Run this after 003. Safe to run several times.
--
-- A course used to get its quiz and its flashcards generated once. Now each
-- generation is a numbered "round": round 1 at upload, then one more round each
-- time the user asks for new questions or cards, up to the plan's max_rounds.

begin;

-- 1. Every question and card remembers the round that created it
alter table quizzes add column if not exists round int not null default 1 check (round > 0);
alter table flashcards add column if not exists round int not null default 1 check (round > 0);

-- 2. One generation claim per (course, kind, round) instead of per (course, kind)
alter table course_generations add column if not exists round int not null default 1 check (round > 0);
alter table course_generations drop constraint if exists course_generations_pkey;
alter table course_generations add primary key (course_id, kind, round);

-- 3. How many rounds a plan allows per course and per kind (placeholder values)
alter table plans add column if not exists max_rounds int not null default 3 check (max_rounds > 0);
update plans set max_rounds = 3 where id = 'free';
update plans set max_rounds = 10 where id = 'premium';
update plans set max_rounds = 25 where id = 'business';
update plans set max_rounds = 50 where id = 'bold';

commit;
