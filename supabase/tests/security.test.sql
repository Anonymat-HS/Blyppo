-- Security tests for the database rules (RLS, triggers, quotas).
-- Run with `npm run test:db`. Each test runs in a rolled-back transaction and
-- raises "FAIL ..." when a rule does not hold; psql then stops with an error.
-- Alice = 1111…, Bob = 2222… (see seed.sql).

\set ON_ERROR_STOP 1
\set QUIET 1
-- Only the \echo lines are printed
\o /dev/null

-- Runs `stmt` and fails unless it raises an error.
create or replace function pg_temp.expect_error(label text, stmt text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    return;
  end;
  raise exception 'FAIL %: expected an error, the statement succeeded', label;
end;
$$;

create or replace function pg_temp.expect(label text, ok boolean) returns void
language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAIL %', label;
  end if;
end;
$$;

-- ── Attacks that must be blocked ──────────────────────────────────────────

\echo 'anonymous visitor reads nothing and writes nothing'
begin; set local role anon;
select pg_temp.expect('anon reads courses', (select count(*) from courses) = 0);
select pg_temp.expect('anon lists avatars', (select count(*) from storage.objects) = 0);
select pg_temp.expect_error('anon inserts a course',
  $$insert into courses (user_id, titre, texte_extrait) values ('11111111-1111-1111-1111-111111111111','x','x')$$);
select pg_temp.expect_error('anon sends feedback', $$insert into feedback (kind, message) values ('general','x')$$);
rollback;

\echo 'a user cannot see or change another user''s data'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect('alice sees bob courses', (select count(*) from courses where user_id = '22222222-2222-2222-2222-222222222222') = 0);
select pg_temp.expect('alice sees bob quizzes', (select count(*) from quizzes where course_id = 'bbbbbbbb-0000-0000-0000-000000000001') = 0);
select pg_temp.expect_error('alice reports bob question',
  $$insert into feedback (kind, quiz_id, reason) values ('question','bbbbbbbb-1111-0000-0000-000000000001','other')$$);
select pg_temp.expect_error('alice uploads into bob folder',
  $$insert into storage.objects (bucket_id, name) values ('avatars','22222222-2222-2222-2222-222222222222/avatar')$$);
delete from courses where user_id = '22222222-2222-2222-2222-222222222222';
update storage.objects set name = '11111111-1111-1111-1111-111111111111/stolen' where name like '22222222%';
reset role;
select pg_temp.expect('alice deletes bob course', (select count(*) from courses where user_id = '22222222-2222-2222-2222-222222222222') = 1);
select pg_temp.expect('alice moves bob avatar', (select count(*) from storage.objects where name like '22222222%') = 1);
rollback;

\echo 'reading passages are private and server-written'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect('alice sees her passage only', (select count(*) = 1 and bool_and(text = 'Alice case study') from quiz_passages));
select pg_temp.expect_error('alice writes a passage',
  $$insert into quiz_passages (course_id, text) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x')$$);
select pg_temp.expect_error('alice writes a question',
  $$insert into quizzes (course_id, question, options, bonne_reponse) values ('aaaaaaaa-0000-0000-0000-000000000001','q','[]','a')$$);
rollback;
begin; set local role anon;
select pg_temp.expect('anon reads passages', (select count(*) from quiz_passages) = 0);
rollback;

\echo 'a user cannot give themselves a plan or more quota'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect_error('alice grants herself a plan', $$insert into user_plans (user_id, plan) values (auth.uid(),'bold')$$);
select pg_temp.expect_error('alice calls claim_usage', $$select public.claim_usage(auth.uid(),'course_upload',1000,86400)$$);
select pg_temp.expect('alice reads usage_events', (select count(*) from usage_events) = 0);
update plans set max_rounds = 999;
delete from quizzes where course_id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from flashcards where course_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select pg_temp.expect('alice edits plans', (select count(*) from plans where max_rounds = 999) = 0);
select pg_temp.expect('alice deletes her questions one by one', (select count(*) from quizzes where course_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select pg_temp.expect('alice deletes her cards one by one', (select count(*) from flashcards where course_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
rollback;

\echo 'dates are set by the server'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into feedback (kind, message, created_at) values ('general', 'backdated', '2000-01-01');
insert into study_events (user_id, kind, created_at) values (auth.uid(), 'quiz_answer', now() - interval '300 days');
insert into quiz_attempts (user_id, course_id, score, total, created_at)
  values (auth.uid(), 'aaaaaaaa-0000-0000-0000-000000000001', 1, 2, '2000-01-01');
reset role;
select pg_temp.expect('feedback date forced', (select bool_and(created_at > now() - interval '1 minute') from feedback));
select pg_temp.expect('study event date forced', (select bool_and(created_at > now() - interval '1 minute') from study_events));
select pg_temp.expect('quiz attempt date forced', (select bool_and(created_at > now() - interval '1 minute') from quiz_attempts));
rollback;

\echo 'feedback is limited to 30 a day'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin for i in 1..30 loop insert into feedback (kind, message) values ('general', 'm' || i); end loop; end $$;
select pg_temp.expect_error('31st feedback of the day', $$insert into feedback (kind, message) values ('general','m31')$$);
rollback;

\echo 'quotas cannot be reset by deleting content, and hold under concurrency'
begin; set local role service_role;
select pg_temp.expect('claim 1', public.claim_usage('22222222-2222-2222-2222-222222222222','generation',2,3600) = 1);
select pg_temp.expect('claim 2', public.claim_usage('22222222-2222-2222-2222-222222222222','generation',2,3600) = 2);
select pg_temp.expect('claim 3 refused', public.claim_usage('22222222-2222-2222-2222-222222222222','generation',2,3600) = -1);
select pg_temp.expect('other user unaffected', public.claim_usage('11111111-1111-1111-1111-111111111111','generation',2,3600) = 1);
select pg_temp.expect('upload', public.claim_usage('22222222-2222-2222-2222-222222222222','course_upload',1,86400) = 1);
reset role;
delete from courses where user_id = '22222222-2222-2222-2222-222222222222';
set local role service_role;
select pg_temp.expect('upload after deleting the course still refused',
  public.claim_usage('22222222-2222-2222-2222-222222222222','course_upload',1,86400) = -1);
rollback;

-- ── Normal use that must keep working ─────────────────────────────────────

\echo 'a user reports their own question and card, and sends feedback'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into feedback (kind, quiz_id, reason) values ('question','aaaaaaaa-1111-0000-0000-000000000001','wrong_answer');
insert into feedback (kind, flashcard_id, reason) values ('flashcard','aaaaaaaa-2222-0000-0000-000000000001','typo');
insert into feedback (kind, rating, message) values ('general', 5, 'great');
reset role;
select pg_temp.expect('3 feedback rows owned by alice',
  (select count(*) = 3 and bool_and(user_id = '11111111-1111-1111-1111-111111111111') from feedback));
rollback;

\echo 'a course with a report can still be deleted, and so can the account'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into feedback (kind, quiz_id, reason) values ('question','aaaaaaaa-1111-0000-0000-000000000001','wrong_answer');
delete from courses where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.expect('course deleted', (select count(*) from courses where user_id = auth.uid()) = 0);
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect('account data gone',
  (select count(*) from feedback) = 0 and (select count(*) from usage_events where user_id = '11111111-1111-1111-1111-111111111111') = 0);
rollback;

\echo 'a user manages their own avatar and studies normally'
begin; set local role authenticated; set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect('alice sees her own avatar file', (select count(*) from storage.objects) = 1);
insert into storage.objects (bucket_id, name) values ('avatars', '11111111-1111-1111-1111-111111111111/avatar');
insert into user_progress (user_id, quiz_id, correct, tentatives) values (auth.uid(), 'aaaaaaaa-1111-0000-0000-000000000001', true, 1);
insert into study_events (user_id, kind) values (auth.uid(), 'quiz_answer');
insert into quiz_attempts (user_id, course_id, score, total) values (auth.uid(), 'aaaaaaaa-0000-0000-0000-000000000001', 3, 4);
select pg_temp.expect('progress saved', (select count(*) from user_progress) = 1 and (select count(*) from quiz_attempts) = 1);
select pg_temp.expect('alice reads the plans', (select count(*) from plans) > 0);
rollback;

\echo 'ALL DATABASE SECURITY TESTS PASSED'
