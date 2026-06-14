import { useEffect, useState } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TrainerRow {
  id: string;
  name: string;
  email: string;
  trainer_code: string;
  must_change_password: boolean;
}

export function AdminPage() {
  const [trainers, setTrainers]       = useState<TrainerRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function loadTrainers() {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, trainer_code, must_change_password')
      .eq('role', 'trainer')
      .order('trainer_code', { ascending: true });

    if (!error) setTrainers((data ?? []) as TrainerRow[]);
    setLoadingList(false);
  }

  useEffect(() => { loadTrainers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setFeedback({ ok: false, msg: 'Preencha todos os campos.' });
      return;
    }
    if (password.length < 6) {
      setFeedback({ ok: false, msg: 'Senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setCreating(true);
    setFeedback(null);

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { role: 'trainer', name: name.trim(), email: email.trim().toLowerCase(), password },
    });

    if (error || !data?.ok) {
      setFeedback({ ok: false, msg: data?.error ?? error?.message ?? 'Erro ao criar personal.' });
    } else {
      setFeedback({ ok: true, msg: `${data.message}` });
      setName(''); setEmail(''); setPassword('');
      await loadTrainers();
    }
    setCreating(false);
  }

  return (
    <div className="page-wrap fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={26} color="#a855f7" /> Painel Admin
        </h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 14 }}>
          Gerencie os personal trainers do sistema.
        </p>
      </div>

      {/* Create trainer form */}
      <div className="game-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7c3aed20', display: 'grid', placeItems: 'center', color: '#a855f7' }}>
            <UserPlus size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Criar personal trainer</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>O código PT será gerado automaticamente.</div>
          </div>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Nome completo</label>
              <input className="game-input" value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>E-mail</label>
              <input className="game-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="personal@email.com" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Senha temporária</label>
            <div style={{ position: 'relative' }}>
              <input
                className="game-input"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>
              O personal deverá trocar a senha no primeiro acesso.
            </div>
          </div>

          {feedback && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8,
              background: feedback.ok ? '#22c55e15' : '#ef444415',
              border: `1px solid ${feedback.ok ? '#22c55e40' : '#ef444440'}`,
              fontSize: 13, color: feedback.ok ? '#86efac' : '#fca5a5',
            }}>
              {feedback.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {feedback.msg}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={creating} style={{ justifyContent: 'center' }}>
            {creating ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Criando...</> : <><UserPlus size={15} /> Criar personal</>}
          </button>
        </form>
      </div>

      {/* Trainers list */}
      <div className="game-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Personal trainers cadastrados</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{trainers.length} personal{trainers.length !== 1 ? 's' : ''}</div>
        </div>

        {loadingList && <div style={{ color: '#94a3b8', fontSize: 14 }}>Carregando...</div>}
        {!loadingList && trainers.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Nenhum personal trainer cadastrado ainda.</div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {trainers.map(t => (
            <div key={t.id} className="game-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: '#7c3aed20',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#a855f7' }}>{t.trainer_code}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.email}</div>
              </div>
              {t.must_change_password && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                  background: '#f9731620', color: '#fb923c', border: '1px solid #f9731640',
                }}>
                  Aguardando 1º acesso
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
