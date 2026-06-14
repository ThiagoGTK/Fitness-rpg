-- ─── Role System Migration ────────────────────────────────────────────────────
-- Adds: role (admin/trainer/student), trainer_code (PT-001...), must_change_password
-- Run AFTER trainer_module_migration.sql

-- 1. New columns on profiles
alter table public.profiles
  add column if not exists role                 text    not null default 'student'
    check (role in ('admin', 'trainer', 'student')),
  add column if not exists trainer_code         text    unique,
  add column if not exists must_change_password boolean not null default false;

-- 2. Migrate existing is_trainer=true → role='trainer'
update public.profiles
  set role = 'trainer'
  where is_trainer = true and role = 'student';

-- 3. Set the app admin by email
update public.profiles
  set role = 'admin'
  where id = (
    select id from auth.users
    where email = 'thiago.gaitkoski@philozon.com.br'
    limit 1
  );

-- 4. Indexes
create index if not exists idx_profiles_role         on public.profiles(role);
create index if not exists idx_profiles_trainer_code on public.profiles(trainer_code);

-- 5. Enable RLS on profiles (safe to run even if already enabled)
alter table public.profiles enable row level security;

-- 6. RLS Policies (drop first to avoid conflicts)
drop policy if exists "Users read own profile"       on public.profiles;
drop policy if exists "Trainer reads student profiles" on public.profiles;
drop policy if exists "Admin reads all profiles"     on public.profiles;
drop policy if exists "Users update own profile"     on public.profiles;
drop policy if exists "Admin updates any profile"    on public.profiles;
drop policy if exists "Users insert own profile"     on public.profiles;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Trainer reads student profiles"
  on public.profiles for select
  using (trainer_id = auth.uid());

create policy "Admin reads all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admin updates any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
