/**
 * create-user — Criação de usuários pelo admin (trainers) ou trainer (students)
 *
 * POST body:
 *   { role: 'trainer' | 'student', name: string, email: string, password: string }
 *
 * Caller must be authenticated:
 *   - admin  → pode criar trainer
 *   - trainer → pode criar student (vinculado a si mesmo)
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

  // ── Load caller profile to check role ─────────────────────────────────────
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: callerProfile, error: profileErr } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (profileErr || !callerProfile) return json({ error: 'Caller profile not found' }, 403)

  const callerRole = callerProfile.role as string

  // ── Parse request body ─────────────────────────────────────────────────────
  const body = await req.json().catch(() => null)
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const { role, name, email, password } = body as {
    role?: string; name?: string; email?: string; password?: string
  }

  if (!role || !name || !email || !password) {
    return json({ error: 'role, name, email e password são obrigatórios' }, 400)
  }
  if (role !== 'trainer' && role !== 'student') {
    return json({ error: 'role deve ser "trainer" ou "student"' }, 400)
  }
  if (password.length < 6) {
    return json({ error: 'Senha deve ter no mínimo 6 caracteres' }, 400)
  }

  // ── Authorization check ────────────────────────────────────────────────────
  if (role === 'trainer' && callerRole !== 'admin') {
    return json({ error: 'Apenas o admin pode criar personal trainers' }, 403)
  }
  if (role === 'student' && callerRole !== 'trainer' && callerRole !== 'admin') {
    return json({ error: 'Apenas um personal trainer pode criar alunos' }, 403)
  }

  // ── Create auth user ───────────────────────────────────────────────────────
  const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true, // skip email confirmation
    user_metadata: { name: name.trim() },
  })

  if (createErr) {
    const msg = createErr.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return json({ error: 'E-mail já cadastrado no sistema' }, 409)
    }
    console.error('[create-user] createUser error:', createErr)
    return json({ error: 'Erro ao criar usuário' }, 500)
  }

  const userId = newUser.user!.id

  // ── Generate trainer_code if creating a trainer ────────────────────────────
  let trainerCode: string | null = null
  if (role === 'trainer') {
    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'trainer')
    trainerCode = `PT-${String((count ?? 0) + 1).padStart(3, '0')}`
  }

  // ── Create profile ─────────────────────────────────────────────────────────
  const profilePayload: Record<string, unknown> = {
    id: userId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    must_change_password: true,
    is_trainer: role === 'trainer',
    level: 1,
    total_xp: 0,
    weekly_xp: 0,
    streak: 0,
    longest_streak: 0,
    joined_at: new Date().toISOString(),
  }

  if (role === 'trainer' && trainerCode) {
    profilePayload.trainer_code = trainerCode
  }

  if (role === 'student') {
    profilePayload.trainer_id = caller.id
  }

  const { error: profileInsertErr } = await adminClient
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })

  if (profileInsertErr) {
    // Roll back auth user on profile failure
    await adminClient.auth.admin.deleteUser(userId)
    console.error('[create-user] profile insert error:', profileInsertErr)
    return json({ error: 'Erro ao criar perfil do usuário' }, 500)
  }

  return json({
    ok: true,
    userId,
    trainerCode: trainerCode ?? undefined,
    message: role === 'trainer'
      ? `Personal trainer criado com sucesso! Código: ${trainerCode}`
      : 'Aluno criado com sucesso!',
  })
})
