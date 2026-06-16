-- ─── Trainer / Student Module ───────────────────────────────────────────────

-- Extend profiles for trainer and student relationships.
alter table if exists public.profiles
  add column if not exists email text,
  add column if not exists is_trainer boolean not null default false,
  add column if not exists trainer_id uuid references auth.users(id) on delete set null;

-- Trainer plans assigned to students.
create table if not exists public.trainer_plans (
  id              uuid        primary key default gen_random_uuid(),
  trainer_id      uuid        not null references auth.users(id) on delete cascade,
  student_id      uuid        not null references auth.users(id) on delete cascade,
  plan_name       text        not null default '',
  scheduled_date  text,
  notes           text        not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.trainer_plan_exercises (
  id                    uuid        primary key default gen_random_uuid(),
  plan_id               uuid        not null references public.trainer_plans(id) on delete cascade,
  exercise_id           uuid        references public.exercises(id) on delete set null,
  exercise_name         text        not null default '',
  primary_muscle_id     text        not null default '',
  secondary_muscles     jsonb       not null default '[]'::jsonb,
  exercise_type         text        not null default 'strength',
  sets                  smallint    not null default 3,
  reps                  smallint    not null default 10,
  weight                decimal(7,2)         default 0,
  rest_seconds          smallint,
  notes                 text        not null default '',
  order_index           smallint    not null default 0,
  created_at            timestamptz not null default now()
);

-- Extend session and entry tables to track trainer-prescribed plans.
alter table if exists public.workout_sessions
  add column if not exists trainer_plan_id uuid references public.trainer_plans(id) on delete set null;

alter table if exists public.workout_entries
  add column if not exists trainer_plan_exercise_id uuid references public.trainer_plan_exercises(id) on delete set null;

-- Indexes for common queries.
create index if not exists idx_profiles_trainer_id   on public.profiles(trainer_id);
create index if not exists idx_trainer_plans_trainer  on public.trainer_plans(trainer_id);
create index if not exists idx_trainer_plans_student  on public.trainer_plans(student_id);
create index if not exists idx_trainer_plan_exercises_plan on public.trainer_plan_exercises(plan_id);
create index if not exists idx_workout_sessions_trainer_plan on public.workout_sessions(trainer_plan_id);
create index if not exists idx_workout_entries_trainer_plan_exercise on public.workout_entries(trainer_plan_exercise_id);

-- Enable row-level security only on new trainer tables to protect trainer data.
alter table public.trainer_plans enable row level security;
alter table public.trainer_plan_exercises enable row level security;

create policy "Trainer owns own plans"
  on public.trainer_plans for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "Trainer owns plan exercises"
  on public.trainer_plan_exercises for all
  using (exists (select 1 from public.trainer_plans p where p.id = plan_id and p.trainer_id = auth.uid()))
  with check (exists (select 1 from public.trainer_plans p where p.id = plan_id and p.trainer_id = auth.uid()));

-- Students can read their own prescribed plans and exercises.
create policy "Student reads own plans"
  on public.trainer_plans for select
  using (auth.uid() = student_id);

create policy "Student reads own plan exercises"
  on public.trainer_plan_exercises for select
  using (exists (select 1 from public.trainer_plans p where p.id = plan_id and p.student_id = auth.uid()));

-- Allow trainer to read student profile (needed by loadStudentDetail).
-- Note: relies on RLS on profiles allowing select by trainer; add if profiles table has RLS enabled.
-- If profiles table has no RLS, this is not needed.

-- Allow trainer to read the workout history of their own students
-- (workout_sessions/workout_entries only had an "own data" policy before this).
create policy "Trainer reads student workout sessions"
  on public.workout_sessions for select
  using (exists (select 1 from public.profiles p where p.id = workout_sessions.user_id and p.trainer_id = auth.uid()));

create policy "Trainer reads student workout entries"
  on public.workout_entries for select
  using (exists (
    select 1 from public.workout_sessions s
    join public.profiles p on p.id = s.user_id
    where s.id = workout_entries.session_id and p.trainer_id = auth.uid()
  ));

-- Allow trainer to read the student's exercise library (needed to resolve
-- exercise names by id when comparing a prescribed plan to a logged workout —
-- without this, exercises only had an "own data" policy and the comparison
-- always showed "Não realizou X" since names could never resolve).
create policy "Trainer reads student exercises"
  on public.exercises for select
  using (exists (select 1 from public.profiles p where p.id = exercises.user_id and p.trainer_id = auth.uid()));
