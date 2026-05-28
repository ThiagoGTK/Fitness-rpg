-- ─── Weekly Workout Plans ────────────────────────────────────────────────────
-- One row per user per day-of-week (0 = Monday … 6 = Sunday).
-- Exercises are stored in the child table below.

create table if not exists public.weekly_workout_plans (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete cascade not null,
  day_of_week       smallint    not null check (day_of_week between 0 and 6),
  workout_name      text        not null default '',
  is_rest_day       boolean     not null default false,
  notes             text        not null default '',
  last_completed_date date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, day_of_week)
);

-- ─── Weekly Plan Exercises ────────────────────────────────────────────────────
-- Each exercise slot in a day's plan.  exercise_id is nullable — it points to the
-- user's exercises table when the exercise was picked from the library; NULL when it
-- was typed free-form (name is stored in exercise_name for display purposes only,
-- but completeDay in the store will try to match by name against the library).

create table if not exists public.weekly_plan_exercises (
  id                uuid        primary key default gen_random_uuid(),
  plan_id           uuid        references public.weekly_workout_plans(id) on delete cascade not null,
  user_id           uuid        references auth.users(id) on delete cascade not null,
  exercise_id       uuid        references public.exercises(id) on delete set null,
  exercise_name     text        not null default '',
  primary_muscle_id text        not null default '',
  secondary_muscles jsonb       not null default '[]'::jsonb,
  exercise_type     text        not null default 'strength',
  sets              smallint    not null default 3,
  reps              smallint    not null default 10,
  weight            decimal(7,2)         default 0,
  rest_seconds      smallint,
  notes             text        not null default '',
  order_index       smallint    not null default 0,
  created_at        timestamptz not null default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.weekly_workout_plans  enable row level security;
alter table public.weekly_plan_exercises enable row level security;

create policy "Users manage own weekly plans"
  on public.weekly_workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own plan exercises"
  on public.weekly_plan_exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_weekly_plans_user        on public.weekly_workout_plans(user_id);
create index if not exists idx_weekly_exercises_plan    on public.weekly_plan_exercises(plan_id);
create index if not exists idx_weekly_exercises_user    on public.weekly_plan_exercises(user_id);
