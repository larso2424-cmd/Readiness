-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
create type calc_type as enum ('calc', 'no_calc');
create type difficulty as enum ('easy', 'medium', 'hard');
create type answer_choice as enum ('A', 'B', 'C', 'D');
create type question_status as enum ('pending_review', 'approved', 'rejected');
create type verification_method as enum ('sympy', 'ai_only', 'failed');
create type generation_outcome as enum (
  'generated',
  'failed_haiku_verification',
  'failed_sympy_verification',
  'failed_similarity_check',
  'approved',
  'rejected'
);

-- ─────────────────────────────────────────
-- SUBTOPICS
-- ─────────────────────────────────────────
create table subtopics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  subtopic text not null,
  display_order int not null,
  unique (topic, subtopic)
);

-- ─────────────────────────────────────────
-- REFERENCE QUESTIONS (private — never served to users)
-- ─────────────────────────────────────────
create table reference_questions (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references subtopics(id) on delete cascade,
  calc_type calc_type not null,
  marks int not null,
  question_text text not null,
  answer text,
  difficulty difficulty,
  source_notes text
);

-- ─────────────────────────────────────────
-- GENERATED QUESTIONS (AI-generated, served after approval)
-- ─────────────────────────────────────────
create table generated_questions (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references subtopics(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer answer_choice not null,
  explanation text not null,
  difficulty difficulty not null,
  status question_status not null default 'pending_review',
  verification_method verification_method not null default 'ai_only',
  generation_outcome generation_outcome not null default 'generated',
  similarity_check_passed boolean not null default false,
  generation_prompt text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- Auto-create user row on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- QUIZ ATTEMPTS
-- ─────────────────────────────────────────
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subtopics_selected uuid[] not null,
  questions_asked jsonb not null default '[]',
  answers_given jsonb not null default '[]',
  correct_count int not null default 0,
  total_count int not null default 0,
  readiness_score int not null default 0,
  weak_subtopics uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table reference_questions enable row level security;
-- No select policy — reference_questions are never readable via client

alter table generated_questions enable row level security;
create policy "approved questions readable by all authenticated users"
  on generated_questions for select
  to authenticated
  using (status = 'approved');

alter table users enable row level security;
create policy "users can read own profile"
  on users for select
  to authenticated
  using (id = auth.uid());

alter table quiz_attempts enable row level security;
create policy "users can read own attempts"
  on quiz_attempts for select
  to authenticated
  using (user_id = auth.uid());
create policy "users can insert own attempts"
  on quiz_attempts for insert
  to authenticated
  with check (user_id = auth.uid());
