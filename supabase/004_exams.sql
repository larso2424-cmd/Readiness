-- Exams table
create table if not exists exams (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  exam_date    date,
  paper_type   text check (paper_type in ('calculator','no-calculator','both','mock')) default 'both',
  target_grade int  check (target_grade between 1 and 7),
  archived     boolean default false,
  created_at   timestamptz default now()
);

alter table exams enable row level security;

create policy "Users manage own exams"
  on exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Exam topics join table
create table if not exists exam_topics (
  exam_id uuid not null references exams(id) on delete cascade,
  topic   text not null,
  primary key (exam_id, topic)
);

alter table exam_topics enable row level security;

create policy "Users manage own exam topics"
  on exam_topics for all
  using  (exists (select 1 from exams where exams.id = exam_topics.exam_id and exams.user_id = auth.uid()))
  with check (exists (select 1 from exams where exams.id = exam_topics.exam_id and exams.user_id = auth.uid()));

-- Active exam pointer on users table
alter table users add column if not exists active_exam_id uuid references exams(id) on delete set null;
