-- Two users with one course each. Used by security.test.sql.
insert into auth.users values ('11111111-1111-1111-1111-111111111111','alice@x'), ('22222222-2222-2222-2222-222222222222','bob@x');
insert into courses (id, user_id, titre, texte_extrait) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Alice course','t'),
 ('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Bob course','t');
insert into quizzes (id, course_id, question, options, bonne_reponse, round) values
 ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Q alice','["a","b","c","d"]','a',1),
 ('bbbbbbbb-1111-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','Q bob','["a","b","c","d"]','a',1);
insert into flashcards (id, course_id, recto, verso) values ('aaaaaaaa-2222-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','r','v');
insert into storage.objects (bucket_id, name) values ('avatars','11111111-1111-1111-1111-111111111111/a.png'), ('avatars','22222222-2222-2222-2222-222222222222/b.png');
