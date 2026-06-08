/**
 * send-blast — Disparo único para todos os usuários
 * Invoque manualmente via SQL Editor ou curl, apenas uma vez.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY             = Deno.env.get('BREVO_API_KEY')!

const FROM_NAME   = 'FitRPG'
const FROM_EMAIL  = 'thiago.gaitkoski@gmail.com'
const LOG_URL     = 'https://fitness-rpg-eight.vercel.app/log'
const APP_URL    = 'https://fitness-rpg-eight.vercel.app'

function buildHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FitRPG agora te avisa para não esquecer de treinar 🔥</title>
</head>
<body style="margin:0;padding:0;background:#060913;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060913;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;">

        <!-- Logo -->
        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:26px;font-weight:900;color:#e2e8f0;letter-spacing:-0.5px;">⚔️ FitRPG</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0d1526;border-radius:16px;border:1px solid #1e2d4a;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#1a0d33 0%,#0d1526 100%);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:52px;line-height:1;margin-bottom:14px;">🔔</div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.3;">
                Novidade: FitRPG agora te avisa!
              </h1>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:28px 32px 32px;">
              <p style="margin:0 0 14px;font-size:16px;color:#94a3b8;line-height:1.6;">
                Oi, <strong style="color:#e2e8f0;">${name}</strong> 👋
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                A partir de hoje o FitRPG vai te mandar um e-mail toda vez que seu progresso estiver em risco — para que você nunca perca um streak ou deixe seu personagem parado. 💪
              </p>

              <!-- Feature list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="background:#111827;border:1px solid #1e2d4a;border-radius:12px;padding:20px;">

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="32" style="vertical-align:top;padding-top:2px;">🔥</td>
                      <td style="padding-bottom:14px;">
                        <strong style="color:#e2e8f0;font-size:14px;">Streak em risco</strong><br>
                        <span style="color:#64748b;font-size:13px;line-height:1.5;">Aviso às 18h quando você ainda não treinou no dia</span>
                      </td>
                    </tr>
                    <tr>
                      <td width="32" style="vertical-align:top;padding-top:2px;">⚔️</td>
                      <td style="padding-bottom:14px;">
                        <strong style="color:#e2e8f0;font-size:14px;">Personagem esperando</strong><br>
                        <span style="color:#64748b;font-size:13px;line-height:1.5;">Lembrete no 3º dia sem nenhum treino registrado</span>
                      </td>
                    </tr>
                    <tr>
                      <td width="32" style="vertical-align:top;padding-top:2px;">🧙</td>
                      <td>
                        <strong style="color:#e2e8f0;font-size:14px;">Última chamada</strong><br>
                        <span style="color:#64748b;font-size:13px;line-height:1.5;">Reengajamento no 7º dia para quem ainda não começou</span>
                      </td>
                    </tr>
                  </table>

                </td></tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #1e2d4a;margin-bottom:24px;"></div>

              <!-- Today's reminder -->
              <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;line-height:1.6;">
                E já que estamos aqui...
              </p>
              <p style="margin:0 0 28px;font-size:16px;font-weight:700;color:#e2e8f0;line-height:1.6;">
                Você já treinou hoje? 💪
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center">
                  <a href="${LOG_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 36px;border-radius:12px;letter-spacing:0.3px;">
                    Registrar meu treino de hoje ⚔️
                  </a>
                </td></tr>
              </table>

            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
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
}

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
      console.error(`[send-blast] FAILED to=${to} status=${res.status} body=${body}`)
      return false
    }
    console.log(`[send-blast] OK to=${to}`)
    return true
  } catch (err) {
    console.error(`[send-blast] EXCEPTION to=${to}`, err)
    return false
  }
}

Deno.serve(async (_req: Request) => {
  console.log('[send-blast] Starting at', new Date().toISOString())

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // Buscar todos os usuários com email
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({
      perPage: 1000,
      page: 1,
    })
    if (authErr) throw new Error(`listUsers: ${authErr.message}`)

    const usersWithEmail = authData.users.filter(u => !!u.email)
    console.log(`[send-blast] ${usersWithEmail.length} users found`)

    // Buscar nomes dos perfis
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')

    const nameMap = new Map<string, string>()
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.name ?? 'Aventureiro')
    }

    let sent   = 0
    let errors = 0

    const subject = 'FitRPG agora te avisa para não esquecer de treinar 🔥'

    for (const user of usersWithEmail) {
      const name = nameMap.get(user.id) ?? 'Aventureiro'
      const html = buildHtml(name)
      const ok   = await sendEmail(user.email!, subject, html)
      if (ok) sent++; else errors++

      // Pequena pausa para não exceder rate limit do Resend (100 req/s)
      await new Promise(r => setTimeout(r, 50))
    }

    const result = { ok: true, sent, errors, total: usersWithEmail.length }
    console.log('[send-blast] Done:', result)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-blast] Fatal error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
