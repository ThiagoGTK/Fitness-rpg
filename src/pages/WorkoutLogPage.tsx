import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import type { WorkoutSet, WorkoutEntryInput, Exercise, MuscleGroup, WorkoutSession, ExerciseType } from '../types';
import { EXERCISE_TYPE_LABELS } from '../types';
import { Plus, Trash2, ChevronDown, ChevronUp, Zap, CheckCircle, X } from 'lucide-react';
import { DatePickerInput } from '../components/ui/DatePickerInput';
import { calculateEntryXP, calcVolume } from '../services/xpCalculator';

interface EntryDraft extends WorkoutEntryInput {
  expanded: boolean;
}

const DEFAULT_SET: WorkoutSet = { reps: 10, weight: 0 };

function SetRow({ set, onChange, onRemove, idx }: {
  set: WorkoutSet;
  onChange: (s: WorkoutSet) => void;
  onRemove: () => void;
  idx: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <span style={{ fontSize: 12, color: '#64748b', width: 32, textAlign: 'center', flexShrink: 0 }}>S{idx + 1}</span>
      <div style={{ display: 'flex', flex: 1, gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Peso (kg)</label>
          <input className="game-input" type="number" min={0} step={0.5} value={set.weight || ''}
            onChange={e => onChange({ ...set, weight: Number(e.target.value) })}
            placeholder="0 = peso corporal" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 3 }}>Reps</label>
          <input className="game-input" type="number" min={1} value={set.reps || ''}
            onChange={e => onChange({ ...set, reps: Number(e.target.value) })} />
        </div>
      </div>
      <button className="btn-ghost" style={{ padding: 6, flexShrink: 0 }} onClick={onRemove}><X size={14} /></button>
    </div>
  );
}

function EntryCard({ entry, index, exercises, muscles, onUpdate, onRemove, prevSessions }: {
  entry: EntryDraft; index: number;
  exercises: Exercise[]; muscles: MuscleGroup[];
  onUpdate: (e: EntryDraft) => void; onRemove: () => void;
  prevSessions: WorkoutSession[];
}) {
  const { addExercise } = useGameStore();
  const [isCreating, setIsCreating]     = useState(false);
  const [newName, setNewName]           = useState('');
  const [newMuscleId, setNewMuscleId]   = useState('');
  const [newType, setNewType]           = useState<ExerciseType>('strength');
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState('');

  async function handleCreateExercise() {
    if (!newName.trim())                        { setCreateError('Informe o nome do exercício'); return; }
    if (!newMuscleId)   { setCreateError('Selecione o músculo principal'); return; }
    setCreating(true);
    setCreateError('');
    const newId = await addExercise({
      name: newName.trim(),
      primaryMuscleId: newMuscleId,
      secondaryMuscles: [],
      type: newType,
      notes: '',
    });
    if (newId) {
      onUpdate({ ...entry, exerciseId: newId });
      setIsCreating(false);
      setNewName('');
      setNewMuscleId('');
      setNewType('strength');
    } else {
      setCreateError('Erro ao criar exercício. Tente novamente.');
    }
    setCreating(false);
  }

  const exercise = exercises.find(e => e.id === entry.exerciseId);
  const primaryMuscle = exercise ? muscles.find(m => m.id === exercise.primaryMuscleId) : null;
  const isCardio = exercise?.primaryMuscleId === 'cardio';
  const volume = calcVolume(entry.sets);
  const xpPreview = exercise ? calculateEntryXP(entry, exercise, prevSessions).exerciseXP : 0;

  return (
    <div className="game-card" style={{ padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          onClick={() => onUpdate({ ...entry, expanded: !entry.expanded })}
        >
          <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
            {primaryMuscle?.icon || '🏋️'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
              {isCreating ? <span style={{ color: '#10b981' }}>✨ {newName || 'Novo exercício...'}</span>
                : exercise ? exercise.name : `Exercício ${index + 1}`}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {entry.sets.length} série{entry.sets.length !== 1 ? 's' : ''}
              {volume > 0 && ` · ${volume.toLocaleString()} kg vol.`}
              {xpPreview > 0 && <span style={{ color: '#eab308' }}> · +{xpPreview} XP</span>}
            </div>
          </div>
          {entry.expanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
        </button>
        <button className="btn-ghost" style={{ padding: 6 }} onClick={onRemove}><Trash2 size={14} /></button>
      </div>

      {/* Body */}
      {entry.expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid #1e2d4a', paddingTop: 14 }}>
          {/* Exercise picker */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Exercício</label>

            {!isCreating ? (
              <select className="game-input" value={entry.exerciseId}
                onChange={e => {
                  if (e.target.value === '__new__') { setIsCreating(true); }
                  else { onUpdate({ ...entry, exerciseId: e.target.value }); }
                }}>
                <option value="">Selecione...</option>
                {exercises.map(ex => {
                  const m = muscles.find(mm => mm.id === ex.primaryMuscleId);
                  return <option key={ex.id} value={ex.id}>{m?.icon} {ex.name} (Lv {ex.level})</option>;
                })}
                <option disabled value="">──────────────</option>
                <option value="__new__">➕ Criar novo exercício...</option>
              </select>
            ) : (
              /* ── Inline quick-create form ── */
              <div style={{
                background: '#071a0d', border: '1px solid #10b98140',
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>✨ Criar novo exercício</span>
                  <button className="btn-ghost" style={{ padding: '3px 6px', fontSize: 11 }}
                    onClick={() => { setIsCreating(false); setCreateError(''); setNewName(''); setNewMuscleId(''); }}>
                    <X size={12} /> Cancelar
                  </button>
                </div>

                {createError && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{createError}</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    className="game-input"
                    placeholder="Nome do exercício *"
                    value={newName}
                    autoFocus
                    onChange={e => { setNewName(e.target.value); setCreateError(''); }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: newType === 'cardio' ? '1fr' : '1fr 1fr', gap: 8 }}>
                    {newType !== 'cardio' && (
                      <select className="game-input" value={newMuscleId}
                        onChange={e => { setNewMuscleId(e.target.value); setCreateError(''); }}>
                        <option value="">Músculo principal *</option>
                        {muscles.map(m => (
                          <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
                        ))}
                      </select>
                    )}

                    <select className="game-input" value={newType}
                      onChange={e => {
                        const t = e.target.value as ExerciseType;
                        setNewType(t);
                        // cardio usa categoria própria; ao sair do cardio, limpa
                        if (t === 'cardio') setNewMuscleId('cardio');
                        else if (newMuscleId === 'cardio') setNewMuscleId('');
                      }}>
                      {Object.entries(EXERCISE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn-primary"
                    style={{ justifyContent: 'center', fontSize: 13, padding: '9px 14px', opacity: creating ? 0.7 : 1 }}
                    onClick={handleCreateExercise}
                    disabled={creating}
                  >
                    {creating
                      ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
                      : '✓ Criar e Adicionar ao Treino'
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Séries</label>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }}
                onClick={() => onUpdate({ ...entry, sets: [...entry.sets, { ...DEFAULT_SET }] })}>
                <Plus size={12} /> Série
              </button>
            </div>
            {entry.sets.map((set, si) => (
              <SetRow key={si} idx={si} set={set}
                onChange={s => onUpdate({ ...entry, sets: entry.sets.map((x, ii) => ii === si ? s : x) })}
                onRemove={() => onUpdate({ ...entry, sets: entry.sets.filter((_, ii) => ii !== si) })}
              />
            ))}
          </div>

          {/* Extra fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            {!isCardio && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Descanso (s)</label>
                <input className="game-input" type="number" min={0} value={entry.restTime || ''}
                  onChange={e => onUpdate({ ...entry, restTime: Number(e.target.value) || undefined })}
                  placeholder="Opcional" />
              </div>
            )}
            <div style={{ gridColumn: isCardio ? '1 / -1' : 'auto' }}>
              <label style={{
                display: 'block', fontSize: 12, marginBottom: 5,
                color: isCardio && entry.sets.length === 0 && !entry.duration ? '#ef4444' : isCardio ? '#10b981' : '#94a3b8',
                fontWeight: isCardio ? 700 : 400,
              }}>
                ⏱️ Duração (min){isCardio && entry.sets.length === 0 ? ' *' : ''}
              </label>
              <input
                className="game-input"
                type="number" min={0}
                value={entry.duration || ''}
                onChange={e => onUpdate({ ...entry, duration: Number(e.target.value) || undefined })}
                placeholder={isCardio && entry.sets.length === 0 ? 'Obrigatório para cardio' : 'Opcional'}
                style={isCardio ? { borderColor: entry.duration ? '#10b98160' : '#ef444440' } : {}}
              />
              {isCardio && (
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                  {entry.duration
                    ? `≈ ${entry.duration * 5} XP base de duração${volume > 0 ? ` + ${Math.floor(volume / 10)} XP de volume` : ''}`
                    : entry.sets.length > 0 ? 'Adicione duração para bônus de XP' : 'XP calculado pelos minutos'}
                </div>
              )}
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              Dificuldade: <strong style={{ color: entry.difficulty >= 8 ? '#ef4444' : entry.difficulty >= 5 ? '#eab308' : '#10b981' }}>
                {entry.difficulty}/10
              </strong>
            </label>
            <input type="range" min={1} max={10} value={entry.difficulty} style={{ width: '100%', accentColor: '#7c3aed' }}
              onChange={e => onUpdate({ ...entry, difficulty: Number(e.target.value) })} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
              <span>Fácil</span><span>Médio</span><span>Difícil</span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 10 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Observações</label>
            <textarea className="game-input" rows={2} value={entry.notes} placeholder="Como foi esse exercício?"
              onChange={e => onUpdate({ ...entry, notes: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkoutLogPage() {
  const { exercises, muscles, workouts, addWorkout } = useGameStore();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<EntryDraft[]>([]);
  const [success, setSuccess]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]   = useState<string[]>([]);

  function addEntry() {
    setEntries(es => [...es, {
      exerciseId: exercises[0]?.id || '',
      sets: [{ ...DEFAULT_SET }],
      difficulty: 7,
      notes: '',
      expanded: true,
    }]);
  }

  function updateEntry(i: number, e: EntryDraft) {
    setEntries(es => es.map((x, ii) => ii === i ? e : x));
  }

  function removeEntry(i: number) {
    setEntries(es => es.filter((_, ii) => ii !== i));
  }

  const totalXPPreview = entries.reduce((sum, entry) => {
    const ex = exercises.find(e => e.id === entry.exerciseId);
    if (!ex) return sum;
    const isCardio = ex.primaryMuscleId === 'cardio';
    // Cardio: include if has duration or sets; others: need at least one set
    if (!isCardio && entry.sets.length === 0) return sum;
    if (isCardio && entry.sets.length === 0 && !entry.duration) return sum;
    return sum + calculateEntryXP(entry, ex, workouts).exerciseXP;
  }, 0);

  function validate(): string[] {
    const errs: string[] = [];
    if (entries.length === 0) errs.push('Adicione pelo menos um exercício');
    entries.forEach((e, i) => {
      if (!e.exerciseId) errs.push(`Exercício ${i + 1}: selecione o exercício`);
      const ex = exercises.find(x => x.id === e.exerciseId);
      const isCardio = ex?.primaryMuscleId === 'cardio';
      if (!isCardio && e.sets.length === 0) {
        errs.push(`Exercício ${i + 1}: adicione pelo menos uma série`);
      }
      if (isCardio && e.sets.length === 0 && !e.duration) {
        errs.push(`Exercício ${i + 1}: informe a duração em minutos`);
      }
      e.sets.forEach((s, si) => {
        if (s.reps <= 0) errs.push(`Exercício ${i + 1}, série ${si + 1}: reps inválidas`);
      });
    });
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setSubmitting(true);
    try {
      await addWorkout({
        date: new Date(date + 'T12:00:00').toISOString(),
        entries: entries.map(({ expanded: _, ...e }) => e),
        notes,
      });
      setSuccess(true);
      setTimeout(() => navigate('/history'), 2000);
    } catch {
      setErrors(['Erro ao salvar treino. Verifique sua conexão e tente novamente.']);
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
        <div className="fade-in-up">
          <div style={{ fontSize: 72, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', marginBottom: 8 }}>Treino Registrado!</h2>
          <p style={{ color: '#64748b', marginBottom: 4 }}>+{totalXPPreview} XP ganhos</p>
          <div style={{ fontSize: 14, color: '#64748b' }}>Redirecionando para o histórico...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap fade-in-up" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
          ➕ Registrar Treino
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Registre seus exercícios e ganhe XP
        </p>
      </div>

      {/* Date + notes */}
      <div className="game-card" style={{ padding: '16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <DatePickerInput
              label="📅 Data do treino"
              value={date}
              max={today}
              onChange={setDate}
            />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Observações da sessão</label>
            <input className="game-input" placeholder="Ex: Treino de peito intenso" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
          {errors.map((e, i) => <div key={i} style={{ fontSize: 13, color: '#ef4444' }}>• {e}</div>)}
        </div>
      )}

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {entries.map((entry, i) => (
          <EntryCard key={i} index={i} entry={entry} exercises={exercises} muscles={muscles}
            prevSessions={workouts} onUpdate={e => updateEntry(i, e)} onRemove={() => removeEntry(i)} />
        ))}
      </div>

      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }} onClick={addEntry}>
        <Plus size={16} /> Adicionar Exercício
      </button>

      {/* Preview + submit */}
      {entries.length > 0 && (
        <div className="game-card" style={{ padding: '16px', background: 'linear-gradient(135deg, #111827, #1a0d33)', border: '1px solid #7c3aed40' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
              {entries.length} exercício{entries.length !== 1 ? 's' : ''} · Prévia de XP
            </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#eab308' }}>
              <Zap size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              +{totalXPPreview} XP
            </span>
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 16, opacity: submitting ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <><span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
              : <><CheckCircle size={18} /> Finalizar Treino</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
