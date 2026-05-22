import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LevelBadge } from '../components/ui/LevelBadge';
import { XPBar } from '../components/ui/XPBar';
import { xpForExerciseLevel } from '../services/levelCalculator';
import { EXERCISE_TYPE_LABELS } from '../types';
import type { Exercise, ExerciseType } from '../types';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

const TYPE_COLORS: Record<ExerciseType, string> = {
  strength: '#a855f7', endurance: '#06b6d4', cardio: '#ef4444',
  mobility: '#10b981', stretching: '#eab308',
};

const EMPTY_FORM = {
  name: '', primaryMuscleId: '', secondaryMuscles: [] as { muscleId: string; xpPercentage: number }[],
  type: 'strength' as ExerciseType, notes: '',
};

function ExerciseModal({ exercise, onClose }: { exercise?: Exercise; onClose: () => void }) {
  const { muscles, addExercise, updateExercise } = useGameStore();
  const [form, setForm] = useState(exercise ? {
    name: exercise.name,
    primaryMuscleId: exercise.primaryMuscleId,
    secondaryMuscles: exercise.secondaryMuscles.map(sm => ({ ...sm })),
    type: exercise.type,
    notes: exercise.notes,
  } : { ...EMPTY_FORM });
  const [error, setError] = useState('');

  function addSecondary() {
    const available = muscles.filter(m => m.id !== form.primaryMuscleId && !form.secondaryMuscles.some(s => s.muscleId === m.id));
    if (available.length === 0) return;
    setForm(f => ({ ...f, secondaryMuscles: [...f.secondaryMuscles, { muscleId: available[0].id, xpPercentage: 40 }] }));
  }

  function removeSecondary(idx: number) {
    setForm(f => ({ ...f, secondaryMuscles: f.secondaryMuscles.filter((_, i) => i !== idx) }));
  }

  function updateSecondary(idx: number, field: 'muscleId' | 'xpPercentage', value: string | number) {
    setForm(f => ({
      ...f,
      secondaryMuscles: f.secondaryMuscles.map((s, i) =>
        i === idx ? { ...s, [field]: field === 'xpPercentage' ? Number(value) : value } : s
      ),
    }));
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
    if (!form.primaryMuscleId) { setError('Músculo principal é obrigatório'); return; }
    const data = {
      name: form.name.trim(), primaryMuscleId: form.primaryMuscleId,
      secondaryMuscles: form.secondaryMuscles.filter(s => s.muscleId && s.muscleId !== form.primaryMuscleId),
      type: form.type, notes: form.notes,
    };
    if (exercise) { updateExercise(exercise.id, data); }
    else { addExercise(data); }
    onClose();
  }

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div className="modal-content game-card" style={{ maxWidth: 540, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f1f5f9' }}>
            {exercise ? 'Editar Exercício' : 'Novo Exercício'}
          </h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px' }}><X size={18} /></button>
        </div>

        {error && <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#ef4444', marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Nome *</label>
            <input className="game-input" placeholder="Ex: Supino Reto" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Músculo principal *</label>
            <select className="game-input" value={form.primaryMuscleId} onChange={e => setForm(f => ({ ...f, primaryMuscleId: e.target.value }))}>
              <option value="">Selecione...</option>
              {muscles.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Tipo</label>
            <select className="game-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ExerciseType }))}>
              {Object.entries(EXERCISE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: '#94a3b8' }}>Músculos secundários</label>
              <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={addSecondary}>
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {form.secondaryMuscles.map((sm, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select className="game-input" style={{ flex: 2 }} value={sm.muscleId}
                  onChange={e => updateSecondary(i, 'muscleId', e.target.value)}>
                  {muscles.filter(m => m.id !== form.primaryMuscleId).map(m =>
                    <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
                </select>
                <input className="game-input" style={{ flex: 1 }} type="number" min={5} max={100}
                  value={sm.xpPercentage} onChange={e => updateSecondary(i, 'xpPercentage', e.target.value)}
                  placeholder="% XP" />
                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>% XP</span>
                <button className="btn-ghost" style={{ padding: '6px', flexShrink: 0 }} onClick={() => removeSecondary(i)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Observações</label>
            <textarea className="game-input" rows={2} placeholder="Notas sobre o exercício..." value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit}>
            <Save size={15} /> Salvar
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export function ExercisesPage() {
  const { exercises, muscles, deleteExercise } = useGameStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exercise | undefined>();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || ex.type === filterType;
    const matchMuscle = !filterMuscle || ex.primaryMuscleId === filterMuscle || ex.secondaryMuscles.some(s => s.muscleId === filterMuscle);
    return matchSearch && matchType && matchMuscle;
  });

  const sorted = [...filtered].sort((a, b) => b.level - a.level || b.timesPerformed - a.timesPerformed);

  function getMuscle(id: string) { return muscles.find(m => m.id === id); }

  return (
    <div className="fade-in-up" style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      {(showModal || editing) && (
        <ExerciseModal exercise={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />
      )}
      {confirmDelete && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal-content game-card" style={{ padding: 28, maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#f1f5f9' }}>Excluir exercício?</h3>
            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-danger" onClick={() => { deleteExercise(confirmDelete); setConfirmDelete(null); }}>
                <Trash2 size={14} /> Excluir
              </button>
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#f1f5f9' }}>🏋️ Exercícios</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{exercises.length} exercícios cadastrados</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Exercício
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <input className="game-input" style={{ maxWidth: 220 }} placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="game-input" style={{ maxWidth: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(EXERCISE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="game-input" style={{ maxWidth: 180 }} value={filterMuscle} onChange={e => setFilterMuscle(e.target.value)}>
          <option value="">Todos os músculos</option>
          {muscles.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
        </select>
      </div>

      {/* Exercise list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {sorted.map(ex => {
          const pm = getMuscle(ex.primaryMuscleId);
          const req = xpForExerciseLevel(ex.level);
          const color = TYPE_COLORS[ex.type];
          return (
            <div key={ex.id} className="game-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {pm && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: `${pm.color}20`, color: pm.color,
                      }}>{pm.icon} {pm.name}</span>
                    )}
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: `${color}20`, color,
                    }}>{EXERCISE_TYPE_LABELS[ex.type]}</span>
                  </div>
                </div>
                <LevelBadge level={ex.level} size="sm" />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                  <span>{ex.currentXP} / {req} XP</span>
                  <span>{ex.timesPerformed}× realizado</span>
                </div>
                <XPBar current={ex.currentXP} required={req} color={pm?.color} animated={false} height={6} />
              </div>

              {ex.secondaryMuscles.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                  {ex.secondaryMuscles.map(sm => {
                    const sm_m = getMuscle(sm.muscleId);
                    if (!sm_m) return null;
                    return (
                      <span key={sm.muscleId} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#0d1526', color: '#64748b', border: '1px solid #1e2d4a' }}>
                        {sm_m.name} {sm.xpPercentage}%
                      </span>
                    );
                  })}
                </div>
              )}

              {ex.notes && <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>{ex.notes}</p>}

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1e2d4a', paddingTop: 10 }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => setEditing(ex)}>
                  <Pencil size={13} /> Editar
                </button>
                <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => setConfirmDelete(ex.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <div>Nenhum exercício encontrado</div>
          </div>
        )}
      </div>
    </div>
  );
}
