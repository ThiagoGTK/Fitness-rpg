import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, Sparkles, Clock, PlusCircle } from 'lucide-react';
import { useTrainerStore } from '../store/trainerStore';

function formatDate(date?: string) {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TrainerDashboard() {
  const navigate = useNavigate();
  const { students, plans, initTrainer } = useTrainerStore();

  useEffect(() => {
    initTrainer();
  }, []);

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
              <button className="btn-secondary" style={{ height: 40, alignSelf: 'center' }} onClick={() => navigate(`/trainer/students/${student.id}`)}>
                Acompanhar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
