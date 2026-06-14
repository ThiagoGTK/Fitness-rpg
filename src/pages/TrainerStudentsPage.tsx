import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CheckCircle2, XCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTrainerStore } from '../store/trainerStore';
import { supabase } from '../lib/supabase';
import type { TrainerStudentSummary } from '../types';

export function TrainerStudentsPage() {
  const navigate = useNavigate();
  const { students, loading, initTrainer, loadStudents } = useTrainerStore();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { initTrainer(); }, []);

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
      body: { role: 'student', name: name.trim(), email: email.trim().toLowerCase(), password },
    });

    if (error || !data?.ok) {
      setFeedback({ ok: false, msg: data?.error ?? error?.message ?? 'Erro ao criar aluno.' });
    } else {
      setFeedback({ ok: true, msg: 'Aluno criado com sucesso! Compartilhe o e-mail e a senha com ele.' });
      setName(''); setEmail(''); setPassword('');
      await loadStudents();
    }
    setCreating(false);
  }

  return (
    <div className="page-wrap fade-in-up">
      <button className="btn-ghost" onClick={() => navigate('/trainer')} style={{ marginBottom: 18 }}>
        <ArrowLeft size={14} /> Voltar ao painel
      </button>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9' }}>Meus alunos</h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 14 }}>
          Crie o acesso do aluno e ele já estará vinculado a você.
        </p>
      </div>

      {/* Create student form */}
      <div className="game-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7c3aed20', display: 'grid', placeItems: 'center', color: '#a855f7' }}>
            <UserPlus size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Criar acesso do aluno</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>O aluno já ficará vinculado a você automaticamente.</div>
          </div>
        </div>

        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Nome do aluno</label>
              <input className="game-input" value={name} onChange={e => setName(e.target.value)} placeholder="Maria Oliveira" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>E-mail</label>
              <input className="game-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="aluno@email.com" />
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
              O aluno deverá trocar a senha no primeiro acesso.
            </div>
          </div>

          {feedback && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 8,
              background: feedback.ok ? '#22c55e15' : '#ef444415',
              border: `1px solid ${feedback.ok ? '#22c55e40' : '#ef444440'}`,
              fontSize: 13, color: feedback.ok ? '#86efac' : '#fca5a5',
            }}>
              {feedback.ok ? <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} /> : <XCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
              {feedback.msg}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={creating} style={{ justifyContent: 'center' }}>
            {creating
              ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Criando acesso...</>
              : <><UserPlus size={15} /> Criar aluno</>}
          </button>
        </form>
      </div>

      {/* Students list */}
      <div className="game-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Alunos vinculados</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Alunos com acesso criado por você.</div>
          </div>
          <button className="btn-ghost" onClick={() => loadStudents()} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {loading && <div style={{ color: '#94a3b8', fontSize: 14 }}>Carregando alunos...</div>}
        {!loading && students.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Nenhum aluno criado ainda. Use o formulário acima.</div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {students.map((student: TrainerStudentSummary) => (
            <button
              key={student.id}
              onClick={() => navigate(`/trainer/students/${student.id}`)}
              className="game-card"
              style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid #1e2d4a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{student.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{student.email ?? 'sem e-mail'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  Último treino: {student.lastTrainedDate
                    ? new Date(student.lastTrainedDate).toLocaleDateString('pt-BR')
                    : 'Nenhum'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{student.totalWorkouts} treino{student.totalWorkouts !== 1 ? 's' : ''}</span>
                <CheckCircle2 size={18} color="#22c55e" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
