import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2, ArrowUp, ArrowDown, Minus, CheckCircle2, XCircle } from 'lucide-react';
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

interface ExerciseComparison {
  exerciseName: string;
  done: boolean;
  plannedSets: number;
  actualSets?: number;
  plannedReps: number;
  actualReps?: number;
  plannedWeight: number;
  actualWeight?: number;
  plannedVolume: number;
  actualVolume?: number;
}

function buildComparison(plan: TrainerPlan, session: WorkoutSession | undefined, studentExercises: Exercise[]): ExerciseComparison[] {
  function exerciseNameOf(exerciseId: string): string {
    return (studentExercises.find(ex => ex.id === exerciseId)?.name ?? '').trim().toLowerCase();
  }

  return plan.exercises.map(exercise => {
    const plannedName = (exercise.exerciseName || '').trim().toLowerCase();
    const entry = session?.entries.find(e => exerciseNameOf(e.exerciseId) === plannedName);
    const plannedVolume = exercise.sets * exercise.reps * exercise.weight;

    if (!entry) {
      return {
        exerciseName: exercise.exerciseName || 'Exercício',
        done: false,
        plannedSets: exercise.sets,
        plannedReps: exercise.reps,
        plannedWeight: exercise.weight,
        plannedVolume,
      };
    }

    const actualSets = entry.sets.length;
    const actualReps = Math.round(entry.sets.map(s => s.reps).reduce((sum, r) => sum + r, 0) / Math.max(actualSets, 1));
    const actualWeight = entry.sets[0]?.weight ?? 0;
    const actualVolume = entry.sets.reduce((sum, s) => sum + s.reps * s.weight, 0);

    return {
      exerciseName: exercise.exerciseName || 'Exercício',
      done: true,
      plannedSets: exercise.sets, actualSets,
      plannedReps: exercise.reps, actualReps,
      plannedWeight: exercise.weight, actualWeight,
      plannedVolume, actualVolume,
    };
  });
}

function DeltaBadge({ planned, actual, suffix = '' }: { planned: number; actual: number; suffix?: string }) {
  const diff = actual - planned;
  if (diff === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#64748b' }}>
        <Minus size={11} /> igual
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: up ? '#10b981' : '#f97316' }}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {up ? '+' : ''}{diff}{suffix}
    </span>
  );
}

function MetricBlock({ label, planned, actual, suffix = '' }: { label: string; planned: number; actual: number; suffix?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 90, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#475569' }}>{planned}{suffix}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', margin: '2px 0' }}>{actual}{suffix}</div>
      <DeltaBadge planned={planned} actual={actual} suffix={suffix} />
    </div>
  );
}

function ExerciseComparisonCard({ c }: { c: ExerciseComparison }) {
  if (!c.done) {
    return (
      <div className="game-card" style={{ padding: 14, background: '#ef444410', border: '1px solid #ef444430' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{c.exerciseName}</div>
            <div style={{ fontSize: 12, color: '#fca5a5' }}>Não realizado · previsto {c.plannedSets}×{c.plannedReps}{c.plannedWeight > 0 ? ` @ ${c.plannedWeight}kg` : ''}</div>
          </div>
        </div>
      </div>
    );
  }

  const exact = c.actualSets === c.plannedSets && c.actualReps === c.plannedReps && c.actualWeight === c.plannedWeight;

  return (
    <div className="game-card" style={{ padding: 14, background: exact ? '#10b98110' : '#111827', border: `1px solid ${exact ? '#10b98130' : '#1e2d4a'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {exact ? <CheckCircle2 size={16} color="#10b981" /> : <ArrowUp size={16} color="#94a3b8" style={{ transform: 'rotate(45deg)' }} />}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{c.exerciseName}</div>
        {exact && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginLeft: 'auto' }}>Conforme prescrito</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <MetricBlock label="Séries" planned={c.plannedSets} actual={c.actualSets!} />
        <MetricBlock label="Reps" planned={c.plannedReps} actual={c.actualReps!} />
        <MetricBlock label="Peso" planned={c.plannedWeight} actual={c.actualWeight!} suffix="kg" />
        <MetricBlock label="Volume" planned={c.plannedVolume} actual={c.actualVolume!} suffix="kg" />
      </div>
    </div>
  );
}

export function TrainerStudentPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { studentDetails, loadStudentDetail, deletePlan, loading } = useTrainerStore();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeletePlan(planId: string) {
    setDeleting(true);
    await deletePlan(planId);
    if (studentId) await loadStudentDetail(studentId);
    if (selectedPlanId === planId) setSelectedPlanId(null);
    setConfirmDeleteId(null);
    setDeleting(false);
  }

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
  const selectedSession = useMemo(() => {
    if (!selectedPlan) return latestWorkout;
    return workouts.find(w => w.trainerPlanId === selectedPlan.id) ?? undefined;
  }, [selectedPlan, workouts, latestWorkout]);

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
                      <button
                        className="btn-ghost"
                        style={{ color: '#ef4444', padding: '8px 10px' }}
                        onClick={() => setConfirmDeleteId(plan.id)}
                        title="Excluir plano"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {confirmDeleteId === plan.id && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 8,
                      background: '#ef444415', border: '1px solid #ef444440',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: 13, color: '#fca5a5' }}>Excluir "{plan.planName || 'plano'}" permanentemente?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deleting}
                        >
                          Cancelar
                        </button>
                        <button
                          style={{
                            fontSize: 12, padding: '6px 12px', borderRadius: 8, border: 'none',
                            background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer',
                            opacity: deleting ? 0.7 : 1,
                          }}
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={deleting}
                        >
                          {deleting ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </div>
                  )}
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
              {workouts.slice(0, 5).map(workout => {
                const planName = plans.find(p => p.id === workout.trainerPlanId)?.planName;
                return (
                <div key={workout.id} className="game-card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{formatDate(workout.date)}</div>
                      {planName && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', background: '#7c3aed15', padding: '2px 8px', borderRadius: 6, border: '1px solid #7c3aed40' }}>
                          {planName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>{workout.totalXP} XP</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{workout.entries.length} exercício{workout.entries.length !== 1 ? 's' : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {workout.entries.map(entry => (
                      <span key={entry.exerciseId} style={{ fontSize: 11, color: '#64748b', background: '#111827', padding: '4px 8px', borderRadius: 8 }}>{resolveExerciseName(entry.exerciseId)}</span>
                    ))}
                  </div>
                </div>
              );})}
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

          {(() => {
            const comparisons = buildComparison(selectedPlan, selectedSession, studentExercises);
            if (!selectedSession) {
              return (
                <div className="game-card" style={{ padding: 16, background: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <XCircle size={18} color="#64748b" />
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Sem registro de treino para este plano ainda.</span>
                </div>
              );
            }

            const doneCount = comparisons.filter(c => c.done).length;
            const total = comparisons.length;
            const adherencePct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            const plannedVolumeTotal = comparisons.reduce((s, c) => s + c.plannedVolume, 0);
            const actualVolumeTotal = comparisons.reduce((s, c) => s + (c.actualVolume ?? 0), 0);

            return (
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Summary */}
                <div className="game-card" style={{ padding: 16, background: '#111827', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: adherencePct === 100 ? '#10b981' : '#a855f7' }}>{adherencePct}%</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{doneCount}/{total} exercícios feitos</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>{actualVolumeTotal.toLocaleString()}<span style={{ fontSize: 13, color: '#64748b' }}>kg</span></div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>volume realizado · previsto {plannedVolumeTotal.toLocaleString()}kg</div>
                  </div>
                </div>

                {/* Per-exercise cards */}
                <div style={{ display: 'grid', gap: 10 }}>
                  {comparisons.map((c, i) => <ExerciseComparisonCard key={i} c={c} />)}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
