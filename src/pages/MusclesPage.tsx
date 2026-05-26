import { useGameStore } from '../store/gameStore';
import { LevelBadge } from '../components/ui/LevelBadge';
import { XPBar } from '../components/ui/XPBar';
import { xpForMuscleLevel } from '../services/levelCalculator';

export function MusclesPage() {
  const { muscles, exercises, workouts } = useGameStore();

  const sortedMuscles = [...muscles].sort((a, b) => b.level - a.level || b.currentXP - a.currentXP);

  function timesTrainedMuscle(muscleId: string): number {
    let count = 0;
    for (const s of workouts) {
      for (const e of s.entries) {
        const ex = exercises.find(x => x.id === e.exerciseId);
        if (ex && (ex.primaryMuscleId === muscleId || ex.secondaryMuscles.some(sm => sm.muscleId === muscleId))) {
          count++;
        }
      }
    }
    return count;
  }

  const avgLevel = (muscles.reduce((s, m) => s + m.level, 0) / muscles.length).toFixed(1);
  const maxLevel = Math.max(...muscles.map(m => m.level));
  const totalXP = muscles.reduce((s, m) => s + m.totalXPEarned, 0);

  return (
    <div className="page-wrap fade-in-up">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
          💪 Grupos Musculares
        </h1>
        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 13 }}>
          Acompanhe a evolução de cada músculo
        </p>
      </div>

      {/* Summary */}
      <div className="grid-stat">
        {[
          { label: 'Nível médio', value: avgLevel, icon: '📊' },
          { label: 'Maior nível', value: maxLevel, icon: '🏆' },
          { label: 'XP total', value: `${(totalXP / 1000).toFixed(1)}k`, icon: '⚡' },
          { label: 'Grupos', value: muscles.length, icon: '🫁' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="game-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Body silhouette progress (visual) */}
      <div className="game-card" style={{ padding: '20px', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
          Visão geral do corpo
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {muscles.map(m => {
            const pct = xpForMuscleLevel(m.level) > 0 ?
              Math.min(100, Math.floor((m.currentXP / xpForMuscleLevel(m.level)) * 100)) : 0;
            return (
              <div key={m.id} style={{
                padding: '8px 12px', borderRadius: 10,
                background: `${m.color}15`,
                border: `2px solid ${m.color}${m.level >= 5 ? 'cc' : '40'}`,
                minWidth: 100, textAlign: 'center',
                boxShadow: m.level >= 5 ? `0 0 12px ${m.color}30` : 'none',
              }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>{m.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: m.color, fontWeight: 800, marginBottom: 4 }}>Lv {m.level}</div>
                <div style={{ height: 4, background: '#1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 2, transition: 'width 0.6s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Muscles detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedMuscles.map(m => {
          const req = xpForMuscleLevel(m.level);
          const timesTrained = timesTrainedMuscle(m.id);
          const relatedExs = exercises.filter(e =>
            e.primaryMuscleId === m.id ||
            e.secondaryMuscles.some(sm => sm.muscleId === m.id)
          );

          return (
            <div key={m.id} className="game-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${m.color}20`, border: `2px solid ${m.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {m.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{timesTrained}× treinado</div>
                  </div>
                </div>

                {/* Level badge */}
                <LevelBadge level={m.level} size="md" />

                {/* XP bar */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{m.currentXP.toLocaleString()} / {req.toLocaleString()} XP</span>
                    <span style={{ fontSize: 12, color: m.color, fontWeight: 700 }}>
                      {Math.min(100, Math.floor((m.currentXP / req) * 100))}%
                    </span>
                  </div>
                  <XPBar current={m.currentXP} required={req} color={m.color} animated={false} height={10} />
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#eab308' }}>{m.totalXPEarned.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>XP total</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{relatedExs.length}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>exercícios</div>
                  </div>
                </div>
              </div>

              {/* Related exercises */}
              {relatedExs.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {relatedExs.slice(0, 6).map(ex => (
                    <span key={ex.id} style={{
                      padding: '3px 8px', borderRadius: 6,
                      background: '#0d1526', border: '1px solid #1e2d4a',
                      fontSize: 11, color: '#94a3b8',
                    }}>
                      {ex.name} <span style={{ color: m.color }}>Lv{ex.level}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
