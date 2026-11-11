-- Kwizo — migration 005 (reports and feedback)
-- Run this after 004. Safe to run several times.
--
-- Users report a wrong question / card, or send general feedback, from the app.
-- They can only write their own rows: reading them is done by the team in the
-- Supabase dashboard (Table editor → feedback), with the service role.

begin;

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

commit;
