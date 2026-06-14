import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useTrainerStore } from '../store/trainerStore';
import type { Exercise } from '../types';
import type { TrainerPlan, WorkoutSession } from '../types';

const DAY_LABELS: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };

function formatDate(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatSchedule(scheduledDate?: string): string {
  if (!scheduledDate) return 'Sem dia definido';
  const days = scheduledDate.split(',').map(Number).filter(n => n >= 0 && n <= 6);
  if (days.length === 0) return 'Sem dia definido';
  return days.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map(d => DAY_LABELS[d]).join(', ');
}

function comparePlanWithSession(plan: TrainerPlan, session?: WorkoutSession) {
  if (!session) return { status: 'Sem registro', details: [] as string[] };

  const details: string[] = [];
  plan.exercises.forEach((exercise) => {
    const entry = session.entries.find(e => e.exerciseId === exercise.exerciseId);
    if (!entry) {
      details.push(`Não realizou ${exercise.exerciseName || 'exercício'}`);
      return;
    }
    if (entry.sets.length !== exercise.sets) {
      details.push(`${exercise.exerciseName}: alterou número de séries (${exercise.sets} → ${entry.sets.length})`);
    }
    const plannedReps = exercise.reps;
    const actualReps = entry.sets.map(s => s.reps).reduce((sum, reps) => sum + reps, 0) / Math.max(entry.sets.length, 1);
    if (Math.round(actualReps) !== plannedReps) {
      details.push(`${exercise.exerciseName}: alterou ${plannedReps} reps previstos`);
    }
    const plannedWeight = exercise.weight;
    const actualWeight = entry.sets[0]?.weight ?? 0;
    if (actualWeight > plannedWeight) {
      details.push(`${exercise.exerciseName}: fez com carga maior (${plannedWeight}kg → ${actualWeight}kg)`);
    } else if (actualWeight < plannedWeight) {
      details.push(`${exercise.exerciseName}: fez com carga menor (${plannedWeight}kg → ${actualWeight}kg)`);
    }
  });

  if (details.length === 0) return { status: 'Fez conforme prescrito', details };
  return { status: 'Ajustes detectados', details };
}

export function TrainerStudentPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { studentDetails, loadStudentDetail, loading } = useTrainerStore();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const studentExercises = studentDetails?.exercises ?? [];

  function resolveExerciseName(exerciseId: string): string {
    const found = studentExercises.find((ex: Exercise) => ex.id === exerciseId);
    return found?.name ?? '—';
  }

  useEffect(() => {
    if (studentId) loadStudentDetail(studentId);
  }, [studentId]);

  const student = studentDetails?.profile;
  const plans = studentDetails?.plans ?? [];
  const workouts = studentDetails?.workouts ?? [];
  const latestWorkout = workouts[0];

  const selectedPlan = useMemo(() => plans.find(plan => plan.id === selectedPlanId) ?? plans[0], [plans, selectedPlanId]);
  const selectedSession = useMemo(() => latestWorkout, [latestWorkout]);

  if (loading) {
    return (
      <div className="page-wrap fade-in-up">
        <div style={{ color: '#94a3b8', fontSize: 14 }}>Carregando dados do aluno...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="page-wrap fade-in-up">
        <div style={{ color: '#f1f5f9', fontSize: 16 }}>Aluno não encontrado ou não está vinculado a você.</div>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/trainer')}>
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="page-wrap fade-in-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <button className="btn-ghost" onClick={() => navigate('/trainer')} style={{ marginBottom: 12 }}>
            <ArrowLeft size={14} /> Voltar ao painel
          </button>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9' }}>{student.name}</h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 14 }}>
            Acompanhe planos, histórico e compare a prescrição com o treino realmente registrado.
          </p>
        </div>
        <Link className="btn-primary" to={`/trainer/students/${studentId}/plans/new`}>
          <PlusCircle size={16} /> Novo plano
        </Link>
      </div>

      <div className="grid-stat" style={{ marginBottom: 20 }}>
        <div className="game-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Último treino</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{formatDate(student.lastTrainedDate)}</div>
        </div>
        <div className="game-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Total de treinos</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{workouts.length}</div>
        </div>
        <div className="game-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Planos ativos</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{plans.length}</div>
        </div>
      </div>

      <div className="grid-cards">
        <div className="game-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
              Planos do aluno
            </h2>
          </div>
          {plans.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>
              Nenhum plano criado ainda. Use o botão "Novo plano" para começar.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {plans.map(plan => (
                <div key={plan.id} className="game-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{plan.planName || 'Plano sem nome'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {formatSchedule(plan.scheduledDate)} · {plan.exercises.length} exercício{plan.exercises.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-secondary" style={{ minWidth: 120 }} onClick={() => setSelectedPlanId(plan.id)}>
                        Ver comparação
                      </button>
                      <Link className="btn-ghost" style={{ minWidth: 120, justifyContent: 'center' }} to={`/trainer/students/${studentId}/plans/${plan.id}/edit`}>
                        Editar
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="game-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Últimos treinos</h2>
          </div>
          {workouts.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>O aluno ainda não registrou treinos.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {workouts.slice(0, 5).map(workout => (
                <div key={workout.id} className="game-card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{formatDate(workout.date)}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{workout.entries.length} exercício{workout.entries.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>{workout.totalXP} XP</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {workout.entries.map(entry => (
                      <span key={entry.exerciseId} style={{ fontSize: 11, color: '#64748b', background: '#111827', padding: '4px 8px', borderRadius: 8 }}>{resolveExerciseName(entry.exerciseId)}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPlan && (
        <div className="game-card" style={{ padding: 20, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Comparação do plano</h2>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Plano selecionado: {selectedPlan.planName || 'Sem nome'} · {formatSchedule(selectedPlan.scheduledDate)}
              </div>
            </div>
            <button className="btn-secondary" style={{ minWidth: 140 }} onClick={() => setSelectedPlanId(null)}>
              Limpar seleção
            </button>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div className="game-card" style={{ padding: 16, background: '#111827' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Resultado</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                {comparePlanWithSession(selectedPlan, selectedSession).status}
              </div>
            </div>

            <div className="game-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Diferenças encontradas</div>
              {comparePlanWithSession(selectedPlan, selectedSession).details.length === 0 ? (
                <div style={{ color: '#94a3b8' }}>Nenhuma diferença detectada.</div>
              ) : (
                <ul style={{ paddingLeft: 18, margin: 0, color: '#94a3b8' }}>
                  {comparePlanWithSession(selectedPlan, selectedSession).details.map((detail, index) => (
                    <li key={index} style={{ marginBottom: 6 }}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
