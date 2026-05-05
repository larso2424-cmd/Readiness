-- Per-question attempt tracking
create table if not exists question_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  quiz_attempt_id     uuid references quiz_attempts(id) on delete cascade,
  question_id         uuid not null references generated_questions(id) on delete cascade,
  answer_given        text check (answer_given in ('A','B','C','D')),
  correct             boolean not null,
  time_taken_seconds  int,
  confidence_rating   text check (confidence_rating in ('low','medium','high')),
  attempted_at        timestamptz default now()
);

alter table question_attempts enable row level security;

create policy "Users insert own question attempts"
  on question_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users read own question attempts"
  on question_attempts for select
  using (auth.uid() = user_id);

-- Skill tags + metadata on questions
alter table generated_questions
  add column if not exists skills          text[]  default '{}',
  add column if not exists common_mistakes text,
  add column if not exists estimated_time_seconds int;
