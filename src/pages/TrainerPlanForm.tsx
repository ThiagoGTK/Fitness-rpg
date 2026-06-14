import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Check } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useTrainerStore } from '../store/trainerStore';
import type { TrainerPlanExercise } from '../types';

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

export function TrainerPlanForm() {
  const { studentId, planId } = useParams();
  const navigate = useNavigate();
  const { exercises } = useGameStore();
  const { studentDetails, loadStudentDetail, createPlan, updatePlan, loading } = useTrainerStore();

  const [planName, setPlanName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [planExercises, setPlanExercises] = useState<TrainerPlanExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      setScheduledDate('');
      setNotes('');
      setPlanExercises([{ ...defaultExercise, id: 'row-0', orderIndex: 0 }]);
      return;
    }

    setPlanName(selectedPlan.planName);
    setScheduledDate(selectedPlan.scheduledDate ?? '');
    setNotes(selectedPlan.notes);
    setPlanExercises(selectedPlan.exercises.map((exercise, index) => ({ ...exercise, orderIndex: index })));
  }, [selectedPlan]);

  function handleExerciseChange(index: number, update: Partial<TrainerPlanExercise>) {
    setPlanExercises(prev => prev.map((item, idx) => idx === index ? { ...item, ...update } : item));
  }

  function addExercise() {
    setPlanExercises(prev => [...prev, { ...defaultExercise, id: `row-${prev.length}`, orderIndex: prev.length }]);
  }

  function removeExercise(index: number) {
    setPlanExercises(prev => prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, orderIndex: idx })));
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

    if (planId) {
      await updatePlan(planId, planName.trim(), scheduledDate || undefined, notes, payload);
    } else {
      await createPlan(studentId, planName.trim(), scheduledDate || undefined, notes, payload);
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Data agendada</label>
              <input className="game-input" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Observações</label>
              <input className="game-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instruções gerais" />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Exercícios prescritos</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Defina séries, repetições, peso e descanso.</div>
              </div>
              <button className="btn-secondary" onClick={addExercise}>
                <Plus size={14} /> Adicionar exercício
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {planExercises.map((exercise, index) => (
                <div key={exercise.id || index} className="game-card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Exercício {index + 1}</div>
                    <button className="btn-ghost" onClick={() => removeExercise(index)}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Exercício</label>
                      <select className="game-input" value={exercise.exerciseId ?? ''} onChange={e => {
                        const selectedId = e.target.value;
                        const selected = selectedId ? getExerciseOption(selectedId) : undefined;
                        handleExerciseChange(index, {
                          exerciseId: selectedId || null,
                          exerciseName: selected?.name ?? exercise.exerciseName,
                          primaryMuscleId: selected?.primaryMuscleId ?? exercise.primaryMuscleId,
                        });
                      }}>
                        <option value="">Selecione ou digite abaixo</option>
                        {exercises.map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Nome alternativo</label>
                      <input className="game-input" value={exercise.exerciseName} onChange={e => handleExerciseChange(index, { exerciseName: e.target.value })} placeholder="Nome livre" />
                    </div>

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
    </div>
  );
}
