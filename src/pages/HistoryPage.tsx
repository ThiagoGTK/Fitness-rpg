import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { calcVolume } from '../services/xpCalculator';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Zap, Calendar, ChevronDown, ChevronUp, Package } from 'lucide-react';

function formatDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR });
  } catch { return iso; }
}

export function HistoryPage() {
  const { workouts, exercises, muscles } = useGameStore();
  const [search, setSearch] = useState('');
  const [filterExercise, setFilterExercise] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = workouts.filter(w => {
    if (filterExercise && !w.entries.some(e => e.exerciseId === filterExercise)) return false;
    if (filterMuscle) {
      const hasMusc = w.entries.some(e => {
        const ex = exercises.find(x => x.id === e.exerciseId);
        return ex && (ex.primaryMuscleId === filterMuscle || ex.secondaryMuscles.some(s => s.muscleId === filterMuscle));
      });
      if (!hasMusc) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const matchNote = w.notes.toLowerCase().includes(s);
      const matchEx = w.entries.some(e => {
        const ex = exercises.find(x => x.id === e.exerciseId);
        return ex?.name.toLowerCase().includes(s);
      });
      if (!matchNote && !matchEx) return false;
    }
    return true;
  });

  const totalSessions = workouts.length;
  const totalXP = workouts.reduce((s, w) => s + w.totalXP, 0);
  const totalVolume = workouts.reduce((s, w) =>
    s + w.entries.reduce((es, e) => es + calcVolume(e.sets), 0), 0);

  return (
    <div className="fade-in-up" style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#f1f5f9' }}>📋 Histórico de Treinos</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{totalSessions} sessões registradas</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total de sessões', value: totalSessions, icon: '📅', color: '#a855f7' },
          { label: 'XP total ganho', value: `${totalXP.toLocaleString()}`, icon: '⚡', color: '#eab308' },
          { label: 'Volume total (kg)', value: `${(totalVolume / 1000).toFixed(1)}t`, icon: '📦', color: '#06b6d4' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="game-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <input className="game-input" style={{ maxWidth: 220 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="game-input" style={{ maxWidth: 200 }} value={filterExercise} onChange={e => setFilterExercise(e.target.value)}>
          <option value="">Todos os exercícios</option>
          {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <select className="game-input" style={{ maxWidth: 180 }} value={filterMuscle} onChange={e => setFilterMuscle(e.target.value)}>
          <option value="">Todos os músculos</option>
          {muscles.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
        </select>
      </div>

      {/* Workout list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            Nenhum treino encontrado
          </div>
        )}
        {filtered.map(w => {
          const totalVol = w.entries.reduce((s, e) => s + calcVolume(e.sets), 0);
          const isOpen = expanded === w.id;
          const prs = w.entries.filter(e => e.isPR).length;

          return (
            <div key={w.id} className="game-card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <button
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setExpanded(isOpen ? null : w.id)}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  🏋️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                      {w.entries.length} exercício{w.entries.length !== 1 ? 's' : ''}
                    </span>
                    {prs > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#eab30820', color: '#eab308', border: '1px solid #eab30840' }}>
                        🏆 {prs} PR{prs > 1 ? 's' : ''}
                      </span>
                    )}
                    {w.notes && <span style={{ fontSize: 12, color: '#64748b' }}>· {w.notes}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {formatDate(w.date)}
                    </span>
                    <span style={{ fontSize: 12, color: '#eab308', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Zap size={12} /> +{w.totalXP} XP
                    </span>
                    {totalVol > 0 && (
                      <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={12} /> {totalVol.toLocaleString()} kg
                      </span>
                    )}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
              </button>

              {/* Detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #1e2d4a', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {w.entries.map((e, i) => {
                      const ex = exercises.find(x => x.id === e.exerciseId);
                      const pm = ex ? muscles.find(m => m.id === ex.primaryMuscleId) : null;
                      const vol = calcVolume(e.sets);
                      const maxW = Math.max(0, ...e.sets.map(s => s.weight));
                      return (
                        <div key={i} style={{
                          padding: '12px 14px', borderRadius: 10,
                          background: '#0d1526', border: '1px solid #1e2d4a',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 18 }}>{pm?.icon || '🏋️'}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                                {ex?.name || 'Exercício desconhecido'}
                              </span>
                              {e.isPR && (
                                <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#eab30820', color: '#eab308', border: '1px solid #eab30840', fontWeight: 700 }}>
                                  🏆 RECORD
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 12, color: '#eab308', fontWeight: 700 }}>+{e.xpGained} XP</span>
                          </div>

                          {/* Sets table */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {e.sets.map((s, si) => (
                              <div key={si} style={{
                                padding: '4px 8px', borderRadius: 6, background: '#111827',
                                border: '1px solid #1e2d4a', fontSize: 12, color: '#94a3b8',
                              }}>
                                S{si + 1}: {s.weight > 0 ? `${s.weight}kg` : 'PC'} × {s.reps}
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#64748b' }}>
                            {vol > 0 && <span>📦 {vol.toLocaleString()} kg vol.</span>}
                            {maxW > 0 && <span>⬆️ Máx: {maxW}kg</span>}
                            <span>💪 Dificuldade: {e.difficulty}/10</span>
                            {e.restTime && <span>⏱️ Descanso: {e.restTime}s</span>}
                            {e.notes && <span style={{ fontStyle: 'italic' }}>"{e.notes}"</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
