import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useTrainerStore } from '../store/trainerStore';
import { SEED_MUSCLES } from '../data/seedData';
import type { TrainerPlanExercise } from '../types';

const WEEK_DAYS = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
];

const EXERCISE_TYPES = [
  { value: 'strength',  label: 'Força' },
  { value: 'cardio',    label: 'Cardio' },
  { value: 'endurance', label: 'Resistência' },
  { value: 'mobility',  label: 'Mobilidade' },
  { value: 'stretching', label: 'Alongamento' },
];

const defaultExercise: TrainerPlanExercise = {
  id: '',
  planId: '',
  exerciseId: null,
  exerciseName: '',
  primaryMuscleId: '',
  secondaryMuscles: [],
  exerciseType: 'strength',
  sets: 3,
  reps: 10,
  weight: 0,
  restSeconds: undefined,
  notes: '',
  orderIndex: 0,
};

interface NewExForm {
  name: string;
  muscleId: string;
  type: string;
  creating: boolean;
}

const blankNewEx = (): NewExForm => ({ name: '', muscleId: SEED_MUSCLES[0].id, type: 'strength', creating: false });

export function TrainerPlanForm() {
  const { studentId, planId } = useParams();
  const navigate = useNavigate();
  const { exercises, addExercise } = useGameStore();
  const { studentDetails, loadStudentDetail, createPlan, updatePlan, loading } = useTrainerStore();

  const [planName, setPlanName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [planExercises, setPlanExercises] = useState<TrainerPlanExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Inline exercise creation state — only one row open at a time
  const [createIdx, setCreateIdx] = useState<number | null>(null);
  const [newEx, setNewEx] = useState<NewExForm>(blankNewEx());

  useEffect(() => {
    if (!studentId) return;
    loadStudentDetail(studentId);
  }, [studentId]);

  const selectedPlan = useMemo(() => {
    return planId ? studentDetails?.plans.find(plan => plan.id === planId) : undefined;
  }, [planId, studentDetails]);

  useEffect(() => {
    if (!selectedPlan) {
      setPlanName('');
      setSelectedDays([]);
      setNotes('');
      setPlanExercises([{ ...defaultExercise, id: 'row-0', orderIndex: 0 }]);
      return;
    }
    setPlanName(selectedPlan.planName);
    setSelectedDays(
      selectedPlan.scheduledDate
        ? selectedPlan.scheduledDate.split(',').map(Number).filter(n => n >= 0 && n <= 6)
        : []
    );
    setNotes(selectedPlan.notes);
    setPlanExercises(selectedPlan.exercises.map((exercise, index) => ({ ...exercise, orderIndex: index })));
  }, [selectedPlan]);

  function handleExerciseChange(index: number, update: Partial<TrainerPlanExercise>) {
    setPlanExercises(prev => prev.map((item, idx) => idx === index ? { ...item, ...update } : item));
  }

  function addRow() {
    setPlanExercises(prev => [...prev, { ...defaultExercise, id: `row-${prev.length}`, orderIndex: prev.length }]);
  }

  function removeExercise(index: number) {
    if (createIdx === index) { setCreateIdx(null); setNewEx(blankNewEx()); }
    setPlanExercises(prev => prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, orderIndex: idx })));
  }

  function openCreate(index: number) {
    setCreateIdx(index);
    setNewEx(blankNewEx());
  }

  function closeCreate() {
    setCreateIdx(null);
    setNewEx(blankNewEx());
  }

  async function handleCreateExercise(index: number) {
    if (!newEx.name.trim()) return;
    setNewEx(prev => ({ ...prev, creating: true }));

    const id = await addExercise({
      name: newEx.name.trim(),
      primaryMuscleId: newEx.muscleId,
      secondaryMuscles: [],
      type: newEx.type as 'strength' | 'cardio' | 'endurance' | 'mobility' | 'stretching',
      notes: '',
    });

    if (id) {
      handleExerciseChange(index, {
        exerciseId: id,
        exerciseName: newEx.name.trim(),
        primaryMuscleId: newEx.muscleId,
        exerciseType: newEx.type as TrainerPlanExercise['exerciseType'],
      });
      closeCreate();
    } else {
      setNewEx(prev => ({ ...prev, creating: false }));
    }
  }

  async function handleSubmit() {
    if (!studentId) return;
    if (!planName.trim()) { setError('O nome do plano é obrigatório.'); return; }
    if (planExercises.length === 0) { setError('Adicione pelo menos um exercício.'); return; }
    setSaving(true);
    setError('');

    const payload = planExercises.map(ex => ({
      ...ex,
      exerciseName: ex.exerciseName.trim() || 'Exercício',
      sets: Math.max(1, ex.sets),
      reps: Math.max(1, ex.reps),
      weight: Math.max(0, ex.weight),
      primaryMuscleId: ex.primaryMuscleId || '',
    }));

    const daysStr = selectedDays.length > 0 ? selectedDays.slice().sort((a, b) => a - b).join(',') : undefined;

    if (planId) {
      await updatePlan(planId, planName.trim(), daysStr, notes, payload);
    } else {
      await createPlan(studentId, planName.trim(), daysStr, notes, payload);
    }

    setSaving(false);
    navigate(`/trainer/students/${studentId}`);
  }

  function getExerciseOption(id: string) {
    return exercises.find(ex => ex.id === id);
  }

  return (
    <div className="page-wrap fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <button className="btn-ghost" onClick={() => navigate(`/trainer/students/${studentId}`)} style={{ marginBottom: 12 }}>
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9' }}>
            {planId ? 'Editar plano' : 'Novo plano'}
          </h1>
        </div>
      </div>

      <div className="game-card" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Nome do plano</label>
            <input className="game-input" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Treino de força" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Dias da semana</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEK_DAYS.map(day => {
                const active = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setSelectedDays(prev =>
                      active ? prev.filter(d => d !== day.value) : [...prev, day.value]
                    )}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `1px solid ${active ? '#7c3aed' : '#1e2d4a'}`,
                      background: active ? '#7c3aed30' : 'transparent',
                      color: active ? '#a855f7' : '#64748b',
                      transition: 'all 0.15s',
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {selectedDays.length === 0 && (
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>Nenhum dia selecionado</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Observações</label>
            <input className="game-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instruções gerais" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Exercícios prescritos</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Defina séries, repetições, peso e descanso.</div>
              </div>
              <button className="btn-secondary" onClick={addRow}>
                <Plus size={14} /> Adicionar exercício
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {planExercises.map((exercise, index) => (
                <div key={exercise.id || index} className="game-card" style={{ padding: 14, border: '1px solid #1e2d4a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Exercício {index + 1}</div>
                    <button className="btn-ghost" onClick={() => removeExercise(index)}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {/* Exercise selector */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8' }}>Exercício</label>
                        {createIdx !== index && (
                          <button
                            type="button"
                            onClick={() => openCreate(index)}
                            style={{ fontSize: 11, color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', gap: 3 }}
                          >
                            <Plus size={11} /> Criar novo
                          </button>
                        )}
                      </div>
                      <select className="game-input" value={exercise.exerciseId ?? ''} onChange={e => {
                        const selectedId = e.target.value;
                        const selected = selectedId ? getExerciseOption(selectedId) : undefined;
                        handleExerciseChange(index, {
                          exerciseId: selectedId || null,
                          exerciseName: selected?.name ?? exercise.exerciseName,
                          primaryMuscleId: selected?.primaryMuscleId ?? exercise.primaryMuscleId,
                        });
                      }}>
                        <option value="">Selecione um exercício</option>
                        {exercises.map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Inline create exercise form */}
                    {createIdx === index && (
                      <div style={{
                        padding: '14px 16px',
                        borderRadius: 10,
                        background: '#7c3aed12',
                        border: '1px solid #7c3aed40',
                        display: 'grid',
                        gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7' }}>Criar novo exercício</div>
                          <button type="button" onClick={closeCreate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                            <X size={14} />
                          </button>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Nome do exercício *</label>
                          <input
                            className="game-input"
                            value={newEx.name}
                            onChange={e => setNewEx(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex.: Supino reto"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateExercise(index); }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Músculo principal</label>
                            <select
                              className="game-input"
                              value={newEx.muscleId}
                              onChange={e => setNewEx(prev => ({ ...prev, muscleId: e.target.value }))}
                            >
                              {SEED_MUSCLES.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Tipo</label>
                            <select
                              className="game-input"
                              value={newEx.type}
                              onChange={e => setNewEx(prev => ({ ...prev, type: e.target.value }))}
                            >
                              {EXERCISE_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleCreateExercise(index)}
                          disabled={!newEx.name.trim() || newEx.creating}
                          style={{ justifyContent: 'center' }}
                        >
                          {newEx.creating
                            ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Criando...</>
                            : <><Check size={13} /> Criar e selecionar</>}
                        </button>
                      </div>
                    )}

                    {/* Free-form name (shown when no exercise selected from list) */}
                    {!exercise.exerciseId && createIdx !== index && (
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Nome livre</label>
                        <input
                          className="game-input"
                          value={exercise.exerciseName}
                          onChange={e => handleExerciseChange(index, { exerciseName: e.target.value })}
                          placeholder="Ex.: Agachamento livre"
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Séries</label>
                        <input className="game-input" type="number" min={1} value={exercise.sets} onChange={e => handleExerciseChange(index, { sets: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Reps</label>
                        <input className="game-input" type="number" min={1} value={exercise.reps} onChange={e => handleExerciseChange(index, { reps: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Peso (kg)</label>
                        <input className="game-input" type="number" min={0} step={0.5} value={exercise.weight} onChange={e => handleExerciseChange(index, { weight: Number(e.target.value) })} />
                        {exercise.weight === 0 && (
                          <div style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>O aluno definirá o peso</div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Descanso (s)</label>
                        <input className="game-input" type="number" min={0} value={exercise.restSeconds ?? ''} onChange={e => handleExerciseChange(index, { restSeconds: e.target.value ? Number(e.target.value) : undefined })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Observações</label>
                        <input className="game-input" value={exercise.notes} onChange={e => handleExerciseChange(index, { notes: e.target.value })} placeholder="Ex.: focar na forma" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => navigate(`/trainer/students/${studentId}`)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving || loading}>
              {saving ? 'Salvando...' : <><Check size={14} /> Salvar plano</>}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
