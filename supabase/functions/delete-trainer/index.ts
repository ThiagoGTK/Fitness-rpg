/**
 * delete-trainer — Remove a personal trainer from the system (admin only)
 *
 * POST body: { trainerId: string }
 *
 * Steps:
 *  1. Verify caller is admin
 *  2. Verify target is a trainer (not admin)
 *  3. Unlink all students (trainer_id → null)
 *  4. Delete trainer's plans + plan exercises (cascade handles exercises)
 *  5. Delete the auth user (cascades to profile, muscles, workouts, etc.)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── Verify caller JWT ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser()
  if (authErr || !caller) return json({ error: 'Unauthorized' }, 401)

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // ── Check caller is admin ──────────────────────────────────────────────────
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return json({ error: 'Apenas o admin pode excluir personal trainers' }, 403)
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null)
  const { trainerId } = (body ?? {}) as { trainerId?: string }
  if (!trainerId) return json({ error: 'trainerId é obrigatório' }, 400)

  // ── Verify target is a trainer ─────────────────────────────────────────────
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role, name')
    .eq('id', trainerId)
    .single()

  if (!targetProfile) return json({ error: 'Personal trainer não encontrado' }, 404)
  if (targetProfile.role !== 'trainer') {
    return json({ error: 'O usuário alvo não é um personal trainer' }, 400)
  }

  // ── Unlink students ────────────────────────────────────────────────────────
  await adminClient
    .from('profiles')
    .update({ trainer_id: null })
    .eq('trainer_id', trainerId)

  // ── Delete trainer plans (cascade removes plan exercises) ──────────────────
  await adminClient
    .from('trainer_plans')
    .delete()
    .eq('trainer_id', trainerId)

  // ── Delete auth user (cascades to profile + all user data) ────────────────
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(trainerId)
  if (deleteErr) {
    console.error('[delete-trainer] deleteUser error:', deleteErr)
    return json({ error: 'Erro ao excluir o usuário' }, 500)
  }

  return json({ ok: true, message: `Personal trainer "${targetProfile.name}" excluído com sucesso.` })
})
