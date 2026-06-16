import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, Sparkles, Clock, PlusCircle, UserMinus, X } from 'lucide-react';
import { useTrainerStore } from '../store/trainerStore';

function formatDate(date?: string) {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TrainerDashboard() {
  const navigate = useNavigate();
  const { students, plans, initTrainer, unlinkStudent } = useTrainerStore();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    initTrainer();
  }, []);

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    await unlinkStudent(removeTarget.id);
    setRemoving(false);
    setRemoveTarget(null);
    setConfirmEmail('');
  }

  const activeStudents = students.filter(student => {
    if (!student.lastTrainedDate) return false;
    const last = new Date(student.lastTrainedDate).getTime();
    const cutoff = Date.now() - 7 * 86400000;
    return last >= cutoff;
  }).length;

  return (
    <div className="page-wrap fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9' }}>Painel do Treinador</h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 14 }}>
            Acompanhe seus alunos, planos e compare treinos prescritos com o que foi executado.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/trainer/students')}> 
          <PlusCircle size={16} /> Ver alunos
        </button>
      </div>

      <div className="grid-summary">
        <div className="game-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#7c3aed20', display: 'grid', placeItems: 'center', color: '#a855f7' }}><Users size={18} /></div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Alunos</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{students.length}</div>
            </div>
          </div>
        </div>
        <div className="game-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#0ea5e9 20', display: 'grid', placeItems: 'center', color: '#0ea5e9' }}><ClipboardList size={18} /></div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Planos</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{plans.length}</div>
            </div>
          </div>
        </div>
        <div className="game-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#22c55e20', display: 'grid', placeItems: 'center', color: '#22c55e' }}><Sparkles size={18} /></div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Alunos ativos</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{activeStudents}</div>
            </div>
          </div>
        </div>
        <div className="game-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#f9731620', display: 'grid', placeItems: 'center', color: '#f97316' }}><Clock size={18} /></div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Último treino</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{students.length > 0 ? formatDate(students.reduce<string | undefined>((latest, cur) => {
                if (!cur.lastTrainedDate) return latest;
                return latest && latest > cur.lastTrainedDate ? latest : cur.lastTrainedDate;
              }, undefined)) : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="game-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Alunos cadastrados</h2>
          <button className="btn-primary" onClick={() => navigate('/trainer/students')}>
            Ver todos
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {students.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>
              Nenhum aluno encontrado. Peça para seu aluno se cadastrar e vincular o perfil ao seu e-mail de treinador.
            </div>
          )}

          {students.map(student => (
            <div key={student.id} className="game-card" style={{ padding: 16, borderRadius: 16, display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{student.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Último treino: {formatDate(student.lastTrainedDate)} · {student.totalWorkouts} treino{student.totalWorkouts !== 1 ? 's' : ''}
                </div>
                {student.email && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{student.email}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
                <button className="btn-secondary" style={{ height: 40 }} onClick={() => navigate(`/trainer/students/${student.id}`)}>
                  Acompanhar
                </button>
                <button
                  className="btn-ghost"
                  style={{ height: 40, color: '#ef4444', padding: '0 10px' }}
                  title="Remover aluno"
                  onClick={() => { setRemoveTarget({ id: student.id, name: student.name, email: student.email }); setConfirmEmail(''); }}
                >
                  <UserMinus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {removeTarget && (
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
                  <UserMinus size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>Remover aluno</h3>
              </div>
              <button
                onClick={() => { setRemoveTarget(null); setConfirmEmail(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8' }}>
              Você está removendo <strong style={{ color: '#f1f5f9' }}>{removeTarget.name}</strong> da sua lista de alunos.
              O histórico e a conta do aluno são mantidos — ele só perde o vínculo com você.
            </p>
            {removeTarget.email ? (
              <>
                <p style={{ margin: '10px 0 6px', fontSize: 13, color: '#94a3b8' }}>
                  Para confirmar, digite o e-mail do aluno: <strong style={{ color: '#f1f5f9' }}>{removeTarget.email}</strong>
                </p>
                <input
                  className="game-input"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
                  autoFocus
                />
              </>
            ) : (
              <p style={{ margin: '10px 0 20px', fontSize: 13, color: '#f97316' }}>
                Este aluno não tem e-mail registrado. Confirme a remoção abaixo.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setRemoveTarget(null); setConfirmEmail(''); }}
                disabled={removing}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1px solid #1e2d4a', background: 'transparent',
                  color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removing || (!!removeTarget.email && confirmEmail.trim().toLowerCase() !== removeTarget.email.toLowerCase())}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: removing ? 'not-allowed' : 'pointer',
                  opacity: removing || (!!removeTarget.email && confirmEmail.trim().toLowerCase() !== removeTarget.email.toLowerCase()) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {removing
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Removendo...</>
                  : <><UserMinus size={14} /> Remover aluno</>
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
