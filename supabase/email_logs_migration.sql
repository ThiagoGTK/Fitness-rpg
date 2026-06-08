-- ============================================================
-- email_logs — Tabela de controle anti-duplicação de e-mails
-- Rode no Supabase Dashboard → SQL Editor antes de fazer o
-- deploy da edge function streak-reminder
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  -- 'streak_risk' | 'new_user_3d' | 'new_user_7d'
  email_type  text        NOT NULL
);

-- RLS habilitado — somente a service role (edge function) acessa essa tabela
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy para anon/authenticated: bloqueia acesso pelo cliente público
-- A service role bypassa RLS automaticamente

-- Índice para consulta "foi enviado e-mail para esse usuário hoje?"
CREATE INDEX IF NOT EXISTS idx_email_logs_user_sent
  ON public.email_logs (user_id, sent_at DESC);
