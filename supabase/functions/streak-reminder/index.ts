/**
 * streak-reminder — Supabase Edge Function
 *
 * Sends daily re-engagement emails at 21:00 UTC (18:00 Brasília) to three groups:
 *   Group 1 – streak > 0  AND last_trained_date < today  → streak at risk
 *   Group 2 – streak = 0  AND last_trained_date IS NULL  AND joined exactly 3 days ago
 *   Group 3 – streak = 0  AND last_trained_date IS NULL  AND joined exactly 7 days ago
 *
 * Required secret (Supabase Dashboard → Settings → Edge Functions → Secrets):
 *   BREVO_API_KEY
 *
 * Auto-injected by Supabase (no action needed):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// ── Environment ───────────────────────────────────────────────────────────────

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY            = Deno.env.get('BREVO_API_KEY')!

const FROM_NAME  = 'FitRPG'
const FROM_EMAIL = 'thiago.gaitkoski@gmail.com'
const APP_URL    = 'https://fitness-rpg-eight.vercel.app'
const LOG_URL    = 'https://fitness-rpg-eight.vercel.app/log'

// ── Types ─────────────────────────────────────────────────────────────────────

type SupabaseClientType = ReturnType<typeof createClient>

interface ProfileGroup1 {
  id: string
  name: string
  streak: number
}

interface ProfileGroup2or3 {
  id: string
  name: string
}

// ── Email Templates ───────────────────────────────────────────────────────────

function templateStreakRisk(name: string, streak: number): { subject: string; html: string } {
  const subject = `Seu streak de ${streak} dias está em risco 🔥`
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#060913;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060913;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">

        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:26px;font-weight:900;color:#e2e8f0;letter-spacing:-0.5px;">⚔️ FitRPG</span>
        </td></tr>

        <tr><td style="background:#0d1526;border-radius:16px;border:1px solid #1e2d4a;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="background:linear-gradient(135deg,#1a0d33 0%,#0d1526 100%);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:52px;line-height:1;margin-bottom:14px;">🔥</div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.3;">
                Seu streak está em risco!
              </h1>
            </td></tr>

            <tr><td style="padding:28px 32px 32px;">
              <p style="margin:0 0 14px;font-size:16px;color:#94a3b8;line-height:1.6;">
                Oi, <strong style="color:#e2e8f0;">${name}</strong> 👋
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Você tem um streak incrível e ainda não treinou hoje. Não deixe ele ir embora agora!
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="background:#1a0d33;border:1px solid rgba(127,119,221,0.25);border-radius:12px;padding:22px;text-align:center;">
                  <div style="font-size:52px;font-weight:900;color:#f97316;line-height:1;">${streak}</div>
                  <div style="font-size:12px;font-weight:700;color:#fb923c;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">DIAS CONSECUTIVOS</div>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                  <a href="${LOG_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">
                    Treinar agora e salvar meu streak 🔥
                  </a>
                </td></tr>
              </table>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="text-align:center;padding-top:20px;">
          <p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">
            FitRPG — Transforme seus treinos em aventuras<br>
            <a href="${APP_URL}" style="color:#475569;text-decoration:none;">Abrir o app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}

function templateNewUser3d(name: string): { subject: string; html: string } {
  const subject = `Seu personagem está esperando, ${name} ⚔️`
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#060913;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060913;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">

        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:26px;font-weight:900;color:#e2e8f0;letter-spacing:-0.5px;">⚔️ FitRPG</span>
        </td></tr>

        <tr><td style="background:#0d1526;border-radius:16px;border:1px solid #1e2d4a;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="background:linear-gradient(135deg,#0d1a2e 0%,#0d1526 100%);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:52px;line-height:1;margin-bottom:14px;">⚔️</div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.3;">
                Seu personagem está esperando!
              </h1>
            </td></tr>

            <tr><td style="padding:28px 32px 32px;">
              <p style="margin:0 0 14px;font-size:16px;color:#94a3b8;line-height:1.6;">
                Oi, <strong style="color:#e2e8f0;">${name}</strong> 👋
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Faz 3 dias que você criou sua conta no FitRPG, mas seu personagem ainda está esperando pelo primeiro treino.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Cada treino dá XP ao seu personagem e evolui seus músculos no mapa corporal. Comece hoje! 💪
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="33%" style="background:#111827;border:1px solid #1e2d4a;border-radius:10px;padding:14px 8px;text-align:center;">
                    <div style="font-size:22px;">🏆</div>
                    <div style="font-size:11px;font-weight:700;color:#7F77DD;margin-top:6px;">XP &amp; Níveis</div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="background:#111827;border:1px solid #1e2d4a;border-radius:10px;padding:14px 8px;text-align:center;">
                    <div style="font-size:22px;">🔥</div>
                    <div style="font-size:11px;font-weight:700;color:#7F77DD;margin-top:6px;">Streaks</div>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="background:#111827;border:1px solid #1e2d4a;border-radius:10px;padding:14px 8px;text-align:center;">
                    <div style="font-size:22px;">💪</div>
                    <div style="font-size:11px;font-weight:700;color:#7F77DD;margin-top:6px;">Mapa Muscular</div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                  <a href="${LOG_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">
                    Fazer meu primeiro treino agora ⚔️
                  </a>
                </td></tr>
              </table>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="text-align:center;padding-top:20px;">
          <p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">
            FitRPG — Transforme seus treinos em aventuras<br>
            <a href="${APP_URL}" style="color:#475569;text-decoration:none;">Abrir o app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}

function templateNewUser7d(name: string): { subject: string; html: string } {
  const subject = `Última chamada, ${name} — seu personagem precisa de você 🧙`
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#060913;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060913;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">

        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:26px;font-weight:900;color:#e2e8f0;letter-spacing:-0.5px;">⚔️ FitRPG</span>
        </td></tr>

        <tr><td style="background:#0d1526;border-radius:16px;border:1px solid #1e2d4a;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="background:linear-gradient(135deg,#1a0d33 0%,#0d1526 100%);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:52px;line-height:1;margin-bottom:14px;">🧙</div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.3;">
                Última chamada, ${name}!
              </h1>
            </td></tr>

            <tr><td style="padding:28px 32px 32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Você criou sua conta no FitRPG há uma semana, mas seu personagem ainda está no nível 1 — sem nenhum treino registrado.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="background:#1a0d33;border-left:3px solid #7F77DD;border-radius:0 10px 10px 0;padding:16px 20px;">
                  <p style="margin:0;font-size:14px;color:#a78bfa;line-height:1.7;font-style:italic;">
                    "Seu personagem está parado na entrada da masmorra. Um único treino é tudo que separa você do primeiro nível."
                  </p>
                </td></tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Pode ser uma caminhada, uma série de flexões — qualquer coisa vale! O importante é dar o primeiro passo. 🚀
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                  <a href="${LOG_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">
                    Entrar na aventura agora 🧙
                  </a>
                </td></tr>
              </table>
            </td></tr>

          </table>
        </td></tr>

        <tr><td style="text-align:center;padding-top:20px;">
          <p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">
            FitRPG — Transforme seus treinos em aventuras<br>
            <a href="${APP_URL}" style="color:#475569;text-decoration:none;">Abrir o app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[sendEmail] FAILED to=${to} status=${res.status} body=${body}`)
      return false
    }
    console.log(`[sendEmail] OK to=${to} subject="${subject}"`)
    return true
  } catch (err) {
    console.error(`[sendEmail] EXCEPTION to=${to}`, err)
    return false
  }
}

async function logEmail(
  supabase: SupabaseClientType,
  userId: string,
  emailType: string,
): Promise<void> {
  const { error } = await supabase
    .from('email_logs')
    .insert({ user_id: userId, email_type: emailType })
  if (error) {
    console.error(`[logEmail] Failed user_id=${userId} type=${emailType}`, error)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  const started = Date.now()
  console.log('[streak-reminder] Starting run at', new Date().toISOString())

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // ── Dates (all UTC) ──────────────────────────────────────────────────────
    const now      = new Date()
    const todayUTC = now.toISOString().slice(0, 10) // YYYY-MM-DD

    const d3ago = new Date(now)
    d3ago.setUTCDate(d3ago.getUTCDate() - 3)
    const d3 = d3ago.toISOString().slice(0, 10)

    const d7ago = new Date(now)
    d7ago.setUTCDate(d7ago.getUTCDate() - 7)
    const d7 = d7ago.toISOString().slice(0, 10)

    // ── Auth user email map (service role = full access) ─────────────────────
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({
      perPage: 1000,
      page: 1,
    })
    if (authErr) throw new Error(`listUsers: ${authErr.message}`)

    const emailMap = new Map<string, string>()
    for (const u of authData.users) {
      if (u.email) emailMap.set(u.id, u.email)
    }
    console.log(`[streak-reminder] ${emailMap.size} users with email found`)

    // ── Users already emailed today (anti-duplicate) ─────────────────────────
    const { data: sentToday, error: logsErr } = await supabase
      .from('email_logs')
      .select('user_id')
      .gte('sent_at', `${todayUTC}T00:00:00.000Z`)
      .lt('sent_at', `${todayUTC}T23:59:59.999Z`)

    if (logsErr) {
      console.error('[streak-reminder] Could not read email_logs — proceeding without dedup:', logsErr)
    }
    const sentTodaySet = new Set<string>((sentToday ?? []).map((r: { user_id: string }) => r.user_id))

    let totalSent   = 0
    let totalErrors = 0
    let totalSkipped = 0

    // ─────────────────────────────────────────────────────────────────────────
    // Grupo 1: streak > 0 AND last_trained_date < today (streak at risk)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: group1, error: g1err } = await supabase
      .from('profiles')
      .select('id, name, streak')
      .gt('streak', 0)
      .not('last_trained_date', 'is', null)
      .lt('last_trained_date', todayUTC)

    if (g1err) {
      console.error('[streak-reminder] Group 1 query error:', g1err)
    }

    console.log(`[streak-reminder] Group 1 (streak at risk): ${(group1 ?? []).length} users`)

    for (const profile of (group1 ?? []) as ProfileGroup1[]) {
      if (sentTodaySet.has(profile.id)) { totalSkipped++; continue }
      const email = emailMap.get(profile.id)
      if (!email)                        { totalSkipped++; continue }

      const { subject, html } = templateStreakRisk(profile.name, profile.streak)
      const ok = await sendEmail(email, subject, html)
      if (ok) {
        await logEmail(supabase, profile.id, 'streak_risk')
        sentTodaySet.add(profile.id) // prevent double-send if somehow in multiple groups
        totalSent++
      } else {
        totalErrors++
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Grupo 2: never trained + joined exactly 3 days ago
    // ─────────────────────────────────────────────────────────────────────────
    const { data: group2, error: g2err } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('streak', 0)
      .is('last_trained_date', null)
      .gte('joined_at', `${d3}T00:00:00.000Z`)
      .lt('joined_at', `${d3}T23:59:59.999Z`)

    if (g2err) {
      console.error('[streak-reminder] Group 2 query error:', g2err)
    }

    console.log(`[streak-reminder] Group 2 (joined 3d ago, no workout): ${(group2 ?? []).length} users`)

    for (const profile of (group2 ?? []) as ProfileGroup2or3[]) {
      if (sentTodaySet.has(profile.id)) { totalSkipped++; continue }
      const email = emailMap.get(profile.id)
      if (!email)                        { totalSkipped++; continue }

      const { subject, html } = templateNewUser3d(profile.name)
      const ok = await sendEmail(email, subject, html)
      if (ok) {
        await logEmail(supabase, profile.id, 'new_user_3d')
        sentTodaySet.add(profile.id)
        totalSent++
      } else {
        totalErrors++
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Grupo 3: never trained + joined exactly 7 days ago
    // ─────────────────────────────────────────────────────────────────────────
    const { data: group3, error: g3err } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('streak', 0)
      .is('last_trained_date', null)
      .gte('joined_at', `${d7}T00:00:00.000Z`)
      .lt('joined_at', `${d7}T23:59:59.999Z`)

    if (g3err) {
      console.error('[streak-reminder] Group 3 query error:', g3err)
    }

    console.log(`[streak-reminder] Group 3 (joined 7d ago, no workout): ${(group3 ?? []).length} users`)

    for (const profile of (group3 ?? []) as ProfileGroup2or3[]) {
      if (sentTodaySet.has(profile.id)) { totalSkipped++; continue }
      const email = emailMap.get(profile.id)
      if (!email)                        { totalSkipped++; continue }

      const { subject, html } = templateNewUser7d(profile.name)
      const ok = await sendEmail(email, subject, html)
      if (ok) {
        await logEmail(supabase, profile.id, 'new_user_7d')
        sentTodaySet.add(profile.id)
        totalSent++
      } else {
        totalErrors++
      }
    }

    const elapsed = Date.now() - started
    const result = { ok: true, sent: totalSent, errors: totalErrors, skipped: totalSkipped, elapsed_ms: elapsed }
    console.log('[streak-reminder] Done:', result)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[streak-reminder] Fatal error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
