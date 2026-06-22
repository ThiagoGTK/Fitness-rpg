import { useEffect, useState } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TrainerRow {
  id: string;
  name: string;
  email: string;
  trainer_code: string;
  must_change_password: boolean;
  studentCount: number;
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

  const [deleteTarget, setDeleteTarget] = useState<TrainerRow | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteFeedback(null);

    const { data, error } = await supabase.functions.invoke('delete-trainer', {
      body: { trainerId: deleteTarget.id },
    });

    if (error || !data?.ok) {
      setDeleteFeedback({ ok: false, msg: data?.error ?? error?.message ?? 'Erro ao excluir.' });
    } else {
      setDeleteFeedback({ ok: true, msg: data.message });
      await loadTrainers();
      setTimeout(() => {
        setDeleteTarget(null);
        setDeleteConfirmName('');
        setDeleteFeedback(null);
      }, 1500);
    }
    setDeleting(false);
  }

  async function loadTrainers() {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, trainer_code, must_change_password')
      .eq('role', 'trainer')
      .order('trainer_code', { ascending: true });

    if (error || !data) { setLoadingList(false); return; }

    const trainerIds = data.map(t => t.id as string);
    const studentCounts: Record<string, number> = {};

    if (trainerIds.length > 0) {
      const { data: students } = await supabase
        .from('profiles')
        .select('trainer_id')
        .in('trainer_id', trainerIds);

      for (const s of students ?? []) {
        const tid = s.trainer_id as string;
        studentCounts[tid] = (studentCounts[tid] ?? 0) + 1;
      }
    }

    setTrainers(data.map(t => ({
      ...(t as any),
      studentCount: studentCounts[t.id as string] ?? 0,
    })) as TrainerRow[]);
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
              {/* Left: code + name/email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: '#7c3aed20',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, gap: 1,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', lineHeight: 1, letterSpacing: '0.06em' }}>PT</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#a855f7', lineHeight: 1 }}>
                    {t.trainer_code.replace('PT-', '')}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{t.email}</div>
                </div>
              </div>

              {/* Center: student count */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: t.studentCount > 0 ? '#38bdf8' : '#475569', lineHeight: 1 }}>
                  {t.studentCount}
                </span>
                <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  aluno{t.studentCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Right: status badge + trash */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {t.must_change_password && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: '#f9731620', color: '#fb923c', border: '1px solid #f9731640',
                  }}>
                    Aguardando 1º acesso
                  </span>
                )}
                <button
                  onClick={() => { setDeleteTarget(t); setDeleteConfirmName(''); setDeleteFeedback(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                  title="Excluir personal"
                >
                  <Trash2 size={15} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#111827', border: '1px solid #ef444440', borderRadius: 16,
            padding: 28, maxWidth: 420, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ef444420', display: 'grid', placeItems: 'center', color: '#ef4444' }}>
                  <Trash2 size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>Excluir personal trainer</h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8' }}>
              Você está excluindo <strong style={{ color: '#f1f5f9' }}>{deleteTarget.name}</strong> ({deleteTarget.email}).
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#f97316' }}>
              Todos os alunos serão desvinculados. Os planos de treino prescritos por este personal serão apagados. Esta ação não pode ser desfeita.
            </p>

            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#94a3b8' }}>
              Para confirmar, digite o nome: <strong style={{ color: '#f1f5f9' }}>{deleteTarget.name}</strong>
            </p>
            <input
              className="game-input"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget.name}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16 }}
              autoFocus
            />

            {deleteFeedback && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: deleteFeedback.ok ? '#22c55e15' : '#ef444415',
                border: `1px solid ${deleteFeedback.ok ? '#22c55e40' : '#ef444440'}`,
                fontSize: 13, color: deleteFeedback.ok ? '#86efac' : '#fca5a5',
              }}>
                {deleteFeedback.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {deleteFeedback.msg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1px solid #1e2d4a', background: 'transparent',
                  color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmName.trim() !== deleteTarget.name.trim()}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 14,
                  opacity: deleting || deleteConfirmName.trim() !== deleteTarget.name.trim() ? 0.5 : 1,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {deleting
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Excluindo...</>
                  : <><Trash2 size={14} /> Excluir personal</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
