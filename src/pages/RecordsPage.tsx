import { useGameStore } from '../store/gameStore';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, TrendingUp } from 'lucide-react';

function formatDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "dd 'de' MMM, yyyy", { locale: ptBR });
  } catch { return iso; }
}

export function RecordsPage() {
  const { personalRecords, exercises, muscles, workouts, user } = useGameStore();

  function getExercise(id: string) { return exercises.find(e => e.id === id); }
  function getMuscle(id: string) { return muscles.find(m => m.id === id); }

  const sortedRecords = [...personalRecords].sort((a, b) => b.maxVolume - a.maxVolume);

  const totalPRs = workouts.reduce((sum, w) => sum + w.entries.filter(e => e.isPR).length, 0);
  const mostPracticedEx = [...exercises].sort((a, b) => b.timesPerformed - a.timesPerformed)[0];
  const maxWeightRecord = personalRecords.reduce((max, r) => r.maxWeight > (max?.maxWeight || 0) ? r : max, personalRecords[0]);
  const maxVolumeRecord = personalRecords.reduce((max, r) => r.maxVolume > (max?.maxVolume || 0) ? r : max, personalRecords[0]);

  return (
    <div className="fade-in-up" style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#f1f5f9' }}>🎯 Recordes Pessoais</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Seus melhores desempenhos de todos os tempos
        </p>
      </div>

      {/* Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <div className="game-card" style={{ padding: '16px', textAlign: 'center', border: '1px solid #eab30840', background: 'linear-gradient(135deg, #111827, #1a1a2e)' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#eab308' }}>{totalPRs}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Recordes quebrados</div>
        </div>
        <div className="game-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🔥</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>{user.longestStreak} dias</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Maior sequência</div>
        </div>
        {maxWeightRecord && (
          <div className="game-card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>⬆️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#a855f7' }}>{maxWeightRecord.maxWeight}kg</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Maior carga</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
              {getExercise(maxWeightRecord.exerciseId)?.name}
            </div>
          </div>
        )}
        {mostPracticedEx && (
          <div className="game-card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🏋️</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#06b6d4' }}>{mostPracticedEx.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{mostPracticedEx.timesPerformed}× mais praticado</div>
          </div>
        )}
      </div>

      {/* Records table */}
      {sortedRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
          <div>Nenhum recorde ainda. Registre treinos para acompanhar sua evolução!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedRecords.map(record => {
            const ex = getExercise(record.exerciseId);
            const pm = ex ? getMuscle(ex.primaryMuscleId) : null;
            if (!ex) return null;

            return (
              <div key={record.exerciseId} className="game-card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Exercise info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: pm ? `${pm.color}20` : '#1e2d4a',
                      border: `2px solid ${pm ? pm.color + '40' : '#2a3f6a'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {pm?.icon || '🏋️'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {pm?.name} · Lv {ex.level}
                      </div>
                    </div>
                  </div>

                  {/* Records */}
                  <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>MAIOR CARGA</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#a855f7' }}>
                        {record.maxWeight > 0 ? `${record.maxWeight}kg` : 'PC'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>MAIOR VOLUME</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>
                        {record.maxVolume.toLocaleString()}<span style={{ fontSize: 11 }}>kg</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>MAX REPS/SÉRIE</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                        {record.maxRepsInSet}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>MAX SÉRIES</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>
                        {record.maxSetsInSession}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>VEZES</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#eab308' }}>
                        {ex.timesPerformed}
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>
                    🗓️ {formatDate(record.date)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
