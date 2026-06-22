-- ============================================================
-- Nutrition Module Migration
-- Run this in Supabase SQL Editor or via Management API
-- ============================================================

-- 1. meal_entries — individual food items logged per meal
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  meal_type   TEXT        NOT NULL CHECK (meal_type IN ('breakfast','lunch','snack','dinner','supper')),
  food_name   TEXT        NOT NULL,
  quantity_g  DECIMAL(8,1),
  calories    DECIMAL(8,1) NOT NULL DEFAULT 0,
  protein     DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs       DECIMAL(6,1) NOT NULL DEFAULT 0,
  fats        DECIMAL(6,1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. water_logs — individual water intake entries
CREATE TABLE IF NOT EXISTS public.water_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  amount_ml   INTEGER     NOT NULL CHECK (amount_ml > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. weight_logs — body weight measurements
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg    DECIMAL(5,1) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  measured_at  DATE        NOT NULL,
  notes        TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. nutrition_goals — per-user daily targets and objective
CREATE TABLE IF NOT EXISTS public.nutrition_goals (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  objective      TEXT        NOT NULL DEFAULT 'maintenance'
                             CHECK (objective IN ('muscle_gain','weight_loss','maintenance','definition')),
  daily_calories DECIMAL(8,1) NOT NULL DEFAULT 2000,
  protein_g      DECIMAL(6,1) NOT NULL DEFAULT 150,
  carbs_g        DECIMAL(6,1) NOT NULL DEFAULT 200,
  fats_g         DECIMAL(6,1) NOT NULL DEFAULT 65,
  water_ml       INTEGER     NOT NULL DEFAULT 2500,
  height_cm      DECIMAL(5,1),
  activity_level TEXT        NOT NULL DEFAULT 'moderate',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON public.meal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date   ON public.water_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user       ON public.weight_logs(user_id, measured_at DESC);

-- Enable RLS
ALTER TABLE public.meal_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users manage own meal entries"    ON public.meal_entries;
DROP POLICY IF EXISTS "Users manage own water logs"      ON public.water_logs;
DROP POLICY IF EXISTS "Users manage own weight logs"     ON public.weight_logs;
DROP POLICY IF EXISTS "Users manage own nutrition goals" ON public.nutrition_goals;

CREATE POLICY "Users manage own meal entries"
  ON public.meal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own water logs"
  ON public.water_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own weight logs"
  ON public.weight_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own nutrition goals"
  ON public.nutrition_goals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
