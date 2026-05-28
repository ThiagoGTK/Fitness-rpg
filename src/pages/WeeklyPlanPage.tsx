import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, Moon, X, ChevronDown, Dumbbell, Zap } from 'lucide-react';
import { useWeeklyStore, type WeeklyPlan, type ExerciseInput, type CompleteDayResult } from '../store/weeklyStore';
import { useGameStore } from '../store/gameStore';
import { calculateEntryXP } from '../services/xpCalculator';
import type { Exercise, MuscleGroup, WorkoutSession } from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DAY_NAMES_FULL  = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira',  'Sexta-feira', 'Sábado', 'Domingo',
];

function todayDow() {
  return (new Date().getDay() + 6) % 7; // 0 = Mon … 6 = Sun
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── XP estimation for a plan (used in confirm modal + day cards) ──────────────

function estimateXP(
  plan: WeeklyPlan,
  exercises: Exercise[],
  workouts: WorkoutSession[],
) {
  let total = 0;
  const byMuscle: Record<string, number> = {};

  for (const planEx of plan.exercises) {
    const ex = planEx.exerciseId
      ? exercises.find((e: Exercise) => e.id === planEx.exerciseId)
      : exercises.find((e: Exercise) => e.name.toLowerCase() === planEx.exerciseName.toLowerCase());
    if (!ex) continue;

    const sets = Array.from({ length: Math.max(1, planEx.sets) }, () => ({
      reps: Math.max(1, planEx.reps), weight: Math.max(0, planEx.weight),
    }));
    const { exerciseXP, muscleXPMap } = calculateEntryXP(
      { exerciseId: ex.id, sets, difficulty: 7, notes: '' }, ex, workouts,
    );
    total += exerciseXP;
    for (const [mId, xp] of Object.entries(muscleXPMap)) {
      byMuscle[mId] = (byMuscle[mId] ?? 0) + xp;
    }
  }
  return { total, byMuscle };
}

// ─── Editor state type ─────────────────────────────────────────────────────────

interface EditorEx {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
  notes: string;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: color + '20', color,
    }}>
      {children}
    </span>
  );
}

// ─── Day Editor Modal ──────────────────────────────────────────────────────────

function DayEditorModal({
  dayOfWeek,
  existing,
  onClose,
}: {
  dayOfWeek: number;
  existing: WeeklyPlan | undefined;
  onClose: () => void;
}) {
  const exercises = useGameStore(s => s.exercises);
  const muscles   = useGameStore(s => s.muscles);
  const upsertDay = useWeeklyStore(s => s.upsertDay);

  const [workoutName, setWorkoutName] = useState(existing?.workoutName ?? '');
  const [isRestDay,   setIsRestDay]   = useState(existing?.isRestDay ?? false);
  const [notes,       setNotes]       = useState(existing?.notes ?? '');
  const [saving,      setSaving]      = useState(false);

  const [editorExs, setEditorExs] = useState<EditorEx[]>(() => {
    if (!existing || existing.isRestDay) return [];
    return existing.exercises
      .filter(pe => pe.exerciseId)
      .map(pe => ({
        exerciseId:  pe.exerciseId!,
        sets:        pe.sets,
        reps:        pe.reps,
        weight:      pe.weight,
        restSeconds: pe.restSeconds ?? 60,
        notes:       pe.notes,
      }));
  });

  function addExercise() {
    if (exercises.length === 0) return;
    setEditorExs(prev => [...prev, {
      exerciseId: exercises[0].id, sets: 3, reps: 10, weight: 0, restSeconds: 60, notes: '',
    }]);
  }

  function removeExercise(idx: number) {
    setEditorExs(prev => prev.filter((_, i) => i !== idx));
  }

  function updateExercise(idx: number, patch: Partial<EditorEx>) {
    setEditorExs(prev => prev.map((ex, i) => i === idx ? { ...ex, ...patch } : ex));
  }

  async function handleSave() {
    setSaving(true);
    const exInputs: ExerciseInput[] = editorExs.map(e => {
      const libEx = exercises.find((x: Exercise) => x.id === e.exerciseId);
      return {
        exerciseId:       e.exerciseId,
        exerciseName:     libEx?.name ?? '',
        primaryMuscleId:  libEx?.primaryMuscleId ?? '',
        secondaryMuscles: libEx?.secondaryMuscles ?? [],
        exerciseType:     libEx?.type ?? 'strength',
        sets:             e.sets,
        reps:             e.reps,
        weight:           e.weight,
        restSeconds:      e.restSeconds || null,
        notes:            e.notes,
      };
    });

    await upsertDay(dayOfWeek, {
      workoutName: workoutName.trim() || DAY_NAMES_FULL[dayOfWeek],
      isRestDay,
      notes,
      exercises: isRestDay ? [] : exInputs,
    });

    setSaving(false);
    onClose();
  }

  const input: React.CSSProperties = {
    width: '100%', background: '#111827', border: '1px solid #1e2d4a',
    borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  };
  const numInput: React.CSSProperties = { ...input, textAlign: 'center' };

  const muscleMap = useMemo(
    () => Object.fromEntries(muscles.map((m: MuscleGroup) => [m.id, m.name])),
    [muscles],
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 16,
        width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid #1e2d4a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>
              {existing ? 'Editar treino' : 'Adicionar treino'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{DAY_NAMES_FULL[dayOfWeek]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {/* Workout name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5, fontWeight: 600 }}>
              Nome do treino
            </label>
            <input
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
              placeholder={DAY_NAMES_FULL[dayOfWeek]}
              style={input}
            />
          </div>

          {/* Rest day toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10,
            padding: '12px 14px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Moon size={15} color="#94a3b8" />
              <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>Dia de descanso</span>
            </div>
            <button
              onClick={() => setIsRestDay(v => !v)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: isRestDay ? '#7c3aed' : '#1e2d4a',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, width: 20, height: 20,
                borderRadius: '50%', background: '#e2e8f0', transition: 'left 0.2s',
                left: isRestDay ? 22 : 2,
              }} />
            </button>
          </div>

          {!isRestDay && (
            <>
              {editorExs.length > 0 && (
                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editorExs.map((ex, idx) => {
                    const libEx = exercises.find((e: Exercise) => e.id === ex.exerciseId);
                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#111827', border: '1px solid #1e2d4a',
                          borderRadius: 10, padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <select
                              value={ex.exerciseId}
                              onChange={e => updateExercise(idx, { exerciseId: e.target.value })}
                              style={{
                                ...input, paddingRight: 32, appearance: 'none',
                                background: '#0d1526', cursor: 'pointer',
                              }}
                            >
                              {exercises.map((e: Exercise) => (
                                <option key={e.id} value={e.id}>
                                  {e.name} ({muscleMap[e.primaryMuscleId] ?? e.primaryMuscleId})
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                          </div>
                          <button
                            onClick={() => removeExercise(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, flexShrink: 0 }}
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {[
                            { label: 'Séries',    key: 'sets'    as const, min: 1, step: 1   },
                            { label: 'Reps',      key: 'reps'    as const, min: 1, step: 1   },
                            { label: 'Carga (kg)',key: 'weight'  as const, min: 0, step: 0.5 },
                          ].map(({ label, key, min, step }) => (
                            <div key={key}>
                              <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3, textAlign: 'center' }}>
                                {label}
                              </label>
                              <input
                                type="number"
                                min={min}
                                step={step}
                                value={ex[key]}
                                onChange={e => updateExercise(idx, { [key]: parseFloat(e.target.value) || 0 })}
                                style={numInput}
                              />
                            </div>
                          ))}
                        </div>

                        {libEx && (
                          <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                            Músculo: {muscleMap[libEx.primaryMuscleId] ?? libEx.primaryMuscleId}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={addExercise}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: '1px dashed #1e2d4a', background: 'transparent',
                  color: '#7c3aed', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6, marginBottom: 12,
                }}
              >
                <Plus size={14} /> Adicionar exercício
              </button>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5, fontWeight: 600 }}>
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Foco em hipertrofia, descanso de 90s…"
                  rows={2}
                  style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #1e2d4a', flexShrink: 0,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '11px', borderRadius: 8, border: 'none',
              background: saving ? '#3730a3' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white', fontWeight: 800, fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saving
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando…</>
              : 'Salvar treino'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '11px 18px', borderRadius: 8, border: '1px solid #1e2d4a',
              background: 'transparent', color: '#94a3b8', fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  plan,
  estimatedXP,
  estimatedByMuscle,
  muscles,
  completing,
  onConfirm,
  onClose,
}: {
  plan: WeeklyPlan;
  estimatedXP: number;
  estimatedByMuscle: Record<string, number>;
  muscles: MuscleGroup[];
  completing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const muscleMap = Object.fromEntries(muscles.map((m: MuscleGroup) => [m.id, m]));
  const topMuscles = Object.entries(estimatedByMuscle)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0d1526', border: '1px solid #7c3aed40', borderRadius: 16,
        width: '100%', maxWidth: 400, padding: 24,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏋️</div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
            Concluir treino?
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            {plan.workoutName}
          </p>
        </div>

        <div style={{
          background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10,
          padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
            XP estimado
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#a855f7', marginBottom: 8 }}>
            +{estimatedXP.toLocaleString()} XP
          </div>
          {topMuscles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {topMuscles.map(([mId, xp]) => {
                const m = muscleMap[mId] as MuscleGroup | undefined;
                return (
                  <span key={mId} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#1e2d4a', borderRadius: 20, padding: '3px 10px',
                    fontSize: 11, color: '#e2e8f0',
                  }}>
                    {m?.icon ?? '💪'} {m?.name ?? mId} <span style={{ color: '#a855f7', fontWeight: 700 }}>+{xp}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {plan.exercises.length > 0 && (
          <div style={{ marginBottom: 20, fontSize: 13, color: '#64748b' }}>
            {plan.exercises.length} exercício{plan.exercises.length !== 1 ? 's' : ''} ·{' '}
            {plan.exercises.reduce((s, e) => s + e.sets, 0)} séries no total
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={completing}
            style={{
              flex: 1, padding: '12px', borderRadius: 8, border: 'none',
              background: completing ? '#3730a3' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white', fontWeight: 800, fontSize: 15,
              cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {completing
              ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Registrando…</>
              : <><CheckCircle2 size={16} /> Concluir</>}
          </button>
          <button
            onClick={onClose}
            disabled={completing}
            style={{
              padding: '12px 18px', borderRadius: 8, border: '1px solid #1e2d4a',
              background: 'transparent', color: '#94a3b8', fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── XP Result Modal ───────────────────────────────────────────────────────────

function XPResultModal({
  result,
  muscles,
  onClose,
}: {
  result: CompleteDayResult;
  muscles: MuscleGroup[];
  onClose: () => void;
}) {
  const muscleMap = Object.fromEntries(muscles.map((m: MuscleGroup) => [m.id, m]));
  const sorted = Object.entries(result.xpByMuscle)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0d1526', border: '1px solid #a855f740', borderRadius: 16,
        width: '100%', maxWidth: 380, padding: 28, textAlign: 'center',
        boxShadow: '0 0 60px #a855f720',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
        <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#f1f5f9' }}>
          Treino concluído!
        </h3>
        <div style={{ fontSize: 36, fontWeight: 900, color: '#a855f7', margin: '12px 0' }}>
          +{result.xpTotal.toLocaleString()} XP
        </div>

        {sorted.length > 0 && (
          <div style={{
            background: '#111827', border: '1px solid #1e2d4a', borderRadius: 10,
            padding: '12px 14px', marginBottom: 20, textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
              XP POR MÚSCULO
            </div>
            {sorted.map(([mId, xp]) => {
              const m = muscleMap[mId] as MuscleGroup | undefined;
              const maxXP = sorted[0][1];
              const pct = maxXP > 0 ? (xp / maxXP) * 100 : 0;
              return (
                <div key={mId} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#e2e8f0' }}>{m?.icon ?? '💪'} {m?.name ?? mId}</span>
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>+{xp} XP</span>
                  </div>
                  <div style={{ height: 3, background: '#1e2d4a', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m?.color ?? '#a855f7', borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}
        >
          Ótimo! 🚀
        </button>
      </div>
    </div>
  );
}

// ─── Day Card ──────────────────────────────────────────────────────────────────

function DayCard({
  dow,
  plan,
  isToday,
  exercises,
  workouts,
  onEdit,
  onComplete,
  onDelete,
}: {
  dow: number;
  plan: WeeklyPlan | undefined;
  isToday: boolean;
  exercises: Exercise[];
  workouts:  WorkoutSession[];
  onEdit:     () => void;
  onComplete: () => void;
  onDelete:   () => void;
}) {
  const today = todayStr();
  const isDoneToday  = plan?.lastCompletedDate === today;
  const isRest       = plan?.isRestDay;
  const hasExercises = plan && !isRest && plan.exercises.length > 0;

  const { total: estXP } = useMemo(
    () => (hasExercises ? estimateXP(plan!, exercises, workouts) : { total: 0, byMuscle: {} }),
    [plan, exercises, workouts],
  );

  const borderColor = isToday
    ? isDoneToday ? '#10b981' : '#7c3aed'
    : '#1e2d4a';

  return (
    <div style={{
      background: '#0d1526', border: `1px solid ${borderColor}`,
      borderRadius: 14, padding: 16,
      boxShadow: isToday ? `0 0 20px ${borderColor}25` : 'none',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: isToday ? '#7c3aed20' : '#1e2d4a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, color: isToday ? '#a855f7' : '#64748b',
          }}>
            {DAY_NAMES_SHORT[dow]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>
              {DAY_NAMES_FULL[dow]}
            </div>
            {isToday && (
              <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>HOJE</div>
            )}
          </div>
        </div>

        {isDoneToday  && <Badge color="#10b981"><CheckCircle2 size={10} /> Feito</Badge>}
        {!isDoneToday && isRest  && <Badge color="#64748b"><Moon size={10} /> Descanso</Badge>}
        {!isDoneToday && !plan   && <Badge color="#475569">Livre</Badge>}
        {!isDoneToday && hasExercises && (
          <Badge color="#a855f7"><Dumbbell size={10} /> {plan!.exercises.length} ex.</Badge>
        )}
      </div>

      {/* Workout info */}
      {plan && !isRest && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
            {plan.workoutName}
          </div>
          {plan.exercises.length > 0 && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {plan.exercises.reduce((s, e) => s + e.sets, 0)} séries · ~{estXP} XP estimado
            </div>
          )}
          {plan.notes && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3, fontStyle: 'italic' }}>
              {plan.notes}
            </div>
          )}
        </div>
      )}
      {isRest && (
        <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
          Dia reservado para descanso e recuperação.
        </div>
      )}
      {!plan && (
        <div style={{ fontSize: 12, color: '#475569' }}>
          Nenhum treino configurado para este dia.
        </div>
      )}

      {/* Exercise chips */}
      {hasExercises && plan!.exercises.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {plan!.exercises.slice(0, 4).map((pe, i) => (
            <span key={i} style={{
              background: '#111827', border: '1px solid #1e2d4a',
              borderRadius: 6, padding: '2px 8px', fontSize: 10, color: '#94a3b8',
            }}>
              {pe.exerciseName || exercises.find((e: Exercise) => e.id === pe.exerciseId)?.name || '?'}
            </span>
          ))}
          {plan!.exercises.length > 4 && (
            <span style={{
              background: '#111827', border: '1px solid #1e2d4a',
              borderRadius: 6, padding: '2px 8px', fontSize: 10, color: '#64748b',
            }}>
              +{plan!.exercises.length - 4} mais
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {hasExercises && !isDoneToday && (
          <button
            onClick={onComplete}
            style={{
              flex: 1, padding: '9px', borderRadius: 8,
              border: isToday ? 'none' : '1px solid #7c3aed50',
              background: isToday ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'transparent',
              color: isToday ? 'white' : '#7c3aed',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <CheckCircle2 size={13} /> Concluir
          </button>
        )}
        {isDoneToday && (
          <div style={{
            flex: 1, padding: '9px', borderRadius: 8,
            background: '#10b98115', border: '1px solid #10b98130',
            color: '#10b981', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <CheckCircle2 size={13} /> Concluído hoje
          </div>
        )}

        <button
          onClick={onEdit}
          style={{
            padding: '9px 12px', borderRadius: 8,
            border: '1px solid #1e2d4a', background: 'transparent',
            color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12,
          }}
        >
          <Pencil size={13} /> {plan ? 'Editar' : 'Configurar'}
        </button>

        {plan && (
          <button
            onClick={onDelete}
            style={{
              padding: '9px 10px', borderRadius: 8,
              border: '1px solid #ef444430', background: 'transparent',
              color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function WeeklyPlanPage() {
  const { plans, deleteDay, completeDay } = useWeeklyStore();
  const exercises = useGameStore(s => s.exercises);
  const workouts  = useGameStore(s => s.workouts);
  const muscles   = useGameStore(s => s.muscles);

  const [editingDow,    setEditingDow]    = useState<number | null>(null);
  const [confirmingDow, setConfirmingDow] = useState<number | null>(null);
  const [completing,    setCompleting]    = useState(false);
  const [xpResult,      setXpResult]      = useState<CompleteDayResult | null>(null);

  const today = todayDow();

  const planByDow = useMemo(
    () => Object.fromEntries(plans.map(p => [p.dayOfWeek, p])),
    [plans],
  );

  const confirmPlan = confirmingDow !== null ? planByDow[confirmingDow] : undefined;
  const { total: confirmXP, byMuscle: confirmByMuscle } = useMemo(
    () => confirmPlan ? estimateXP(confirmPlan, exercises, workouts) : { total: 0, byMuscle: {} },
    [confirmPlan, exercises, workouts],
  );

  async function handleComplete() {
    if (confirmingDow === null) return;
    setCompleting(true);
    const result = await completeDay(confirmingDow);
    setCompleting(false);
    setConfirmingDow(null);
    if (!result.alreadyDone && result.xpTotal > 0) {
      setXpResult(result);
    }
  }

  async function handleDelete(dow: number) {
    if (!window.confirm(`Remover treino de ${DAY_NAMES_FULL[dow]}?`)) return;
    await deleteDay(dow);
  }

  const totalDays      = plans.filter(p => !p.isRestDay && p.exercises.length > 0).length;
  const completedToday = plans.filter(p => p.lastCompletedDate === todayStr()).length;
  const restDays       = plans.filter(p => p.isRestDay).length;

  return (
    <div className="page-wrap">
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 26 }}>📅</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>
            Treino Semanal
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Configure sua rotina semanal. Conclua o treino do dia para ganhar XP automaticamente.
        </p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'DIAS ATIVOS', value: totalDays,      color: '#a855f7' },
          { label: 'DESCANSO',    value: restDays,       color: '#64748b' },
          { label: 'FEITOS HOJE', value: completedToday, color: '#10b981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#111827', border: `1px solid ${color}20`, borderRadius: 10,
            padding: '10px 16px', minWidth: 110,
          }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Day cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 14,
      }}>
        {Array.from({ length: 7 }, (_, dow) => (
          <DayCard
            key={dow}
            dow={dow}
            plan={planByDow[dow]}
            isToday={dow === today}
            exercises={exercises}
            workouts={workouts}
            onEdit={() => setEditingDow(dow)}
            onComplete={() => setConfirmingDow(dow)}
            onDelete={() => handleDelete(dow)}
          />
        ))}
      </div>

      {/* Tip */}
      <div style={{
        marginTop: 28, padding: '14px 16px',
        background: '#111827', border: '1px solid #1e2d4a',
        borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Zap size={16} color="#eab308" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          <strong style={{ color: '#94a3b8' }}>Dica:</strong> Ao concluir um treino semanal, o sistema
          registra uma sessão completa e distribui XP para todos os músculos envolvidos — incluindo
          bônus de streak e recordes pessoais.
        </p>
      </div>

      {/* Modals */}
      {editingDow !== null && (
        <DayEditorModal
          dayOfWeek={editingDow}
          existing={planByDow[editingDow]}
          onClose={() => setEditingDow(null)}
        />
      )}

      {confirmingDow !== null && confirmPlan && (
        <ConfirmModal
          plan={confirmPlan}
          estimatedXP={confirmXP}
          estimatedByMuscle={confirmByMuscle}
          muscles={muscles}
          completing={completing}
          onConfirm={handleComplete}
          onClose={() => setConfirmingDow(null)}
        />
      )}

      {xpResult && (
        <XPResultModal
          result={xpResult}
          muscles={muscles}
          onClose={() => setXpResult(null)}
        />
      )}
    </div>
  );
}
